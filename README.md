# Keep for your assistant

Keep is a project record: requirements, tasks, decisions, and the time spent on them. This
package lets an AI assistant work in it. There are three ways in, and they give the assistant
the same thing.

## 1. The connector, then the skill

1. **Connect Keep.** Add a remote MCP server in your assistant with this address:

   ```
   https://mcp.hykeep.app/mcp
   ```

   It is a Streamable HTTP server. A browser tab opens: sign in with your Keep account.
2. **Add the Keep skill.** The skill is the folder `skills/keep/` in this package (a
   `SKILL.md` and its `references/`), in the Agent Skills format. Add it wherever your
   assistant keeps skills, as the folder or as a ZIP of it.

## 2. The agent plugin

This folder is an agent plugin in the open Agent Plugins 1.0.0 format: `plugin.json`,
`mcp.json` (the connector above) and `skills/` (the skill above). An assistant that loads
agent plugins gets both in one install, then asks you to sign in.

## 3. The Claude plugin

For Claude Code, the same connector and skill come as a Claude plugin. This folder
is also a plugin marketplace of one plugin, in `.claude-plugin/`. In Claude Code:

```
/plugin install keep --marketplace reveriext/keep-plugin
```

or, from a terminal:

```
claude plugin marketplace add reveriext/keep-plugin
claude plugin install keep@keep-plugin
```

Then sign in with your Keep account when the connector asks.

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
