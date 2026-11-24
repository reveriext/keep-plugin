# Delivery standards: the settings, the level and the controls

Every project declares how it is run. The settings ride on the project and are returned
everywhere a project is (`get_project`, `list_projects`, and the create responses) as a
`ways_of_working` object:

| Field | Default | What it does |
|---|---|---|
| `requirements_enabled` | on at creation | Keeps first-class requirements in this project. **One-way.** |
| `person_time_tracking` | `advanced` | "Person time tracking": `off` records no user time and suggests none; `simple` (Project level) records each person's time on the project for each day, without naming a task, and Done does not require time on the task; `advanced` (Task level) records time on each task, and the time controls apply. **Two-way**, from the moment it is saved. |
| `assistant_time_tracking` | `on` | "Assistant time tracking": `on` records assistant time for each connection, run, subagent and task, attributed to the person who directed it; `off` records no assistant time and no token counts. **Two-way.** Independent of `person_time_tracking`. |
| `idle_limit_minutes` | `10` | "Idle limit": `5`, `10`, `15`, `20` or `30` minutes without a sign of activity, after which Keep stops counting time for an assistant turn, user time and a connector work session on the project, until the next sign. **Two-way**; a change applies to sessions that start after it; a session already open retains the limit in effect when it started. Work not tied to a project uses 10 minutes. |
| `git_tracking_enabled` | on at creation | Associates branches, commits and pull requests with records. GitHub only. **One-way.** |
| `cycles_enabled` | on at creation | Cycles and modules (the Plan section); off, a new cycle is refused with `cycles_disabled` and a new module with `modules_disabled`. **One-way.** |
| `default_assignee_policy` | `creator` | Who a new task falls to when nobody is named. |
| `time_backdate_days` | `7` | How far back a time entry may be dated, 0 to 365. 0 means today only. |
| `requirements_customer_visible_default` | off | Whether a new requirement starts visible to customer-role members. |
| `show_dev_activity` | follows `git_tracking_enabled` at creation | Whether records display their branches, commits and pull requests. **Two-way**; hiding them keeps the links. |
| `agent_engagement` | `ask` | "AI assistants work in Keep": `always` means an AI assistant uses Keep for this project's work without asking; `ask` means it asks the person once. **Two-way**: a preference, not a data commitment. The main skill says how an assistant reads it. At the Strict level it reads `always` unless a manager configured otherwise. |
| `token_mode` | `auto` | "Token counts", which applies while `assistant_time_tracking` is `on` (its value is retained while it is `off`): `auto` records the Keep plugin's counts and the `usage` figures you send; `manual` only the figures you send; `off` none. **Two-way.** Send `usage` only as your client shows it. |
| `level` | `standard` | How strictly Keep holds the project to its features: `relaxed`, `standard` or `strict`. **Two-way.** |
| `controls` | the level's | The effective value of every control: `off`, `ask` or `required`. Read-only as a whole; a manager modifies single controls. |
| `definition_of_done` | the level's | The project's checklist, `items` of `{ id, text }`. Whether it is enforced is `controls.definition_of_done`. |
| `done_means` | the level's | What Done means for a task: `accepted`, `merged` or `released`. |
| `idle_flag_days` | the level's | Days without activity before a task In progress is identified to its manager, 1 to 30; null: never. |
| `unconfirmed_reminder_days` | the level's | Days before time awaiting confirmation is reminded, 0 to 7; null: no reminder. |

