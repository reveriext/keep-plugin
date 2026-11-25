# Time: a work session while you work, or a log after the fact

Time in Keep is a **log of effort**, not a clock and not an invoice. Keep records two kinds
of time, separately:

- **Assistant time** is the assistant's work. Keep calculates it; it is never asked of the
  person, and nobody edits it.
- **User time** is the person's own time, and nobody else's. Keep suggests it, and the
  person confirms or modifies it.

Assistant time and token counts are provisional estimates, calculated from the recorded compute and the data available.

User time is written down in two ways:

1. **A work session**: `start_work` when you start work on a record, `checkpoint_work` as you go,
   `pause_work` or `stop_work` when you leave it. The session's entry is the suggestion.
2. **`log_time`**, for the person's own work that no session covered, in minutes the
   person gives.

Both write the same kind of entry: the calling person's minutes, on a record, with a note.

User time needs the project's Person time tracking to be Simple or Advanced
(Configuration › Delivery standards › Time tracking), which `get_project` returns as
`ways_of_working.person_time_tracking`:

- **Simple** (Project level): a person records time on the project without naming a record:
  pass `project_id` alone to `log_time`. Time recorded on a task is still accepted. Done does
  not require time on the task, and the time controls do not apply.
- **Advanced** (Task level): time is recorded on a record. `log_time` with `project_id` alone
  is refused with `time_needs_record`. The time controls apply: Time at Done, Time is settled
  before Done, Time when a task moves to Review and Estimates on tasks.
- **Off**: no user time is recorded or suggested, and `log_time` is refused with
  `time_tracking_disabled`. Ask the person; do not modify the setting to clear the error. A work session
  still opens and keeps its work log, and the answer states that no time was recorded.

Assistant time has its own setting, Assistant time tracking, On or Off
(`ways_of_working.assistant_time_tracking`). The two settings are independent, and a project
manager modifies either at any time, from the moment it is saved.

## A work session

```
start_work { thread_id, also_thread_ids?, client_session?, client_label? }
checkpoint_work { session_id, note, commits?, usage? }
pause_work { session_id, summary, next?, commits?, usage?, preview?, confirmed?, minutes?, allocation?, as_of? }
stop_work { session_id, summary, next?, commits?, usage?, preview?, confirmed?, minutes?, allocation?, as_of? }
get_work_session { thread_id? }
```

- **`start_work`** opens a session on the record. A **task** moves to `in_progress` and is
  assigned to the person if nobody holds it. No other kind changes status when work on it
  starts. A task somebody else holds is not taken: the call is refused with `held_by_other`
  and says who holds it. Say so and ask.
- **`also_thread_ids`** names further records when one change serves them all (a fix that
  closes two bugs, a change that meets two requirements), up to ten. They open together
  with `thread_id`, each checked as `thread_id` is, and share the time equally. Name them
  only when the work really serves each one; otherwise start work on one record at a time.
- **`client_label`** is how your client is named on the record ("Cursor", "Codex"), up to
  40 characters. Optional. `client_session` is the conversation's identifier: the one
  `connection_status` returns, or the one the Keep plugin gives you
  ([connection.md](connection.md)). Send it on this call and on every other Keep call. With
  it, starting a second record closes the first, and the assistant time is recorded on the
  record in focus. Without it, `start_work` returns one: send that one from then on.
- **`checkpoint_work`** is quiet: it adds a line to the record's activity and grows the
  time entry, creating it on the first checkpoint.
- **`commits`**, on `checkpoint_work`, `pause_work` and `stop_work`, is a list of
  `{ sha, message, repo }`. `repo` is the `owner/name` of the checkout's git remote (from
  `git remote get-url origin`). Each commit goes on the record's Development tab, and Keep
  checks it with GitHub when the workspace has the GitHub app and the repository is
  connected to the project: a checked commit is marked, and a sha GitHub does not know is
  not linked. Without `repo` a commit is linked only when the project has exactly one
  connected repository; the answer says when one was not linked. The commits are also
  listed in the summary comment, as before.
- **`pause_work`** and **`stop_work`** work the same way and mean different things: pause
  means "coming back", stop means "done for now". Each closes the session and posts **one**
  summary comment. To resume, call `start_work` again.
