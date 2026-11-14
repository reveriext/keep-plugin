# Keep for your AI assistant

Keep is a project record: requirements, tasks, decisions, and the time spent on them. This
package lets an AI assistant work in it: the Keep connector, and the Keep skill that tells the
assistant how to work in Keep. It works with any AI assistant that connects to remote MCP
servers. The exact steps for each assistant, as they appear on its screens, are on
My profile › Connections in Keep and at https://hykeep.app/connect.

## 1. Install the Keep plugin (preferred)

Where your AI assistant installs plugins, add this repository as a plugin marketplace and
install Keep from it. The connector and the skill arrive together.

```
reveriext/keep-plugin
```

Then sign in with your Keep account when the connector asks. Examples of the same step from a
terminal:

```
claude plugin marketplace add reveriext/keep-plugin && claude plugin install keep@keep-plugin
codex plugin marketplace add reveriext/keep-plugin && codex plugin add keep@keep-plugin
copilot plugin marketplace add reveriext/keep-plugin && copilot plugin install keep@keep-plugin
```

**Automatic updates in Claude Code.** Claude Code installs a new version of the Keep plugin
automatically only when automatic updates are enabled for the marketplace it came from. They
are disabled for a marketplace you add yourself. Enable them once: run `/plugin`, open
**Marketplaces**, select **keep-plugin** and select **Enable auto-update**. A new version
takes effect in the next session, or after `/reload-plugins`. An organisation can enable
the same setting for its members with `autoUpdate: true` on the marketplace's
`extraKnownMarketplaces` entry in a Claude Code settings file.

## 2. Or connect Keep and add the skill

1. **Connect Keep.** Add a remote MCP server with this address. It is a Streamable HTTP
   server; a browser tab opens, and you sign in with your Keep account. No key is needed.

   ```
   https://mcp.hykeep.app/mcp
   ```

2. **Add the Keep skill.** The skill is the folder `skills/keep/` in this package (a
   `SKILL.md` and its `references/`), in the Agent Skills format. Add it wherever your
   assistant keeps skills, as the folder or as a ZIP of it.

## The formats in this package

The Keep plugin follows the open Agent Plugins 1.0.0 format (`plugin.json`,
`mcp.json` and `skills/`), with the manifest fields some assistants read in addition: the
`com.openai` interface block (name, description and logo) and `.claude-plugin/` (a plugin
marketplace of one plugin).

## What the skill tells the assistant

- When to use Keep: it finds the project, reads the project's "AI assistants work in Keep" setting
  (Always, or Ask first), and asks you once if it has to. A no holds for the conversation.
- Record first: a requirement before something new, a task before code.
- Time: the assistant starts a work session, records each step, and before it stops
  presents a summary with the agent time Keep calculated and the user time Keep suggests.
  It never asks you for the agent time. You confirm or modify the suggestion; a suggestion
  you did not confirm is recorded and marked awaiting confirmation until you confirm it in
  Keep. Agent time and token counts are provisional estimates, calculated from the recorded
  compute and the data available.
- To name the record in every commit message.
- To keep each record's status true, and to ask before anything that cannot be taken back.
- To follow the project's controls: it states the project's rules when work starts, records
  each task's deliverable, writes acceptance criteria as a list, and presents every
  confirmation request that Keep returns to the person and never answers it itself.
- A method for each activity, from submitting a request to communicating outcomes.
- When the connection is in Code Mode: to write a script for several calls, and to make every
  step that needs the person's agreement its own `use_tool` call.

## Connection verification in Claude Code

In Claude Code, the Keep plugin verifies the Keep connection at the first prompt of each
session, and the assistant states the result once:

- connected: "Keep is connected as" the person, with their email address and workspaces;
- not connected: "Keep is not connected. Run /mcp, select the Keep server and complete
  sign-in."

