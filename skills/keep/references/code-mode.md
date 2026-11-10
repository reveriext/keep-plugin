# Scripts: working in Keep through `code`

A person can have Keep serve a connection in Code Mode. Its tool list is then short:

- `get_skill`: this skill and its reference files. It is listed in every mode.
- `code`: runs one script, an async JavaScript function that calls Keep's tools as
  `keep.<tool>(args)` and returns a JSON value. Its description lists the tools a script
  may call, with their fields.
- `use_tool`: calls one Keep tool directly, with `name` and `arguments`.
- `request_form`: asks the person, as in every mode.

`code` and `use_tool` both take `workspace`. A call inside a script works in that
workspace unless its own arguments name another.

If `code` and `use_tool` are not in the tool list, the connection has every tool listed
(All tools). Call each tool directly, as the rest of this skill says. Nothing here applies.

## When to write a script

Write a script when one step of work takes several Keep calls:

- reading and filtering: a project's blocked tasks, the records a cycle still holds;
- opening several records the person has listed, one after another;
- reading what a step needs before you put it to the person.

```js
async () => {
  const project = await keep.get_project({ project_id: "<project id>" });
  const blocked = await keep.list_threads({
    project_id: "<project id>",
    kind: "task",
    status: "blocked",
  });
  return { project, blocked };
}
```

Return what you need and no more: the script's answer is what you read.

Call one tool with `use_tool` when the step is one call, and always for the calls in the
next section.

## Consequential steps are never in a script

These calls change what people see or can do. Keep refuses each of them inside `code`, and
the error names `use_tool`. Make each one its own `use_tool` call, after the person has
agreed to that act, with `acknowledge: true` in `arguments` where the tool asks for it.

- Approvals and rejections: `approve_run`, `reject_run`.
- Deletions and restores: `delete_thread`, `delete_project`, `restore_thread`.
- Archiving and converting artifacts: `archive_artifact`, `convert_artifact`.
- Decisions, publishing and sharing: `record_decision`, `publish_update`, `share_artifact`.
- Change requests: `apply_change_request`.
- Members and roles: `remove_workspace_member`, `revoke_workspace_invitation`,
  `set_workspace_member_role`; and, inside tools that also do ordinary things,
  `manage_project_members` with `action` set to `remove`, and `manage_team` with
  `remove_member` or `delete`.
- Forms: `request_form`. It asks the person, so it cannot run inside a script.

Any other call that needs `acknowledge: true` is refused in a script as well. A script may
read what the step needs; the step itself is the `use_tool` call.

Approvals follow the person's role in every mode: a project manager, the project owner or a
workspace admin may `approve_run` through `use_tool`, on the person's explicit word; a
member is refused, and the run waits for a project manager in Keep's Queue.

## Limits

- 40 tool calls and 30 seconds per script. The calls run one at a time.
- No network. A script reaches Keep through `keep.<tool>` and nothing else.
- If a script fails, its answer says what failed and lists the calls it made. A call Keep
  refused throws an error carrying the refusal. Read it, then fix the script, or call the
  tool with `use_tool`.

## Every call inside is an ordinary Keep call

Each `keep.<tool>` call is one Keep tool call, checked as if you had made it yourself: the
same access, the same audit, the same time tracking. A script cannot do what you could not
do one call at a time.

Work sessions work the same inside a script: `start_work`, `checkpoint_work`,
`pause_work` and `stop_work`. The rule before stopping still holds. Call `stop_work` with
`preview: true`, show the person `proposal.text` exactly as returned, and wait. Booking
their figure (`confirmed: true` with `minutes`) is a later call, made after they answer.

## Who chooses the mode

The person chooses for each connection, on My profile › Connections, under Tools:

- **Automatic**, the default: chat assistants get Code Mode, coding agents get every tool.
- **Code Mode**: `get_skill`, `code`, `use_tool` and `request_form`.
- **All tools**: every tool, called one at a time. `code` and `use_tool` are not listed,
  and the assistant works as it always has.

A change applies from the assistant's next request. When Code Mode is not available,
every connection is served all tools, and a call to `code` says so.

## Do not

- Do not put a step from the list above in a script, or look for a way around the refusal.
- Do not preview and book time in the same script: the person answers between the two.
- Do not run a failed script again before reading which of its calls were made.
- Do not write a script for one call. Use `use_tool`.
- Do not change the Tools setting for the person. It is theirs, on My profile.
