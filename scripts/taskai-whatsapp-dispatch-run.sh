#!/bin/bash
set -euo pipefail

ENV_FILE="$HOME/.taskai-whatsapp-dispatch.env"
DISPATCH_SCRIPT="$HOME/.local/bin/taskai-whatsapp-dispatch.sh"

export PATH="/Users/bobbylian/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [ ! -x "$DISPATCH_SCRIPT" ]; then
  echo "Dispatch script not found: $DISPATCH_SCRIPT" >&2
  exit 1
fi

"$DISPATCH_SCRIPT"
