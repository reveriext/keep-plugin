---
name: keep
description: Work in Keep, the project record. Use when starting or finishing work, opening a requirement or task, tracking or logging time, committing, or when the person mentions Keep.
---

# Working in Keep

Keep is the person's project record: requirements, tasks, decisions, and the time spent on
them. This skill says how to work in it. It needs the Keep connector: if neither
`start_work` nor `code` is among your tools, say that Keep is not connected and stop. Do
not describe work as recorded when it was not. If `code` and `use_tool` are listed, the
connection is in Code Mode: read [references/code-mode.md](references/code-mode.md), and
make every consequential step its own `use_tool` call, never part of a script.

## When to use Keep

1. **Is this real work?** Changing code or producing a deliverable is. Answering a question
   is not, and that includes a question about Keep: answer it, and ask nothing back.
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
5. **A direct request always wins, both ways.** "Log this in Keep" turns it on after a no.
   "Don't track this" turns it off on a project set to Always.

## Record first

- **Something new starts with a requirement.** Call `open_requirement` (the statement in
  `body`; in `acceptance_md`, the acceptance criteria as a top-level list, one per item),
  then `open_task` with `requirement_id` for each piece of work. A chore may be a task alone.
- **Before you touch code, there is a task and you have started work on it** (next
  section). If the work has no task, open one or ask which record it belongs to.
- **Never invent a title or a detail.** Use the person's words. If something required is
  missing, ask with `request_form`. A refusal that carries `details.ask` wrote nothing: it
  is a question to put to the person, then call again.
- **Use real ids.** Resolve people with `list_members`. Find existing records with
  `list_threads` or `search_threads` before opening a new one.
- Unsure which kind of record it is: read [references/records.md](references/records.md).

## Keep track of time

Nothing measures your work for you. Keep counts time only from your own calls about a
record, so the time is right only if you tell Keep as you go.

1. **Pick up.** Call `start_work` with the record's `thread_id`. Keep its `session_id`. A
   task moves to In progress and is assigned to the person if nobody holds it. If it
   answers `held_by_other`, say who holds it and ask. Do not take it.
2. **Checkpoint.** Call `checkpoint_work` with one line (`note`: what changed, past tense)
   each time you finish a step, and pass the commits you made (`commits`: each with its
   `sha`, `message` and `repo`, the `owner/name` of the checkout's git remote). They go on
   the record's Development tab. Do not go a long stretch without one: ten quiet minutes
   close the session.
3. **Before you stop, show the person the time.** Call `stop_work` with `preview: true`
   and a `summary`. It writes nothing. Show the person `proposal.text` exactly as returned
   and wait. It states what Keep counted and how long has passed. The person chooses.
4. **Book their answer.** Call `stop_work` again with `confirmed: true` and their figure in
   `minutes`. If they do not answer, call `stop_work` with neither, and `as_of` set to the
   preview's `preview_as_of`: the figure the preview showed is saved, marked awaiting
   confirmation, and they can confirm it in Keep. Tell them so.
5. **Coming back later?** Use `pause_work` in place of `stop_work`, the same way, and
   `start_work` again when you return.

Rules that hold throughout:

- **Never invent minutes.** `confirmed: true` and `minutes` are the person's words, never
  your judgement. Silence is not a yes.
- **An estimate is said to be one.** For work no session covered, ask the person for the
  figure and call `log_time` with `confirmed: true`. If they cannot say, estimate from what
  you actually did, write "estimated" in the `note`, and leave `confirmed` out.
- **Follow the reminder.** Other writes on a record answer with a `time` block. Its
  `reminder` says what to do in the state you are in, and gives the `session_id` when a
  session is open. If you have lost track, call `get_work_session`.
- **"Show me the time"**: `stop_work` with `preview: true`, or `list_time_entries`.
- Time is a person's time. Never log for someone else, and never price it.

More, including meetings and correcting an entry: [references/time.md](references/time.md).

## Name the record in every commit

Put the record's code in the commit message, in square brackets at the end:
`fix(export): round the totals [ABC-12]`. `start_work` returns the code.

If no record is open when you are about to commit, ask which record the work belongs to.
Keep cannot prevent a commit that cites no record; ask on every occasion.

## Read the code behind a record

`get_commit_changes` returns the diff of a record's commits (`thread_id`) or of one commit
(`repo`, `sha`); `read_repo_file` returns a file at a `ref`. Both need the GitHub app.

## Status follows reality

A record's status says what is true now, not what you hope.

- A task is `in_progress` only while someone is working on it. `start_work` sets it.
- Move it with `transition_thread`: to `review` when the work is ready for someone to
  check, to `done` only when it is finished and accepted, to `blocked` or `cancelled` with
  a `reason`.
- **Follow the project's controls.** `start_work` returns `protocol` (the level, the
  `required` and `ask` controls, the Definition of Done, the record's requirement, module,
  cycle, linked artifacts and open questions) and `readiness` where it is returned.
- **Record the deliverable** before Review: commits when the work changed code; otherwise
  offer to save the document as a linked artifact, or record a link or a written outcome.
- A blocked move is refused (`control_required`, `done_requires_time`) with a confirmation
  request (field `ask`): present it to the person and never answer it yourself. See [references/ways-of-working.md](references/ways-of-working.md).
- When you stop, leave one line on the record saying what is left (`next` on `stop_work`).

## Dates

Send and read every date as ISO (`YYYY-MM-DD`, or an ISO timestamp). "Today" is the
person's: use `calendar.today` from `workspace_briefing` (with `time_zone` and
`week_starts_on`), never your own clock.

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
  calls take effect immediately (drafts: `references/records.md`). A share creates a share link.
- **Deleting.** Prefer a status change (cancel, reject, withdraw). A deleted record goes to
  a recycle bin for 30 days (`list_recycle_bin`, `restore_thread`). There is no tool that
  destroys a record for good. Do not look for one.

If you have already done something that needed a yes, say so at once and say how to undo it.

## Reference files: read the one the work needs

- [references/records.md](references/records.md): which kind of record a thing is.
- [references/requirements.md](references/requirements.md): writing and amending them.
- [references/cycles-and-releases.md](references/cycles-and-releases.md): cycles, releases.
- [references/ways-of-working.md](references/ways-of-working.md): levels, controls, refusals.
- [references/time.md](references/time.md): work sessions, logging and reading time.
- [references/code-mode.md](references/code-mode.md): Code Mode, scripts and `use_tool`.
- [references/activities.md](references/activities.md): the method for each activity.
- [references/planning.md](references/planning.md): optional, a way to plan larger work.
