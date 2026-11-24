![Keep](assets/readme-mark.png)

# Keep for your AI assistant

**Your team and your AI assistants, in one shared workspace.**

[hykeep.app](https://hykeep.app) · [Connect an AI assistant](https://hykeep.app/connect) ·
[Trust and security](https://hykeep.app/trust) · [Privacy Policy](https://hykeep.app/privacy) ·
[Support](https://hykeep.app/support)

The Keep plugin provides the Keep connector and the Keep skill, which allow an AI assistant to
work in Keep with the access of the person who signs in.

## What Keep is

Keep is a shared workspace for your team and your AI assistants. It holds requirements,
tasks, decisions, documents and time in one project record, kept up to date by the team and
the AI assistants it already uses. Keep is built for teams that deliver software. A workspace
starts on the Free plan, without payment details.

## What the plugin provides

| Component | What it provides | Where it applies |
|---|---|---|
| The Keep connector | Keep's tools, through a remote MCP server at `https://mcp.hykeep.app/mcp` over Streamable HTTP | Every assistant that connects to remote MCP servers |
| The Keep skill | The instructions that tell the assistant how to work in Keep, in the Agent Skills format | Every assistant that reads Agent Skills |
| Connection verification and assistant time | The hooks and the scripts they run, described below | Claude Code only |

### The Keep skill

The skill instructs the assistant to manage the project's record and to assist the person in
delivering the work, with the person's own access. The assistant never takes the title of
project manager: in Keep, that is an access capability a person holds on a project.

- When to use Keep: it finds the project, reads the project's "AI assistants work in Keep" setting
  (Always, or Ask first), and asks you once if it has to. A refusal applies for the whole
  conversation.
- Record first: a requirement before something new, a task before code.
- Time: the assistant starts a work session, records each step, and before it stops
  presents a summary with the assistant time Keep calculated and the user time Keep suggests.
  It never asks you for the assistant time. You confirm or modify the suggestion; a suggestion
  you did not confirm is recorded and marked awaiting confirmation until you confirm it in
  Keep. Assistant time and token counts are provisional estimates, calculated from the recorded
  compute and the data available.
- To name the record in every commit message.
- To keep each record's status true, and to ask before anything that cannot be taken back.
- To follow the project's controls: it states the project's rules when work starts, records
  each task's deliverable, writes acceptance criteria as a list, and presents every
  confirmation request that Keep returns to the person and never answers it itself.
- A method for each activity, from submitting a request to communicating outcomes.
- Reports: for a person who manages a project, to prepare the project report, the Time report,
  the decision log or the risk register from the figures Keep returns, exactly as returned, and
  to end with the link to the report in Keep.
- When the connection is in Code Mode: to write a script for several calls, and to make every
  step that needs the person's agreement its own `use_tool` call.

The skill is instructions. It measures nothing and blocks nothing: outside Claude Code, Keep
calculates assistant time from the assistant's own calls, and nothing stops a commit that names
no record. If your assistant does not follow it, tell it to "use the Keep skill". In Claude
Code, the plugin's hooks verify the connection, give the assistant the instructions quoted
below, and report the assistant's work, and your presence while assistants work, to Keep; they perform only the
functions stated under "What the plugin runs, reads and sends in Claude Code".

### Connection verification in Claude Code

In Claude Code, the Keep plugin verifies the Keep connection at the first prompt of each
session, and the assistant states the result once:

- connected: "Keep is connected as" the person, with their email address and workspaces;
- not connected: "Keep is not connected. Run /mcp, select the Keep server and complete
  sign-in."

The statement "Keep is connected as" is returned by Keep's `connection_status` tool, which a
hook calls through the plugin's own connection, under the sign-in you already completed; it
never opens a sign-in of its own. The script `session-check.sh` records the session in
the plugin's data folder, so that the result is stated once per session, and gives the
assistant the instruction to state it. The same instruction gives the assistant the session's
identifier, for `start_work`, so that a work session and the assistant time below are recorded
on the same record. Both are described under "What the plugin runs, reads and sends in Claude
Code".

The same script reads the workspace and the project from the repository's `.keep.json`, in
the session's working directory or the nearest directory above it within the repository.
The assistant then associates the session with that project once, through Keep's
`record_agent_activity` tool, and states nothing about it unless Keep refuses it. Without a
`.keep.json`, the assistant associates the session with its project once the project of the
work is established.

### Assistant time in Claude Code

In Claude Code, the Keep plugin measures the assistant time of each session. The script
`usage.mjs` records, in the background, when you submit a prompt, when you answer a question the
assistant asks in Claude Code's question dialog, when the assistant finishes its reply, when a
subagent starts and stops, and when the session ends, and reports each of these events to Keep.
Keep counts each turn in full, and each subagent as its own run on the record in focus. Nothing
is asked of you: the assistant time is calculated, and only your own time is suggested for your
confirmation. The reports carry the fields stated under "What the reports to Keep contain", and
never what you wrote, the reply or any file.

Once the session is associated with its project, Keep records the session's assistant time and
your own acts for that project from the first turn, whether or not a record is in focus.
Your acts that reached no record are suggested as one entry of user time on the
project. It is never confirmed on your behalf: it awaits your decision in My time › To
settle.

Each report is recorded in the workspace of the session's project, or in the workspace in which
the session started work on a record. Where you belong to one workspace only, it is recorded in
that workspace. Otherwise Keep retains the reports, for up to seven days, until the session is
associated with its project or starts work on a record, and then records them in that
workspace, in order. Work done before a record is in focus is therefore recorded too.

The plugin also reports the token counts of each turn and subagent, and your presence while
the assistant works: the number of words in each reply, so that Keep can allow time to read a
long reply, such as a plan; that a turn is in progress; that the session waits for you; and
the time on your computer at which you submitted each prompt and each answer in the question
dialog. The script `usage.mjs` sends every report in the background, so no tool call and no
reply waits on Keep. What it reads, what it sends and when it runs are stated below.

Claude Code also runs the prompt hooks on turns it starts itself (a scheduled task, a
background subagent reporting back, a message from another session). Its hook details do
not distinguish those turns, so Keep counts them as prompts, and the presence while assistants
work that follows them is suggested as user time. This is a known limit: Claude Code does not
state who started a turn, so the plugin cannot mark such a turn. Keep accepts a prompt marked as started
by a schedule and counts it as assistant time only. The person modifies such a suggestion
when they confirm their time.

### What the plugin runs, reads and sends in Claude Code

In Claude Code only, the plugin declares hooks: handlers that Claude Code runs at fixed events
of a session. They are declared in `hooks/claude-code.json`, and the three scripts they run are
in `scripts/`. Before a plugin is installed, Claude Code may list the hooks it adds in the
plugin's details. Only the Claude manifest, `.claude-plugin/plugin.json`, names the hooks file;
the manifests in the Agent Plugins, Codex and Cursor formats name none, and the packages built
for the OpenAI directory and for Cursor contain neither the hooks nor the scripts. The hooks are written
for Claude Code and verified there only; an assistant that reads Claude's plugin format may run
some of them.

#### Where it sends data

The plugin sends data to two addresses, both on the host of the Keep connector,
`mcp.hykeep.app`, and to no other address:

- `https://mcp.hykeep.app/mcp`, the Keep connector. The one hook of type `mcp_tool`,
  `connection_status`, calls Keep there through the plugin's own connection, under the sign-in
  you completed in Claude Code. Claude Code makes this call; the plugin's scripts do not.
- `https://mcp.hykeep.app/plugin/events`. The script `usage.mjs` sends every report there
  directly, by HTTPS `POST`, outside the MCP connection, in batches of at most 100 events and
  64 KB. It derives the address from the connector's address in the plugin's `.mcp.json`
  (`endpointFrom` in `usage.mjs`), sends nothing when that address does not use HTTPS, and
  never follows a redirect to another address. Each
  request carries the session's identifier and the session's report code, described below, and
  no credential of yours.

The shell scripts `session-check.sh` and `active.sh` make no network request.

#### The hooks, event by event

Claude Code passes each hook the details of its event as JSON. The `mcp_tool` hook sends
exactly the fields listed in `hooks/claude-code.json`, filled from those details. Each script
receives the details on its standard input, and they include, according to the event, the
text of the prompt (`prompt`, on each prompt), the input of the tool (`tool_input`: before and
after a tool call, the questions of the question dialog and the plan to approve), the result of
the tool (`tool_response`, after a tool call), the text of the notification (`message`) and the
text of the final reply (`last_assistant_message`, at the end of a reply and when a subagent
finishes). The scripts extract only the fields named below, and send or store none of the
others.

**One hook holds the prompt.** On each prompt you submit (`UserPromptSubmit`), Claude Code waits
for one hook that reaches Keep, `connection_status`, through the connector. It sends
`session_id`, `format`, `plugin_version` (the version of the installed plugin) and `client`
(`claude-code`). Keep answers it from its own store of connections and sessions, without a
request to the workspace's database. Claude Code displays "Verifying the Keep connection" while
it runs, and its time limit is 10 seconds, so that a connection that Claude Code re-establishes
after an idle period completes the call. Keep returns, once per session, the connection
statement and, when a newer version of the plugin is published, the out-of-date statement,
and, until the plugin has used it, the session's report code; Claude Code adds them to the
assistant's context. When time of yours from the session is awaiting confirmation, it also returns a
message that Claude Code displays to you and does not add to the assistant's context.

**Every other hook runs in the background**, except two that Claude Code waits for:

- on each prompt, `session-check.sh`, which Claude Code also waits for, with a time limit of
  3 seconds. It reads the session's identifier and working directory, and the first 4 KB of the
  nearest `.keep.json`, from the working directory up to the root of the repository, for its
  `workspace` and `project`. At the first prompt of a session, it records the session in the
  plugin's data folder and adds a fixed instruction to the assistant's context, quoted below.
  At every later prompt of the session it adds nothing. It sends nothing;
- at the end of the session, `usage.mjs`, for at most 2 seconds: it saves the session's last
  event and starts a separate process to send it, so that the exit does not wait on Keep.

`usage.mjs` runs at these events, in the background with a time limit of 5 seconds, except at
the end of the session, as stated above. At each, it first saves the events named below in the session's spool (see "What the plugin stores on your
computer"), and then sends the spool:

- **When the session starts** (`SessionStart`): it saves nothing, and sends what earlier
  sessions left in their spools while their report codes are valid (24 hours), and the
  session's own spool when the session is resumed.
- **On each prompt** (`UserPromptSubmit`): `person_prompt`, dated by the time on your computer
  at which you submitted the prompt.
- **Before each tool call** (`PreToolUse`): `tool_start`, which states that a tool has started,
  so that Keep counts the turn as active until the tool ends, and carries nothing of the tool:
  neither its name nor its input. It is sent at most once in 30 seconds during a turn.
- **Before Claude Code's question dialog or a plan to approve** (`PreToolUse` on
  `AskUserQuestion` and `ExitPlanMode`), and **when Claude Code notifies that it waits for you**
  (`Notification`, for a permission, an idle prompt or an input dialog): `awaiting_person`, sent
  immediately.
- **After each tool call** (`PostToolUse`): `active.sh`, in the background, reads the tool's
  name and the session's identifier, and starts `usage.mjs` with the same details at most once
  in 30 seconds, and always after an answer in the question dialog or the approval of a plan.
  `usage.mjs` saves `turn_active` at most once a minute and, after an answer in the question
  dialog, `person_answer`, dated by the time on your computer at which you answered. It
  sends the spool at most once in 30 seconds during a turn, and immediately after an answer.
- **When the assistant finishes its reply** (`Stop`): `turn_end`; `output_words`, the number of
  words of the reply; and, from the session's transcript, the token counts of each model not
  yet reported.
- **When a subagent starts** (`SubagentStart`): `subagent_start`, with `agent_id` and
  `agent_type`. This event is sent with the next report.
- **When a subagent finishes** (`SubagentStop`): `subagent_end`, with `agent_id`, and, from the
  subagent's own transcript, its token counts of each model, with its `agent_id`.
- **When the session ends** (`SessionEnd`): `session_end`, and, from the session's transcript, the
  token counts of each model that have not yet been reported, such as those of a reply whose run
  was stopped when Claude Code exited. The separate process sends the spool, for at most 10 seconds.

`usage.mjs` waits at most 3 seconds for Keep to answer one request. The plugin adds the
instruction and the statements quoted below to the assistant's context once per session.

#### What the scripts read

`usage.mjs` reads the lines that Claude Code has added to the session's transcript
(`transcript_path`) since the script's previous run and, when a subagent finishes, the lines
added to the subagent's transcript (`agent_transcript_path`); at most 16 MB in one run. From
those lines it takes only:

- the sentence that carries the report code, and only from the context that a prompt's hook
  added, with Keep's sentence beside it when the project does not accept token counts ("Token
  counts: not recorded."). A code anywhere else, in a prompt or a reply, is ignored;
- from each message of the assistant, its identifier, the model's name and its four token
  counts (input, output, cache read and cache creation), so that each message is counted once.

It takes nothing else from the transcript, and it never sends or stores the words of a prompt,
a reply, a tool call or a file. When the assistant finishes its reply, Claude Code passes the
reply's text to the script (`last_assistant_message`); the script counts its words and sends
only the number. After a tool call, Claude Code passes the call's details; `active.sh`
and `usage.mjs` use only the session's identifier and the tool's name.

`session-check.sh` reads only the session's identifier and working directory from the
details of the prompt, and the first 4 KB of the nearest `.keep.json`. `active.sh`
reads only the tool's name and the session's identifier. Neither reads the transcript.

#### What the reports to Keep contain

Every request that `usage.mjs` sends to `https://mcp.hykeep.app/plugin/events` carries
`session_id`, `code` and `events`, a list of at most 100 events. Each event carries `id`, an
identifier that the plugin creates and that Keep records once, so that an event sent again is
never counted twice; `seq`, its position in the session; `at`, the time of the event on your
computer; `event`, its name; and `args`, one of the following:

- for `usage`, the token counts of one model: `model`, and those of `input_tokens`,
  `output_tokens`, `cache_read_tokens` and `cache_creation_tokens` that are above zero, with
  `agent_id` for a subagent; or `output_words`, the number of words of the reply that ended the
  turn, with `at`;
- for `turn_active` (the turn is in progress, at most once a minute) and `awaiting_person` (the
  session waits for you), `at`;
- for `subagent_start`, `agent_id` and `agent_type`; for `subagent_end`, `agent_id`;
- for `tool_start`, nothing further: neither the tool's name nor its input;
- for `person_prompt`, `person_answer`, `turn_end` and `session_end`, nothing further. Keep dates a
  prompt or an answer by the event's `at` field, the time on your computer at which you submitted it,
  even when the event reaches Keep later. Keep refuses an event whose day falls in a week that is
  locked for you, a prompt or an answer included (`week_locked`). For that event, Keep records no
  assistant time, no token counts and no presence while assistants work, and retains only the
  record of your act.

It never sends the prompt, the reply, the question, the plan, the notification or any file.
An event leaves the spool only once Keep's answer accounts for it. When Keep cannot be reached,
the events remain in the spool and are sent at a later run. When Keep answers that it is
unavailable or that the request limit has been reached, the script sends nothing until the time Keep
states (`Retry-After`), or for an interval that doubles from 5 seconds up to 5 minutes. No line
of a transcript is counted twice.

#### Text that Keep adds to the session

The plugin adds four texts to the assistant's context, and one message that Claude Code displays
to you:

- At the first prompt of a session, the fixed instruction of `session-check.sh`, in
  which the script inserts only the session's identifier and, from `.keep.json`, the workspace
  and the project, each limited to letters, digits, periods, underscores and hyphens:

  > The Keep plugin verified the Keep connection at the first prompt of this session. If this
  > context contains a statement that begins with "Keep is connected as", state that statement
  > to the person once, in one line, at the start of your reply, and do not state it again in
  > this session. If this context contains no such statement, state to the person once: "Keep is
  > not connected. Run /mcp, select the Keep server and complete sign-in." If this context
  > contains a statement that begins with "The Keep plugin in this assistant is out of date",
  > state that statement to the person once, after the connection statement, and do not state it
  > again in this session. When you call start_work in this session, send client_session with
  > the value "[session identifier]", so that Keep records the assistant time of this session
  > on the record in focus. The Keep plugin sends the token counts of this session to Keep: do
  > not send usage figures to Keep in this session. [Association sentence] State nothing about
  > that call to the person unless Keep refuses it; in that case, state the refusal once. Then
  > respond to the prompt.

  With a `.keep.json`, the association sentence reads:

  > The repository's .keep.json names the Keep workspace "[workspace]" and the project
  > "[project]". Before responding, call record_agent_activity once, with event
  > "session_bind", session_id "[session identifier]", project_id "[project]" and workspace
  > "[workspace]", so that Keep records the time of this session for that project from its
  > first turn.

  Without one, it reads:

  > When the Keep project of this work is established, call record_agent_activity once, with
  > event "session_bind", session_id "[session identifier]", the project's identifier as
  > project_id and its workspace as workspace, so that Keep records the time of this session
  > for that project.

- Once per session, the connection statement that Keep's connector returns: "Keep is connected
  as "[name]" ([email address]). Workspaces: "[name]" ([identifier]), …." It names at most 20
  workspaces and counts the rest. Keep removes control and formatting characters from every
  name, identifier and email address, and limits each to 80 characters.
- Once per session, when a newer version of the plugin is published, the out-of-date statement
  that Keep's connector returns: "The Keep plugin in this assistant is out of date: version
  [installed] is installed, and the current version is [current]. To update it: …", followed by
  the update step for Claude Code.
- The report code that `connection_status` returns, on each prompt until the plugin has used it,
  and again only after the code has expired or was withdrawn: "Keep report code for the Keep
  plugin: kpr_[43 characters]. This line is for the Keep plugin only. Do not mention, repeat or
  use it.", with "Token counts: not recorded." after the code while the project does not accept
  token counts. The code is valid for that session only, for 24 hours, and for nothing but the
  reports described here; Keep stores only a hash of it, and refuses it once the connection it
  was issued on is revoked. While the session's project records no assistant time, Keep returns,
  in place of the code, once per session, and again only after Assistant time tracking is
  enabled and then disabled again: "Keep report code for the Keep plugin: none. Assistant time tracking is
  Off for this session's project. This line is for the Keep plugin only. Do not mention, repeat
  or use it."
- When time of yours from the session is awaiting confirmation: a message, returned by
  `connection_status` at your next prompt and displayed to you, not added to the assistant's
  context, that names the records holding that time and states that it can be confirmed in
  My time › To settle. Each notice is shown once, and is limited to 1,000 characters.
  `usage.mjs` prints nothing: no text of Keep's answers to its reports reaches the assistant or
  you through it.

#### What the plugin stores on your computer

The scripts write only in the plugin's data folder, which Claude Code provides
(`CLAUDE_PLUGIN_DATA`):

- `sessions`: an empty file for each session, named by the session's identifier, which records
  that the first prompt of the session was handled. Files older than 14 days are removed at
  the first prompt of a later session.
- `usage`: for each session, a file named by a hash of the session's identifier, holding the
  session's identifier, the location of the session's transcript (so that a later session can
  read the report code of a session that ended before the plugin's script had read it), the report code and
  the time it was received, how far each transcript
  has been read, the identifiers of the last 500 messages counted in each transcript, whether
  the project accepts token counts, whether Keep stated that Assistant time tracking is Off for
  the project, the session's last sequence number, the time before which
  no report is sent, and the spool: the
  events not yet accounted for by Keep, each with the fields stated under "What the reports to
  Keep contain". Each change is written in full to a new file that then replaces the previous
  one, so that the file is never left half-written. While another run of the script holds the
  session's file, an event is saved as a file of its own in a folder named by the same hash
  with the extension `.inbox`, and moved into the spool at the next run. The folder also holds,
  for each session, a file holding the time in seconds at which `usage.mjs` last ran after a
  tool call, and short-lived lock folders, each holding the identifier of the process that
  holds the lock and a random value that only that process uses to release it. The folder and
  its subfolders are readable by your user only (mode 0700), and every file the script writes
  is readable and writable by your user only (mode 0600).
- Retention: the spool holds at most 2,000 events, and removes the oldest events first, the
  reports of your prompts and answers last; an event older than 7 days, which Keep would no
  longer accept, is removed; files unchanged for 14 days are removed when a later session first
  reports.

Without a report code, the events of a session remain in its spool, on your computer only, and
are sent once Keep issues the session a code; the token counts are not read until then.

**Assistant time tracking: Off.** When Keep states that the session's project records no
assistant time, either in place of the report code (quoted above) or in its answer to a report,
the script deletes every event saved for the session, and never sends them, even if Assistant
time tracking is enabled again later. From then on, it keeps only the events of the latest
prompt, so that the turn in which Keep issues a new code is reported; an event saved before that
prompt is deleted. A code that is merely missing, or that Keep refuses for another reason, while
the project records its time, does not delete the events: they are sent with the next code.
When Keep answers a report with `time_off`, the script also deletes the events it saved before
Assistant time tracking was disabled and could not send while Keep could not be reached: Keep would
no longer record them.

The plugin stores no words of a prompt, a reply or a file.

#### When it runs

Claude Code runs every hook above at its event, in every session, while the plugin is installed
and enabled. `session-check.sh`, `connection_status` and the saving of events in the spool run
whatever the project's settings; Keep applies the project's settings to what it records.

`usage.mjs` reads the session's transcript at each of its runs, to find the report code. It
reads token counts, and sends any report to `https://mcp.hykeep.app/plugin/events`, only while
it holds a report code. Keep issues a code only while Assistant time tracking is On for the
session's project, in Configuration › Delivery standards › Time tracking, whatever the value of
Token counts, which is retained while Assistant time tracking is Off. Before the session's
project is known, Keep issues a code, and applies the project's settings when the reports
arrive. While Token counts is not Automatic, Keep states so beside the code, or in its answer to
a report, and the script reads and sends no token counts; the reports of your presence while assistants work continue.
Keep applies a change of the project's settings to each report it receives, and the script
resumes sending token counts only with the session's next report code. Keep refuses a code that
has expired or was withdrawn. The script then discards the code, keeps the events in the spool,
and sends them once Keep issues a new code, unless Keep states that the project records no
assistant time, as described under "What the plugin stores on your computer". The script needs Node.js; without it, no event is
saved or sent, and the assistant time is unaffected.

#### How to stop it

- **For a project.** A project manager or a workspace administrator, in Configuration ›
  Delivery standards › Time tracking, selects Off for Assistant time tracking. Keep then issues
  the plugin no report code and records no assistant time or token counts for sessions on that
  project, whatever the value of Token counts, whose stored value is retained. From the next
  report, Keep refuses the code a session holds, so `usage.mjs` stops reading token counts and
  sending reports, and deletes the events it saved for the session, as stated above. The connection hook and `session-check.sh` continue to run
  while the plugin is installed.
- **For you, in Claude Code.** Run `/plugin`, open the installed plugins, and disable or
  uninstall the Keep plugin; no hook of the plugin then runs, and the Keep connector that the
  plugin provides is removed with it. To keep Keep's tools without the plugin, add the connector
  and the skill as described under "The connector and the skill, without the plugin". Setting
  `"disableAllHooks": true` in Claude Code's settings disables the hooks of every plugin and
  leaves the Keep connector available; assistant time is then calculated from Keep's calls only.
  An organization can restrict hooks with `allowManagedHooksOnly`.

## Supported assistants and installation

The Keep plugin works with any AI assistant that connects to remote MCP servers. The steps
for each assistant, as they appear on its screens, are on My profile › Connections in Keep
and at [hykeep.app/connect](https://hykeep.app/connect).

| AI assistant | Preferred route | Alternative route |
|---|---|---|
| Claude, on the web and in the desktop app | The Keep plugin | The connector and the skill |
| Claude Code | The Keep plugin | The connector and the skill |
| Codex | The connector, then the Keep plugin for the skill | The connector and the skill |
| GitHub Copilot, in VS Code and the Copilot CLI | The Keep plugin | The connector and the skill |
| Cursor | The connector and the skill | None |
| Google Antigravity | The Keep plugin | The connector and the skill |
| Any other assistant that connects to remote MCP servers | The connector and the skill | None |

Every route installs the plugin from this repository, `reveriext/keep-plugin`: the
marketplace is `keep-plugin`, and the plugin is `keep`.

### Claude on the web and in the desktop app

1. Open **Customize**, then **Plugins**.
2. Select **Add**, then **Add marketplace**.
3. Paste `reveriext/keep-plugin` and confirm.
4. Enable **Sync automatically** for the marketplace.
5. On **Discover**, select **Keep**, then **Add**.
6. Open the plugin's **Connectors** tab. It states Keep's status:
   - **Not connected**: connect Keep from this tab, and sign in with your Keep account in the
     browser tab that opens.
   - **Not added**: add Keep from this tab, then connect it and sign in. A member who cannot add
     it asks an Owner to add it.
   - **Connected**: nothing further is required.

Adding the plugin does not add its connector to your account and does not sign you in: step 6
is required. On the Team and Enterprise plans, an Owner ensures once that Keep is on the
organization's list of connectors, from the plugin's **Connectors** tab or in Organization
settings › Connectors. Each member then connects it with their own Keep account. If Customize ›
Plugins has no Add marketplace option, ask your organization's Owner to allow members to add
marketplaces, or to install Keep for the organization.

### Claude Code

Run `/plugin`, add the marketplace `reveriext/keep-plugin` on **Marketplaces**, and install
Keep from **Discover** for your user. Then run `/mcp`, select **keep**, and sign in with your
Keep account. From a terminal:

```
claude plugin marketplace add reveriext/keep-plugin && claude plugin install keep@keep-plugin
```

### Codex

In Codex, the connector is added in Codex's settings, and the plugin adds the Keep skill.

1. In the Codex app, open **Settings** › **MCP servers** › **Add server**. Name: `keep`. Type:
   **Streamable HTTP**. URL: `https://mcp.hykeep.app/mcp`. Save, select **Restart**, then
   **Authenticate**, and sign in with your Keep account.
2. Add the plugin's marketplace from a terminal with the command below. Restart the Codex
   app, open **Plugins**, choose the **keep-plugin** marketplace, and select **+** beside Keep.

```
codex plugin marketplace add reveriext/keep-plugin
```

From a terminal only, the plugin is added with `codex plugin add keep@keep-plugin`, and the
connector is signed in with `codex mcp login keep`.

After an update of the plugin, sign in to Keep again (**Settings** › **MCP servers** ›
**Authenticate**) and start a new session.

### Copilot: VS Code and the command line

In VS Code, open the Command Palette and run **Chat: Open Customizations**. Select **Browse**,
open the source menu, then **Configure Marketplaces** › **Add Marketplace**, and paste
`reveriext/keep-plugin`. Select **Install** beside Keep, accept the trust prompt, and sign in
with your Keep account when the connector asks. In VS Code, plugins require the setting
`chat.plugins.enabled`. With the GitHub Copilot CLI:

```
copilot plugin marketplace add reveriext/keep-plugin && copilot plugin install keep@keep-plugin
```

On Copilot Business and Enterprise, an organization owner enables "MCP servers in Copilot"
and leaves "Restrict MCP access to registry servers" at "Allow all".

### Cursor

On My profile › Connections in Keep, select **Add to Cursor** and confirm the installation in
Cursor. Then select **Connect** beside Keep, and sign in with your Keep account. Add the Keep
skill to Cursor's skills folder, as described below.

### Google Antigravity

Install the plugin with `agy plugin install https://github.com/reveriext/keep-plugin`. It adds the
Keep skill and the connector, which Antigravity reads from the plugin's `mcp_config.json`. Then
sign in with your Keep account when Antigravity asks: in the Antigravity app, select
**Authenticate** beside Keep, sign in through the browser, and paste the code into **Enter
authorization code**.

### The connector and the skill, without the plugin

1. **Connect Keep.** Add a remote MCP server with this address. It is a Streamable HTTP
   server; a browser tab opens, and you sign in with your Keep account. No key is needed.

   ```
   https://mcp.hykeep.app/mcp
   ```

2. **Add the Keep skill.** The skill is the folder `skills/keep/` in this package (a
   `SKILL.md` and its `references/`), in the Agent Skills format. Add it wherever your
   assistant keeps skills, as the folder or as a ZIP of it. The same ZIP is available for
   download on My profile › Connections in Keep.

## Sign-in and access

- **No key.** The connector signs in through an authorization flow: a browser tab opens, and
  you sign in with your Keep account. The plugin carries no key, token or other credential.
- **Your own access.** The assistant acts as the person who signed in, within that person's
  workspace membership, workspace role and project roles. Connecting an AI assistant does not
  make it a workspace administrator; its requests remain subject to the user's permissions.
- **Verified on each request.** Keep checks current workspace membership on each AI assistant
  request. Each connection is listed on My profile › Connections, and revoking it there removes
  its access to every workspace immediately.
- **Your confirmation.** The skill instructs the assistant to ask before anything that cannot
  be taken back, and to present to you every confirmation request that Keep returns.

## Security and privacy

Each Keep workspace is provisioned with its own Cloudflare D1 database, R2 storage bucket and
workspace Worker. Authorized tools can return project information to your connected AI assistant.
That provider's handling of the returned data is governed by your settings and agreement with
it.

The plugin's hooks are written for Claude Code. There, they send the events and figures
stated under "What the plugin runs, reads and sends in Claude Code", to the Keep connector and
to `https://mcp.hykeep.app/plugin/events` only, and never your prompt, the assistant's reply or
any file.

- [Trust and security](https://hykeep.app/trust)
- [Privacy Policy](https://hykeep.app/privacy)
- [Terms of Service](https://hykeep.app/terms)
- [Data Processing Agreement](https://hykeep.app/dpa)

## Updates and versions

The plugin's version is the version of the Keep release it accompanies, and the
[CHANGELOG](CHANGELOG.md) states what each version changed.

**Automatic updates in Claude Code.** When the installed version is out of date, Keep states
so once per session in Claude Code, with the update step. Claude Code installs a new version of the Keep plugin
automatically only when automatic updates are enabled for the marketplace it came from. They
are disabled for a marketplace you add yourself. Enable them once: run `/plugin`, open
**Marketplaces**, select **keep-plugin** and enable automatic updates. A new version
takes effect in the next session, or after `/reload-plugins`. An organization can enable
the same setting for its members with `autoUpdate: true` on the marketplace's
`extraKnownMarketplaces` entry in a Claude Code settings file.

**Automatic updates in Claude on the web and in the desktop app.** Enable **Sync
automatically** for the marketplace; otherwise select **Check for updates**.

## Support

For questions about your Keep workspace or connecting an AI assistant, contact
[support@hykeep.app](mailto:support@hykeep.app); for invoices, plans and add-ons, contact
[billing@hykeep.app](mailto:billing@hykeep.app). A person reads every email, Monday to Friday,
and replies within one business day. Include the workspace name, what you were trying to do,
and any error message. Keep passwords, access tokens and sensitive project content out of
your email.

## What is in the package

| Folder or file | Contents |
|---|---|
| `plugin.json`, `mcp.json` | The plugin's manifest and its connector, in the open Agent Plugins 1.0.0 format, with the `com.openai` interface block that Codex reads |
| `.claude-plugin` | The Claude plugin manifest, a plugin marketplace of this one plugin, and the plugin's icon |
| `.codex-plugin`, `.mcp.json` | The Codex plugin manifest, and the connector in the form Claude and Codex read |
| `.cursor-plugin` | The Cursor plugin manifest, which names the skill, the connector in `mcp.json` and the logo, and no hooks |
| `mcp_config.json` | The connector in the form Google Antigravity reads |
| `skills` | The Keep skill: the folder `keep`, with its `SKILL.md` and the reference files in `references` |
| `hooks` | The Claude Code hooks file, `claude-code.json` |
| `scripts` | The scripts the Claude Code hooks run: `session-check.sh`, `active.sh` and `usage.mjs` |
| `assets` | Keep's mark, as the icon and the logo the assistants display |
| `README.md`, `CHANGELOG.md`, `LICENSE`, `NOTICE` | This page, the changes in each version, the license (Apache 2.0) and its notice |

## License

The Keep plugin is licensed under the [Apache License, Version 2.0](LICENSE). Copyright
2026 Reveriext Inc. The license covers this package only: it grants no right to the Keep
service, whose use is governed by the [Terms of Service](https://hykeep.app/terms) and
requires a Keep account, and no permission to use the Keep name or logo, as [NOTICE](NOTICE)
states.
