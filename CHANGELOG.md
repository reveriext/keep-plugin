# Changelog

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
- The Claude plugin carries Keep's mark as its icon (`.claude-plugin/icon.png`).
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
