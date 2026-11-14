# Time: a work session while you work, or a log after the fact

Time in Keep is a **log of effort**, not a clock and not an invoice. Keep records two kinds
of time, separately:

- **Agent time** is the assistant's work. Keep calculates it; it is never asked of the
  person, and nobody edits it.
- **User time** is the person's own time, and nobody else's. Keep suggests it, and the
  person confirms or modifies it.

Agent time and token counts are provisional estimates, calculated from the recorded compute and the data available.

User time is written down in two ways:

1. **A work session**: `start_work` when you pick a record up, `checkpoint_work` as you go,
   `pause_work` or `stop_work` when you leave it. The session's entry is the suggestion.
2. **`log_time`**, for the person's own work that no session covered, in minutes the
   person gives.

Both write the same kind of entry: the calling person's minutes, on a record, with a note.

Time needs the project's time tracking to be enabled (Project configuration, Delivery standards).
If `log_time` is refused for that reason, ask. Do not enable the feature to clear the
error. With tracking disabled a work session still opens and keeps its work log, and the answer
states that no time was recorded.

## A work session

```
start_work { thread_id, also_thread_ids?, client_session?, client_label? }
checkpoint_work { session_id, note, commits?, usage? }
pause_work { session_id, summary, next?, commits?, usage?, preview?, confirmed?, minutes?, allocation? }
stop_work { session_id, summary, next?, commits?, usage?, preview?, confirmed?, minutes?, allocation? }
get_work_session { thread_id? }
```

- **`start_work`** opens a session on the record. A **task** moves to `in_progress` and is
  assigned to the person if nobody holds it. No other kind changes status by being picked
  up. A task somebody else holds is not taken: the call is refused with `held_by_other`
  and says who holds it. Say so and ask.
- **`also_thread_ids`** names further records when one change serves them all (a fix that
  closes two bugs, a change that meets two requirements), up to ten. They open together
  with `thread_id`, each checked as `thread_id` is, and share the time equally. Name them
  only when the work really serves each one; otherwise start work on one record at a time.
- **`client_label`** is how your client is named on the record ("Cursor", "Codex"), up to
  40 characters. Optional. `client_session` is your client's own session identifier: with
  it, starting a second record closes the first. When the Keep plugin gives you this
  session's identifier, send it: the agent time the plugin measures is then recorded on
  the record in focus.
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

### Agent time and user time

**Agent time** is the time your session spent working, recorded against the record in
focus. Keep calculates it in one of two ways, and the record states which:

- **Measured by the Keep plugin**: in a client where the Keep plugin runs, each turn from
  the person's prompt to the end of your reply is counted in full, up to a limit per turn,
  and each subagent's work is counted as its own run on the same record. Work before a
  record is in focus is attributed to the record the work then focuses on, or remains
  unallocated.
- **Measured from Keep's calls**: elsewhere, Keep sees only its own calls. Every call that
  names the record counts as activity, and ten minutes of inactivity close the session. So
  forty minutes of work between two calls is a few minutes on Keep's count: checkpoint at
  each completed step.

**User time** is suggested from the person's own acts during the session: prompts,
approvals, answered forms, reviews and meetings. A session in which the person did not act
suggests no user time; only the agent time is recorded.

The assistant never asks the person for either figure. The summary states both, and the
person confirms or modifies the user time only.

A checkpoint or a stop on a session that was already closed after inactivity is still
accepted and updates the same entry, so a late summary is not lost.

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

   Agent time (calculated; it cannot be edited)
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

   The agent time is the assistant's own, calculated by Keep; it is shown, not asked about.
   The person answers for their own time only. Where the client reported its token usage, a
   run reads "N reported tokens (indicative)". The times are in the workspace's time zone
   and the line names the zone. Do not rewrite them into another zone. When the person did
   not act during the session, the summary states that no user time is suggested and asks
   only whether the summary is correct.
3. Record what they say:
   - **they confirm** → `stop_work { session_id, summary, confirmed: true }`: the
     suggestion is recorded as confirmed.
   - **a modified figure** ("50 minutes") → `stop_work { session_id, summary, confirmed:
     true, minutes: 50 }`. Any figure up to the time since pick-up is theirs to give. More
     than that is refused (`confirmed_over_elapsed`): other work goes to `log_time`.
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
time, the summary asks for all of those records at once: it lists the agent time, the
person's active, engaged and elapsed time, and the figure suggested for each record, and
states the limit ("ABC-16 and ABC-20 together cannot exceed 30m"). Show it as it is.

- **OK** → `stop_work { session_id, confirmed: true }`: the suggested figures are recorded
  as confirmed.
