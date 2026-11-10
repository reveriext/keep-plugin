# Pick the right kind

Keep has **twelve kinds** and each has its own workflow: `task`, `requirement`, `module`,
`cycle`, `decision`, `note`, `risk`, `question`, `update`, `feedback`, `artifact`, `meeting`.
Choosing the kind is the first decision, and it is not reversible by editing.
Pick it deliberately.

## The trio people get wrong

| Thing | Kind | Verb |
|---|---|---|
| A unit of work someone will do | task | `open_task` |
| What the work is **for** | requirement | `open_requirement` |
| The part of the product both belong to | module | `open_module` |

- **Anything genuinely new starts as a requirement.** Open the requirement first, then hang
  the work off it: `open_task { requirement_id }`. That link is what the requirement's
  Delivery pane counts.
- **Type follows relationship**, and the server enforces it:
  - a **bug** is against a requirement that is already **delivered** (status `review` or `done`):
    `open_task { task_type: "bug", requirement_id }`, with `steps_md` / `expected_md` / `actual_md`.
    Against a requirement that is *not* delivered the work is simply unfinished: open a plain task
    under it. Against nothing at all: a plain task.
  - a **chore or follow-up may stand alone** as a task with no requirement.
- A **module is a shelf, not work**: a name, a short description, an owner, and no dates,
  no timeline, no schedule. Requirements and tasks are filed into it with `module_id` or
  `link_threads { relation: "part_of" }`. A record belongs to **at most one module**, and a
  module is never part of anything.
- Anything with a start and an end is a **cycle** (`open_cycle`), not a module.

## Every task and requirement has a module: its own, its parent's, or the person is asked

`open_task` and `open_requirement` apply one rule, and the record is created in every case:

| You sent | What happens | What the answer adds |
|---|---|---|
| `module_id` | Filed there. | `module` (`source: "explicit"`) |
| nothing, and a parent is in a module | Filed with the parent: a task takes its requirement's module, else its parent task's; an enhancement or change request takes its requirement's. | `module` (`source` says which parent) |
| nothing, nothing to inherit, the project has modules | Created unfiled. | **`module_ask`** |
| nothing, and the project has no modules | Created unfiled. | **`module_note`** |
| `module_id: "none"` | A deliberate "no module". Nothing is asked. | nothing |

- **`module_ask` is a question for the person. Put it to them; never pick a module
  yourself.** It is a ready `request_form` call: send its `arguments` to `request_form`, or
  put the question in your reply where the client cannot draw a form. Then file the answer
  with `link_threads { src_thread_id, dst_thread_id: <the module's id from
  module_ask.modules>, relation: "part_of" }`. "None of these" means leave it unfiled and do
  not ask again.
- **Pass `module_note` on once.** It says the project has no modules yet. Tell the person
  once in the session and offer to propose a set for them to approve. Do not repeat it on
  the next record, and do not create modules they have not approved.
- Pass `module_id` whenever the person has said which part of the product this is, so there
  is nothing to ask.
- A record filed by inheritance was never chosen into that module, so filing it elsewhere
  with `link_threads` moves it in one step (`replaced_module`). A module that was chosen is
  protected (`already_in_module`): `unlink_threads` first.

## The journal kinds

- **decision**: `record_decision`. A deliberate choice plus the rationale, the alternatives,
  and the prior decision it supersedes. Use it for architecture, scope, tooling, process.
  It is **approval-gated by role**: for a project manager, the project owner or a workspace
  administrator it is recorded immediately (`status: "recorded"`); for a member it is staged
  (`status: "awaiting_approval"`) until a project manager approves it. When the person asks
  for a draft, send `status: "proposed"`: the decision is recorded as a proposal, for any
  person who may write to the project, and waits in the Queue for a project manager to
  decide it. Only a project manager, the project owner or a workspace administrator moves a
  decision to `decided`, `revisited` or `superseded`, or modifies one once it is decided; a
  member is refused with `manager_required`. Say so; do not retry.
- **note**: `record_note`. A date-anchored moment with **nobody in it**: a journal entry, an
  email log, a captured Slack thread, an observation. Notes are **immutable** once recorded.
  `record_note` no longer accepts `note_kind: "standup"` or `"meeting"` for a **new** note:
  that call is refused with the slug `note_kind_retired`, naming `record_meeting` as the
  tool to use instead. Notes recorded before this change keep their old `note_kind` and are
  untouched and still editable.
- **meeting**: `record_meeting`. Something that happens at a time, with people in it: a
  standup, a sprint review, a demo, a customer call, a workshop. Inputs: `title`; a
  free-text `meeting_type` in the project's own words ("Standup", "Sprint review", "Customer
  call": there is no fixed list); `scheduled_at`, an ISO timestamp **with a time** (a dated
  entry with no time is a note, not a meeting); `duration_minutes`; `attendees`, workspace
  members by `user_id` (or the literal `"me"`), or outside guests as `{ name, org }`, only
  members carry time; `body`, the agenda before the meeting and the minutes after, one field
  edited in place; `outcomes`, thread ids of records that already exist and came out of the
  meeting; and `repeat_of` to hold it again. **Status follows the date**: a `scheduled_at` in
  the past records the meeting `held`, one in the future books it `scheduled`: a meeting
  cannot be held in the future.
