# Cycles: a window that produces something

`open_cycle` takes a **`cycle_kind`** and it is the whole choice:

- **sprint**: a one-to-two-week iteration.
- **phase**: a stage of delivery (Discovery, Build, Launch).
- **milestone**: a checkpoint someone is answerable for.
- **release**: a versioned ship.

Every cycle has a `start_date`, an `end_date` and a `goal`. Statuses are `upcoming` →
`active` → `closed`. If the thing you are describing has no dates, it is a **module**, not a
cycle: see `records.md`.

## Putting work in a cycle

- `manage_cycle_tasks { cycle_id, add: [...], remove: [...] }`.
- **A task sits in at most one cycle.** Adding a task that is already in another cycle
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
  recently touched first, so an empty rank is "nobody has placed this", never "first".
- Read the order back with `get_thread` on the cycle, or `list_threads { kind: "task",
  cycle: <id> }`: scoped to one cycle that list is **already in plan order** (pass
  `sort: "rank"` anywhere else, or `sort: "updated"` to opt out).

## Closing a release or a milestone produces a document

This is the one transition that creates something:

```
transition_thread { thread_id: <cycle>, new_status: "closed", completion_note_md: "…" }
```

- On a **release** cycle the markdown becomes the **release notes**; on a **milestone**, the
  **completion note**. Either is filed as a published document on the project, linked to the
  cycle, and shown on its record.
- Passing `completion_note_md` on any other transition is **refused, not ignored**.
- Omitting it is allowed and honest: the record then says "no release notes" out loud.

Write the notes before you close. Closing without them is a state you have to explain later.

## A release carries its identity

On a cycle whose kind is `release`, and only there, record what shipped:

```
update_thread_detail {
  thread_id: <release cycle>,
  patch: {
    version: "2.1.0",
    deployed_at: "<ISO timestamp of the deploy>",
    deploy_ref: "<git tag or build identifier>"
  }
}
```

These three are refused on a sprint, a phase or a milestone, and changing them needs the
project-manager capability. Fill them in when the release is deployed, not before: `deployed_at` is a fact about what happened.

## Close one, open the next

Shipping is a sequence, in this order:

1. Publish the release notes and link them on the release cycle.
2. Close the release cycle with the ship date and its version identity.
3. **Open the next release cycle** immediately, so in-flight work has somewhere to land.
4. **Re-point the standing Maintenance phase** at the version now in production.

**Maintenance is standing, not a sprint.** Production bugs against the shipped version go to
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
- Do not infer a plan's order from `updated_at`: that is the order things were last
  touched, which ticking a checkbox changes. The rank is the order.
- Do not fake an order with title prefixes ("1. …", "2. …", "P1 -"). A number in a title
  is a number nothing sorts by, and it is wrong the moment anything moves.
- Do not invent a release version. The version comes from what actually shipped.