- **`get_work_session`** lists what you have open. Use it when a conversation starts or
  resumes, and whenever you no longer have a `session_id`.

### Usage: what your client reports

`checkpoint_work`, `pause_work` and `stop_work` take an optional `usage`:

```
usage { model, input_tokens, output_tokens, cache_tokens, user_active_seconds }
```

- Pass it **when your client exposes these figures**, for the work since your last
  report: the model, the token counts, and the seconds the person was actively engaged.
  Send only the fields you have; every field is optional.
- **When the Keep plugin sends the token counts of your session**, you are told so at the
  first prompt. Then do not send `usage`: the figures would be counted twice.
- **Never invent figures.** Do not estimate tokens from the length of the conversation, and
  do not round a guess into `user_active_seconds`. A client that reports nothing is
  recorded as "Tokens not reported", which is correct.
- Tokens are recorded as indicative, for reference only. They are kept separately from
  time, are never added to it and are never priced.

### Assistant time and user time

**Assistant time** is the time your session spent working, recorded against the record in
focus. Keep calculates it in one of two ways, and the record states which:

- **Measured by the Keep plugin**: in a client where the Keep plugin reports the session's
  activity (Claude Code, except in the Code tab of the Claude desktop application), each turn from
  the person's prompt to the end of your reply is counted in full, up to a limit per turn,
  and each subagent's work is counted as its own run on the same record. Once the session
  is associated with its project, Keep records its time for that project from the first
  turn, whether or not a record is in focus. Work before a record is in focus is attributed
  to the record the work then focuses on; otherwise it remains on the project, unallocated.
- **Measured from Keep's calls**: elsewhere, Keep sees only its own calls. Every call that
  names the record counts as activity, and an inactivity period equal to the project's Idle
  limit (10 minutes by default) closes the session. So
  forty minutes of work between two calls is a few minutes on Keep's count: checkpoint at
  each completed step. The calls of one conversation form one run when each carries the
  conversation's `client_session`. A conversation that only reads, with no work session and
  no change to a record, records no assistant time and leaves nothing to settle, provided that
  no work session of the person is open while it reads.

**User time** is suggested from the person's own acts during the session: prompts, answers
to your questions, approvals, answered forms, reviews and meetings. The Keep plugin reports
when the person prompts or answers, never what they wrote. In a session associated with its
project, the person's acts that reached no record are suggested as one entry on the
project. A session in which the person did not act suggests no user time; only the assistant
time is recorded. User time is only suggested: it awaits the person's decision in My time ›
To settle, and is never confirmed on their behalf.

While a session the person started works or waits for them, the minutes within the
presence window after their last act are also suggested, as presence while assistants work;
a long reply extends the window by a reading allowance. Keep counts a minute once across
sessions, meetings and manual entries. A turn that Claude Code starts itself, such as a
scheduled task, is reported as a prompt, because Claude Code does not state who started it:
Keep cannot exclude it, and the person modifies the suggestion when they confirm their time.

**A manual entry takes precedence.** For each minute, Keep counts one source, in this order:
a range the person already confirmed, then a manual entry the person recorded with a start and
end time (`started_at` with `ended_at`), then their own act, then presence while assistants work.
Such a manual entry over confirmed presence is counted, and the confirmed presence it covers
is reopened for the person to confirm again while its week is open; in a locked week the
confirmed figure stands. A manual entry given as a duration only (`minutes`, with or without a
`day`) is counted on its day as manual time and has no start or end time.

