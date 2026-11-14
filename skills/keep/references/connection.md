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
session. When it reports "Keep is connected as" a person, state that statement to the
person once, in one line, and do not repeat it in the same session.

## Keeping the Keep plugin up to date

Claude Code installs a new version of a plugin automatically only when automatic updates
are enabled for the marketplace the plugin was installed from. For a marketplace the person
added, they are disabled until the person enables them. If the person asks how to keep the
Keep plugin up to date, state:

"Run /plugin, open Marketplaces, select keep-plugin and select Enable auto-update."

A new version takes effect in the next session, or after /reload-plugins. To install an
update immediately: "Run /plugin, open Installed, select Keep and select Update now."
