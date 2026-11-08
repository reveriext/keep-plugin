# Delivery standards: seven settings, three of them one-way

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
| `agent_engagement` | `ask` | "AI assistants work in Keep": `always` means an AI assistant uses Keep for this project's work without asking; `ask` means it asks the person once. **Two-way**: a preference, not a data commitment. The main skill says how an assistant reads it. |

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

## Do not

- Do not turn a switch on to make an error go away.
- Do not describe a switch as reversible.
- Do not set `requirements_customer_visible_default` expecting it to change requirements
  already written: it seeds future rows only.