**Every minute of user time carries its source**, and Keep shows the sources separately in My time,
Team and the reports: **Own acts** (the person's prompts, answers and approvals), **Presence while
assistants work** and **Manual** (time the person entered). Time recorded before the sources were
identified is shown as "Source not recorded". When several sessions run at the same time, Keep allocates each
minute to one session: the one the person acted in most recently, or the one waiting for them. That is an
allocation, not a measurement, and you state it as one. Assistant time is a separate measure and is never
added into user time: when you report both, give each figure with its name, and when you give a total, state
which of user time, assistant time or combined time it is. Until the person confirms a suggestion, it can
change as overlapping work completes; a confirmed entry is never moved.

**A week locks.** Each week stays open for two days after it ends, unless a workspace setting changes
that. A write of time to a locked week (`log_time`, `update_time_entry`, a confirmation in `stop_work`) is
refused with `week_locked`. Do not retry it and do not attempt another method: tell the person what the
refusal states. Only a workspace administrator records a correction to a locked week:
`update_time_entry` with `minutes` and `correction_reason`, on their word. The correction is kept
beside the original entry.

The assistant never asks the person for either figure. The summary states both, and the
person confirms or modifies the user time only.

A checkpoint or a stop on a session that was already closed after inactivity is still
accepted and updates the same entry, so a late summary is not lost.

### The person's prompts, where the Keep plugin does not report them

The Keep plugin's statement is the instruction the plugin gives at the first prompt: it begins
"Keep is connected as" and gives you the session's identifier ("send client_session with the
value …"). The answer to your own `connection_status` call is not that statement. Where the
statement is not in your context (the plugin did not run in this conversation, or the assistant
in use has no Keep plugin), report each prompt of the person yourself, while Keep is in use in
the conversation:

```
record_agent_activity { event: "person_prompt", session_id }
```

- **`session_id`** is the conversation's `client_session`, the one Keep issued (it begins with
  `kcs_`). Make the call only with such an identifier. The call names the workspace of the
  work, as your other Keep calls do.
- **Once in each turn in which the person wrote to you**, at the start of the turn, before any
  other Keep call of that turn. Make no such call in a turn that you, a schedule or another
  conversation started, and never from a subagent.
- **Send nothing of what the person wrote:** no words of the prompt, no summary and no length.
  Send only the fields above. Keep retains only the time of the prompt, the workspace to which
  it is reported, the conversation's identifier and the connection under which it was received,
  never any content of the prompt, and records it as the person's own act, under a source of its
  own, apart from the Keep plugin's reports.
- **Keep records these reports only from the person's acceptance of the Terms of Service dated
  25 November 2026.** For a person who has not accepted them, Keep answers the report and
  records nothing. Make the call all the same; do not ask the person about it.
- **An answer `recorded: false` (`not_recorded`) is not a reason to stop reporting.** Keep
  also returns it while Person time tracking is Off or when the conversation's limit is reached.
  Continue to report each prompt: a person who accepts the Terms during the conversation is
  recorded from that acceptance.
- **Where the Keep plugin's statement is in your context, make no such call:** the plugin
  reports the person's prompts itself.
- In Code Mode, make the call directly: never in a `code` script and never through `use_tool`.
- After the person declines Keep for the conversation, or asks you not to track the work, make
  no such call.

### Subagents, and conversations you start

- **A subagent** works inside this conversation. In its brief, give it this conversation's
  `client_session` and a `client_agent` label that names its role (for example `reviewer`:
  letters, digits and `-`, `_`, `.` or `:`, up to 64 characters), and instruct it to send both on
  each Keep call it makes. Keep records the subagent's calls as its own assistant run, beside
  the conversation's. A subagent does not call `start_work`, `pause_work` or `stop_work`: with
  the same `client_session`, a second record started would close the conversation's work
  session. It returns its commits and its result to you, and you record them with
  `checkpoint_work`. A subagent records no user time; the person acts in the conversation.
- **A conversation that you start** (for example, an additional session or a cloud session of
  your client) is a conversation of its own. Instruct it to call `connection_status` with `parent_session`
  set to this conversation's `client_session`, to send the `client_session` it receives on
  each of its calls, and to send `parent_session` again on its first `start_work`. Its
  assistant time is its own. It records no user time unless the person acts in it directly.
- **No figure in a brief.** Never pass a figure of time or `usage` to a subagent or a
  conversation that its client did not report; Keep calculates assistant time from the calls.

### Switching records

Switch when the subject of the work really changes for more than a few minutes: checkpoint,
then `start_work` on the other record. A glance at another record to reread something is
not a switch.

## The summary, and the person's yes

Time is saved as it accrues and stays **awaiting confirmation** until the person confirms it.
Time awaiting confirmation is real: it counts in every total and it satisfies the Done gate. The mark
only says the person has not looked yet. Confirming is theirs to do, never yours.

