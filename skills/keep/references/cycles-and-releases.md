# Cycles: a window that produces something

`open_cycle` takes a **`cycle_kind`** and it is the whole choice:

- **sprint**: a one-to-two-week iteration.
- **phase**: a stage of delivery (Discovery, Build, Launch).
- **milestone**: a checkpoint someone is answerable for.
- **release**: a versioned release.

Every cycle has a `start_date`, an `end_date` and a `goal`. Statuses are `upcoming` →
`active` → `closed`. If the thing you are describing has no dates, it is a **module**, not a
cycle: see `records.md`.

## Planning a cycle

A cycle is planned from its goal, its dates and the estimates of its tasks.

1. **Open it in the person's words**: `open_cycle { project_id, title, cycle_kind, start_date,
   end_date, goal }`. The goal states what the cycle produces. Never choose the dates.
2. **Place the tasks in order** (the next section), and aim the requirements it delivers at a
   release with `update_requirement` and `target_cycle_id`.
3. **Request an estimate for each planned task**, in hours, and record the person's figure with
   `update_thread_detail` and `patch.estimate_hours`. The control `estimate_on_tasks` makes
   Keep request it when a task is planned into a cycle (Ask at the Standard level, under Person
   time tracking Advanced). Never estimate on the person's behalf.
4. **Request a due date** for each active task, as `ways-of-working.md` states.
5. **Report the plan as Keep holds it**: the tasks, their order, their estimates and their due
   dates, and the tasks that have no estimate. Keep records no capacity: make no statement about
   whether the work fits the cycle, and file nothing about it.
6. **Move unfinished work** before the close (below), with a reason on each task.

## Putting work in a cycle

- `manage_cycle_tasks { cycle_id, add: [...], remove: [...] }`.
- **A task is assigned to at most one cycle.** Adding a task that is already in another cycle
  *moves* it, and the result says where it came from.
- To take a task out, call `manage_cycle_tasks` on the cycle it is actually in: `remove`
  only accepts tasks already in the cycle you named.
- Every id is applied independently, so a planning call reads back as "17 moved, 1 not
  found". Read the result; do not assume.
- Requirements aim at a release through `target_cycle_id`, not through membership.

### The cycle's tasks have an order

A cycle is a plan, and a plan is a sequence. Each task carries a **rank** among its cycle
siblings: sparse integers spaced by 10, so there is always room to insert.

- **A task added with no position lands at the end.** That is the honest default: a task
  filed today is the newest thing said, not the most important.
- Say where one goes by passing an object instead of a bare id:

```
manage_cycle_tasks {
  cycle_id: <cycle>,
  add:  [ "task_A", { task_id: "task_B", position: "start" } ],
  move: [ { task_id: "task_C", after_task_id: "task_A" } ]
}
```

- `position` takes `"start"`, `"end"` or a 0-based index; `after_task_id` puts the task
  directly below a task **already in that cycle**.
- `add` is for a task arriving from the backlog or another cycle; `move` is for one already
  in this cycle. A `move` with no position is refused (`no_position_given`) rather than
  written: it would be a no-op wearing a verb.
- **Re-adding a task that is already there with no position leaves it exactly where it is.**
- `open_task { parent_cycle_id, position | after_task_id }` files a new task into the plan
  in one call. The cycle must be live and in the same project, or the call is refused
  (`invalid_cycle`).
- **Unranked sorts last.** A cycle nobody has ordered reads as it always did, most
  recently modified first, so an empty rank is "nobody has placed this", never "first".
- Read the order back with `get_thread` on the cycle, or `list_threads { kind: "task",
  cycle: <id> }`: scoped to one cycle that list is **already in plan order** (pass
  `sort: "rank"` anywhere else, or `sort: "updated"` to opt out).

## Moving unfinished work

A cycle of any kind is closed only when each of its tasks is Done or Canceled
(`cycle_tasks_settled_before_close`, Required at the Standard level). A task that is not
finished moves to the next cycle with `manage_cycle_tasks`, adding it to that cycle. Keep
requires a reason and has no field for it: write the reason in a reply on the task
(`reply_to_thread`), in one sentence that states why the work did not complete and where it
went. A task that will not be done is canceled under the cancellation rule instead
(`requirements.md`).

## A release and its deployment task

`open_cycle` with `cycle_kind: "release"` creates the release with its deployment task, "Deploy"
followed by the version and "to production", and returns it as `deployment_task`. The release
records it as `deployment_task_id`.

- The deployment task does not start while another task of the release is open
  (`release_deployment_task`). It is marked Done when the deployment is complete.
- A release has one deployment task. If it is in the recycle bin, restore it, or record another
  deployment task in the release's `deployment_task_id` (see "A release carries its identity").

## Closing a release or a milestone produces a document

This is the one transition that creates something:

```
transition_thread { thread_id: <cycle>, new_status: "closed", completion_note_md: "…" }
```

- On a **release** cycle the markdown becomes the **release notes**; on a **milestone**, the
  **completion note**. Either is filed as a published document on the project, linked to the
  cycle, and shown on its record.
- Passing `completion_note_md` on any other transition is **refused, not ignored**.
- A **release** closes only when it is complete (`release_complete_before_close`): every task Done or Canceled, its
  deployment task Done, its release notes attached, its release tag recorded (the version, the git tag and the bundle)
  and every requirement targeted at it Done or Canceled. Once an earlier release has closed, the release must also be
  linked to the release it replaces: `link_threads { relation: "supersedes" }`, the release the person names. A refusal
  lists what is missing; present it to the person.
- **The release notes are the cycle's completion artifact**, which only `completion_note_md` writes: on the close, as
  above, or beforehand on the release cycle (see "A release carries its identity"). An artifact linked with
  `link_threads` does not count as the release notes.
  A deployment task in the recycle bin is named as such: restore it, or record another deployment task.
- Closing a release records `deployed_at` when none is recorded yet.
- A cycle is created Upcoming or Active, never Closed: close it with `transition_thread`.

Write the notes before you close.

## A closed release is not modified

A closed release keeps its kind, version, git tag, bundle and deployment task, and no task leaves it, by a cycle
move or by the recycle bin: a task of a closed release, or its deployment task, is not deleted, nor is the closed
release itself. No requirement is targeted at a closed release, and a requirement's target does not leave one. To
change any of these, reopen the release, make the change and close it again. While
`closed_release_takes_no_task` is Required, no task is added to a closed release, including a task restored from the
recycle bin. A defect found after the release is filed in Maintenance or in the next release.

A closed cycle of any kind (a sprint, a phase, a milestone or a release) takes no open task: an open task is not
assigned to it, created in it, restored into it from the recycle bin, or re-assigned to it when the cycle is
restored from the recycle bin. A task that is
Done or Canceled may still be assigned to a closed cycle, and is not reopened while the cycle is closed, by any route
(a status change, or a reopened GitHub issue). Reopen the cycle to add open work to it, or open a new task for the
remaining work.

## A release carries its identity

On a cycle whose kind is `release`, and only there, record what was released:

```
update_thread_detail {
  thread_id: <release cycle>,
  patch: {
    version: "2.1.0",
    deploy_ref: "<the git tag on the released commit>",
    deploy_bundle: "<the deployed bundle>",
    deployed_at: "<ISO timestamp of the deployment>",
    deployment_task_id: "<the deployment task, only to record another one>",
    completion_note_md: "<the release notes, when they are written before the close>"
  }
}
```

The **release tag** is the version, the git tag and the bundle; a close without any one of them
is refused. These fields are refused on a sprint, a phase or a milestone (a milestone takes only
`completion_note_md`), and changing the version, the git tag, the bundle or `deployed_at` needs
the project-manager capability. Record them when the release is deployed, not before:
`deployed_at` is a fact about what happened.

## Close one, open the next

A release is completed in this order:

1. Move each unfinished task to the next release, with its reason, and settle every requirement
   targeted at the release.
2. Mark the deployment task Done once the deployment is complete.
3. Record the release tag, and link the release it replaces (`supersedes`).
4. Close the release cycle with its release notes in `completion_note_md`.
5. **Open the next release cycle** immediately, so the work in progress has a release to be
   assigned to.
6. **Re-point the standing Maintenance phase** at the version now in production: write its goal
   with `update_thread_detail` and `patch.goal_md`, naming the release in production. This is a
   practice, not a rule Keep enforces.

**Maintenance is a standing cycle.** Keep refuses to close a cycle labeled `maintenance`. Production bugs against the released version go to
the maintenance phase and ship as patches while the next version is being built; features go
to the open release cycle. Do not park a production bug on a release cycle that has not been
cut yet, and do not reopen a closed release to add work to it: open a task on maintenance.

## Reading a release

- `get_thread` on the cycle returns its identity and the completion artifact it produced.
- `list_threads { kind: "task", ... }` scoped to the project enumerates the work.
- `workspace_briefing` answers "how does the week look" in one call; do not fan out into
  many `list_threads` calls for that question.

## Do not

- Do not close a release cycle with a bare status flip when notes were expected.
- Do not put a version on a sprint.
- Do not move a task between cycles by editing it: call `manage_cycle_tasks`.
- Do not infer a plan's order from `updated_at`: that is the order in which records were last
  modified, which marking a checklist item complete changes. The rank is the order.
- Do not fake an order with title prefixes ("1. …", "2. …", "P1 -"). A number in a title
  is a number nothing sorts by, and it is incorrect once anything moves.
- Do not invent a release version. The version comes from what was actually released.
- Do not attach the release notes as a linked artifact: write them with `completion_note_md`.
- Do not state a capacity, or whether the plan fits the cycle: Keep records none.
