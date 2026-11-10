# Activities and their methods

Keep has no delivery roles. Anyone may perform any activity that their access allows: a
developer may report a defect, and a project manager may implement a task. Access remains
as it is (workspace owner and admins, a project's managers, a project's members). What Keep
adds is a method for each activity. When the person performs one of these activities,
follow its method, whoever they are.

Each method below describes a project at the Standard level. The project's own controls
decide what is requested and what is required: read them in the `protocol` block that
`start_work` returns, or in `get_project` (`ways_of_working.controls`). A control that is
Off is not mentioned. A control at Ask is requested once and the person may decline. A
control at Required is requested, and Keep refuses the move until it is satisfied.

## 1. Submitting a request

The person reports a need, a defect or a question that is not yet accepted as work.

1. Search first with `search_threads` or `list_threads`. If the request already exists,
   add to it with `reply_to_thread` rather than opening a second record.
2. Record it with `record_feedback`, as a bug, an idea, a question or general feedback.
3. For a defect, ask the person for the expected result and the actual result.

A request is not work until it is accepted.

## 2. Accepting and specifying

The person decides that a request is work and states exactly what is wanted.

1. Open a requirement with `open_requirement`. Pass the request as
   `derive_from_thread_id`, so the requirement and its origin remain linked.
2. Write the statement in `body`: what must be true, and why, in the person's words.
3. Write the acceptance criteria in `acceptance_md` as a top-level list, one checkable
   criterion per item. Each top-level item is one criterion; text that is not a list is a
   single criterion. See [requirements.md](requirements.md).
4. Request the module (`module_id`) and the release it is promised into
   (`target_cycle_id`).

## 3. Designing

The person decides how the work will be built.

1. Read the earlier decisions and artifacts linked to the requirement and its module.
2. Record each design choice with `record_decision`. A member's waits for a project manager's approval.
3. Save designs, specifications and plans as artifacts (`create_artifact`) and link them
   to the requirement with `link_threads`.
4. Divide the requirement into tasks with `open_task`, each with its `requirement_id`,
   `module_id` and `parent_cycle_id`.

## 4. Planning

The person decides the schedule of work and identifies the risks.

1. Assign tasks to a sprint or a release with `manage_cycle_tasks`, in order.
2. Request an estimate on each task that is planned into a cycle.
3. Report tasks without estimates, blocked or overdue work, open risks and open questions.
4. Record a risk with `record_risk` and a question that must be answered with
   `open_question`, addressed to a named person.

## 5. Implementing

The person, or the assistant on their behalf, does the work of a task.

1. Call `start_work`. Read its `protocol` block: state the project's rules in one line,
   and read the linked artifacts when the project asks for it.
2. Call `checkpoint_work` at each completed step, with the commits the step made.
3. Record the deliverable (see [ways-of-working.md](ways-of-working.md)): the commits when
   the work changed code; otherwise offer to save the document the work produced as an
   artifact linked to the task, or record a link or a written outcome.
4. Work through the Definition of Done and mark each item.
5. Before stopping, call `stop_work` with `preview: true` and show the person the summary.
   The person chooses the time.
6. Move the task to Review with `transition_thread` when the work is ready to be checked.

## 6. Reviewing

The person checks completed work and accepts it or returns it.

1. Show the deliverable, the Definition of Done and the time recorded on the task.
2. Accept it with `transition_thread` to `done`, or return it to `in_progress` with a
   `reason` that states what is missing.
3. Where the project requires it, the reviewer is someone other than the assignee.

## 7. Verifying

The person confirms that a delivered requirement meets its acceptance criteria.

1. List each acceptance criterion of the requirement.
2. Mark each criterion met or not met with `update_requirement` and its
   `acceptance_state`, by each criterion's `key`. Mark a criterion only on evidence, never
   on your own judgement alone.
3. A criterion that is not met becomes a bug against the requirement (activity 8).
4. Move the requirement to `done` with `transition_thread` once every criterion is met.

## 8. Reporting a defect

The person reports that something does not behave as intended.

1. Decide what it is. A **bug** is a delivered requirement that does not behave as its
   acceptance states. Unfinished work on a requirement not yet delivered is a plain task.
2. Open a bug with `open_task`: `task_type` is `bug`, and `requirement_id` names the
   delivered requirement.
3. Record the steps to reproduce it (`steps_md`), the expected result (`expected_md`) and
   the actual result (`actual_md`).

## 9. Releasing

The person closes a release.

1. Confirm that every task that was released is `done`.
2. Move each task that was not released to the next cycle, with a reason.
3. Save the release notes as an artifact linked to the release, and close the cycle.

## 10. Communicating outcomes

The person informs the people outside the work.

1. Publish an update with `publish_update`. A member's waits for a project manager's approval.
2. Answer the reporter of each closed feedback record with `reply_to_thread` and
   `for_reporter`, then close the feedback with a link to the record it became.