Show the summary at a stopping point: the work on the record is finished, or you are
parking it.

1. `stop_work { session_id, preview: true, summary, next? }` (or `pause_work`). It writes
   nothing. It answers `proposal`, `confirm` and `preview_as_of`, the instant it was
   computed at.
2. Show the person `proposal.text` as it is. It reads like this, and ends with the question:

   ```
   **ABC-12** · 15:35–16:40 IST (UTC+5:30)
   - Added the per-person column to the export
   - Covered the empty-month case with a test
   - Commits: a41c9e2

   Assistant time (calculated; it cannot be edited)
     Claude Code  15:35–16:40  52m  Tokens not reported

   Your time, 15:35–16:40
     active 12m · engaged 41m · elapsed 1h 05m

   Suggested user time (41m in total):
     ABC-12  41m  15:35–16:40

   Confirm the suggestion, or state the modified figure.
   Time outside this session requires a separate entry.
   If no response is received, 41m is recorded as suggested and marked as awaiting confirmation.

   Suggested user time for this session: 41m on ABC-12, at most 1h 05m. Do you confirm it, or modify it?
   ```

   The assistant time is the assistant's own, calculated by Keep; it is shown, not asked about.
   The person answers for their own time only. Where the client reported its token usage, a
   run reads "N reported tokens (indicative)". The times are in the workspace's time zone
   and the line names the zone. Do not rewrite them into another zone. When the person did
   not act during the session, the summary states that no user time is suggested and asks
   only whether the summary is correct.