It does so with two hooks on each prompt. One calls Keep's `connection_status` tool through
the plugin's own connection, under the sign-in you already completed; it never opens a
sign-in of its own. The other is a short shell script that records each session in the
plugin's data folder, so the result is stated once per session; it makes no network requests.
The session's identifier is given to the assistant at the same time, for `start_work`, so
that a work session and the agent time below are recorded on the same record.

## Agent time in Claude Code

In Claude Code, the Keep plugin measures the agent time of each session. It calls Keep's
`record_agent_activity` tool through the plugin's own connection when you submit a prompt,
when the assistant finishes its reply, when a subagent starts and stops, and when the
session ends. Keep counts each turn in full, and each subagent as its own run on the record
in focus. Nothing is asked of you: the agent time is calculated, and only your own time is
suggested for your confirmation. The calls carry the session's identifier, the subagent's
identifier and type, and the event; never your prompt, the reply or any file.

Each call is made to the workspace in which the session started work on a record. Where
you belong to one workspace only, it is made to that workspace. Otherwise Keep retains the
calls, for up to seven days, until the session starts work on a record, and then records
them in that workspace, in order. Work done before a record is in focus is therefore
recorded too.

The plugin also sends the token counts of each turn and subagent. When the assistant
finishes a reply or a subagent finishes, a short script, run in the background, reads the
lines of the session's transcript written since its previous run, adds up the tokens of
each model, and sends the totals to Keep. It sends the model's name and the four token
counts (input, output, cache read, cache creation); never your prompt, the reply or any
file. It is authorised by a report code: Keep returns a code once per session, at its
first prompt, valid for that session only and for nothing but token counts, and Claude
Code records it in the session's transcript, where the script reads it. The code expires
after 24 hours, and the next prompt then brings a new one. The script keeps its progress
and any totals not yet sent in the plugin's data folder, and sends no line twice. It needs
Node.js; without it, the token counts are not sent and the agent time is unaffected.

Each project states how it records time and token counts (Configuration › Delivery
standards › Time). Keep issues a report code only while the project's token counts are
Automatic. Without a code the script reads none of the transcript's token counts and sends
nothing, and the plugin adds nothing to the assistant's context. A short call to Keep at
each turn remains while the plugin is installed. Automatic adds about 0.2 to 0.4 seconds
to each prompt and a small amount of context once per session. Each hook waits at most 3 seconds (2 for a subagent), and Keep
answers within 1.5 seconds; a report Keep has not answered by then is recorded all the
same.

Claude Code also runs the prompt check on turns it starts itself (a scheduled task, a
background subagent reporting back, a message from another session). Its hook details do
not distinguish those turns, so Keep counts them as prompts.

Claude Code displays a notice when a plugin that contains hooks is installed. To disable
the plugin's hooks entirely, run `/plugin`, open the installed plugins and disable the Keep
plugin, or set `"disableAllHooks": true` in Claude Code's settings, which disables the hooks
of every plugin. An organisation can also restrict hooks with `allowManagedHooksOnly`. The
Keep connector works without the hooks; agent time is then calculated from Keep's calls
only. Other assistants receive no hooks from this package.

## What it does not do

The skill is instructions. It measures nothing and blocks nothing: outside Claude Code, Keep
calculates agent time from the assistant's own calls, and nothing stops a commit that names
no record. If your assistant does not follow it, tell it to "use the Keep skill". The hooks
in Claude Code perform no function other than verifying the connection and reporting the
agent's work as described above.

## Privacy

Keep's privacy policy: https://hykeep.app/privacy

## What is in the package

```text
.claude-plugin/
  plugin.json
  marketplace.json
  icon.png
plugin.json
mcp.json
hooks/
  claude-code.json
scripts/
  session-check.sh
skills/
  keep/
    SKILL.md
    references/
      connection.md
      records.md
      requirements.md
      cycles-and-releases.md
      ways-of-working.md
      time.md
      code-mode.md
      planning.md
      activities.md
README.md
CHANGELOG.md
LICENSE
```
