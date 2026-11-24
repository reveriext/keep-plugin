# Changelog

## 3.5.0

- Claude Code: the prompt waits for one hook that reaches Keep, `connection_status`, which Keep
  answers from its own store, without a request to the workspace's database. Its time limit is
  10 seconds, so that a connection that Claude Code re-establishes after an idle period
  completes the call, and Claude Code displays "Verifying the Keep connection" while it runs.
  The hooks that called `record_agent_activity` at each prompt, answer, reply, subagent and
  session end are removed, so that no prompt and no reply waits on the report of an event, and
  no event is reported twice.
- Claude Code: `usage.mjs` is the one reporter of the session's activity. It saves each event,
  with an identifier, the time on your computer and the event's position in the session, in a
  spool in the plugin's data folder before it sends it, and it sends the spool in batches of at
  most 100 events and 64 KB to `https://mcp.hykeep.app/plugin/events`: at the end of each reply,
  at the next prompt, and at most every 30 seconds during a long turn. An event leaves the spool
  only once Keep's answer accounts for it, and Keep records each identifier once, so an event
  is never lost when Claude Code stops or the network is interrupted, and never counted twice
  when it is sent again. The script waits as Keep asks (`Retry-After`) when Keep is unavailable,
  keeps the events when Keep refuses the session's report code and sends them with the next
  code, sends at the end of a session from a separate process so that the exit does not wait,
  and at each session's start sends what earlier sessions left. The first prompt of a session,
  before Keep has issued the report code, is now reported with the time on your computer. The
  spool holds at most 2,000 events, and an event older than 7 days is removed.
- Claude Code: while Keep states that the session's project records no assistant time
  (Assistant time tracking: Off), the plugin deletes the events it saved for the session and
  never sends them, even if Assistant time tracking is enabled again later; only the turn in
  which Keep issues a new code is reported. A code that is merely missing or refused while the
  project records its time keeps the events for the next code.
- Claude Code: a notice for you, such as time of yours awaiting confirmation, is shown to you
  once by the connection verification hook (`connection_status`) at your next prompt, as a
  message Claude Code displays and does not add to the assistant's context. `usage.mjs` prints nothing: no text of Keep's answers
  reaches the assistant through it.
- Claude Code: the plugin reports the start of each tool call (`tool_start`), with neither the
  tool's name nor its input, so that Keep counts the turn as active while a tool runs, for
  at most four hours; the report after the tool call marks its end.
- Claude Code: the plugin's data folder and its files are readable by your user only, and
  `usage.mjs` never follows a redirect.
- The package carries the Cursor plugin manifest, `.cursor-plugin/plugin.json`, beside the
  Claude and Codex manifests. It is generated from `plugin.json`, and names the Keep skill, the
  connector in `mcp.json` and Keep's logo, and no hooks: Cursor runs none of the Claude Code
  scripts.
- The README states in full what the plugin runs, reads and sends in Claude Code: the hooks
- The skill states the GitHub offer: on a project with no repository connected, the first
  `checkpoint_work`, `pause_work` or `stop_work` that records commits carries an `offer`, which
  the assistant relays to the person once. Keep makes it once per person per project.
- The README states in full what the plugin runs, reads and sends in Claude Code: the four hooks
  that run on each prompt and the hooks of every other event, with the fields each one sends;
  the two addresses it sends to, the Keep connector and `https://mcp.hykeep.app/plugin/events`,
  which `usage.mjs` reaches directly over HTTPS; what the scripts read from the session's
  transcript (the sentence that carries the report code, and each message's model and token
  counts) and that they never send or store the words of a prompt, a reply or a file; every
  report the script sends, including the time on your computer of each prompt and answer and the
  number of words in each reply; the texts that Keep adds to the assistant's context, quoted;
  what the plugin stores in its data folder, and for how long; when each part runs; and how a
  project, or a person, stops it.
- Claude Code: the token-count script removes the session records in its data folder that have
  been unchanged for 14 days when a new session first reports. It previously removed them only
  in a case that did not occur, so the records of earlier sessions remained.
- The plugin's publisher is named Reveriext Inc. in the manifests, the license and the README.
- The plugin is licensed under the Apache License, Version 2.0, in the file `LICENSE`, and the
  package carries a `NOTICE` file. The license covers this package only: it grants no right to the
  Keep service, whose use is governed by the Keep Terms of Service, and no permission to use the
  Keep name or logo.
