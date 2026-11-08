# Requirements: state it, amend it, never overwrite it

A requirement is **what the project is for**: a capability the product must have, a feature
request, an enhancement, or a change request against an existing requirement. The work is
separate: tasks are opened against it.

Requirements only exist in a project that has them switched on. If a call refuses with
`requirements_disabled`, a project manager turns them on under **Project configuration → Delivery
standards**; the switch is one-way (see `ways-of-working.md`).

## 1. Requirement first

Anything new starts here:

1. `open_requirement { project_id, title, body, acceptance_md }`.
2. `open_task { requirement_id }` for each unit of work. That link is what the requirement's
   Delivery pane counts.

A chore or a follow-up may be a task on its own. A new capability may not, and neither may a
**bug**: see §7.

## 1b. Type follows relationship

The type is not a matter of taste: it is what the record points at, and the server refuses a
type that does not match. Pick the relationship first and the type follows from it.

| The record… | Type | And it must carry |
|---|---|---|
| stands on its own, raised inside the team | `requirement` | nothing |
| stands on its own, asked for from **outside** the team | `feature_request` | nothing |
| improves a requirement that already exists | `enhancement` | `parent_requirement_id` |
| amends a requirement that already exists | `change_request` | `derive_from_thread_id` |

The four refusals, by slug: `enhancement_needs_parent`, `change_request_needs_target`,
`requirement_with_parent_is_enhancement`, and, on a task, `bug_needs_delivered_requirement`.

The rule is judged on the **result**, not on what you moved: `update_requirement` that retypes a
requirement to `enhancement` must set `parent_requirement_id` in the same call, and one that
detaches an enhancement must retype it in the same call.

**State it as the user stated it.** Do not embellish, do not round it up into something
bigger, and do not invent a title. If the user said "add a requirement" without saying what
it is, collect it with `request_form` first. If `request_form` answers `ask_in_chat`, which
is what most clients get, because they cannot draw a form, ask those questions in your own
message, wait for the person to answer, and then call the tool `next` names with their
values.

**And `open_requirement` asks for itself.** It asks the person for the title and the
statement when you left them out, before it writes anything: a requirement with an empty
body is a title with nothing behind it. The same is true of `open_task`, `open_module`,
`create_project` and `record_meeting`. If nobody can be asked, the call is refused
(`validation_failed`) and the refusal carries `details.ask`: the questions, and the
instruction to put them to the person and call again. A refusal like that wrote nothing.

## 2. The statement and the acceptance criteria are two fields

- `body` is the **statement**: what must be true, and why.
- `acceptance_md` is the **acceptance criteria**: how anyone will know the requirement is
  met. Write it as **markdown prose, not a checklist**, and keep it beside the statement:
  never inside it.

Both are snapshotted at every version, so any two versions can be compared later.

## 3. Amend, do not overwrite

Three verbs, and they are three different acts. Choose deliberately:

| You are… | Call | Mints a version? |
|---|---|---|
| publishing a new version of what the requirement **says** | `amend_requirement` | yes |
| maintaining the record: priority, owner, type, target cycle, parent, a typo nobody needs to review | `update_requirement` | no |
| moving its status | `transition_thread` | no |
| accepting a change request | `apply_change_request` | yes |

`amend_requirement` **requires** `summary` and it becomes the line in the Versions rail.
Write the reason, not a restatement of the diff: *"Narrowed to managers only, per Dana on
the 3rd"*, not *"changed body"*.

Use `update_requirement` for everything that is not a change the team should review. It was
split out precisely because a change log full of typo fixes and priority nudges is a log
nothing can be found in.

## 4. The workflow is the task workflow, verbatim

`open` = proposed, not yet taken up → `in_progress` = accepted and being delivered →
`review` = delivered, awaiting verification → `done` = verified. Plus `blocked`, and
`cancelled`: where the transition `reason` says whether it was rejected or withdrawn.

Move status with `transition_thread` and give a reason whenever the move is not obvious.

## 5. A change request amends; it does not edit

Do not edit an agreed requirement because scope moved. File the change:

1. `open_requirement { req_type: "change_request", derive_from_thread_id: <target> }` with
   the proposed text. **The target stays untouched while the CR is open.**
2. `apply_change_request { cr_thread_id, summary, title?, body_md?, acceptance_md? }`: the
   target is edited from the CR, gains the next version marked `cr_applied` with the CR
   recorded against it, and the CR closes. One act; it needs `acknowledge: true` because it
   writes a record the caller did not name.
3. To reject instead: `transition_thread` the CR to `cancelled`.

If an application fails, nothing landed and the CR is still open: re-apply.

## 6. Structure

- `parent_requirement_id`: the requirement it sits under (the tree).
- `derive_from_thread_id`: where it came from, either a promoted feedback or the requirement a CR
  amends.
- `module_id`: the part of the product it belongs to. Left out, an enhancement or a change
  request takes its parent requirement's module; otherwise the requirement is created
  unfiled and the answer carries `module_ask` (a question for the person: never pick for
  them) or `module_note` (the project has no modules: say so once). See `records.md`.
- `target_cycle_id`: the release it is aimed at.
- `link_threads { relation: "blocked_by" }`: a dependency. An open blocker warns on
  `in_progress`; it does not refuse.

## 7. A bug is against a delivered requirement

"Delivered" is a status: `review` (delivered, awaiting verification) or `done` (verified). A bug
reports that something which shipped is wrong, so it needs one of those on the other end.

```
open_task { task_type: "bug", requirement_id: <a requirement in review or done>,
            steps_md, expected_md, actual_md }
```

- Against a requirement that is **not** delivered, the work is unfinished, not broken: open a
  plain task under it (`open_task { requirement_id }`): or a **change request** if the
  requirement itself is what is wrong.
- Against **nothing at all**: a plain task. The exception is a project with requirements off:
  there a bug needs no `requirement_id`, and keeps its report.
- Retyping an existing task to `bug` needs the link to be there already
  (`link_threads { relation: "derives_from" }` to the requirement), and removing a bug's last
  such link is refused until the task is retyped. With requirements off, neither applies.

## Do not

- Do not overwrite a requirement's text to reflect a new agreement: amend it, or file a CR.
- Do not pick a type and then look for a relationship to justify it: the relationship decides.
- Do not put acceptance criteria inside the statement, and do not write them as a checklist.
- Do not amend for a typo, and do not `update_requirement` for a real change of meaning.
- Do not flip `customer_visible` casually: changing exposure needs the project-manager
  capability, and the refusal says so. A new requirement's exposure is seeded from the
  project's own policy; omit the field and accept it.
