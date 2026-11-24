# Reports: written from the figures Keep calculates

Keep calculates four reports for each project: the project report, the Time report, the
decision log and the risk register. `get_report` returns one of them: its definition, Keep's
own figures and named records for a period, and a link to the same report in Keep. You write
the sentences. Keep supplies every figure and every named record, so the report you write
states what the report in Keep states.

## When to use it

- The person asks for a project report, a status report, a Time report, a decision log or a
  risk register, or asks a question one of them answers: "What did the team spend its time
  on this month?", "What was delivered in the last 30 days?", "Which risks are open?".
- Preparing a report reads Keep and records nothing. It is not work on a record: do not ask
  whether to use Keep for it, and open no work session.
- A question about one record, or about the person's own time, is answered by the tools for
  that, such as `get_thread` and `list_time_entries`, not by a report.

## The call

```
get_report { project_id, report, period?, from?, to?, reading? }
```

| `report` | The report | Period when none is given |
|---|---|---|
| `project` | The project report | The last 7 days |
| `time` | The Time report | The last 7 days |
| `decisions` | The decision log | All time |
| `risks` | The risk register | All time |

- **The project.** `project_id` takes the project's id, code or slug. Find the project as the
  skill says; ask only when more than one project could be meant. A call reads one project:
  there is no report across projects.
- **The period.** `period` takes `today`, `7d` or `30d`, and also `all` for the decision log
  and the risk register. For any other period, such as "this month", send `from` and `to`:
  dates in the person's calendar (`calendar.today` from `workspace_briefing`), both
  inclusive. Without either, Keep applies the default above.
- **The reading.** `reading` is `summary`, the default, which leads with the conclusions and
  the key figures, or `details`, the full breakdown. Send `details` when the person asks for
  the full report or for every record.

## Writing the report

The answer holds `project`, `period` (its dates, its `label` and its time zone, and the
previous period where Keep compares), `definition` (the report's `title` and its
`sections`, each with a `key`, a `title` and a `rule`), `facts` (the figures and records of
each section, under its `key`), `notes` and `link`.

1. Begin with the report's title, the project's name and code, and the period: its label
   and its dates.
2. Write each section of `definition.sections` in the order given, under its title, as its
   `rule` directs, from that section's `facts`. Omit no section. When a section holds no
   records, state so in one sentence.
3. **Use every figure and every named record exactly as returned.** Never add, round,
   recompute or estimate a figure, and never state a figure that `facts` does not contain,
   not even a total or a percentage you could derive from it. A figure that is absent or
   null is withheld: state that it is not available, never that it is zero. A section
   with `count` 0 and no `records` holds nothing in the period.
4. Name each record by its code and its title, as returned.
5. Where the answer carries the previous period, describe the comparison as "compared with
   the previous period", with the figures Keep returned for it.
6. State each note in `notes`, in Keep's words.
7. End with `link`, the same report in Keep.

Write in a formal register: complete, neutral sentences, no contractions, no exclamation
marks, and Keep's own terms ("period", "Delivered", "Summary", "Details", "user time"). The
Time report shows user time, including time awaiting confirmation. It does not include
assistant time.

## Refusals

Present each refusal in Keep's words. Do not build the report from other tools instead.

- **A member who does not manage the project** receives: "Reports are for the project’s
  managers. Your own time is on the Time page." State it, then offer the person their own
  time on the project, which `list_time_entries` returns.
- **A customer** is refused. State the refusal and offer no report.
- **The Time report on a plan without "Time reports and exports"**: the refusal names the
  feature and the plan that includes it. State it as returned.
- **A project that records no time** (Person time tracking and Assistant time tracking both
  Off) and has no recorded time: the answer holds no figures and the note "This project
  records no time. Person time tracking and Assistant time tracking are Off." State the note,
  and state no figure. Time recorded before both settings were Off is reported as usual.

## A document, or a copy in Keep

`get_report` reads only. It saves nothing in Keep.

- **A document.** When the person wants a document, make it with your own means from the
  same answer: the same sections, figures, period, notes and link.
- **A permanent copy in Keep** is made in Keep, with **Capture** on the toolbar of the
  project report or the Time report; direct the person to `link`. The decision log and the
  risk register have no Capture. Do not save the report in Keep through any other tool: a
  captured report is visible only to the people who see Reports, and a document saved
  otherwise is not.

## Through `code` and `use_tool`

In Code Mode, call `get_report` inside a `code` script: `get_report` reads, and `use_tool`
makes changes only. One script may read several reports together, for example the project
report and the risk register. Return each answer whole: every section, note and link is
written from it.