- The README and the setup guide state that Keep issues a report code only while Assistant time
  tracking is On for the session's project, whatever the value of Token counts, and that selecting
  Off for Assistant time tracking stops the plugin's reports for that project.
- The package carries `mcp_config.json`, the connector in the form Google Antigravity reads
  (`serverUrl`, at the same address as `.mcp.json`), so that `agy plugin install` adds the Keep
  connector with the Keep skill. The README states the installation in Google Antigravity, and the
  Claude steps in their current order: the plugin first, then the status on the plugin's
  Connectors tab.
- The Claude manifest names Keep's mark as its `icon` and carries the links to the Terms of Service, the support page and the setup guide.
  The icon and the logo in the package are 512 px. The Codex listing adds a long description
  and the support page. The README states what Keep is, what the plugin provides, the installation in each
  assistant, sign-in and access, security and privacy, updates, support and the license.
- The skill states the assistant's role: it manages the project's record and assists the person
  in delivering the work, with the person's own access, and it never calls itself the project
  manager. A new reference, `project-management.md`, states the access the assistant acts within
  (the workspace role, the project role and the manager capability, membership, vaults and the
  features of the plan), the Keep capability that serves each need across the delivery cycle,
  and the sequences of calls for orienting the person, the project review, planning a cycle,
  decomposing a requirement, modules and the handover. At the start of work the assistant gives
  one line naming what needs attention in the person's own records, and conducts the full
  project review only on request.
- The time reference states the time model as Keep implements it: Person time tracking Simple,
  Advanced and Off, and the time controls under Advanced only; the precedence of a manual entry;
  the time that awaits the person's decision and `allocate_time`; a workspace administrator's
  correction of a locked week; meeting attendance; and who reads whose time.
- The references state the methods of the record as Keep enforces them: a cancellation states
  whether the work was dropped or replaced; a requirement is decomposed into tasks, its delivery
  traced from `get_thread` and its acceptance verified on evidence; a module is retired only when
  the records filed in it are settled; a cycle is planned from its goal, its dates and the
  estimates of its tasks, with no capacity claim; unfinished work moves with a reason written in a
  reply on the task; and a release is closed with its deployment task Done, its release tag (the
  version, the git tag and the bundle), its release notes written as its completion note, every
  requirement targeted at it settled and a `supersedes` link to the release it replaces.
- The skill orders the start of work so that the project review reads the records before
  `start_work`, which records activity and clears a task's inactivity flag, and the review names
  an open task in a closed cycle. It states the shape of `patch.definition_of_done` (the whole
  list, each item `done`, `na` with a reason, or `open`, with its evidence), what to do for a task
  that names no requirement, that new scope is a new task, how a commit made without the record's
  code is recorded, how a session with no user time suggested is closed, and that the `summary`
  and `next` of a session are never invented.
- Claude Code: the plugin reports the time on your device at which you submitted each prompt
  and each answer in the question dialog, so that the recorded time of your own acts is the time
  at which you acted. Keep uses it when it is within five minutes of the time Keep received the
  report, and otherwise uses the time received; the act records which was used. The first
  prompt of a session, before Keep has issued the report code, is dated by the time Keep
  received it. These reports run in the background and never send the content of the prompt or
  the answer.
- The skill and its records reference instruct the assistant to change a text on the version it
  read. It reads `updated_at` with `get_thread`, sends it as `expected_updated_at` on
  `update_thread`, `update_thread_detail` (a bug's steps, expected result and actual result,
  a question's answer, a cycle's goal), `update_requirement`, `amend_requirement`, `apply_change_request` and
  `update_artifact`, and adopts the `updated_at` each call returns for its next save. Keep
  refuses a save when the same field was changed after that version, names the field and who
  changed it, and writes nothing; the assistant then reads the record again and saves on the
  current text.
- The skill and its ways-of-working reference instruct the assistant to propose a due date
  when it starts work on a task that has none, or opens a task into a cycle or directly in In progress, to record the date the person gives, and never to choose one. The project's new
  control "A due date on an active task" (Off, Ask or Required; Ask by default) makes Keep
  request it: `start_work` returns `due_date_request`, a move to In progress returns the
  request, and at Required the move, or a task opened into a cycle or directly in In progress, is refused
  until a due date is recorded.
