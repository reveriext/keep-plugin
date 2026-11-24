// The Keep plugin in Claude Code: the one reporter of the session's activity
// to Keep.
//
// Claude Code runs this script, in the background, at the events of a session
// named in hooks/claude-code.json, and passes the event's details as JSON on
// standard input. Each run does two things, in this order:
//
//   1. IT SAVES FIRST. The run turns its event into one or more activity
//      events and appends them to the session's spool, a file in the plugin's
//      data folder, written atomically, before any attempt to send. Each event
//      has an identifier (a UUIDv7), the instant it happened on this computer,
//      and a sequence number within the session that never goes backwards,
//      across restarts too: the larger of the last number plus one and the
//      current time in microseconds.
//   2. IT THEN SENDS. One sender at a time, under the session's send lock,
//      sends the spool in batches of at most BATCH_MAX events and
//      BATCH_MAX_BYTES to Keep's `/plugin/events`, with the session's report
//      code. An event leaves the spool only when Keep's answer (202) accounts
//      for it. Keep records each identifier once, so an event sent again is
//      never counted twice. A process stopped at any point therefore loses
//      nothing that was saved.
//
// THE EVENTS. `person_prompt` at each prompt and `person_answer` after an answer
// in the question dialog, each dated by its instant on this computer (`at`),
// which Keep takes as the time of the act;
// `turn_end`, with the words of the reply (`output_words`, as a `usage` event)
// and the token counts of each model, at the end of each reply; `subagent_start`
// and `subagent_end`, with the subagent's token counts; `session_end`;
// `tool_start` before every tool call, with nothing of the tool; `turn_active`
// after a tool call, at most once a minute; `awaiting_person`
// before the question dialog or a plan to approve, and when Claude Code waits
// for the person.
//
// WHEN IT SENDS. At the end of each reply, at the next prompt, after a person's
// answer, when the session starts to wait for the person, and during a long
// turn after a tool call, at most once in FLUSH_EVERY_MS. At the session's end
// the run saves `session_end` and starts a detached process that sends the
// spool, so that the exit does not wait on Keep. At each session's start, the
// spools that earlier sessions left are sent, while their codes are valid.
//
// THE REPORT CODE. Keep issues one per session through the connection hook,
// and Claude Code writes it into the transcript as the context of that hook;
// the script reads it from there. A code anywhere else (in a prompt or a reply)
// is ignored. Without a code the script reads no token counts, and keeps the
// session's other events in the spool until a code arrives. A code Keep refuses
// (401) is forgotten; the events wait for the next code. Keep's answer
// `tokens: false` stops the token counts for the session until a new code.
//
// ASSISTANT TIME TRACKING OFF. While Keep states that the session's project
// records no assistant time (TIME_NOT_RECORDED beside the connection's answer,
// or a 401 `time_off` to a report), the events saved for the session are
// deleted and never sent, even if the project records its time again later;
// from then on only the events of the latest prompt are kept, so that the turn
// in which Keep issues a new code is reported. A code that is merely missing
// or refused while the project records its time keeps the events for the next
// code.
//
// BACK-OFF. On 429, 503 or any other 5xx, the time to wait (Retry-After, or a
// doubling interval) is saved, and no run sends before it.
//
// BOUNDS. The spool holds at most SPOOL_MAX events, dropping the oldest events
// other than the person's own acts first; events older than EVENT_MAX_AGE_MS
// are dropped; session state unchanged for STATE_MAX_AGE_MS is removed.
//
// FILES. The script's folder and files are readable by this user only (0700
// and 0600). Locks hold their owner's process and a random token; one is
// released only by its owner and broken, once its owner is gone, by one
// process alone.
//
// Keep's address is the connector's own, read from the plugin's .mcp.json; a
// redirect is never followed. The script prints nothing: no text Keep answers
// reaches the assistant or the person through it. It always ends with exit 0.

