# Plan before you build

Keep's method is that a substantial piece of work is **written down before any code is
written**, and the writing is what gets reviewed. Follow this whenever you are asked to
plan, scope or start something larger than a single edit.

## 1. Write the plan first

Produce one document, not a chat answer. Open it with:

- **The Keep records it serves**: the requirement id, the task id, the release cycle.
- **The design of record** it descends from, by path or by artifact id.
- **The operating model in force**: who specifies, who builds, who reviews and commits.

File it in the workspace so it outlives the session: `create_artifact` with
`type: "document"` on the project (or `record_knowledge`, which funnels to the same place),
then attach it with `link_threads { relation: "related" }` to the requirement or cycle it
serves. A plan that lives only in a transcript is not a plan.

## 2. Say what is already built

Before the packets, write a short section stating what exists today and what that means for
this work: the tables, the switches, the tools, the surfaces already in place. Most plans
shrink by half at this step, and the ones that do not have found real work.

## 3. Cut the work into packets

A **packet** is the unit one executor takes end to end. Give every packet:

- **A name and a number** (`Packet 1: connector agents`), so it can be referred to.
- **An explicit file list.** Name every file the packet creates or edits, with one line
  saying what changes in each. If you cannot list the files, the packet is not specified
  yet.
- **The rules, in the order the code hits them.** Numbered, concrete, decidable: "resolve
  the thread server-side", not "handle the thread properly".
- **Its own gate**: the typecheck, the tests and the lint run that must pass before the
  packet is done.
- **What is deliberately out of scope**, so the next person does not re-derive it.

## 4. Disjoint by file, then parallel

**Two packets must never name the same file.** File disjointness is what makes packets safe
to run at the same time, and it is the only merge protocol here: there is no rebase dance
between executors.

Where a packet genuinely depends on another (a migration must exist before the worker reads
its columns), say so in one line at the top of the plan: which packets run in parallel,
which one waits, and on what. Order the dependent chain explicitly rather than hoping.

## 5. One hand reviews and commits

- **Executors never commit and never push.** They leave the work in the tree.
- One reviewer reads every packet, reconciles them, and makes the commit.
- Executors do not run deploy tooling, do not touch remote databases, and do not run
  workflows. The main skill has the full gate.

If you are the executor: finish, verify, report what you changed, and stop.

## 6. Put the plan into Keep as records

The document is the narrative; the records are what the team tracks against.

1. `open_requirement` for the capability the work delivers: this is where anything new
   starts. State it as the user stated it.
2. `open_task { requirement_id }` for each packet, so the work hangs off what it is for.
   The requirement's Delivery pane counts exactly these.
3. `open_cycle` when the work is timeboxed, and place the tasks with `manage_cycle_tasks`.
   A task sits in at most one cycle.
4. `record_decision` for every ruling the plan settles: the choice plus the rationale plus
   the options weighed. It is approval-gated; a human confirms before it lands.
5. `open_question` for anything the plan could not settle, so it is visible rather than
   forgotten in a paragraph.
6. `record_meeting` for a kickoff, a review or a call the plan was shaped by: and whatever
   it produced (a decision, a task, a question, a risk, a piece of feedback) is opened as a
   record of its own and linked to the meeting, either when it is recorded (`record_meeting`'s
   `outcomes`, the ids of records that already exist) or afterward with `link_threads
   { relation: "derives_from" }`. Never leave what a meeting produced sitting only as bullets
   in the minutes: a decision buried in a meeting note is a decision nobody can find later.
   A standup that repeats every day does so with `repeat_of`, not a fresh meeting typed from
   scratch each time.

Do not invent titles. If the user said "plan the billing work" without saying what it is,
call `request_form` to collect it rather than opening a record named "Initial kickoff". If
`request_form` answers `ask_in_chat`, which is what most clients get, because they cannot
draw a form, ask those questions in your own message, wait for the person to answer, and
then call the tool `next` names with their values.

The tools that open a record also ask for themselves: `open_task`, `open_requirement`, `open_module`,
`create_project` and `record_meeting` ask the person for a required detail you left out,
before they write anything: `record_meeting` for its time and its length, because every
attendee's own time is suggested from them. If nobody can be asked, the call is refused
(`validation_failed`) and the refusal carries `details.ask`: the questions, and the
instruction to put them to the person and call again. A refusal like that wrote nothing.

## 7. Close the loop

Work each packet inside a work session on its task (`start_work`, `checkpoint_work`,
`stop_work`), so the time is on the task before you move it. Then move the task with
`transition_thread`. For work no session covered, book the person's time with `log_time`
on the record: one entry per task, not per tool call. Time in Keep is a person's time.

**In that order.** A task cannot reach `done` on a time-tracking project with nothing logged
against it; the server refuses the move. That gate is task-only. Time itself goes on **any
record**: a requirement's or a cycle's total is its own entries plus the time on the tasks
that deliver it. See `time.md`.

## Do not

- Do not start coding a multi-file change with no written plan.
- Do not write a packet whose file list overlaps another's.
- Do not commit, push, merge or deploy as an executor.
- Do not fold three unrelated concerns into one packet because they are all "backend".