- Claude Code: the plugin reports your presence while the assistant works, so that Keep can
  suggest your time while your assistants work. When the assistant finishes its reply, it
  sends the number of words in the reply; after the assistant uses a tool, that the turn is
  in progress, at most once a minute; before a question or a plan to approve, and when Claude
  Code notifies that it waits for you, that the session waits for you. These reports run in
  the background and never send what was written.
- Claude Code: Keep records the time of a session for its project from the first turn,
  whether or not a record is in focus. At the first prompt of a session, the plugin reads
  the workspace and the project from the repository's `.keep.json`, and the assistant
  associates the session with that project once, through `record_agent_activity`. Without a
  `.keep.json`, the assistant associates the session with its project once the project of
  the work is established.
- Claude Code: an answer to a question the assistant asks in Claude Code's question dialog
  is reported to Keep, as a prompt is. The plugin's hooks report when the person prompts or
  answers, and never what the person wrote.
- The person's time is only suggested. The person's time in a session that reached no record is
  suggested as one entry on the project, and awaits the person's decision in My time › To
  settle. Keep never confirms it on the person's behalf.
- The time reference states that every minute of user time carries its source (own acts, presence
  while assistants work, or manual), that Keep shows the sources separately and never adds assistant time
  into user time, that a minute shared by several sessions is allocated to one and is not measured, and
  that a write to a locked week is refused with `week_locked`.
- The skill, its references and this README name the assistant's work "assistant time", the
  term every Keep screen uses, in place of "agent time".
- Reports in your assistant: for a person who manages a project, the assistant prepares the
  project report, the Time report, the decision log and the risk register through
  `get_report`. Keep returns each report's sections in order, with a rule for each, Keep's
  own figures and named records for the period, its notes and a link to the report in Keep.
  The assistant writes each section in order, uses every figure exactly as returned and
  states no other figure. A member is offered their own time. The new reference file
  `references/reports.md` holds the method; a permanent copy inside Keep remains Capture on
  the report in Keep.
- The time reference states that an unallocated assistant run is retained as project time, on the
  person's word, with `allocate_time { segment_id, retain: true }`, as My time › To settle does:
  only the person who directed the run retains it, and only once.
- The time reference states that `update_time_entry` takes `period`, the value that My time ›
  To settle or `list_time_entries` names, to confirm the split Keep calculated for a period too
  large to edit, and that an answer confirming only part of the split asks for a further call
  with `period` set to the group identifier it names.
- The ways-of-working reference states that a change of the Idle limit applies to sessions that
  start after it, and that a session already open retains the limit in effect when it started.

## 3.4.1

- The Keep plugin carries the version of the Keep release it ships with, from this release.
- Closing a task: before a move to Review or Done, the assistant always calls `stop_work`
  with `preview: true`, shows the person the time (user time suggested, agent time, any
  overlap and its suggested split) and waits for the answer before it moves the task.
- Claude Code: when a turn or the session ends with time of yours from this session
  awaiting confirmation, the plugin's hooks state it once, naming each task, for example
  "ABC-12 has 31m of your time from this session awaiting confirmation." The time awaits
  your decision in My time › To settle.
- The skill states the business rules (no record is completed while its children are open;
  the release rules) and presents every refusal, with its confirmation request (`ask`), to the person.
- `list_time_entries` with `to_settle: true` lists the time that awaits the person's
  decision.

## 1.10.0

- Claude Code: the connection verification at the first prompt of a session sends the plugin's
  version to Keep. When a newer version is published, Keep states once per session that
  the plugin is out of date, with the update step for the assistant in use, and the
  assistant states it to the person after the connection statement.

## 1.9.2

- Closing a task: an answer to a preview always carries `snapshot`. When it does not, the
  task moved: the assistant states that to the person and moves the task back with
  `transition_thread`. A move to Review or Done over the connector answers `moved: true`,
  and, when the call carries no `client_session`, a note that the move was applied. The
  assistant sends the preview's `client_session` on the close as well.

## 1.9.1

- The Definition of Done: Keep marks the items it can establish from the record (the
  requirement, the deliverable, the time and the work-session summary). The assistant marks
  the other items on evidence, citing it in `evidence`, and asks the person only for an item
  it cannot establish.
- Closing a task: before a move to Done, the assistant calls `transition_thread` with
  `preview: true` and shows the person one snapshot (the Definition of Done, the deliverable,
  the time and the suggested reviewer) as a form or as its text, then closes it. The person
  may authorize the assistant to close the rest of the session's tasks without a snapshot.
