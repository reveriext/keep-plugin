// The Keep plugin in Claude Code: the token counts of each turn and subagent.
//
// Claude Code runs this script, in the background, when the assistant finishes
// a reply (Stop) and when a subagent finishes (SubagentStop), and passes the
// event's details as JSON on standard input. The script:
//
//   1. reads the lines of the session's transcript written since its last run,
//      and takes the latest report code Keep gave the session: Keep returns it
//      to the hook on each prompt, and Claude Code writes it into the
//      transcript as the context of that hook. A code anywhere else (in a
//      prompt or a reply) is ignored;
//   2. reads the lines of the transcript that was reported on (the session's,
//      or the subagent's own) written since its last run, and sums the token
//      counts of each model, counting each message once;
//   3. adds them to what is waiting to be sent, saves that, and only then sends
//      each model's totals to Keep with the code. What Keep accepted, or
//      refused for good, is removed; the rest is sent at the next run.
//
// WITHOUT A CODE IT STANDS DOWN. Keep issues a code once per
// session, and only while the session's project records token counts
// Automatically. When the session holds no code, the script reads nothing of
// the reported transcript: it moves its place to the transcript's end, so no
// line is ever counted for a time without a code, and exits. The only read is
// step 1, which reads just the bytes written since its previous run. A code
// Keep no longer accepts (401) or a project that no longer accepts the counts
// (422 tokens_manual or tokens_off) is forgotten, and the script stands down
// until a new code arrives.
//
// Its state is kept in the plugin's data folder: for each session, the code,
// how far each transcript has been read, and the totals waiting to be sent. A
// line is never counted twice, and totals are removed once Keep has them.
//
// Keep's address is the connector's own, read from the plugin's .mcp.json.
// The script prints nothing and always ends with exit 0.