import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** The sentence that carries the report code in the hook's context. */
export const CODE_RE =
  /Keep report code for the Keep plugin: (kpr_[A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/;
const SESSION_RE = /^[A-Za-z0-9._-]{1,200}$/;
/** The most bytes of one transcript read in one run; the rest is read next. */
export const MAX_READ_BYTES = 16 * 1024 * 1024;
/** The message identifiers remembered, so a message split across runs counts once. */
const SEEN_CAP = 500;
/** Events older than Keep accepts are dropped. */
export const EVENT_MAX_AGE_MS = 7 * 86_400_000;
/** Session state older than this is removed. */
const STATE_MAX_AGE_MS = 14 * 86_400_000;
/** A report code is valid for this long after Keep issues it. */
export const CODE_MAX_AGE_MS = 24 * 3_600_000;
/** The most events and bytes in one request (Keep's own limits). */
export const BATCH_MAX = 100;
export const BATCH_MAX_BYTES = 64 * 1024;
/** The most events one session's spool holds. */
export const SPOOL_MAX = 2000;
/** `turn_active` is saved at most once in this many milliseconds. */
export const ACTIVE_EVERY_MS = 60_000;
/** During a turn, a tool call sends the spool at most this often. */
export const FLUSH_EVERY_MS = 30_000;
/** How long one run may spend sending, below its hook's timeout of 5 s. */
const FLUSH_BUDGET_MS = 3500;
/** How long the detached process at the session's end may spend sending. */
const DETACHED_BUDGET_MS = 10_000;
/** The longest wait for one answer from Keep. */
const REQUEST_TIMEOUT_MS = 3000;
/** The first back-off without Retry-After, doubled up to BACKOFF_MAX_MS. */
const BACKOFF_FIRST_MS = 5000;
const BACKOFF_MAX_MS = 300_000;
/** The longest Retry-After honored. */
const RETRY_AFTER_MAX_MS = 3_600_000;
/** How long a run waits for the session's state. Without it, the event is
 *  saved in the session's inbox, which needs no lock. */
const STATE_LOCK_WAIT_MS = 1000;
/** A state lock older than this was left by a process that was stopped. */
const STATE_LOCK_STALE_MS = 15_000;
/** A send lock older than this was left by a process that was stopped: longer
 *  than the detached sender's budget and its last request. */
const SEND_LOCK_STALE_MS = 60_000;
/** The most events saved in a session's inbox while its state is held. */
export const INBOX_MAX = 200;
/** The most transcripts whose reading position a session's state keeps. */
const FILES_MAX = 64;
/** The most bytes of Keep's answer read. */
const ANSWER_MAX_BYTES = 8192;

const TOKEN_FIELDS = [
  'input_tokens',
  'output_tokens',
  'cache_read_tokens',
  'cache_creation_tokens',
];
const PERSON_EVENTS = new Set(['person_prompt', 'person_answer']);
/** The tools before which the session waits for the person. */
const WAIT_TOOLS = new Set(['AskUserQuestion', 'ExitPlanMode']);

/** The number of words in a reply: its runs of non-space characters. */
export function wordCount(text) {
  if (typeof text !== 'string') return null;
  return (text.match(/\S+/g) ?? []).length;
}

const hash = (value) => createHash('sha256').update(value).digest('hex');
const iso = (ms) => new Date(ms).toISOString();

/* ─────────────────────────── identifiers ─────────────────────────── */

/** A UUIDv7 (RFC 9562): 48 bits of the time in milliseconds, then random bits. */
export function uuidv7(nowMs = Date.now()) {
  const b = randomBytes(16);
  let t = nowMs;
  for (let i = 5; i >= 0; i -= 1) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The next sequence number of a session: never below the last one, and never
 *  below the current time in microseconds, so that a state lost or rewound
 *  still never goes backwards. */
export function nextSeq(last, nowMs) {
  const base = Number.isSafeInteger(last) && last >= 0 ? last : 0;
  return Math.max(base + 1, Math.floor(nowMs) * 1000);
}

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

/** The sentence Keep adds beside the code when the session's project does not
 *  accept token counts: the script then reads and sends none. */
export const TOKENS_NOT_RECORDED = 'Token counts: not recorded.';

/** The sentence Keep gives in place of a code while the session's project
 *  records no assistant time: what the session saved is then discarded. */
export const TIME_NOT_RECORDED =
  "Keep report code for the Keep plugin: none. Assistant time tracking is Off for this session's project.";

/** Whether a prompt hook's context may be the connection hook's: a hook named
 *  as another tool of a server (`server/tool`) or as a command is not. Claude
 *  Code writes the event's name for the hooks of an event; any other name
 *  that names the connection tool is accepted. */
function fromConnectionHook(name) {
  if (typeof name !== 'string' || name === 'UserPromptSubmit') return true;
  if (name.includes('/')) return name.endsWith('/connection_status');
  return !/\.(sh|mjs|js)\b|session-check/.test(name);
}

/** The latest report code in these lines, read only from the context of a
 *  prompt's hook, or null. */
export function latestCode(lines) {
  return latestCodeAndMode(lines).code;
}

/** The latest report code, and whether the token counts may be sent with it. */
export function latestCodeAndMode(lines) {
  let code = null;
  let tokens = true;
  // Whether the latest statement was that the project records no assistant
  // time (null: no statement either way in these lines), and whether any was.
  let timeOff = null;
  let offSeen = false;
  for (const line of lines) {
    if (!line.includes('Keep report code')) continue;
    const entry = parse(line);
    const attachment = entry?.type === 'attachment' ? entry.attachment : null;
    if (
      !attachment ||
      attachment.type !== 'hook_additional_context' ||
      attachment.hookEvent !== 'UserPromptSubmit' ||
      !fromConnectionHook(attachment.hookName)
    ) {
      continue;
    }
    const content = Array.isArray(attachment.content) ? attachment.content : [attachment.content];
    for (const text of content) {
      const match = typeof text === 'string' ? text.match(CODE_RE) : null;
      if (match) {
        code = match[1];
        tokens = !text.includes(TOKENS_NOT_RECORDED);
        timeOff = false;
      } else if (typeof text === 'string' && text.includes(TIME_NOT_RECORDED)) {
        code = null;
        timeOff = true;
        offSeen = true;
      }
    }
  }
  return { code, tokens, timeOff, offSeen };
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
    if (TOKEN_FIELDS.every((f) => row[f] === 0)) delete totals[model];
  }
  return totals;
}

/* ─────────────────────────── state and spool ─────────────────────────── */

const emptyState = (sessionId = null) => ({
  v: 2,
  session: sessionId,
  code: null,
  codeAt: 0,
  codeOffset: 0,
  tokens: true,
  files: {},
  activeAt: 0,
  flushAt: 0,
  retryAt: 0,
  backoffMs: 0,
  seq: 0,
  spool: [],
  transcript: null,
  timeOff: false,
});

export function statePath(dataDir, sessionId) {
  return join(dataDir, 'usage', `${hash(sessionId).slice(0, 32)}.json`);
}

/** The folder of events saved while the state was held by another run. */
function inboxPath(file) {
  return `${file.slice(0, -'.json'.length)}.inbox`;
}

/** The session's state. A state of the previous version keeps its code and its
 *  reading positions, and its totals not yet sent become `usage` events. */
export function loadState(file, now = Date.now()) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return emptyState();
  }
  if (raw && raw.v === 2 && Array.isArray(raw.spool) && typeof raw.files === 'object') {
    return { ...emptyState(), ...raw };
  }
  if (raw && raw.v === 1 && typeof raw.files === 'object') {
    const state = {
      ...emptyState(),
      code: raw.code ?? null,
      codeAt: raw.code ? now : 0,
      codeOffset: raw.codeOffset ?? 0,
      files: raw.files,
      tokens: raw.tokens !== false,
    };
    for (const entry of Object.values(raw.pending ?? {})) {
      const args = { model: entry.model };
      if (entry.agent_id) args.agent_id = entry.agent_id;
      for (const f of TOKEN_FIELDS) if (entry[f] > 0) args[f] = entry[f];
      addEvent(state, 'usage', args, entry.since ?? now);
    }
    return state;
  }
  return emptyState();
}

