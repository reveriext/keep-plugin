# The connection: restoring it, and keeping the plugin up to date

## When Keep is not connected

Keep is not connected when its tools are not among your tools, or when a Keep call fails
because the connection is not established, the sign-in has expired, or the sign-in was
refused. In that case:

1. Do not retry the call, and do not describe the work as recorded.
2. State to the person: "Keep is not connected." Then give the one step for the assistant
   in use, in these words:
   - **Claude Code:** "Run /mcp, select the Keep server and complete sign-in."
   - **Claude (claude.ai and the Claude desktop application):** "Open Settings ›
     Connectors, select Keep and select Connect."
   - **Codex:** "Open Settings › MCP servers, select Keep and select Authenticate."
   - **Any other assistant:** "Open the list of MCP servers in the assistant's settings,
     select Keep and sign in with your Keep account."
3. Continue the work without Keep only if the person agrees.

**Keep listed twice.** In Claude, Keep can be listed twice: once as the Keep connector and
once through the Keep plugin. Both reach the same Keep. If the person sees two entries, or
one is connected and the other is not, state: "Keep is listed twice. Use one entry and
remove the other." Neither entry holds data of its own. Removing one entry does not delete any data.

## When Keep is connected

In Claude Code, the Keep plugin verifies the connection at the first prompt of each
session, except in the Code tab of the Claude desktop application, where its verification
does not run. When it reports "Keep is connected as" a person, state that statement to the
person once, in one line, and do not repeat it in the same session.

## When the Keep plugin is out of date

In Claude Code, the Keep plugin sends its version to Keep at the first prompt of each
session. When a newer version is published, Keep adds a statement that begins "The Keep
plugin in this assistant is out of date", with the installed version, the current version
and the update step for the assistant in use. State that statement to the person once,
after the connection statement, in Keep's words, and do not repeat it in the same session.
Do not update the plugin on the person's behalf. When Keep adds no such statement, the
plugin is current: say nothing about its version.

## At the start of a conversation: the verification and the identifier

When no statement from Keep is in your context at the first use of Keep in a conversation (the
plugin did not make its verification, or the assistant in use does not make one), make the
same verification yourself, once per conversation: call `connection_status` with `plugin_version`
set to the version that SKILL.md states and `client` set to the assistant in use (`claude-code`,
`claude`, `codex`, `chatgpt`, `cursor` or `vscode`; for any other assistant, omit `client`). State the
connection statement it returns and, when it states that the plugin is out of date, its update
step, and ask the person to update the plugin before the work continues. In Claude Code, a
missing statement also means that the plugin did not run its own verification in this session,
so it did not report the person's prompts and answers: Keep measures the assistant time from
Keep's calls, and you report each prompt of the person as time.md states. State this to the
person once, in one line.

The same call returns `client_session`: the identifier that Keep issues for this conversation.
An identifier that Keep issues begins with `kcs_`. Retain it for the whole conversation and send it,
unchanged, as `client_session` on every later Keep call, reads included, and on each `code` and
`use_tool` call in Code Mode. Keep then records the calls of the conversation as one assistant run.

- **The Keep plugin's identifier.** When the Keep plugin's statement is in your context, it gives
  you the session's identifier ("send client_session with the value …"). Send that value as
  `client_session` on every Keep call instead, and do not call `connection_status` for another.
- **Never invent or alter an identifier.** Send only the one Keep issued or the one the Keep
  plugin gave you. A `start_work` that carries no `client_session` returns one: send that one
  from then on.
- **`client_session_not_issued`.** The call was refused because the identifier was not issued for
  this connection, for example after the connection was revoked and connected again. Call `connection_status`
  without `client_session` to obtain a new one, and repeat the call with it.
- **`client_session_unavailable`.** Keep cannot verify an identifier on this connection at
  present. Repeat the call without `client_session`, as the refusal states.
- **A conversation that only reads records no time.** A question or a report that changes no
  record and opens no work session records no assistant time and leaves nothing to settle,
  provided that no work session of the person is open while it reads; a read made while one is
  open counts toward that session's time. Once the conversation changes a record or opens a
  work session, its time is recorded.

## Keeping the Keep plugin up to date

Claude Code installs a new version of a plugin automatically only when automatic updates
are enabled for the marketplace the plugin was installed from. For a marketplace the person
added, they are disabled until the person enables them. If the person asks how to keep the
Keep plugin up to date, state:

"Run /plugin, open Marketplaces, select keep-plugin and enable automatic updates."

A new version takes effect in the next session, or after /reload-plugins. To install an
update immediately: "Run /plugin, open Installed, select Keep and select Update now."