Read-only beside them: `customised` (true when any control differs from the level's default),
`checkpoint_minutes`, `time_summary_before_recording`, `replies_internal_by_default`,
`defaults` and `agent_engagement_stored`. `get_project` also returns `recording`: the time
and token settings in words, their cost and the provisional notice.

## Levels and controls

A project's **level** is a starting point for its controls:

- **Relaxed**: every control is Off or Ask; none is Required, including time.
- **Standard** (the default): most controls request; under Person time tracking Advanced, time
  is required when a task is Done (`time_at_done`).
- **Strict**: required at every gate: a requirement first, a recorded deliverable, time,
  and review by someone other than the assignee.

Each **control** takes one of three values, and the value says what you do:

| Value | What it means for you |
|---|---|
| `off` | The control is not part of this project. Do not mention it. |
| `ask` | Request it once, at the appropriate point. Accept the person's answer if they decline. |
| `required` | Request it. Keep refuses the move until it is satisfied. |

A manager may modify any single control at any time; the project then reads `customised`.
Restating the current level keeps those overrides. Selecting a different level, or sending
`{ level, controls: null }`, resets every control to that level's defaults. A control whose
feature is disabled reads `off`. `commits_for_code_work` is never `required`: not every task
involves code.

## The protocol block

`start_work` returns `protocol`, the project's rules and the record's context in one object:

- `level`, and the controls that are not Off: `required` and `ask`, each mapping a control
  key to a one-line meaning;
- `definition_of_done`: the checklist items, when that control is not Off;
- `requirement` (with its `acceptance_criteria`), `module`, `cycle`, `linked_artifacts` and
  `open_questions`.

When `state_rules_at_start` is not Off, state the project's rules to the person in one line.
When `read_linked_artifacts` is not Off, read the linked artifacts before you begin.
When `due_date_on_active_task` is not Off and the task has no due date, `start_work` returns
`due_date_request` (and a move to `in_progress` returns the same request). Propose a date to
the person, record the one they give with `update_thread_detail` (`patch.due_date`), and never
choose a date for them. At `required`, the move to `in_progress` is refused until a due date
is recorded, and so is a task opened without `due_date` into a cycle (`parent_cycle_id`) or directly
in `in_progress`. A task that is in no cycle and is left `open` is in the backlog
and is not asked. `open_task` returns the same request at the Ask level.

**Readiness.** `get_thread` and `start_work` may also return a `readiness` block: for each
control that applies to the record, its value, whether it is satisfied, and what would
satisfy it. Read it before you move a record to Review or Done, and do what it lists.

## The deliverable

A task's deliverable is what the work produced, of one of four kinds:

| Kind | How it is recorded |
|---|---|
| Code | Commits or a pull request that cite the task's code: pass `commits` to `checkpoint_work` or `stop_work`. |
| Artifact | A Keep artifact linked to the task: `create_artifact`, or `link_threads` for one that exists. |
| Link | An external document or address: `update_thread_detail` with `patch.deliverables`. |
| Outcome | A short written statement of the result, for a review, research or a decision: `update_thread_detail` with `patch.deliverables`. |

A task is not classified in advance. Answer from what the work actually produced: commits
if it changed code, an artifact if it produced a document, an outcome for a review. While a
task has no deliverable, `checkpoint_work`, `pause_work` and `stop_work` carry a `reminder`
that requests one, at the first checkpoint or at the close's preview. At `ask` it is made
once per work session; at `required` it is made at both points. A recorded link or outcome
does not satisfy a request for the commits of work that changed code.

**The GitHub offer.** When `offer_github` is not Off and the project has no repository
connected, the first `checkpoint_work`, `pause_work` or `stop_work` that records your commits
on that project carries an `offer`: what connecting GitHub provides and how to connect, or, on
a plan without GitHub, the upgrade. Relay it to the person once; Keep makes it once per person
per project, and a declined offer is not repeated.

## Checklist: Definition of Done

The project's `definition_of_done` lists what each task must satisfy before Review. Keep
marks four items itself when the task moves to Review or Done, from the record: the
requirement (`dod_requirement`), the deliverable (`dod_deliverable`), the time
(`dod_time`: assistant time, or confirmed user time) and the summary (`dod_summary`). Each
carries `by: "keep"` and its `evidence`. Mark the other items yourself with
`update_thread_detail` and `patch.definition_of_done`: complete, or not applicable with a
reason, always with `evidence` (the tests run and their result, the documentation or Help
files modified, or why the item does not apply). Ask the person only for an item you cannot
establish. Never modify a mark a person made. At `required`, Review is refused until every
item is marked; at `ask`, the move proceeds.

`patch.definition_of_done` replaces the whole list: read the items from `get_thread`, and send
every item with its mark, as entries of `{ id, state, reason, evidence }`. `state` is `done`,
`na` (not applicable) or `open` (Keep accepts `open`, which clears a mark); `reason` is
required for `na`; `evidence` names what the mark rests on.

**A task that names no requirement** (`dod_requirement`). If the work is new, link the
requirement it delivers, opening it first if none exists (the skill's "Record first"): an
existing task is linked with `link_threads { src_thread_id, dst_thread_id, relation:
"derives_from" }`, from the task to the requirement, which is what `open_task` with
`requirement_id` records for a new task. If the work is a chore, record it as one:
`update_thread_detail` with `patch.task_type` set to `chore`. Otherwise leave the item open and
tell the person; never mark it `na` to pass the gate.

## Closing a task: one snapshot, one answer

Before moving a task to Done, call `transition_thread { thread_id, new_status: "done",
preview: true, client_session }`. It moves and writes nothing, and returns `snapshot`: the
Definition of Done with Keep's marks as they would be written, the deliverable, the time
(assistant time, provisional, per run; the person's user time, confirmed or suggested with its
basis; the user time on the task) and the suggested reviewer, with `snapshot.text` and one
confirmation request (`ask`). Present it to the person once, with `request_form` or your client's own question
widget, or show `snapshot.text` and request confirmation once. Follow its `next`. Send the
same `client_session` on the close itself.

An answer to a preview always carries `snapshot`. If it does not, the task moved: state that
to the person and move it back with `transition_thread`. An answer that carries `moved: true`
is a move that was applied, never a preview.

**Session authorization.** When the person chooses "Close this task and the remaining
tasks of this session without further confirmation", or says so in words, send `authorize_session_closure:
true` and your `client_session` on that close. While it is in force (the preview's and
`get_work_session`'s `session_authorization`), close the session's further tasks without
the snapshot: Keep posts the snapshot as each task's closing comment, and the user time
is still awaiting confirmation. It covers only that person and that client session, and
ends when the session's work sessions end. Never infer it.

## Refusals that carry a confirmation request

A move that a Required control blocks is refused with `control_required`, the `control` it
concerns, and a confirmation request (field `ask`), in `request_form` arguments. One
refusal names every missing item. A Definition of Done item is yours to mark on evidence;
put its form to the person only when you cannot establish it. Every other request is the
person's: present it and act on their answer. **Never answer it yourself**, never invent a
deliverable or mark an item without evidence to resolve a refusal, and do not retry the
move until the item is satisfied. `done_requires_time` refuses in the same way.

**The suggested reviewer.** Keep suggests the owner of the task's requirement when that
person is not the assignee, else the person who created the task. It is a note on the move
to Done (`suggested_reviewer`), never a refusal, at every level. With no suggestion, the
assignee or the assistant reviews, and nothing is requested. `review_ownership` is accepted
for older clients and ignored.

## The features are one-way, and that is the point

A feature may be enabled at any time. **It is never disabled.** Once a project has kept requirements
or associated commits, that history is not retractable, so the API refuses the reverse
with `switch_is_one_way` and applies nothing else in the patch. Person time tracking and
Assistant time tracking are not features: a project manager modifies either at any time, and
recorded time is not modified.

Before enabling one, state what it commits the project to:

- **`requirements_enabled`**: the project will state what it is for as requirements, with a
  revision log, versions and acceptance criteria, and work will hang off them.
- **`cycles_enabled`**: the project plans in releases, sprints and phases, and in
  **modules**: they share the same feature, and `open_module` refuses with
  `modules_disabled` until it is enabled.
- **`git_tracking_enabled`**: records and code are associated, and the project's
  Development section appears. GitHub only.

So: **do not enable a feature speculatively.** At creation every feature omitted from
`create_project` is **enabled** (Full mode); pass `false` only where the user said so, because
creation is the only moment a feature can be disabled. A project created with a feature
disabled can enable it later. On an existing project, `update_project` returns a confirmation
request (field `ask`) before it enables a feature: present it to the person, and repeat the call
with `confirmed: true` only on their answer.

## Who may change them

- Changing **any** ways-of-working field on an existing project needs the **project-manager
  capability**; otherwise the call refuses with `manager_required`. Restating a value that
  is already set is always fine.
- `create_project` is **workspace administrators only**. If the person you are acting for is not a
  workspace administrator, the right next move is `request_project`, which files the request
  for a workspace administrator to answer.

## The default-assignee rule

`default_assignee_policy` is one of:

- `creator`: the person or agent that opened the task (the default),
- `manager`: the project's manager,
- `owner`: the project's owner,
- `user:<user_id>`, a named current workspace member.

A new task takes the rule unless you pass `assignee_id`, which overrides it. A policy naming
someone who no longer resolves **falls back to the creator** rather than leaving the task
unassigned. Resolve any user id with `list_members` first: an invented one is rejected, and
the refusal is `invalid_default_assignee`.

## The backdating window

`time_backdate_days` bounds how far back a time entry's day may be, counted in calendar days
back from the person's today (their own time zone, not UTC). A day outside it is refused, and
the refusal names the setting. Out-of-range values refuse with
`invalid_backdate_days`.

## When a call is refused

Read the code and act on it, do not retry blindly:

- `requirements_disabled`: a project manager enables requirements under **Project
  configuration → Delivery standards**. Ask; do not enable it yourself unless asked.
- `cycles_disabled` / `modules_disabled`: the same, for cycles and modules, which share one
  feature.
- `time_tracking_disabled`: Person time tracking is Off. A project manager modifies it under
  **Configuration › Delivery standards › Time tracking**. Ask; do not change it yourself.
- `switch_is_one_way`: you tried to disable a feature. It cannot be disabled once enabled.
- `manager_required`: the person you act for lacks the capability. Say so; do not retry.
- A workspace is not available on this connection: when every call takes a `workspace`, its
  description lists the person's live workspaces, checked on every call. One they join later
  works with no reconnect; one they leave stops working immediately.

## Do not

- Do not enable a setting or modify a control to clear an error.
- Do not describe a feature as reversible.
- Do not set `requirements_customer_visible_default` expecting it to change requirements
  already written: it seeds future rows only.

## Business rules and refusals

- **No record is completed while its children are open.** A requirement is not done
  while a task delivering it, a child requirement, a record linked to it as its `parent` or a
  change request against it is open;
  a module is not retired while a requirement or task filed in it is open; a cycle or
  release is not closed while a task in it is open.
- **A child of a completed record is not reopened.** A task or requirement is not reopened
  while the record it belongs to is Done or Retired: reopen that record first, or open a
  new record for the remaining work.
- **No open record is placed under a completed record.** While `children_settled_before_done`
  is Required, an open task or requirement is not restored from the recycle bin while the
  record it belongs to is Done or Retired. An open task is not created under a Done task or
  against a Done requirement, and an open requirement is not created with a Done
  `parent_requirement_id`. A `parent` or `derives_from` link, or a new
  `parent_requirement_id`, does not make an open record the child of a Done task or
  requirement. Reopen that record first, or open a new record for the remaining work.
- **Bugs and change requests are exempt.** A bug reports against delivered work, and a change
  request amends it, so either may be opened, linked, restored or reopened against a Done
  requirement. A requirement is still not completed while a change request against it is
  open.
- **A cancellation states its kind** (`cancellation_names_kind`). A task or requirement moves to
  `cancelled` with `cancellation`: `dropped` when the work is no longer being done, or
  `replaced` with `replaced_by`, which Keep links with `supersedes`. Ask the person which it is;
  never choose it for them.
- **A change request is completed only by applying it.** `apply_change_request` marks it
  Done; a move to Done by `transition_thread` is refused. A change request against a
  canceled requirement cannot be applied.
- **A move to the current status changes nothing.** It returns `unchanged`, and release
  notes or meeting time sent with it are refused, not discarded.
- **Release rules.** A release is created with one deployment task, which does not start while
  another task of the release is open (`release_deployment_task`). A release is closed only when
  each of its tasks is done or moved to the next release with a reason, its deployment task is
  Done, its release notes and release tag are recorded and every requirement targeted at it is
  settled (`release_complete_before_close`; `cycles-and-releases.md`). What Done means (merged, released) is the project's
  setting, stated in `protocol`. Where Done means merged, a merged pull request counts. Where
  the project has a GitHub connection, the state of every pull request is recorded from
  GitHub, including one linked manually; where the project has no GitHub connection, the
  state is recorded manually, and no connector tool records it.
- **The time controls apply under Person time tracking Advanced only.** Under Simple or Off,
  Done does not require time on the task, and no time control is requested.
- **Time is settled before Done** (`time_settled_at_done`). Before a move to Review or
  Done, call `stop_work` with `preview: true`, show the summary and wait for the answer.
  `list_time_entries` with `to_settle: true` lists the time that awaits the person's
  decision. A Done refused for time carries a confirmation request (`ask`) that lists each entry and run.
- **Present every refusal.** A refused call wrote nothing. Show its message in full and,
  when it carries a confirmation request (`ask`), put that question to the person. Never answer it yourself,
  never work around the rule, and never retry the call unchanged.