- The reviewer is a suggestion: the owner of the task's requirement, or else its creator.
  It never stops a move, and a single-owner project moves to Done with no review request.
  The review ownership confirmation is removed.

## 1.9.0

- Claude Code: the report code for token counts arrives once per session, not at each
  prompt, and only while the project's token counts are Automatic. Without a code the
  usage script reads none of the transcript's token counts and sends nothing. The hooks
  wait at most 3 seconds (2 for a subagent).

- Claude Code: the plugin verifies the Keep connection at the first prompt of each session, and
  the assistant states the result once. When Keep is connected, it states the person, their
  email address and their workspaces. When it is not, it states the one step to restore it:
  "Run /mcp, select the Keep server and complete sign-in." This is the plugin's first hook
  (`hooks/claude-code.json`, named by `.claude-plugin/plugin.json`): a call to Keep's
  `connection_status` tool through the plugin's own connection, and a short shell script that
  records each session so the result is stated once. Codex and the open format receive no
  hooks.
- The skill states, for each assistant, the one step that restores the connection when a Keep
  call fails because Keep is not connected, and what to do when Claude lists Keep twice
  (`references/connection.md`).
- Automatic updates: Claude Code installs new versions automatically only when automatic
  updates are enabled for the plugin's marketplace. The README and the skill give the step.
- Claude Code: the plugin measures agent time. Hooks on each prompt, each end of a reply,
  each subagent's start and stop, and the end of the session call Keep's
  `record_agent_activity` tool through the plugin's own connection, with the session's
  identifier (and the subagent's identifier and type). Keep counts each turn in full and
  each subagent as its own run, on the record in focus. The connector sends each report to
  the workspace in which the session started work, or to the person's only workspace;
  otherwise it retains the reports, for up to seven days, until the session starts work, and
  then records them there in order.
- Claude Code: the plugin sends token counts. A script, `usage.mjs`, run in the
  background when a reply or a subagent finishes, adds up the tokens of each model in the
  transcript lines written since its previous run and sends the totals to Keep, authorised
  by a report code that Keep returns once per session, valid for that session and for token
  counts only. The assistant is told not to send usage figures itself in such a session.
- The first prompt of each session also gives the assistant the session's identifier, which
  it sends as `client_session` to `start_work`.
- Time in the skill: agent time is calculated and never asked of the person; user time is
  suggested, and the person confirms or modifies it. The assistant no longer asks the person
  for a figure for a work session. The skill states that agent time and token counts are
  provisional estimates, calculated from the recorded compute and the data available.

## 1.8.3

- Codex: the plugin is also packaged in Codex's own format (`.codex-plugin/plugin.json`, which names
  the skills and the connector in `.mcp.json`), so Codex associates the Keep connector with the plugin
  and gives its tools to the chat. Claude reads the connector from `.mcp.json` as well.

## 1.8.2

- Codex loads the Keep connector again. The `com.openai` sign-in block added to `mcp.json` in 1.8.0
  is not accepted by Codex's plugin loader, which dropped the server; it is removed, and Codex selects
  its sign-in method itself.

## 1.8.1

- Codex shows Keep's name, description and logo: the manifest carries the `com.openai`
  interface block, with the logo and icon in `assets/`.

## 1.8.0

- Codex: the connector requests dynamic client registration. (Removed in 1.8.2: Codex does not
  accept this field and dropped the connector.)
- Approval by role: `record_decision`, `publish_update` and `share_artifact` take effect
  immediately for a project manager, the project owner or a workspace administrator, and are staged in the
  Queue for a member. A project manager may ask for a draft: `record_decision` with
  `status: "proposed"` records a proposal (for anyone, as a proposal waits in the Queue to be
  decided), and `stage: true` places an update or a share link in the Queue.
- The same rule holds in the Keep application: a member's decision and share link are
  submitted for a project manager's approval. In Keep's own chat, a project manager's
  decision is recorded immediately, while updates and share links are always placed in the
  Queue, and the chat cannot approve or reject.
- `approve_run` and `reject_run` are decided by role, through any connected assistant or the
  Queue: a project manager approves a run an assistant staged, including one staged for
  them; a member is refused.
  `list_pending_approvals` reports `can_decide` for each run. This replaces the rule of
  1.6.0 that the person approves in the Queue.
