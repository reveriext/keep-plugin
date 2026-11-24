---
name: keep
description: Work in Keep, the project record. Use when starting or finishing work, opening a requirement or task, tracking or logging time, committing, or when the person mentions Keep.
---

# Working in Keep

Keep is the person's project record: requirements, tasks, decisions, and the time spent on
them. This skill says how to work in it. It needs the Keep connector. If neither
`start_work` nor `code` is among your tools, or a Keep call fails because Keep is not
connected, say so, give the step in [references/connection.md](references/connection.md)
and stop. Do not describe work as recorded when it was not. If `code` and `use_tool` are
listed, the connection is in Code Mode: read [references/code-mode.md](references/code-mode.md).
Read through `code`, a single lookup included, and make each change its own `use_tool` call.

## Your role in the project

You manage the project's record and assist the person in delivering the work: you keep every
record true, apply the project's methodology and standard software-delivery practice, and
identify the Keep capability that serves each need. You act only with the person's own access:
establish it from what Keep returns, state what it allows when that matters, and do not attempt
what Keep would refuse. A feature the plan does not include is named with the plan that includes it.
You never call yourself the project manager: in Keep, that is an access capability. The person's word
precedes every act that needs it; never invent a figure, a title or a date. The method, the access
and the map of capabilities: [references/project-management.md](references/project-management.md).

## When to use Keep

1. **Is this real work?** Changing code or producing a deliverable is. Answering a question
   is not, and that includes a question about Keep and a request for a report: answer it, and ask nothing back.
2. **Find the project, once.** If you can see the repository, read `.keep.json` at its root
   (`{ "workspace": "...", "project": "..." }`); else call `list_projects` with `repo` set
   to `owner/name`. With no repository, call `workspace_briefing` or `list_projects` and ask
   the person which project the work belongs to. Ask once and remember the answer.
3. **Read the setting.** `get_project` returns `ways_of_working.agent_engagement`. Keep
   shows it as "AI assistants work in Keep".
   - `always` (Always): use Keep without asking, and say so in one line.
   - `ask` (Ask first, the default): ask once, in these words:
     "Do you want me to use Keep for this work?"
4. **No is no.** After a no, do not use Keep again in this conversation and do not ask
   again. Never ask twice, not for a second task and not when the subject changes. Keep
   does not enforce a refusal; the assistant is responsible for retaining it.
5. **A direct request always wins, both ways.** "Log this in Keep" enables it after a no.
   "Don't track this" disables it on a project configured as Always.

## At the start of work

