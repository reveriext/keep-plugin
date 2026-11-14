#!/bin/sh
# The Keep plugin in Claude Code: the first prompt of each session.
#
# Claude Code runs this script on every prompt (UserPromptSubmit) and passes the
# prompt's details as JSON on standard input. On the first prompt of a session it
# records the session in the plugin's data folder and adds one instruction to the
# assistant's context: report the state of the Keep connection to the person,
# once, and send the session's identifier as client_session to start_work. On
# every later prompt of the same session it prints nothing.
#
# The connection itself is verified by the hook beside this one, which calls the
# Keep connector under the person's own sign-in. This script reaches no network.
#
# It never stops a prompt: any problem ends the script with no output and exit 0.

input=$(cat)

# The first "session_id" key of the input. A prompt that quotes the same words
# carries them escaped (\"session_id\"), which this pattern does not match.
session=$(printf '%s' "$input" |
  grep -o '"session_id"[[:space:]]*:[[:space:]]*"[A-Za-z0-9._-]*"' |
  head -n 1 |
  sed 's/.*"\([A-Za-z0-9._-]*\)"$/\1/')
[ -n "$session" ] || exit 0

data="${CLAUDE_PLUGIN_DATA:-}"
[ -n "$data" ] || exit 0
dir="$data/sessions"
mkdir -p "$dir" 2>/dev/null || exit 0

marker="$dir/$session"
[ -e "$marker" ] && exit 0
: >"$marker" 2>/dev/null || exit 0

# Sessions recorded more than fourteen days ago are removed.
find "$dir" -type f -mtime +14 -exec rm -f {} + 2>/dev/null

# The session's identifier is given to the assistant for start_work, so that a
# work session and the agent time this plugin reports share one run in Keep.
# It holds only [A-Za-z0-9._-] (the pattern above), so it is safe inside JSON.
printf '%s%s%s\n' \
  '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"The Keep plugin verified the Keep connection at the first prompt of this session. If this context contains a statement that begins with \"Keep is connected as\", state that statement to the person once, in one line, at the start of your reply, and do not state it again in this session. If this context contains no such statement, state to the person once: \"Keep is not connected. Run /mcp, select the Keep server and complete sign-in.\" When you call start_work in this session, send client_session with the value \"' \
  "$session" \
  '\", so that Keep records the agent time of this session on the record in focus. The Keep plugin sends the token counts of this session to Keep: do not send usage figures to Keep in this session. Then respond to the prompt."}}'
exit 0
