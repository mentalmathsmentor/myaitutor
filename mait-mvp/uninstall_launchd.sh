#!/bin/bash
set -euo pipefail

PLIST_ID="com.myaitutor.mait-preview"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_ID}.plist"

launchctl bootout "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null || true
rm -f "$PLIST_PATH"

printf 'Removed %s\n' "$PLIST_ID"
