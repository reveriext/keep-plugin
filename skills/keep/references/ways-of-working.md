# Delivery standards: the settings, the level and the controls

Every project declares how it is run. The settings ride on the project and are returned
everywhere a project is (`get_project`, `list_projects`, and the create responses) as a
`ways_of_working` object:

| Field | Default | What it does |
|---|---|---|
| `requirements_enabled` | off | Keeps first-class requirements, and modules, in this project. **One-way.** |
| `time_tracking_enabled` | off | Records time against work in this project. **One-way.** |
| `git_tracking_enabled` | off | Associates branches, commits and pull requests with records. GitHub only. **One-way.** |
| `default_assignee_policy` | `creator` | Who a new task falls to when nobody is named. |
| `time_backdate_days` | `7` | How far back a time entry may be dated, 0 to 365. 0 means today only. |
| `requirements_customer_visible_default` | off | Whether a new requirement starts visible to customer-role members. |
| `agent_engagement` | `ask` | "AI assistants work in Keep": `always` means an AI assistant uses Keep for this project's work without asking; `ask` means it asks the person once. **Two-way**: a preference, not a data commitment. The main skill says how an assistant reads it. At the Strict level it reads `always` unless a manager configured otherwise. |
| `level` | `standard` | How strictly Keep holds the project to its features: `relaxed`, `standard` or `strict`. **Two-way.** |
| `controls` | the level's | The effective value of every control: `off`, `ask` or `required`. Read-only as a whole; a manager modifies single controls. |
| `customised` | false | True when any control differs from the level's default. |
| `definition_of_done` | the level's | The project's checklist, `items` of `{ id, text }`. Whether it is enforced is `controls.definition_of_done`. |

## Levels and controls

A project's **level** is a starting point for its controls:

- **Relaxed**: every control is Off or Ask; none is Required, including time.
- **Standard** (the default): most controls request; time is required when a task is Done.
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

## Checklist: Definition of Done

The project's `definition_of_done` lists what each task must satisfy before Review. Mark
each item with `update_thread_detail` with `patch.definition_of_done`: complete, or not
applicable with a reason. Mark an item only on evidence, never on your own judgement
alone. At `required`, Review is refused until every item is marked; at `ask`, list what is
missing and the move proceeds.

## Refusals that carry a confirmation request

A move that a Required control blocks is refused with `control_required`, the `control` it
concerns, and a confirmation request for the person (field `ask`), in `request_form`
arguments. One refusal names every missing item. Present the request to the person and act
on their answer. **Never answer a confirmation request yourself**, never invent a
deliverable or mark an item to resolve a refusal, and do not retry the move until
the person has answered. `done_requires_time` refuses in the same way.

**Review ownership.** Where review by someone other than the assignee is Required and no
other member could review, the refusal requests the assignee's confirmation that they take
ownership of approving the work. When you act for the assignee, present it; if they
confirm, repeat the move with `review_ownership: true`. The confirmation is recorded with
the channel it came through.

## The switches are one-way, and that is the point

Off to on at any time. **On to off never.** Once a project has kept requirements, tracked
time or associated commits, that history is not retractable, so the API refuses the reverse
with `switch_is_one_way` and applies nothing else in the patch.

Before turning one on, say out loud what it commits the project to:

- **`requirements_enabled`**: the project will state what it is for as requirements, with a
  revision log, versions and acceptance criteria, and work will hang off them. It also turns
  on **modules**: they ride the same switch, and `open_module` refuses with
  `modules_disabled` until it is on.
- **`time_tracking_enabled`**: effort will be logged against records, by people and
  by assistants working for them, and it becomes readable per person, per record and per
  cycle. `log_time` is refused until it is on (`time_tracking_disabled`). A work session
  still opens and keeps its work log, but books no time.
- **`git_tracking_enabled`**: records and code are associated, and the project's
  Development section appears. GitHub only.

So: **do not turn a switch on speculatively.** Leave them out of `create_project` unless the
user asked for them. Every one defaults to off, and a project that did not enable a switch
at creation can always enable it later.

## Who may change them

- Changing **any** ways-of-working field on an existing project needs the **project-manager
  capability**; otherwise the call refuses with `manager_required`. Restating a value that
  is already set is always fine.
- `create_project` is **workspace admins only**. If the person you are acting for is not an
  admin, the right next move is `request_project`, which files the request for an admin to
  answer.

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

- `requirements_disabled` / `modules_disabled`: a project manager turns requirements on
  under **Project configuration → Delivery standards**. Ask; do not turn it on yourself unless asked.
- `time_tracking_disabled`: same switch story, for time.
- `switch_is_one_way`: you tried to turn something off. It cannot be turned off.
- `manager_required`: the person you act for lacks the capability. Say so; do not retry.
- A workspace is not available on this connection: when every call takes a `workspace`, its
  description lists the person's live workspaces, checked on every call. One they join later
  works with no reconnect; one they leave stops working at once.

## Do not

- Do not enable a setting or modify a control to clear an error.
- Do not describe a switch as reversible.
- Do not set `requirements_customer_visible_default` expecting it to change requirements
  already written: it seeds future rows only.
