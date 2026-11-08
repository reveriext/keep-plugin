# Changelog

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
