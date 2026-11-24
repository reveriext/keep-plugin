#!/bin/sh
# The Keep plugin in Claude Code: the first prompt of each session.
#
# Claude Code runs this script on every prompt (UserPromptSubmit) and passes the
# prompt's details as JSON on standard input. On the first prompt of a session it
# records the session in the plugin's data folder and adds one instruction to the
# assistant's context: report the state of the Keep connection to the person,
# once, send the session's identifier as client_session to start_work, and bind
# the session to its Keep project, once, so that Keep records the session's time
# for that project from its first turn. On every later prompt of the same
# session it prints nothing.
#
# The project is read from the repository's .keep.json, in the session's working
# directory or the nearest directory above it, up to the root of the repository:
# { "workspace": "<workspace>", "project": "<project>" }. Without one, the
# assistant binds the session once the project of the work is established.
#
# The connection itself is verified by the hook beside this one, which calls the
# Keep connector under the person's own sign-in and sends the plugin's version
# with it; Keep answers whether this version is out of date. This script reaches
# no network.
#
# It never stops a prompt: any problem ends the script with no output and exit 0.

# What this script writes in the plugin's data folder is readable by this
# user only.
umask 077

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

# One string field of a JSON text whose value holds only [A-Za-z0-9._-], at
# most 100 characters. Any other value reads as absent, so nothing but those
# characters ever reaches the output below.
field() {
  found=$(printf '%s' "$2" |
    grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[A-Za-z0-9._-]*\"" |
    head -n 1 |
    sed 's/.*"\([A-Za-z0-9._-]*\)"$/\1/')
  [ "${#found}" -le 100 ] && printf '%s' "$found"
}

# The session's working directory ("cwd"), as the input states it. A path
# written with an escape (a quotation mark or a backslash) is not read.
cwd=$(printf '%s' "$input" |
  grep -o '"cwd"[[:space:]]*:[[:space:]]*"[^"\\]*"' |
  head -n 1 |
  sed 's/^"cwd"[[:space:]]*:[[:space:]]*"\(.*\)"$/\1/')

# The nearest .keep.json, from the working directory up to the root of the
# repository (the first directory holding .git, a folder or a file), at most
# 64 levels. Only its first 4 KB are read.
workspace=''
project=''
case "$cwd" in
  /*)
    at="$cwd"
    level=0
    while [ "$level" -lt 64 ]; do
      if [ -f "$at/.keep.json" ]; then
        text=$(dd if="$at/.keep.json" bs=4096 count=1 2>/dev/null | tr '\n\r\t' '   ')
        workspace=$(field workspace "$text")
        project=$(field project "$text")
        break
      fi
      [ -e "$at/.git" ] && break
      [ "$at" = / ] && break
      at=$(dirname "$at")
      level=$((level + 1))
    done
    ;;
esac

# The session's identifier is given to the assistant for start_work, so that a
# work session and the assistant time this plugin reports share one run in Keep.
# It holds only [A-Za-z0-9._-] (the pattern above), as do the workspace and the
# project, so each is safe inside JSON.
if [ -n "$workspace" ] && [ -n "$project" ]; then
  bind="The repository's .keep.json names the Keep workspace \\\"$workspace\\\" and the project \\\"$project\\\". Before responding, call record_agent_activity once, with event \\\"session_bind\\\", session_id \\\"$session\\\", project_id \\\"$project\\\" and workspace \\\"$workspace\\\", so that Keep records the time of this session for that project from its first turn."
else
  bind="When the Keep project of this work is established, call record_agent_activity once, with event \\\"session_bind\\\", session_id \\\"$session\\\", the project's identifier as project_id and its workspace as workspace, so that Keep records the time of this session for that project."
fi

printf '%s%s%s%s%s\n' \
  '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"The Keep plugin verified the Keep connection at the first prompt of this session. If this context contains a statement that begins with \"Keep is connected as\", state that statement to the person once, in one line, at the start of your reply, and do not state it again in this session. If this context contains no such statement, state to the person once: \"Keep is not connected. Run /mcp, select the Keep server and complete sign-in.\" If this context contains a statement that begins with \"The Keep plugin in this assistant is out of date\", state that statement to the person once, after the connection statement, and do not state it again in this session. When you call start_work in this session, send client_session with the value \"' \
  "$session" \
  '\", so that Keep records the assistant time of this session on the record in focus. The Keep plugin sends the token counts of this session to Keep: do not send usage figures to Keep in this session. ' \
  "$bind" \
  ' State nothing about that call to the person unless Keep refuses it; in that case, state the refusal once. Then respond to the prompt."}}'
exit 0