export function saveState(file, state) {
  const temp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(temp, JSON.stringify(state), { mode: 0o600 });
  renameSync(temp, file);
}

/** Append one event to the state's spool, with its identifier, its instant and
 *  the session's next sequence number. Returns the event. */
export function addEvent(state, event, args, now, id = uuidv7(now)) {
  const seq = nextSeq(state.seq, now);
  state.seq = seq;
  const entry = { id, seq, at: iso(now), event, args };
  // While the project records no assistant time, only the latest prompt's
  // events are kept, for the turn in which Keep may issue a new code.
  if (state.timeOff && event === 'person_prompt') state.spool = [];
  state.spool.push(entry);
  return entry;
}

const carriesTokens = (e) =>
  e.event === 'usage' && TOKEN_FIELDS.some((f) => typeof e.args?.[f] === 'number');

/** Keep the spool within its bounds: events older than EVENT_MAX_AGE_MS go;
 *  over SPOOL_MAX, the oldest events go, the person's own acts last. */
export function boundSpool(state, now) {
  state.spool = state.spool.filter((e) => now - Date.parse(e.at) <= EVENT_MAX_AGE_MS);
  state.spool.sort((a, b) => a.seq - b.seq);
  let excess = state.spool.length - SPOOL_MAX;
  if (excess <= 0) return;
  const drop = new Set();
  for (const e of state.spool) {
    if (excess === 0) break;
    if (!PERSON_EVENTS.has(e.event)) {
      drop.add(e.id);
      excess -= 1;
    }
  }
  for (const e of state.spool) {
    if (excess === 0) break;
    if (!drop.has(e.id)) {
      drop.add(e.id);
      excess -= 1;
    }
  }
  state.spool = state.spool.filter((e) => !drop.has(e.id));
}

/** Move the events of the session's inbox into its spool. Under the lock only. */
function mergeInbox(file, state) {
  const dir = inboxPath(file);
  let names;
  try {
    names = readdirSync(dir).filter((n) => n.endsWith('.json'));
  } catch {
    return [];
  }
  const known = new Set(state.spool.map((e) => e.id));
  const merged = [];
  const found = [];
  for (const name of names) {
    try {
      const e = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      if (
        e &&
        typeof e.id === 'string' &&
        typeof e.event === 'string' &&
        Number.isFinite(Date.parse(e.at)) &&
        !known.has(e.id)
      ) {
        found.push(e);
        known.add(e.id);
      }
    } catch {
      // A file still being written is a temporary file, never named *.json.
    }
    merged.push(join(dir, name));
  }
  // The sequence is given here, under the lock, in the order the events
  // happened: the inbox holds no number of its own.
  found.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || (a.id < b.id ? -1 : 1));
  for (const e of found) {
    addEvent(state, e.event, e.args ?? {}, Date.parse(e.at), e.id);
  }
  return merged;
}

