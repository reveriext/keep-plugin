---
name: keep
description: Work in Keep, the project record. Use when starting or finishing work, opening a requirement or task, tracking or logging time, committing, or when the person mentions Keep.
---

# Working in Keep

Keep is the person's project record: requirements, tasks, decisions, and the time spent on
them. This skill says how to work in it. It needs the Keep connector: if tools such as
`workspace_briefing` and `start_work` are not available, say that Keep is not connected and
stop. Do not describe work as recorded when it was not.

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
   again. Never ask twice, not for a second task and not when the subject changes.
5. **A direct request always wins, both ways.** "Log this in Keep" turns it on after a no.
   "Don't track this" turns it off on a project set to Always.

Nothing enforces a no. It is yours to remember.

## Record first

- **Something new starts with a requirement.** Call `open_requirement` (the statement in
  `body`, how it will be judged in `acceptance_md`), then `open_task` with `requirement_id`
  for each piece of work. A chore or a follow-up may be a task alone.
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
   `minutes`. If they do not answer, call `stop_work` with neither: the time is saved,
   marked awaiting confirmation, and they can confirm it in Keep. Tell them so.
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
- **"Show me the time"** is `stop_work` with `preview: true` on the open session, or
  `list_time_entries` for what is already booked.
- Time is a person's time. Never log for someone else, and never price it.

More, including meetings and correcting an entry: [references/time.md](references/time.md).

## Name the record in every commit

Put the record's code in the commit message, in square brackets at the end:
`fix(export): round the totals [ABC-12]`. `start_work` returns the code.

If you are about to commit and no record is open, say so and ask which record the work
belongs to before you commit. Nothing checks this for you and nothing can stop a commit
that names no record, so do it every time.

## Read the code behind a record

`get_commit_changes` returns the files and diff of a record's commits (`thread_id`), or of
one commit (`repo`, `sha`). `read_repo_file` returns a file's text at a `ref`. Both need the
GitHub app and the repository connected to the project; `truncated` says what was cut.

## Status follows reality

A record's status says what is true now, not what you hope.

- A task is `in_progress` only while someone is working on it. `start_work` sets it.
- Move it with `transition_thread`: to `review` when the work is ready for someone to
  check, to `done` only when it is finished and accepted, to `blocked` or `cancelled` with
  a `reason`.
- `done` is refused on a task with no time on it (`done_requires_time`). Stop the session
  or log the time first. The refusal carries the question to ask. Do not retry around it.
- When you stop, leave one line on the record saying what is left (`next` on `stop_work`).

## Dates

Send and read every date as ISO: `YYYY-MM-DD` for a day, an ISO timestamp for an instant.
"Today" is the person's, not yours: `workspace_briefing` returns `calendar` with `today`,
`time_zone` and `week_starts_on`. Use `calendar.today`. Never guess the date and never
work it out from your own clock.

## Ask before anything you cannot take back

Doing the work is yours. Releasing it is the person's. Do not push, merge, deploy, run a
release workflow, touch production data or publish a public link unless the person told
you to, in this conversation, for that act. The repository's own rules come first.

In Keep, some calls carry the same gate:

- **Calls that need `acknowledge: true`:** `delete_thread`, `delete_project`,
  `apply_change_request`, `archive_artifact`, `convert_artifact`, `record_decision`,
  `publish_update`, `share_artifact`, `approve_run`. Send it only after the person has
  agreed to that act.
- **Calls that wait for approval:** `record_decision`, `publish_update` and
  `share_artifact` stage the action and return an `agent_run_id`. `approve_run` commits it,
  and only when the person has approved that action in this conversation. Approving a
  share creates a public link. Never approve your own staged action to move things along.
- **Deleting.** Prefer a status change (cancel, reject, withdraw). A deleted record goes to
  a recycle bin for 30 days (`list_recycle_bin`, `restore_thread`). There is no tool that
  destroys a record for good. Do not look for one.

If you have already done something that needed a yes, say so at once and say how to undo it.

## Reference files

Read the one the work needs:

- [references/records.md](references/records.md): which kind of record a thing is.
- [references/requirements.md](references/requirements.md): writing, amending and changing
  a requirement.
- [references/cycles-and-releases.md](references/cycles-and-releases.md): sprints,
  releases, the order of a cycle's tasks.
- [references/ways-of-working.md](references/ways-of-working.md): the project's settings
  and the refusals they cause.
- [references/time.md](references/time.md): work sessions, logging and reading time.
- [references/planning.md](references/planning.md): optional, a way to plan larger work.