- Deciding is a project manager's through every door: moving a decision to decided,
  revisited or superseded, modifying a decided decision, and publishing a draft update are
  refused for a member with `manager_required`.
- Review ownership: where no other member could review, the assistant presents the
  assignee's confirmation request and sends `review_ownership: true` with their answer.

## 1.7.0

- Project controls: every project has a level (Relaxed, Standard or Strict) that gives each
  control one value: Off, Ask or Required. Off is never mentioned, Ask is requested once, and a
  Required control refuses the move until it is satisfied. At Relaxed, every control is Off
  or Ask. `references/ways-of-working.md` describes the levels, the controls and the
  refusal.
- `start_work` returns a `protocol` block: the project's level, its Required and Ask
  controls with their meanings, the Definition of Done, and the record's requirement (with
  its acceptance criteria), module, cycle, linked artifacts and open questions. The skill
  says to state the rules in one line and to read the linked artifacts.
- The deliverable: what a task's work produced, as code, an artifact, a link or a written
  outcome. While a task has none, the first `checkpoint_work` of a work session and the
  preview of `pause_work` or `stop_work` carry a `reminder` that requests one, as the
  project's controls specify.
- Acceptance criteria are written as a top-level list, one criterion per item. Whoever
  verifies the requirement marks each one met or not met, by its key, and only on evidence.
- A refusal that carries a confirmation request is presented to the person, and the
  assistant never answers it itself.
- The skill's new reference file, `activities.md`, gives the method for each activity, from
  submitting a request to communicating outcomes.

## 1.6.0

- Code Mode: a connection in Code Mode lists `get_skill`, `code`, `use_tool` and
  `request_form`. `code` runs one script that calls Keep's tools as `keep.<tool>(args)`, up
  to 40 calls and 30 seconds, with no network; `use_tool` calls one tool directly. Every
  call inside a script is an ordinary Keep call, with the same access, audit and time
  tracking. Approvals, deletions and restores, archiving and converting artifacts,
  decisions, publishing, sharing, change requests, member removals and role changes, and
  forms are never in a script: each is its own `use_tool` call, after the person agrees.
  The skill's new reference file, `code-mode.md`, says how to work.
- `get_skill`: the connector returns this skill and its reference files, in every mode.
- The Tools setting: the person chooses for each connection, on My profile › Connections,
  between Automatic (chat assistants get Code Mode, coding agents every tool), Code Mode
  and All tools. A change applies from the assistant's next request.
- Approvals are the person's: Keep refuses `approve_run` on what an assistant staged, so an
  assistant cannot approve what it put in the Queue. The skill says to tell the person it
  waits there.

## 1.5.0

- Time: `checkpoint_work`, `pause_work` and `stop_work` take an optional `usage` (the model,
  the token counts and the person's active seconds). The skill says to pass it only when the
  client exposes those figures, and never to invent them. Tokens are recorded as indicative.
- Time: `start_work` takes `also_thread_ids`, to name several records that one change
  serves; they share the time equally.
- Time: concurrent records are asked together at pause or stop, with the limit stated, and
  `allocation` carries the person's figures for each of them.

## 1.4.0

- Feedback: `reply_to_thread` takes `for_reporter`, which shows a reply to the reporter of a
  feedback record who logged in through the site widget.
- Comments: `reply_to_thread` takes `audience`. A comment is Internal unless it says
  `customer`, and `get_thread` says `customer_shared`.

## 1.3.0

- The Claude plugin: the same connector and skill in Claude's plugin layout, in
  `.claude-plugin/`. The package is also a plugin marketplace of one plugin, so Claude Code
  installs Keep in one step.
- The Claude plugin carries Keep's mark as its icon.
- The package names its repository and carries its licence: proprietary, all rights
  reserved (`LICENSE`).

## 1.2.0

- Reading code: `get_commit_changes` returns the files and diff of a record's commits, and
  `read_repo_file` returns a file's text, when the workspace has the GitHub app and the
  repository is connected to the project.

## 1.1.0

- Work sessions: each commit passed to `checkpoint_work`, `pause_work` or `stop_work`
  carries its `repo` (`owner/name`), and goes on the record's Development tab, checked
  with GitHub when the workspace has the GitHub app.

## 1.0.0

- The first release: the Keep connector and the `keep` skill in one package, in the Agent
  Plugins 1.0.0 format.