/** The owner of a lock, as written in it: its process and its token. */
function ownerOf(dir) {
  try {
    const [pid, token] = readFileSync(join(dir, 'owner'), 'utf8').split(' ');
    return { pid: Number(pid), token: token ?? '' };
  } catch {
    return null;
  }
}

/** Whether a lock is abandoned: its owner's process is gone, or it is older
 *  than `staleMs`, which is longer than any run's budget, so that age never
 *  overrides a live owner still within its hook's time. A lock with no owner
 *  written yet belongs to its maker for its first second. */
function abandoned(dir, staleMs) {
  let age;
  try {
    age = Date.now() - statSync(dir).mtimeMs;
  } catch {
    return false;
  }
  if (age > staleMs) return true;
  const owner = ownerOf(dir);
  if (!owner || !Number.isSafeInteger(owner.pid) || owner.pid <= 0) return age > 1000;
  if (owner.pid === process.pid) return false;
  try {
    process.kill(owner.pid, 0);
    return false;
  } catch (err) {
    return err?.code === 'ESRCH';
  }
}

/** Remove the locks named `${dir}.broken-*` that hold this token: moved aside
 *  by another process while this run held them. */
function removeMovedLocks(dir, token) {
  const parent = dirname(dir);
  const prefix = `${basename(dir)}.broken-`;
  try {
    for (const name of readdirSync(parent)) {
      if (!name.startsWith(prefix)) continue;
      const moved = join(parent, name);
      if (ownerOf(moved)?.token === token) rmSync(moved, { recursive: true, force: true });
    }
  } catch {
    // Nothing moved.
  }
}

/** A lock: a folder holding its owner's process and a random token. Waits up
 *  to `waitMs`. An abandoned lock is broken by renaming it to a name of this
 *  run's own, which only one process can do, and then removing it. The
 *  release removes the lock only while it still holds this run's token.
 *  Returns the release, or null. */
