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
- How to keep track of time: it starts a work session, notes each step, shows you a summary
  before it stops, and books the figure you choose. Time you did not confirm is saved and
  marked awaiting confirmation until you confirm it in Keep.
- To name the record in every commit message.
- To keep each record's status true, and to ask before anything that cannot be taken back.
- To follow the project's controls: it states the project's rules when work starts, records
  each task's deliverable, writes acceptance criteria as a list, and presents every
  confirmation request that Keep returns to the person and never answers it itself.
- A method for each activity, from submitting a request to communicating outcomes.
- When the connection is in Code Mode: to write a script for several calls, and to make every
  step that needs the person's agreement its own `use_tool` call.

## What it does not do

The skill is instructions. It measures nothing and blocks nothing: Keep counts time from the
assistant's own calls and you choose the figure, and nothing stops a commit that names no
record. If your assistant does not follow it, tell it to "use the Keep skill".

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
skills/
  keep/
    SKILL.md
    references/
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
