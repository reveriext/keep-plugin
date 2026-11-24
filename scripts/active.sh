#!/bin/sh
# The Keep plugin in Claude Code: after a tool call, start the reporter
# (usage.mjs), at most once in 30 seconds, without starting Node on every call.
#
# Claude Code runs this in the background after each tool call (PostToolUse)
# and passes the call's details as JSON on standard input. The session's
# marker file, which usage.mjs writes at each such run with the time in
# seconds, tells whether the reporter ran within the last 30 seconds; if so,
# nothing runs. An answer in the question dialog or a plan's approval ends a
# wait for the person, so it always reaches usage.mjs. The script prints
# nothing and always ends with exit 0.

input=$(cat)
data="${CLAUDE_PLUGIN_DATA:-}"
[ -n "$data" ] || exit 0

case "$input" in
  *'"tool_name":"AskUserQuestion"'* | *'"tool_name": "AskUserQuestion"'* | \
  *'"tool_name":"ExitPlanMode"'* | *'"tool_name": "ExitPlanMode"'*)
    ;;
  *)
    # The first "session_id" key of the input, as session-check.sh reads it: a
    # tool's input that quotes the same words carries them escaped.
    session=$(printf '%s' "$input" |
      grep -o '"session_id"[[:space:]]*:[[:space:]]*"[A-Za-z0-9._-]*"' |
      head -n 1 |
      sed 's/.*"\([A-Za-z0-9._-]*\)"$/\1/')
    [ "${#session}" -le 200 ] || exit 0
    [ -n "$session" ] || exit 0
    marker="$data/usage/active-$session"
    if [ -f "$marker" ]; then
      stamp=$(head -c 20 "$marker" 2>/dev/null | tr -cd '0-9')
      now=$(date +%s)
      if [ -n "$stamp" ] && [ $((now - stamp)) -ge 0 ] && [ $((now - stamp)) -lt 30 ]; then
        exit 0
      fi
    fi
    ;;
esac

command -v node >/dev/null 2>&1 || exit 0
printf '%s' "$input" | node "$(dirname "$0")/usage.mjs"
exit 0