function lock(dir, waitMs, staleMs) {
  const until = Date.now() + waitMs;
  const token = randomBytes(12).toString('hex');
  for (;;) {
    try {
      mkdirSync(dir, { mode: 0o700 });
      try {
        writeFileSync(join(dir, 'owner'), `${process.pid} ${token}`, { mode: 0o600 });
      } catch {
        // The lock still holds; it is taken over after its first second.
      }
      return () => {
        if (ownerOf(dir)?.token === token) rmSync(dir, { recursive: true, force: true });
        // A lock of this run's that another process moved aside while it was
        // live (below) is removed by this run, its owner.
        removeMovedLocks(dir, token);
      };
    } catch {
      const judged = ownerOf(dir)?.token;
      if (abandoned(dir, staleMs)) {
        const broken = `${dir}.broken-${token}`;
        try {
          renameSync(dir, broken);
          // Another process may have broken it and taken it in between: the
          // lock moved is then live, and is left for its owner to remove.
          if (ownerOf(broken)?.token === judged) rmSync(broken, { recursive: true, force: true });
        } catch {
          // Another process broke it first.
        }
        continue;
      }
      if (Date.now() >= until) return null;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
}

/** Change the session's state under its lock, and save it in one atomic
 *  write. Returns the state, or null when the lock was not obtained. */
function withState(file, sessionId, now, change) {
  const release = lock(`${file}.lock`, STATE_LOCK_WAIT_MS, STATE_LOCK_STALE_MS);
  if (!release) return null;
  try {
    const state = loadState(file, now);
    if (!state.session) state.session = sessionId;
    const merged = mergeInbox(file, state);
    change(state);
    boundSpool(state, now);
    saveState(file, state);
    for (const path of merged) rmSync(path, { force: true });
    return state;
  } catch {
    return null;
  } finally {
    release();
  }
}

/** Save events in the session's inbox, one file each, written atomically and
 *  with no lock: used when another run holds the state, so that no event is
 *  ever lost to a busy or abandoned lock. */
function saveToInbox(file, events, now) {
  const dir = inboxPath(file);
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    // Bounded: a session whose state stays held saves at most INBOX_MAX.
    if (readdirSync(dir).length >= INBOX_MAX) return;
    for (const [event, args] of events) {
      const entry = { id: uuidv7(now), at: iso(now), event, args };
      const path = join(dir, `${entry.id}.json`);
      writeFileSync(`${path}.tmp`, JSON.stringify(entry), { mode: 0o600 });
      renameSync(`${path}.tmp`, path);
    }
  } catch {
    // Nowhere to save; never a problem for the session.
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

/** The session's state folder, created if need be. When the session has no
 *  state file yet, its first run first removes the state left unchanged for
 *  STATE_MAX_AGE_MS. False when the folder cannot be made. */
function prepareState(dataDir, sessionId, now) {
  const dir = join(dataDir, 'usage');
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    // Readable by this user only, also when an earlier version made it.
    chmodSync(dir, 0o700);
  } catch {
    return false;
  }
  if (!existsSync(statePath(dataDir, sessionId))) sweep(dir, now);
  return true;
}

/** Take the latest report code from the session's transcript, and whether the
 *  token counts may be sent with it: Keep says so beside the code. */
function refreshCode(state, main, now, { atPrompt = false } = {}) {
  if (!main) return;
  const read = readNewLines(main, state.codeOffset ?? 0);
  const { code, tokens, timeOff, offSeen } = latestCodeAndMode(read.lines);
  // Any Off statement discards what was saved before it, even when a code
  // follows it in the same lines.
  if (offSeen) stopForTimeOff(state);
  if (timeOff !== true && code && code !== state.code) {
    state.code = code;
    state.codeAt = now;
    state.tokens = tokens;
    // A new code: what waited for one is sent at once.
    state.retryAt = 0;
    state.backoffMs = 0;
    if (state.timeOff) {
      // The project records its time again. What was saved while it did not
      // is discarded, except the turn of the prompt that brought the code: at
      // that prompt's own run, its event is saved after this; at a later run,
      // it is the latest prompt saved.
      const prompts = state.spool.filter((e) => e.event === 'person_prompt');
      const from = !atPrompt && prompts.length ? prompts.at(-1).seq : Number.POSITIVE_INFINITY;
      state.spool = state.spool.filter((e) => e.seq >= from);
      state.timeOff = false;
    }
  }
  state.codeOffset = read.next;
}

/** Keep states that the session's project records no assistant time: the code
 *  is forgotten and every event saved for the session is discarded. */
function stopForTimeOff(state) {
  state.timeOff = true;
  state.code = null;
  state.codeAt = 0;
  state.spool = [];
}

/** The token counts of a transcript since the last run, as `usage` events, and
 *  the transcript's new reading position, in the same state change. Without a
 *  code, or while the project does not accept the counts, nothing is read: the
 *  position moves to the transcript's end, so these lines are never counted. */
function addTokenEvents(state, transcript, agentId, now, { skipSidechain }) {
  if (typeof transcript !== 'string' || !transcript) return;
  const key = hash(transcript).slice(0, 32);
  if (!state.files[key]) state.files[key] = { offset: 0, seen: [] };
  const progress = state.files[key];
  progress.t = now;
  pruneFiles(state, now);
  if (!state.code || state.tokens === false) {
    try {
      progress.offset = statSync(transcript).size;
    } catch {
      // No transcript yet.
    }
    return;
  }
  const read = readNewLines(transcript, progress.offset);
  const seen = new Set(progress.seen);
  const totals = sumUsage(read.lines, seen, { skipSidechain });
  progress.offset = read.next;
  progress.seen = [...seen].slice(-SEEN_CAP);
  for (const [model, row] of Object.entries(totals)) {
    const args = { model };
    if (agentId) args.agent_id = agentId;
    for (const f of TOKEN_FIELDS) if (row[f] > 0) args[f] = row[f];
    addEvent(state, 'usage', args, now);
  }
}

/** Keep the reading positions of at most FILES_MAX transcripts, those read
 *  most recently, and none unread for STATE_MAX_AGE_MS. */
function pruneFiles(state, now) {
  const entries = Object.entries(state.files)
    .filter(([, f]) => now - (f.t ?? now) <= STATE_MAX_AGE_MS)
    .sort((a, b) => (b[1].t ?? 0) - (a[1].t ?? 0))
    .slice(0, FILES_MAX);
  state.files = Object.fromEntries(entries);
}

/* ─────────────────────────── sending ─────────────────────────── */

/** Keep's address for the session's events, beside the connector's own. */
export function endpointFrom(pluginRoot) {
  try {
    const config = JSON.parse(readFileSync(join(pluginRoot, '.mcp.json'), 'utf8'));
    const url = new URL(config?.mcpServers?.keep?.url);
    const local = url.hostname === 'localhost' || url.hostname.endsWith('.localhost');
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    return `${url.origin}/plugin/events`;
  } catch {
    return null;
  }
}

/** The body of one request: the oldest events of the spool, at most `max` of
 *  them and BATCH_MAX_BYTES in all. An event that alone passes the limit is
 *  returned in `oversized`, never sent. */
export function buildBatch(spool, sessionId, code, max = BATCH_MAX) {
  const ordered = [...spool].sort((a, b) => a.seq - b.seq);
  const events = [];
  const head = Buffer.byteLength(JSON.stringify({ session_id: sessionId, code, events: [] }));
  let size = head;
  for (const e of ordered) {
    if (events.length >= max) break;
    const wire = { id: e.id, seq: e.seq, at: e.at, event: e.event, args: e.args };
    const bytes = Buffer.byteLength(JSON.stringify(wire)) + (events.length ? 1 : 0);
    if (size + bytes > BATCH_MAX_BYTES) {
      if (events.length === 0) return { events: [], oversized: e.id };
      break;
    }
    events.push(wire);
    size += bytes;
  }
  return { events, oversized: null };
}

/** Retry-After in milliseconds (seconds or an HTTP date), bounded, or null. */
export function retryAfterMs(value, now) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const seconds = Number(value.trim());
  let ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  if (!Number.isFinite(ms)) return null;
  ms = Math.max(0, ms);
  return Math.min(ms, RETRY_AFTER_MAX_MS);
}

function headerOf(response, name) {
  try {
    return response.headers?.get?.(name) ?? null;
  } catch {
    return null;
  }
}

/** Keep's answer as JSON, read no further than ANSWER_MAX_BYTES, or null. */
async function bodyOf(response) {
  try {
    const reader = response.body?.getReader?.();
    if (reader) {
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > ANSWER_MAX_BYTES) {
          await reader.cancel().catch(() => {});
          return null;
        }
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    if (typeof response.text === 'function') {
      const text = await response.text();
      return text.length > ANSWER_MAX_BYTES ? null : JSON.parse(text);
    }
    return (await response.json?.()) ?? null;
  } catch {
    return null;
  }
}

/** The error Keep gives a report while the session's project records no
 *  assistant time: what the session saved is then discarded. */
export const TIME_OFF_ERROR = 'time_off';

/** Send the session's spool, batch after batch, within `budgetMs`. One sender
 *  at a time per session; a run that finds another sender at work leaves the
 *  spool to it. Nothing Keep answers is ever printed or given to the
 *  assistant. */
export async function flush(file, sessionId, { endpoint, fetchImpl, now, budgetMs }) {
  if (!endpoint) return;
  const release = lock(`${file}.send`, 0, SEND_LOCK_STALE_MS);
  if (!release) return;
  const started = Date.now();
  let limit = BATCH_MAX;
  // Rate limited or unavailable: wait as Keep asks, or for a doubling
  // interval, before any run sends again.
  const backOff = (response) => {
    const asked = response ? retryAfterMs(headerOf(response, 'retry-after'), now) : null;
    withState(file, sessionId, now, (state) => {
      const backoff = Math.min(
        BACKOFF_MAX_MS,
        state.backoffMs ? state.backoffMs * 2 : BACKOFF_FIRST_MS,
      );
      state.backoffMs = backoff;
      state.retryAt = now + (asked ?? backoff);
    });
  };
  try {
    for (;;) {
      const remaining = budgetMs - (Date.now() - started);
      if (remaining <= 200) return;
      let batch = null;
      let code = null;
      withState(file, sessionId, now, (state) => {
        state.flushAt = now;
        if (!state.code || now < (state.retryAt ?? 0)) return;
        const built = buildBatch(state.spool, sessionId, state.code, limit);
        if (built.oversized) {
          state.spool = state.spool.filter((e) => e.id !== built.oversized);
          batch = [];
          return;
        }
        if (built.events.length) {
          batch = built.events;
          code = state.code;
        }
      });
      if (batch === null) return;
      if (batch.length === 0) continue;

      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, code, events: batch }),
          // Keep's address is the only one the reports go to: never followed.
          redirect: 'error',
          signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, remaining)),
        });
      } catch {
        return; // Keep is not reachable now: the spool waits for the next run.
      }
      const status = response.status;
      const ids = new Set(batch.map((e) => e.id));
      const answer = (await bodyOf(response)) ?? {};
      // Final for this batch: Keep's own refusal of its content. A batch of
      // several is halved, so that one event Keep refuses holds back no other;
      // a single event is dropped.
      const refused =
        (status === 400 && answer.error === 'invalid_request') ||
        (status === 413 && answer.error === 'too_large') ||
        (status === 415 && answer.error === 'unsupported_media_type');
      const accepted = Number.isInteger(answer.accepted) ? answer.accepted : 0;
      if (status === 202 && accepted >= batch.length) {
        withState(file, sessionId, now, (state) => {
          // Keep accounts for every event of the batch: they leave the spool.
          state.spool = state.spool.filter((e) => !ids.has(e.id));
          state.backoffMs = 0;
          if (answer.tokens === false && state.code === code) {
            state.tokens = false;
            state.spool = state.spool.filter((e) => !carriesTokens(e));
          }
        });
        // After a halved batch is accepted, the batches grow back.
        limit = Math.min(BATCH_MAX, limit * 2);
      } else if (status === 202 || refused) {
        // Not accounted for in full, or refused: halved until the event
        // stands alone. Every event is kept until Keep accounts for it, but
        // for one Keep refuses on its own.
        if (batch.length > 1) {
          limit = Math.ceil(batch.length / 2);
          continue;
        }
        if (refused) {
          withState(file, sessionId, now, (state) => {
            state.spool = state.spool.filter((e) => !ids.has(e.id));
          });
          continue;
        }
        backOff(null);
        return;
      } else if (status === 401) {
        // The code is no longer valid: forget it, keep the events, and send
        // them with the next code. When Keep states that the project records
        // no assistant time, the events are discarded instead.
        withState(file, sessionId, now, (state) => {
          if (answer.error === TIME_OFF_ERROR) stopForTimeOff(state);
          else if (state.code === code) {
            state.code = null;
            state.codeAt = 0;
          }
        });
        return;
      } else {
        backOff(response);
        return;
      }
    }
  } finally {
    release();
  }
}