3. Record what they say:
   - **they confirm** → `stop_work { session_id, summary, confirmed: true, as_of }`, `as_of`
     being the preview's `preview_as_of`: the suggestion is recorded as confirmed. When the
     time on the record was changed after the preview (for example, a manager's correction), the
     answer is refused (`entry_changed_since_preview`) with the figure that stands now:
     nothing is recorded, so show the summary again and ask again.
   - **a modified figure** ("50 minutes") → `stop_work { session_id, summary, confirmed:
     true, minutes: 50 }`. Any figure up to the time since the start is theirs to give. More
     than that is refused (`confirmed_over_elapsed`): other work goes to `log_time`.
   - **no user time suggested** (the person did not act in the session) → `stop_work
     { session_id, summary, as_of }`, with neither `confirmed` nor `minutes`: the assistant
     time is recorded and nothing awaits confirmation.
   - **no response received** → `stop_work { session_id, summary, as_of }`
     with neither, `as_of` being the preview's `preview_as_of`. The figure the preview
     stated after "If no response is received" is saved awaiting confirmation; the wait for
     an answer is not counted. It waits for them in Keep, under Time.
   - **they do not want it recorded** → do not send `confirmed`. Tell them that what was
     already saved is on the record, awaiting confirmation, and that they can change or
     delete it in Keep. No tool deletes a time entry.

`minutes` without `confirmed: true` is refused. `confirm` is the same question as a ready
`request_form` call, for a client that can draw a form.

### Concurrent records are asked together

When the session named several records, or another session of the person's ran at the same
time, the summary asks for all of those records together: it lists the assistant time, the
person's active, engaged and elapsed time, and the figure suggested for each record, and
states the limit ("ABC-16 and ABC-20 together cannot exceed 30m"). Show it as it is.

- **OK** → `stop_work { session_id, confirmed: true }`: the suggested figures are recorded
  as confirmed.
- **Different figures** → `stop_work { session_id, confirmed: true, allocation: [ { thread_id,
  minutes } ] }`, one row per record the person gave a figure for. Together they cannot exceed
  the elapsed time the summary states; an allocation above it is refused
  (`allocation_over_elapsed`), and you ask again.
- **No response received** → `stop_work { session_id }`: the suggestion is recorded and
  marked as awaiting confirmation.

### Time that awaits the person's decision

`list_time_entries` with `to_settle: true` returns the person's own time that awaits their
decision, for this week, a period (`from`, `to`), one project or one record: assistant runs not
yet allocated to a record (each with its `segment_id`), user time awaiting confirmation, and
periods in which concurrent work overlaps. Present it to the person and act only on their answer.

- **An unallocated run** is allocated with `allocate_time { segment_id, thread_id }`, to a record
  that the run modified or created, on the person's word. Only the person who directed the run
  allocates it, and only once: a second call is refused (`segment_already_allocated`). Their own
  unallocated user time over the same window moves with it, and the assistant time does not change.
  On the person's word, a run is instead retained as project time with
  `allocate_time { segment_id, retain: true }`, without `thread_id`; the same person retains it,
  once (`segment_already_retained`), and their user time does not move.
- **User time awaiting confirmation** is confirmed through `stop_work` at the close of a
  session, or with `update_time_entry` on the person's word.
- **An overlap** is settled by the person in My time › To settle. No connector tool settles it,
  except for a period too large to edit (next item).
- **A period too large to edit** record by record is confirmed, after the person agrees, with
  `update_time_entry { period }` in place of `entry_id`. `period` is the value that To settle or
  `list_time_entries` names for it, and the call confirms the split Keep calculated for the
  period, the elapsed time counted once. A large period may be confirmed in parts: when the
  answer states that only part of the split is confirmed, call `update_time_entry` again with
  `period` set to the group identifier (`ccgl_…`) that the answer names, until the answer states
  that the split is confirmed.

### The summary comment

`pause_work` and `stop_work` post exactly one comment on the record. Keep writes its first
line. You supply the rest:

- **`summary` says what the work session achieved**, past tense, in one line. The comment already
  lists the checkpoint notes: do not repeat them in it.
- **Commits by sha**, if any were made.
- **`next` only when something is left**: the person's words, or what is genuinely open on the
  record, such as an open checklist item. Never invent one to fill the space.

## `log_time`, for work no session covered

```
log_time { thread_id | project_id, minutes | (started_at + ended_at), day?, note, preview?, confirmed? }
```

- `thread_id` is the record the work was for, of **any kind**. Under Person time tracking
  Simple, `project_id` alone records the time on the project; under Advanced it is refused
  (`time_needs_record`): open a task if the work has none.
- Give `minutes` (1 to 1440), or `started_at` with `ended_at`.
- `day` is the calendar day the time is for, `YYYY-MM-DD`, in the person's own day. It
  defaults to their today.
- `note` says what was done.
- `confirmed: true` when the person gave or agreed to the figure. Without it the entry is
  saved awaiting confirmation, which is right for a figure you estimated.
- `preview: true` shows what would be recorded, with the `day` it would be filed on, and
  writes nothing.
- The entry always belongs to the calling person. You cannot log time for someone else.
- Backdating is bounded by the project's `time_backdate_days`. A day outside it is refused.

### Never invent a person's time

Assistant time is never asked of the person: Keep calculates it. Ask the person only for their
own work that no session covered, and `request_form` with one number field is the way.
When Keep wants that figure it hands you the form already written: `time_ask` on a task's
move to `review` with no time recorded, and `details.ask` on the `done` refusal. A task
with recorded assistant time needs neither, and nothing is asked. Send the form, then call
`log_time` with the answer. If the person cannot say, estimate from the work you actually
did and say so in the note ("estimated from the work done"). An estimate stated as such is
honest. A round number nobody can account for is worse than no number.

## Dates, and whose today

"Today" is the person's, not yours.

- `workspace_briefing` returns `calendar`: `today`, `weekday`, `time_zone`, `utc_offset`
  and `week_starts_on`.
- `list_time_entries` returns `today` and `time_zone` with every answer.
- **"Log it for today":** leave `day` out.
- **"Yesterday", "last Friday":** count back from `calendar.today` and send that as `day`.
- **"This week"** starts on `calendar.week_starts_on`. In a read, prefer the `when` preset
  over working out the bounds.
- When you tell the person the day on which the time was recorded, say the `day` Keep returned.

## A meeting's time goes on the meeting, and everyone records their own

There is no way to record a meeting's time for anyone but the caller. After you write a
meeting up (`record_meeting`), record only the person's own time:

- `transition_thread { thread_id, new_status: "held", duration_minutes, attended, book_my_time: true }`
  in the call that marks it held, or
- `log_time { thread_id: <the meeting> }` afterwards.

`attended` names who was present: user ids (or `"me"`) and guests by their exact name; omitted,
everybody on the meeting was present. `book_my_time` refuses the whole move when the person did
not attend. The other attendees are not left out: each of them is offered their own entry in
Keep. Outside guests carry no time.

## The Done gate

The gate applies only under Person time tracking Advanced, through the control
`time_at_done`. While it is Required (the default at the Standard and Strict levels; below the Professional
plan a Required control applies as Ask),
`transition_thread` to `done` is refused on a task with neither assistant time nor a time entry
on it (`done_requires_time`). At Ask, Keep requests the time and the move proceeds. Under Simple
or Off, Done does not require time on the task. Recorded assistant time satisfies the gate, and
so does a session's own entry, confirmed or not. `cancelled` is free. Other kinds have no such gate.

**The time in the closure snapshot.** Before a task moves to Done, `transition_thread` with
`preview: true` returns `snapshot.time`: the assistant time on the task (provisional, per run
when there are several), the person's user time (the confirmed figure, or the suggested
figure with its basis: active, engaged and elapsed) and the user time on the task. When the
person's time awaits confirmation, the snapshot's `ask` carries a minutes field with the
suggested figure as its default, and its `next` says how to confirm it with
`update_time_entry` before the close. A close under a session authorization never confirms
time: the suggested figure stays awaiting confirmation.