- **artifact / document**: `create_artifact` (or `record_knowledge`). Durable reference
  material meant to be re-read and kept current: a spec, a runbook, an RFC, release notes.
- **risk**: `record_risk`. Something that could cause harm if unaddressed, with severity,
  likelihood and a mitigation.
- **question**: `open_question`. Something that needs an answer before work proceeds.
- **update**: `publish_update`. A status report for stakeholders. Approval-gated by role in
  the same way: published immediately for a manager, staged for a member. `stage: true` places a
  manager's update in the Queue instead. `share_artifact` takes the same `stage`. Moving a
  draft update to `published` is a project manager's too.

**Decision or note?** If a choice was made and the team will need to know why later, it is a
decision. If it is a record of what happened at a moment in time, it is a note. Do not
record a decision to capture a meeting, and do not bury a choice in a meeting note.

**Meeting or note?** People met at a time → `record_meeting`. Something you wrote alone →
`record_note`.

## Feedback, and when it becomes a requirement

- **feedback**: `record_feedback`. Inbound customer or user signal: a bug report, an idea, a
  question about the product, general commentary relayed from a conversation, an email, a
  call. It lands in the project's Feedback inbox at status `new` for triage. It starts
  Internal: pass `customer_visible: true` when relaying a customer's own words they should
  see. Feedback from the site widget starts customer-visible.
- **A reporter who logged in through the widget** reads their own reports there, and the
  only words of yours they read are a reply you mark: `reply_to_thread { thread_id, body,
  for_reporter: true }`. It reaches them as plain text signed "Project team", so write it
  for them and leave out names and links. A marked reply is never Internal. The call is
  refused on anything but feedback with a logged-in reporter, and on a
  report the team marked Internal. Read `reporter_can_read` on the record's `detail` first.
  `reporter_verified` says the address was proven. They cannot answer in the widget.
- **A comment is Internal unless you say otherwise.** The team reads it and no customer
  does, on any record. `reply_to_thread { thread_id, body, audience: 'customer' }` shows it to
  the customers who can read the record, and is refused on a record that is not shared with
  one (`customer_shared` on `get_thread` says which). Only send a customer what is meant for
  them. A customer's own comment is always customer audience.
- Feedback is **not** the team's own work item. For that, use `open_task`. For an internal
  open question, use `open_question`.
- When a piece of feedback points at something genuinely new the product should do,
  **promote it**: `open_requirement { derive_from_thread_id: <feedback thread id> }`. That
  is the promotion path: do not open a task straight from feedback and lose the provenance.

## Change requests

A change request is **its own requirement record**, not an edit:

1. `open_requirement { req_type: "change_request", derive_from_thread_id: <target
   requirement id> }`. While it is open, the target is **untouched**.
2. `apply_change_request { cr_thread_id, ... }` applies it: the target is edited from the
   CR's proposed text, gains the next version marked `cr_applied`, and the CR moves to
   `done`. One act. It needs `acknowledge: true` because it writes a record you did not name.
3. Rejecting a CR is an ordinary `transition_thread` to `cancelled`, not an application.

## Links, not copies

A record points at what it relates to; it never copies it. Use `link_threads` with:
`parent`, `related`, `blocks` / `blocked_by`, `derives_from`, `supersedes`, `references`,
`part_of`.

## Before you open anything

- **Never invent a title.** Every tool that opens a record requires the title to come from what the user
  actually said. If they said "add a task" or "add a module" without saying what it is, call
  `request_form` to collect it, then open it next turn from the submitted values. If
  `request_form` answers `ask_in_chat`, which is what most clients get, because they cannot
  draw a form, ask those questions in your own message, wait for the person to answer, and
  then call the tool `next` names with their values.
- **The write tools ask for themselves.** `open_task`, `open_requirement`, `open_module`,
  `create_project` and `record_meeting` ask the person for a required detail you left out,
  before they write anything. If nobody can be asked, the call is refused
  (`validation_failed`) and the refusal carries `details.ask`: the questions, and the
  instruction to put them to the person and call again. A refusal like that wrote nothing:
  so read it as a question to relay, never as an error to retry.
- Do not invent a set of modules for a project because it looks tidy.
- Resolve people with `list_members` before passing any `assignee_id` or `owner_id`: a
  user id that was not returned by that call is rejected server-side.
- To find what already exists: `list_threads` for type-bounded enumeration in a project,
  `search_threads` when a term or concept is named, `list_recent_activity` for time windows,
  `workspace_briefing` for "how does the week look".

## Do not delete to fix a mistake

Members never delete; they move status: cancel a task, reject a requirement, withdraw a
question. Deletion is manager-only, goes to a recycle bin for 30 days, and needs
`acknowledge: true`. The main skill lists the calls that carry a gate.
