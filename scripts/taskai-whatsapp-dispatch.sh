#!/bin/bash
set -euo pipefail

TASKAI_BASE_URL="${TASKAI_BASE_URL:-http://localhost:3000}"
TASKAI_INTERNAL_BRIDGE_TOKEN="${TASKAI_INTERNAL_BRIDGE_TOKEN:-}"
OPENCLAW_WHATSAPP_ADDR="${OPENCLAW_WHATSAPP_ADDR:-http://127.0.0.1:8555}"

if [ -z "$TASKAI_INTERNAL_BRIDGE_TOKEN" ]; then
  echo "TASKAI_INTERNAL_BRIDGE_TOKEN is required" >&2
  exit 1
fi

if ! command -v openclaw-whatsapp >/dev/null 2>&1; then
  echo "openclaw-whatsapp not found in PATH" >&2
  exit 1
fi

CLAIM_RESPONSE="$(curl -fsS \
  -X POST \
  -H "Authorization: Bearer ${TASKAI_INTERNAL_BRIDGE_TOKEN}" \
  "${TASKAI_BASE_URL}/api/internal/whatsapp/jobs/claim")"

export CLAIM_RESPONSE
JOB_ID="$(python3 - <<'PY'
import json
import os

payload = json.loads(os.environ["CLAIM_RESPONSE"])
job = ((payload.get("data") or {}).get("job"))
print("" if not job else (job.get("id") or ""))
PY
)"

if [ -z "$JOB_ID" ]; then
  exit 0
fi

NUMBER="$(python3 - <<'PY'
import json
import os

payload = json.loads(os.environ["CLAIM_RESPONSE"])
recipient = ((payload.get("data") or {}).get("recipient")) or {}
print(recipient.get("phoneNumber") or "")
PY
)"

MESSAGE="$(python3 - <<'PY'
import json
import os

payload = json.loads(os.environ["CLAIM_RESPONSE"])
job = ((payload.get("data") or {}).get("job")) or {}
message = job.get("rendered_message") or ""
message = message.replace("\\r\\n", "\n").replace("\\n", "\n")
print(message)
PY
)"

if [ -z "$NUMBER" ] || [ -z "$MESSAGE" ]; then
  RESULT_BODY="$(python3 - <<'PY'
import json
print(json.dumps({
    "status": "failed",
    "errorMessage": "Missing phone number or rendered message in claimed job"
}))
PY
)"

  curl -fsS \
    -X POST \
    -H "Authorization: Bearer ${TASKAI_INTERNAL_BRIDGE_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$RESULT_BODY" \
    "${TASKAI_BASE_URL}/api/internal/whatsapp/jobs/${JOB_ID}/result" >/dev/null
  exit 1
fi

SEND_OUTPUT=""
SEND_STATUS="sent"
if ! SEND_OUTPUT="$(openclaw-whatsapp send "$NUMBER" "$MESSAGE" --addr "$OPENCLAW_WHATSAPP_ADDR" 2>&1)"; then
  SEND_STATUS="failed"
fi

export SEND_OUTPUT SEND_STATUS
RESULT_BODY="$(python3 - <<'PY'
import json
import os

status = os.environ["SEND_STATUS"]
output = os.environ.get("SEND_OUTPUT", "")

payload = {
    "status": status,
    "responsePayload": {
        "stdout": output,
    },
}

if status == "failed":
    payload["errorMessage"] = output or "openclaw-whatsapp send failed"

print(json.dumps(payload))
PY
)"

curl -fsS \
  -X POST \
  -H "Authorization: Bearer ${TASKAI_INTERNAL_BRIDGE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$RESULT_BODY" \
  "${TASKAI_BASE_URL}/api/internal/whatsapp/jobs/${JOB_ID}/result" >/dev/null