- **Different figures** → `stop_work { session_id, confirmed: true, allocation: [ { thread_id,
  minutes } ] }`, one row per record the person gave a figure for. Together they cannot exceed
  the elapsed time the summary states; a split above it is refused
  (`allocation_over_elapsed`), and you ask again.
- **No response received** → `stop_work { session_id }`: the suggestion is recorded and
  marked as awaiting confirmation.

### The summary comment

`pause_work` and `stop_work` post exactly one comment on the record. Keep writes its first
line. You supply the rest:

- **`summary` and the checkpoint notes say what changed**, past tense, one line each.
- **Commits by sha**, if any were made.
- **`next` only when something is left.** Do not make one up to fill the space.

## `log_time`, for work no session covered

```
log_time { thread_id, minutes | (started_at + ended_at), day?, note, preview?, confirmed? }
```

- `thread_id` is the record the work was for, of **any kind**. Time is never logged on the
  bare project: open a task if the work has none.
- Give `minutes` (1 to 1440), or `started_at` with `ended_at`.
- `day` is the calendar day the time is for, `YYYY-MM-DD`, in the person's own day. It
  defaults to their today.
- `note` says what was done.
- `confirmed: true` when the person gave or agreed to the figure. Without it the entry is
  saved awaiting confirmation, which is right for a figure you estimated.
- `preview: true` shows what would be logged, with the `day` it would be filed on, and
  writes nothing.
- The entry always belongs to the calling person. You cannot log time for someone else.
- Backdating is bounded by the project's `time_backdate_days`. A day outside it is refused.

### Never invent a person's time

Agent time is never asked of the person: Keep calculates it. Ask the person only for their
own work that no session covered, and `request_form` with one number field is the way.
When Keep wants that figure it hands you the form already written: `time_ask` on a task's
move to `review` with no time recorded, and `details.ask` on the `done` refusal. A task
with recorded agent time needs neither, and nothing is asked. Send the form, then call
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
- When you tell the person which day you logged against, say the `day` Keep returned.

## A meeting's time goes on the meeting, and everyone records their own

There is no way to record a meeting's time for anyone but the caller. After you write a
meeting up (`record_meeting`), record only the person's own time:

- `transition_thread { thread_id, new_status: "held", duration_minutes, book_my_time: true }`
  in the call that marks it held, or
- `log_time { thread_id: <the meeting> }` afterwards.

The other attendees are not left out: each of them is offered their own entry in Keep.
Outside guests carry no time.

## The Done gate

`transition_thread` to `done` is refused on a task with neither agent time nor a time entry
on it (`done_requires_time`), on a project that tracks time. Recorded agent time satisfies
it, and so does a session's own entry, confirmed or not. `cancelled` is free. Other kinds have no such gate.

**The time in the closure snapshot.** Before a task moves to Done, `transition_thread` with
`preview: true` returns `snapshot.time`: the agent time on the task (provisional, per run
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

- Newest first, capped at 200 rows. `from` and `to` are days, matched on each entry's own
  `day`. `from` is included and `to` is not.
- `when` is a preset counted from the person's today: `today`, `yesterday`, `week`, `7d`,
  `30d`, `month`, `all`. An explicit `from` or `to` wins.
- Do not add the rows up to answer a totals question: use the `totals` the answer carries.
  The cap would make your arithmetic wrong.

## Correcting an entry

`update_time_entry { entry_id, minutes?, note? }` changes one entry, on the person's word.
`entry_id` alone confirms it as it stands. Changing or confirming their own entry marks it
confirmed. Another person's entry needs the project-manager capability and stays
awaiting confirmation, because only its owner can confirm it.

## No cost, anywhere

Effort is recorded and never priced. There is no rate and no cost field. If asked what a
piece of work cost, give what the log holds (hours, who, on which record) and say pricing
is not part of Keep.

## Do not

- Do not ask the person for agent time, or for a figure when a work session covered the
  work: the summary carries the suggestion.
- Do not log time for another person.
- Do not send `confirmed: true` or `minutes` unless the person said yes or gave that figure
  in this conversation. Silence is not a yes.
- Do not close a session without showing the summary first when a person is there to read
  it.
- Do not confirm someone's time with `update_time_entry` to clear an "Awaiting confirmation" mark.
- Do not log one entry per tool call, and do not post more than one summary per session.
- Do not send `usage` figures your client did not give you.
- Do not move a task to `done` with no time recorded on it.
- Do not ignore a `time_ask` or a confirmation request (field `ask`) that Keep hands you. It is the question, already
  written.
- Do not guess today's date. Read `calendar.today`, and send dates as `YYYY-MM-DD`.
- Do not price anything.
