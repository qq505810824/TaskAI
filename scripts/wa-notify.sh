#!/bin/bash
set -u

NAME="${1:-Unknown}"
MSG="${2:-}"
JID="${3:-}"
MESSAGE_ID="${4:-}"
SYSTEM_PROMPT_ARG="${5:-}"
SYSTEM_PROMPT="${SYSTEM_PROMPT_ARG:-${OC_WA_SYSTEM_PROMPT:-You are a helpful WhatsApp assistant. Be concise and natural.}}"

[ -z "$JID" ] && exit 0
[ -z "$MSG" ] && exit 0

if [[ "$JID" == *"@g.us" ]]; then
  if ! printf '%s' "$MSG" | python3 -c 'import re,sys; msg=sys.stdin.read(); raise SystemExit(0 if re.search(r"@|\bolivia\b", msg, re.I) else 1)'; then
    exit 0
  fi
fi

ENV_FILE="${TASKAI_WHATSAPP_ENV_FILE:-$HOME/.taskai-whatsapp-dispatch.env}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

OPENCLAW_WHATSAPP_ADDR="${OPENCLAW_WHATSAPP_ADDR:-http://127.0.0.1:8555}"

is_assistant_allowed_sender() {
  [ -z "${OC_WA_ASSISTANT_ALLOWLIST:-}" ] && return 0

  python3 - "$JID" "${OC_WA_ASSISTANT_ALLOWLIST:-}" <<'PY'
import sys

jid = (sys.argv[1] or "").strip()
raw_allowlist = sys.argv[2] or ""

variants = {jid}
head = jid.split("@", 1)[0].strip()
if head:
    variants.add(head)
digits = "".join(ch for ch in head if ch.isdigit())
if digits:
    variants.add(digits)
    variants.add(f"{digits}@s.whatsapp.net")

allowed = set()
for chunk in raw_allowlist.replace(",", "\n").splitlines():
    item = chunk.strip()
    if item:
        allowed.add(item)

raise SystemExit(0 if variants & allowed else 1)
PY
}

handle_taskai_verification() {
  [ -z "${TASKAI_BASE_URL:-}" ] && return 1
  [ -z "${TASKAI_INTERNAL_BRIDGE_TOKEN:-}" ] && return 1

  local request_body response handled reply
  request_body="$(python3 - "$JID" "$MSG" "$MESSAGE_ID" <<'PY'
import json
import sys

jid, message, message_id = sys.argv[1:]
print(json.dumps({
    "fromJid": jid,
    "message": message,
    "messageId": message_id or None,
}))
PY
)"

  response="$(curl -fsS \
    -X POST \
    -H "Authorization: Bearer ${TASKAI_INTERNAL_BRIDGE_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$request_body" \
    "${TASKAI_BASE_URL}/api/internal/whatsapp/verify-binding" 2>/dev/null)" || return 1

  handled="$(python3 - <<'PY' "$response"
import json
import sys

payload = json.loads(sys.argv[1])
print("true" if ((payload.get("data") or {}).get("handled")) else "false")
PY
)"

  [ "$handled" != "true" ] && return 1

  reply="$(python3 - <<'PY' "$response"
import json
import sys

payload = json.loads(sys.argv[1])
print(((payload.get("data") or {}).get("replyMessage")) or "")
PY
)"

  if [ -n "$reply" ]; then
    openclaw-whatsapp send "$JID" "$reply" --addr "$OPENCLAW_WHATSAPP_ADDR" >/dev/null 2>&1 || true
  fi

  exit 0
}

handle_taskai_verification

if ! is_assistant_allowed_sender; then
  exit 0
fi

DATA_DIR="${OC_WA_AGENT_DATA_DIR:-/tmp/openclaw-wa-agent}"
QUEUE="$DATA_DIR/queue.jsonl"
SEEN_IDS="$DATA_DIR/seen_message_ids.txt"
WORKER_PATH="${OC_WA_WORKER_PATH:-$HOME/.local/bin/wa-notify-worker.sh}"

mkdir -p "$DATA_DIR"
touch "$QUEUE" "$SEEN_IDS"

if [ -n "$MESSAGE_ID" ]; then
  if grep -Fqx "$MESSAGE_ID" "$SEEN_IDS" 2>/dev/null; then
    exit 0
  fi
  echo "$MESSAGE_ID" >> "$SEEN_IDS"
  tail -n 5000 "$SEEN_IDS" > "$SEEN_IDS.tmp" && mv "$SEEN_IDS.tmp" "$SEEN_IDS"
fi

python3 - "$NAME" "$MSG" "$JID" "$MESSAGE_ID" "$SYSTEM_PROMPT" >> "$QUEUE" <<'PY'
import json
import sys
import time

name, msg, jid, message_id, system_prompt = sys.argv[1:]
print(json.dumps({
    "ts": int(time.time()),
    "name": name,
    "message": msg,
    "jid": jid,
    "message_id": message_id,
    "system_prompt": system_prompt,
}, ensure_ascii=False))
PY

if [ -x "$WORKER_PATH" ]; then
  nohup "$WORKER_PATH" >/dev/null 2>&1 &
fi

exit 0