## Reading time back

```
list_time_entries { project_id | thread_id, user_id?, from?, to?, when? }
```

- Most recent first, capped at 200 rows. `from` and `to` are days, matched on each entry's own
  `day`. `from` is included and `to` is not.
- `when` is a preset counted from the person's today: `today`, `yesterday`, `week`, `7d`,
  `30d`, `month`, `all`. An explicit `from` or `to` wins.
- Do not add the rows up to answer a totals question: use the `totals` the answer carries
  (`minutes`, `entries`, `unconfirmed_minutes` and `unconfirmed_entries`, over every match).
  The cap would make the arithmetic incorrect.
- **Whose entries are returned.** A person who holds the project-manager capability reads
  everyone's entries on the project, and one member's with `user_id`. Anyone else reads every
  entry on one record (`thread_id`), and only their own across a project; a customer reads only
  their own. The answer's `scope` says which was applied.
- The Time report (`get_report`, in `reports.md`) is the project's own account of its time, for
  its managers.

## Correcting an entry

`update_time_entry { entry_id, minutes?, note?, correction_reason? }` changes one entry, on the
person's word. `entry_id` alone confirms it as it stands. Changing or confirming their own entry
marks it confirmed. Another person's entry needs the project-manager capability and stays
awaiting confirmation, because only its owner can confirm it. A correction (not a bare
confirmation) is refused outside `time_backdate_days`. `correction_reason` is a workspace
administrator's correction of an entry in a locked week, and requires `minutes`.
`update_time_entry { period }` confirms the split Keep calculated for a period too large to edit
(see "Time that awaits the person's decision").

## No cost, anywhere

Effort is recorded and never priced. There is no rate and no cost field. If asked what a
piece of work cost, give what the log holds (hours, who, on which record) and say pricing
is not part of Keep.

## Do not

- Do not ask the person for assistant time, or for a figure when a work session covered the
  work: the summary carries the suggestion.
- Do not log time for another person.
- Do not send `confirmed: true` or `minutes` unless the person said yes or gave that figure
  in this conversation. Silence is not a yes.
- Do not close a session without showing the summary first when a person is there to read
  it.
- Do not confirm someone's time with `update_time_entry` to clear an "Awaiting confirmation" mark.
- Do not log one entry per tool call, and do not post more than one summary per session.
- Do not send `usage` figures your client did not give you.
- Do not move a task to `done` with no time recorded on it on a project whose Person time
  tracking is Advanced.
- Do not ignore a `time_ask` or a confirmation request (field `ask`) that Keep hands you. It is the question, already
  written.
- Do not describe presence while assistants work as work the person did, and do not add assistant time to user
  time or give a total without stating which of the three views it is.
- Do not retry a write that was refused with `week_locked`.
- Do not guess today's date. Read `calendar.today`, and send dates as `YYYY-MM-DD`.
- Do not price anything.