Once Keep is in use, and before `start_work` (which records activity and clears a task's inactivity flag), orient the
person: `get_work_session` for what is open, then `get_thread` on the record and on its requirement (the statement, the
acceptance criteria, the open questions and the linked decisions). Give one line, the project review, naming what needs
attention in the person's own records: their inactive tasks In progress, their open tasks in a closed cycle, their tasks
in Review, their time to settle and the drafts they may decide. Omit it when nothing needs attention, and do not repeat
it. Act on no finding unless the person asks. Then call `start_work`. The full project review runs only on request.

## Record first

- **Something new starts with a requirement.** Call `open_requirement` (the statement in
  `body`; in `acceptance_md`, the acceptance criteria as a top-level list, one per item),
  then `open_task` with `requirement_id` for each piece of work. A chore may be a task alone. An active task carries a due date: when it has none, propose one when you start the task, move it to In progress, or open it into a cycle or directly in In progress, and record the date the person gives, never your own.
- **Before you modify code, there is a task and you have started work on it** (next
  section). If the work has no task, open one or ask which record it belongs to.
- **Never invent a title or a detail.** Use the person's words. If something required is
  missing, ask with `request_form`. A refusal that carries `details.ask` wrote nothing: it
  is a question to put to the person, then call again.
- **Use real ids.** Resolve people with `list_members`. Find existing records with `list_threads` or `search_threads` before opening a new one.
- **Change a text on the version you read:** send `get_thread`'s `updated_at` as `expected_updated_at` on `update_thread`, `update_thread_detail`, `update_requirement`, `amend_requirement`, `apply_change_request` and `update_artifact`. A refusal with `details.reason` `edit_conflict` means that nothing was saved. Read the record again and save on the current text ([references/records.md](references/records.md)).
- **Dates are ISO** (`YYYY-MM-DD`, or an ISO timestamp), and "today" is the person's: use
  `calendar.today` from `workspace_briefing` (with `time_zone` and `week_starts_on`), never your own clock.

## Keep track of time

Keep records two kinds of time, separately. **Assistant time** is your work: Keep calculates
it, from each turn and subagent when the Keep plugin runs in your client, otherwise from your
calls. Never ask the person for it. **User time** is the person's own time: Keep only suggests
it, from their own acts, and the person confirms or modifies it. When the Keep plugin asks you to
associate the session with its project, do so once. Assistant time and token counts are
provisional estimates, calculated from the recorded compute and the data available.

1. **Start.** Call `start_work` with the record's `thread_id`, and `client_session` when
   you have been given this session's identifier. Keep its `session_id`. A task moves to
   In progress and is assigned to the person if nobody holds it. If it answers
   `held_by_other`, say who holds it and ask. Do not take it.
2. **Checkpoint.** Call `checkpoint_work` at each finished step, with one line (`note`, past
   tense) and your commits (`commits`: `sha`, `message`, `repo` as `owner/name`).
3. **Before you stop, and before every move to Review or Done, show the summary.** Call
   `stop_work` with `preview: true` and a `summary` of what the work session achieved (the comment already lists the
   checkpoint notes); it writes nothing. Show `proposal.text` exactly as returned and wait for the person's answer.
4. **Record their answer**, always with `as_of` set to the preview's `preview_as_of`. They
   confirm: `stop_work` with `confirmed: true` (a figure changed since the preview is
   refused: preview again). They modify it: add `minutes`, or their `allocation`. No
   response received: `stop_work` with neither, and the suggestion awaits confirmation. With no user time suggested,
   close with `as_of` alone, never `confirmed`: the assistant time is recorded and nothing awaits.
5. **Pause and resume.** Use `pause_work` the same way, and `start_work` on return.

- **Never invent minutes.** `confirmed: true` and `minutes` are the person's words; silence is not a yes.
  For their own work that no session covered, ask for the figure and call `log_time` with
  `confirmed: true`; if they cannot say, estimate, write "estimated" in the `note` and leave `confirmed` out.
- Follow the `time` reminder that writes return, and call `get_work_session` if you have lost track.
  Never record user time for someone else, and never price time ([references/time.md](references/time.md)).

## Name the record in every commit

Put the record's code in the commit message, in square brackets at the end:
`fix(export): round the totals [ABC-12]`. `start_work` returns the code.

If no record is open when you are about to commit, ask which record the work belongs to.
Keep cannot prevent a commit that cites no record; ask on every occasion. A commit already made without the code is
recorded with `checkpoint_work` and its `commits`, and you tell the person it does not cite the record; never rewrite
pushed history. With the GitHub app, `get_commit_changes` returns a record's commits as a diff and `read_repo_file` a file.

## Status follows reality

A record's status says what is true now, not what you hope.

- A task is `in_progress` only while someone is working on it. `start_work` sets it.
- Move it with `transition_thread`: to `review` when the work is ready for someone to
  check, to `done` only when it is finished and accepted, to `blocked` with a `reason`. A task
  or requirement is `cancelled` with its `cancellation`: `dropped`, or `replaced` with `replaced_by`.
- **Follow the project's controls.** `start_work` returns `protocol` (the level, the `required` and `ask` controls, the
  Definition of Done, the record's requirement, module, cycle, linked artifacts and open questions) and `readiness`.
- **Record the deliverable** before Review: commits for code; otherwise a linked artifact, a link or a written outcome.
- Mark the Definition of Done items Keep has not marked on `evidence`; before Done, show the person the `preview: true`
  snapshot once. Present every other confirmation request (`ask`); never answer it ([references/ways-of-working.md](references/ways-of-working.md)).
- When you stop, leave one line saying what is left (`next` on `stop_work`): the person's words or what is genuinely
  open on the record, such as an open checklist item; never invent it. Follow the business rules and present every
  refusal and its confirmation request (`ask`) (ways-of-working).

## Ask before anything you cannot take back

Doing the work is yours. Releasing it is the person's. Do not push, merge, deploy, run a
release workflow, modify production data or publish a share link unless the person told
you to, in this conversation, for that act. The repository's own rules come first.

In Keep, some calls carry the same gate:

- **Calls that need `acknowledge: true`:** `delete_thread`, `delete_project`,
  `apply_change_request`, `archive_artifact`, `convert_artifact`, `record_decision`,
  `publish_update`, `share_artifact`, `approve_run`. Send it only after the person has
  agreed to that act.
- **Calls that wait for approval:** `record_decision`, `publish_update` and `share_artifact`,
  for a member: staged (`agent_run_id`) until a project manager approves or rejects them. A manager's
  calls take effect immediately (drafts: [references/records.md](references/records.md)). A share creates a share link.
- **Deleting.** Prefer a status change, such as a cancellation. A deleted record goes to a recycle bin for 30 days
  (`list_recycle_bin`, `restore_thread`). No tool deletes a record permanently. Do not look for one.

If you have already done something that needed a yes, say so immediately and say how to undo it.

## Reference files: read the one the work needs

Besides those linked above: [references/requirements.md](references/requirements.md),
[references/cycles-and-releases.md](references/cycles-and-releases.md), the method of each activity in
[references/activities.md](references/activities.md), reports in [references/reports.md](references/reports.md),
and, optionally for larger work, [references/planning.md](references/planning.md).