/** Send the spools that earlier sessions left, while their codes are valid. */
async function flushLeftovers(dataDir, ownFile, { endpoint, fetchImpl, now, budgetMs }) {
  const dir = join(dataDir, 'usage');
  const started = Date.now();
  let names;
  try {
    names = readdirSync(dir).filter((n) => /^[0-9a-f]{32}\.json$/.test(n));
  } catch {
    return;
  }
  for (const name of names) {
    const file = join(dir, name);
    if (file === ownFile) continue;
    const remaining = budgetMs - (Date.now() - started);
    if (remaining <= 200) return;
    let state;
    try {
      // A file unchanged for longer than an event is kept holds nothing to send.
      if (now - statSync(file).mtimeMs > EVENT_MAX_AGE_MS) continue;
      state = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    const waiting = (state?.spool?.length ?? 0) > 0 || existsSync(inboxPath(file));
    if (state?.v !== 2 || !waiting || typeof state.session !== 'string') continue;
    if (state.timeOff) continue;
    if (!state.code && typeof state.transcript === 'string') {
      // A session stopped before any run read its code: read it from the
      // session's transcript, as a run of that session would; the file is
      // written only when a code is found there.
      const read = readNewLines(state.transcript, state.codeOffset ?? 0);
      const found = latestCodeAndMode(read.lines);
      if (!found.code && found.timeOff !== true) continue;
      state = withState(file, state.session, now, (s) => refreshCode(s, s.transcript, now));
    }
    if (!state?.code || now - (state.codeAt ?? 0) > CODE_MAX_AGE_MS) continue;
    await flush(file, state.session, { endpoint, fetchImpl, now, budgetMs: remaining });
  }
}

/** The file whose content, the time in seconds, tells the shell, before Node
 *  starts, that a tool call reached this script within FLUSH_EVERY_MS. */
export function activeStampPath(dataDir, sessionId) {
  return join(dataDir, 'usage', `active-${sessionId}`);
}

/* ─────────────────────────── one run ─────────────────────────── */

/** The events one hook saves, as [event, args] pairs, and whether it sends. */
function eventsOf(hook, state, now) {
  const name = hook.hook_event_name;
  const at = iso(now);
  switch (name) {
    case 'UserPromptSubmit':
      return { events: [['person_prompt', {}]], send: true };
    case 'PostToolUse': {
      if (hook.tool_name === 'AskUserQuestion') {
        state.activeAt = now;
        return {
          events: [
            ['person_answer', {}],
            ['turn_active', { at }],
          ],
          send: true,
        };
      }
      const events = [];
      if (now - (state.activeAt ?? 0) >= ACTIVE_EVERY_MS) {
        state.activeAt = now;
        events.push(['turn_active', { at }]);
      }
      return { events, send: now - (state.flushAt ?? 0) >= FLUSH_EVERY_MS };
    }
    case 'PreToolUse': {
      // Every tool's start (the owner's rule: a running tool counts):
      // the turn is active until the tool ends (`turn_active` after it). The
      // tool's name and input are never sent.
      const events = [['tool_start', {}]];
      if (WAIT_TOOLS.has(hook.tool_name)) {
        // A wait for the person: the next tool call states its end at once.
        state.activeAt = 0;
        events.push(['awaiting_person', { at }]);
        return { events, send: true };
      }
      return { events, send: now - (state.flushAt ?? 0) >= FLUSH_EVERY_MS };
    }
    case 'Notification':
      // A wait for the person: the next tool call states its end at once.
      state.activeAt = 0;
      return { events: [['awaiting_person', { at }]], send: true };
    case 'Stop': {
      const events = [['turn_end', {}]];
      const words = wordCount(hook.last_assistant_message);
      if (words !== null) events.push(['usage', { output_words: words, at }]);
      return { events, send: true, tokens: { path: hook.transcript_path, agent: null } };
    }
    case 'SubagentStart': {
      const agent = typeof hook.agent_id === 'string' ? hook.agent_id.slice(0, 200) : '';
      if (!agent) return { events: [], send: false };
      const args = { agent_id: agent };
      if (typeof hook.agent_type === 'string' && hook.agent_type) {
        args.agent_type = hook.agent_type.slice(0, 120);
      }
      return { events: [['subagent_start', args]], send: false };
    }
    case 'SubagentStop': {
      const agent = typeof hook.agent_id === 'string' ? hook.agent_id.slice(0, 200) : '';
      if (!agent) return { events: [], send: true };
      return {
        events: [['subagent_end', { agent_id: agent }]],
        send: true,
        tokens: { path: hook.agent_transcript_path, agent },
      };
    }
    case 'SessionEnd':
      // The token counts a reply's run did not save (a run stopped at exit)
      // are collected here; the reading position makes it count each once.
      return {
        events: [['session_end', {}]],
        send: false,
        tokens: { path: hook.transcript_path, agent: null },
      };
    case 'SessionStart':
      return { events: [], send: true };
    default:
      return { events: [], send: false };
  }
}

export async function run({
  input,
  dataDir,
  pluginRoot,
  fetchImpl = fetch,
  now = Date.now(),
  spawnImpl = spawn,
  budgetMs = FLUSH_BUDGET_MS,
}) {
  let hook;
  try {
    hook = JSON.parse(input);
  } catch {
    return;
  }
  if (!hook || typeof hook !== 'object' || !dataDir) return;
  const sessionId = hook.session_id;
  if (typeof sessionId !== 'string' || !SESSION_RE.test(sessionId)) return;
  const event = hook.hook_event_name;
  const main = typeof hook.transcript_path === 'string' ? hook.transcript_path : null;
  if (!prepareState(dataDir, sessionId, now)) return;
  const file = statePath(dataDir, sessionId);
  const endpoint = pluginRoot ? endpointFrom(pluginRoot) : null;

  // 1. SAVE FIRST: the run's events, the session's code and, at the end of a
  // reply or of a subagent, its token counts with the transcript's new reading
  // position, all in one atomic write.
  let plan = null;
  const state = withState(file, sessionId, now, (s) => {
    if (main) s.transcript = main.slice(0, 4096);
    refreshCode(s, main, now, { atPrompt: event === 'UserPromptSubmit' });
    plan = eventsOf(hook, s, now);
    for (const [name, args] of plan.events) addEvent(s, name, args, now);
    if (plan.tokens) {
      addTokenEvents(s, plan.tokens.path, plan.tokens.agent, now, {
        skipSidechain: !plan.tokens.agent,
      });
    }
  });
  if (!state) {
    // Another run holds the state: the events are saved without the lock.
    plan = eventsOf(hook, loadState(file, now), now);
    saveToInbox(file, plan.events, now);
  }
  if (event === 'PostToolUse') {
    try {
      writeFileSync(activeStampPath(dataDir, sessionId), String(Math.floor(now / 1000)), {
        mode: 0o600,
      });
    } catch {
      // The shell's check then starts Node, which decides.
    }
  } else if (
    event === 'Notification' ||
    (event === 'PreToolUse' && WAIT_TOOLS.has(hook.tool_name))
  ) {
    rmSync(activeStampPath(dataDir, sessionId), { force: true });
  }

  // 2. THEN SEND.
  if (event === 'SessionEnd') {
    startDetachedFlush(sessionId, { dataDir, pluginRoot, spawnImpl });
    return;
  }
  if (plan?.send) {
    const started = Date.now();
    if (event === 'SessionStart') {
      await flushLeftovers(dataDir, file, { endpoint, fetchImpl, now, budgetMs });
    }
    // One budget for the run, below its hook's timeout.
    const remaining = budgetMs - (Date.now() - started);
    await flush(file, sessionId, { endpoint, fetchImpl, now, budgetMs: remaining });
  }
}

/** Start a process, detached from Claude Code, that sends the session's spool
 *  after the session has ended, so that the exit never waits on Keep. */
function startDetachedFlush(sessionId, { dataDir, pluginRoot, spawnImpl }) {
  try {
    const child = spawnImpl(
      process.execPath,
      [fileURLToPath(import.meta.url), '--flush', sessionId],
      {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, CLAUDE_PLUGIN_DATA: dataDir, CLAUDE_PLUGIN_ROOT: pluginRoot ?? '' },
      },
    );
    child.on?.('error', () => {});
    child.unref?.();
  } catch {
    // The spool is sent at the next session's start.
  }
}

/** The detached process: send one session's spool. */
export async function runFlush({ sessionId, dataDir, pluginRoot, fetchImpl = fetch, now }) {
  if (!dataDir || typeof sessionId !== 'string' || !SESSION_RE.test(sessionId)) return;
  const file = statePath(dataDir, sessionId);
  if (!existsSync(file)) return;
  const endpoint = pluginRoot ? endpointFrom(pluginRoot) : null;
  await flush(file, sessionId, {
    endpoint,
    fetchImpl,
    now: now ?? Date.now(),
    budgetMs: DETACHED_BUDGET_MS,
  });
}

async function main() {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA || '';
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || '';
  if (process.argv[2] === '--flush') {
    await runFlush({ sessionId: process.argv[3], dataDir, pluginRoot });
    return;
  }
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  await run({ input: Buffer.concat(chunks).toString('utf8'), dataDir, pluginRoot });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch(() => {})
    .finally(() => process.exit(0));
}
