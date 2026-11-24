# Scripts: working in Keep through `code` and `use_tool`

A connection in Code Mode has a short tool list:

- `get_skill`: this skill and its reference files. It is listed in every mode.
- `connection_status`: whether the connection works, and for whom. It is listed in every mode.
- `code`: runs one script, an async JavaScript function that reads Keep by calling its read
  tools as `keep.<tool>(args)` and returns a JSON value. Its description lists the read tools,
  with their fields.
- `use_tool`: makes one change in Keep, with `name` and `arguments`. Its description lists the
  write tools, with their fields.
- `request_form`: asks the person, as in every mode.
- One tool that the Keep plugin calls to record the assistant's activity. It is not yours to
  call.

`code` and `use_tool` both take `workspace`. A call inside a script works in that
workspace unless its own arguments name another.

If `code` and `use_tool` are not in the tool list, the connection has every tool listed
(All tools). Call each tool directly, as the rest of this skill says. Nothing here applies.

## Reads go through `code`

Every read is a `code` script, a single lookup included. One script can also read and
filter several things in one step: a project's blocked tasks, the records a cycle still
holds, what a step needs before you put it to the person.

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

A script reads only. A call to any other tool inside a script is refused, its error names
`use_tool`, and nothing is written.

## Each change is its own `use_tool` call

Make every change as one `use_tool` call: opening or updating a record, a reply, a label, a
link, time, a status change. `use_tool` refuses a read tool; read through `code`.

Some calls look like reads but change or may change a record, so they are `use_tool` calls
as well: `get_work_session`, and the previews of `stop_work` and `transition_thread` with
`preview: true`.

To open several records the person has listed, make one `use_tool` call for each, one
after another.

## Changes that need the person's agreement

These changes alter what people see or can do. Make each one its own `use_tool` call, after
the person has agreed to that act, with `acknowledge: true` in `arguments` where the tool
asks for it.

- Approvals and rejections: `approve_run`, `reject_run`.
- Deletions and restores: `delete_thread`, `delete_project`, `restore_thread`.
- Archiving and converting artifacts: `archive_artifact`, `convert_artifact`.
- Decisions, publishing and sharing: `record_decision`, `publish_update`, `share_artifact`.
- Change requests: `apply_change_request`.
- Members and roles: `remove_workspace_member`, `revoke_workspace_invitation`,
  `set_workspace_member_role`; and, inside tools that also do ordinary things,
  `manage_project_members` with `action` set to `remove`, and `manage_team` with
  `remove_member` or `delete`.
- Forms: `request_form`. It asks the person: call it directly, never inside a script and
  never through `use_tool`.

A script may read what the step needs; the step itself is the `use_tool` call.

Approvals follow the person's role in every mode: a project manager, the project owner or a
workspace administrator may `approve_run` through `use_tool`, on the person's explicit word; a
member is refused, and the run waits for a project manager in Keep's Queue.

## Limits

- 40 tool calls and 30 seconds per script. The calls run one at a time.
- No network. A script reaches Keep through `keep.<tool>` and nothing else.
- If a script fails, its answer says what failed and lists the calls it made. A call Keep
  refused throws an error carrying the refusal. Read it, then correct the script.

## Every call is an ordinary Keep call

Each `keep.<tool>` call and each `use_tool` call is one Keep tool call, checked as if you had
made it yourself: the same access, the same audit, the same time tracking. Neither can do
what you could not do one call at a time.

Work sessions are `use_tool` calls: `start_work`, `checkpoint_work`, `pause_work` and
`stop_work`. The rule before stopping still holds. Call `stop_work` with `preview: true`,
show the person `proposal.text` exactly as returned, and wait. Recording their figure
(`confirmed: true` with `minutes`) is a later `use_tool` call, made after they answer.

## Who chooses the mode

The person chooses for each connection, on My profile › Connections, under Tools:

- **Automatic**, the default: All tools for ChatGPT and Codex, and Code Mode for every other
  AI assistant.
- **Code Mode**: `get_skill`, `connection_status`, `code`, `use_tool`, `request_form`, and the
  tool the Keep plugin calls to record the assistant's activity.
- **All tools**: every tool, called one at a time. `code` and `use_tool` are not listed,
  and the assistant works as it always has.

A change applies from the assistant's next request. When Code Mode is not available,
every connection is served all tools, and a call to `code` says so.

## Do not

- Do not put a change in a script, or look for a way around the refusal.
- Do not call a read through `use_tool`.
- Do not run a failed script again before reading which of its calls were made.
- Do not change the Tools setting for the person. It is theirs, on My profile.