import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The sentence that carries the report code in the hook's context. */
export const CODE_RE =
  /Keep report code for the Keep plugin: (kpr_[A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/;
const SESSION_RE = /^[A-Za-z0-9._-]{1,200}$/;
/** The most bytes of one transcript read in one run; the rest is read next. */
export const MAX_READ_BYTES = 16 * 1024 * 1024;
/** The message identifiers remembered, so a message split across runs counts once. */
const SEEN_CAP = 500;
/** Totals waiting longer than Keep accepts a report are dropped. */
const PENDING_MAX_AGE_MS = 7 * 86_400_000;
/** Session state older than this is removed. */
const STATE_MAX_AGE_MS = 14 * 86_400_000;
const SEND_TIMEOUT_MS = 5000;
const LOCK_WAIT_MS = 5000;
const LOCK_STALE_MS = 60_000;

const FIELDS = ['input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_creation_tokens'];

const hash = (value) => createHash('sha256').update(value).digest('hex');

/* ─────────────────────────── reading ─────────────────────────── */

/** The complete lines of a file from a byte offset, and the offset after the
 *  last complete line. A line still being written is left for the next run. A
 *  file shorter than the offset (rewritten) is read from the start. */
export function readNewLines(file, offset, max = MAX_READ_BYTES) {
  let size;
  try {
    size = statSync(file).size;
  } catch {
    return { lines: [], next: offset };
  }
  let from = offset;
  if (size < from) from = 0;
  const length = Math.min(size - from, max);
  if (length <= 0) return { lines: [], next: from };
  const buffer = Buffer.alloc(length);
  const fd = openSync(file, 'r');
  try {
    readSync(fd, buffer, 0, length, from);
  } finally {
    closeSync(fd);
  }
  const end = buffer.lastIndexOf(10);
  if (end === -1) {
    // One line longer than the window cannot be read; it is skipped.
    return { lines: [], next: length === max ? from + length : from };
  }
  const lines = buffer.subarray(0, end).toString('utf8').split('\n');
  return { lines, next: from + end + 1 };
}

function parse(line) {
  if (!line || line[0] !== '{') return null;
  try {
    const value = JSON.parse(line);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

/** The latest report code in these lines, read only from the context of a
 *  prompt's hook, or null. */
export function latestCode(lines) {
  let code = null;
  for (const line of lines) {
    if (!line.includes('Keep report code')) continue;
    const entry = parse(line);
    const attachment = entry?.type === 'attachment' ? entry.attachment : null;
    if (
      !attachment ||
      attachment.type !== 'hook_additional_context' ||
      attachment.hookEvent !== 'UserPromptSubmit'
    ) {
      continue;
    }
    const content = Array.isArray(attachment.content) ? attachment.content : [attachment.content];
    for (const text of content) {
      const match = typeof text === 'string' ? text.match(CODE_RE) : null;
      if (match) code = match[1];
    }
  }
  return code;
}

const whole = (n) => (Number.isInteger(n) && n > 0 ? n : 0);

/** The token counts in these lines, by model. Each message is counted once,
 *  by its identifier (Claude Code writes one line per part of a message, each
 *  with the message's usage); `seen` holds the identifiers already counted
 *  and is updated. Lines of a subagent inside the session's own transcript
 *  are left to the subagent's report when `skipSidechain` is set. */
export function sumUsage(lines, seen, { skipSidechain = false } = {}) {
  const totals = {};
  for (const line of lines) {
    if (!line.includes('"usage"')) continue;
    const entry = parse(line);
    if (!entry || entry.type !== 'assistant') continue;
    if (skipSidechain && entry.isSidechain === true) continue;
    const message = entry.message;
    const usage = message?.usage;
    const model = typeof message?.model === 'string' ? message.model.trim() : '';
    if (!usage || typeof usage !== 'object' || !model || model.startsWith('<')) continue;
    const id = typeof message.id === 'string' ? message.id : null;
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    if (!totals[model]) {
      totals[model] = {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_creation_tokens: 0,
      };
    }
    const row = totals[model];
    row.input_tokens += whole(usage.input_tokens);
    row.output_tokens += whole(usage.output_tokens);
    row.cache_read_tokens += whole(usage.cache_read_input_tokens);
    row.cache_creation_tokens += whole(usage.cache_creation_input_tokens);
  }
  for (const [model, row] of Object.entries(totals)) {
    if (FIELDS.every((f) => row[f] === 0)) delete totals[model];
  }
  return totals;
}

/* ─────────────────────────── state ─────────────────────────── */

const emptyState = () => ({ v: 1, code: null, codeOffset: 0, files: {}, pending: {} });

export function statePath(dataDir, sessionId) {
  return join(dataDir, 'usage', `${hash(sessionId).slice(0, 32)}.json`);
}

export function loadState(file) {
  try {
    const state = JSON.parse(readFileSync(file, 'utf8'));
    if (state && state.v === 1 && typeof state.files === 'object' && state.pending) return state;
  } catch {
    // A missing or unreadable state starts afresh.
  }
  return emptyState();
}

export function saveState(file, state) {
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(state));
  renameSync(temp, file);
}

/** Add totals to what waits to be sent, per subagent (or the session) and model. */
export function addPending(state, agentId, totals, now) {
  for (const [model, row] of Object.entries(totals)) {
    const key = `${agentId ?? ''}|${model}`;
    if (!state.pending[key]) {
      state.pending[key] = {
        agent_id: agentId ?? null,
        model,
        since: now,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_creation_tokens: 0,
      };
    }
    const entry = state.pending[key];
    for (const f of FIELDS) entry[f] += row[f];
  }
}

function lock(file) {
  const dir = `${file}.lock`;
  const until = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      mkdirSync(dir);
      return () => {
        try {
          rmdirSync(dir);
        } catch {
          // Already gone.
        }
      };
    } catch {
      try {
        if (Date.now() - statSync(dir).mtimeMs > LOCK_STALE_MS) rmdirSync(dir);
      } catch {
        // It went away; try again.
      }
      if (Date.now() > until) return null;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
}

function sweep(dir, now) {
  try {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      try {
        if (now - statSync(path).mtimeMs > STATE_MAX_AGE_MS) rmSync(path, { recursive: true });
      } catch {
        // Next time.
      }
    }
  } catch {
    // Nothing to sweep.
  }
}

/* ─────────────────────────── sending ─────────────────────────── */

/** Keep's address for token counts, beside the connector's own. */
export function endpointFrom(pluginRoot) {
  try {
    const config = JSON.parse(readFileSync(join(pluginRoot, '.mcp.json'), 'utf8'));
    const url = new URL(config?.mcpServers?.keep?.url);
    const local = url.hostname === 'localhost' || url.hostname.endsWith('.localhost');
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    return `${url.origin}/plugin/usage`;
  } catch {
    return null;
  }
}

/** Send what waits, one model at a time. Removes what Keep accepted (200) or
 *  refused for good (400, 413, 415, 422); keeps the rest for the next run. */
export async function sendPending(state, { endpoint, sessionId, fetchImpl, now }) {
  for (const [key, entry] of Object.entries(state.pending)) {
    if (now - (entry.since ?? now) > PENDING_MAX_AGE_MS) delete state.pending[key];
  }
  if (!endpoint || !state.code) return;
  for (const [key, entry] of Object.entries(state.pending)) {
    const body = { session_id: sessionId, code: state.code, model: entry.model };
    if (entry.agent_id) body.agent_id = entry.agent_id;
    for (const f of FIELDS) if (entry[f] > 0) body[f] = entry[f];
    let status;
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      status = response.status;
    } catch {
      return; // Keep is not reachable now: everything waits for the next run.
    }
    if (status === 200 || [400, 413, 415, 422].includes(status)) {
      delete state.pending[key];
      if (status === 422 && (await refusedForProject(response))) {
        // The project does not accept the counts: forget the code and what
        // waits, and stand down until Keep issues a new code.
        state.code = null;
        state.pending = {};
        return;
      }
    } else if (status === 401) {
      // The code is no longer valid: forget it; a new one arrives with a prompt.
      state.code = null;
      return;
    } else {
      return; // Rate limited or unavailable: the next run sends it.
    }
  }
}

/** Whether a 422 says the session's project does not accept the counts. */
async function refusedForProject(response) {
  try {
    const body = await response.json();
    return body?.error === 'tokens_manual' || body?.error === 'tokens_off';
  } catch {
    return false;
  }
}

/** The size of a file, or null. Reads nothing of it. */
function sizeOf(file) {
  try {
    return statSync(file).size;
  } catch {
    return null;
  }
}

/* ─────────────────────────── one run ─────────────────────────── */

export async function run({ input, dataDir, pluginRoot, fetchImpl = fetch, now = Date.now() }) {
  let hook;
  try {
    hook = JSON.parse(input);
  } catch {
    return;
  }
  if (!hook || typeof hook !== 'object' || !dataDir) return;
  const sessionId = hook.session_id;
  if (typeof sessionId !== 'string' || !SESSION_RE.test(sessionId)) return;
  const main = typeof hook.transcript_path === 'string' ? hook.transcript_path : null;
  const subagent =
    hook.hook_event_name === 'SubagentStop' && typeof hook.agent_id === 'string' && hook.agent_id
      ? { id: hook.agent_id.slice(0, 200), path: hook.agent_transcript_path }
      : null;
  const reported = subagent ? subagent.path : main;
  if (typeof reported !== 'string' || !reported) return;

  const dir = join(dataDir, 'usage');
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    return;
  }
  const file = statePath(dataDir, sessionId);
  if (!existsSync(file)) sweep(dir, now);
  const release = lock(file);
  if (!release) return;
  try {
    const state = loadState(file);

    if (main) {
      const read = readNewLines(main, state.codeOffset ?? 0);
      const code = latestCode(read.lines);
      if (code) state.code = code;
      state.codeOffset = read.next;
    }

    const key = hash(reported).slice(0, 32);
    if (!state.files[key]) state.files[key] = { offset: 0, seen: [] };
    const progress = state.files[key];

    // NO CODE: STAND DOWN. Nothing of the reported transcript is read; its
    // place moves to its end, so these lines are never counted later.
    if (!state.code) {
      const size = sizeOf(reported);
      if (size !== null) progress.offset = size;
      saveState(file, state);
      return;
    }
    const read = readNewLines(reported, progress.offset);
    const seen = new Set(progress.seen);
    const totals = sumUsage(read.lines, seen, { skipSidechain: !subagent });
    progress.offset = read.next;
    progress.seen = [...seen].slice(-SEEN_CAP);
    addPending(state, subagent?.id ?? null, totals, now);
    // Saved before sending: a line is never counted twice, whatever happens next.
    saveState(file, state);

    await sendPending(state, {
      endpoint: pluginRoot ? endpointFrom(pluginRoot) : null,
      sessionId,
      fetchImpl,
      now,
    });
    saveState(file, state);
  } catch {
    // Never a problem for the session.
  } finally {
    release();
  }
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  await run({
    input: Buffer.concat(chunks).toString('utf8'),
    dataDir: process.env.CLAUDE_PLUGIN_DATA || '',
    pluginRoot: process.env.CLAUDE_PLUGIN_ROOT || '',
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch(() => {})
    .finally(() => process.exit(0));
}
