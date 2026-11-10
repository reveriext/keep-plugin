# Changelog

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
