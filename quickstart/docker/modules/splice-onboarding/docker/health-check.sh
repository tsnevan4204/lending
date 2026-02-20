#!/bin/bash
# Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
# SPDX-License-Identifier: 0BSD

set -eo pipefail
trap 'touch /tmp/error' ERR
exec > /proc/1/fd/1 2>&1

if [ ! -f /tmp/all-done ]; then
  ONBOARDING_SCRIPTS_DIR="/app/scripts/on"
  ONBOARDING_TEMP_DIR="/tmp/onboarding-scripts/$(hostname)"

  if [ ! -d "$ONBOARDING_TEMP_DIR" ]; then
    mkdir -p "$ONBOARDING_TEMP_DIR"
  fi

  # Wait for Canton participant JSON API to be reachable (Canton/Splice can take 2+ min on first start)
  wait_canton() {
    local host_port="$1"
    local max_attempts="${2:-90}"
    local attempt=1
    while [ "$attempt" -le "$max_attempts" ]; do
      if curl -s -S --connect-timeout 5 -o /dev/null "http://${host_port}/v2/parties/participant-id" -H "Content-Type: application/json" 2>/dev/null; then
        echo "Canton $host_port reachable" >&2
        return 0
      fi
      echo "Waiting for Canton at $host_port (attempt $attempt/$max_attempts)..." >&2
      sleep 2
      attempt=$((attempt + 1))
    done
    echo "Canton at $host_port not reachable after ${max_attempts} attempts" >&2
    return 1
  }
  if [ "$APP_PROVIDER_PROFILE" == "on" ]; then
    wait_canton "canton:3${PARTICIPANT_JSON_API_PORT_SUFFIX}" || exit 1
  fi
  if [ "$APP_USER_PROFILE" == "on" ]; then
    wait_canton "canton:2${PARTICIPANT_JSON_API_PORT_SUFFIX}" || exit 1
  fi

  if [ -f /app/do-init ]; then
    echo "Initializing ..."
    export DO_INIT=true
  fi
  source /app/utils.sh

  if [ "$APP_PROVIDER_PROFILE" == "on" ]; then
    source /app/app-provider-auth.sh
    if [ "$DO_INIT" == "true" ] && [ ! -f /tmp/app-provider-init-dars-uploaded ]; then
      upload_dars "$APP_PROVIDER_PARTICIPANT_ADMIN_TOKEN" "canton:3${PARTICIPANT_JSON_API_PORT_SUFFIX}"
      touch /tmp/app-provider-init-dars-uploaded
    fi
  fi

  if [ "$APP_USER_PROFILE" == "on" ]; then
    source /app/app-user-auth.sh
    if [ "$DO_INIT" == "true" ] && [ ! -f /tmp/app-user-init-dars-uploaded ]; then
      upload_dars "$APP_USER_PARTICIPANT_ADMIN_TOKEN" "canton:2${PARTICIPANT_JSON_API_PORT_SUFFIX}"
      touch /tmp/app-user-init-dars-uploaded
    fi
  fi

  echo "Executing onboarding scripts..." >&2

  for script in $(ls "$ONBOARDING_SCRIPTS_DIR"); do
    script_name=$(basename "$script")
    done_file="$ONBOARDING_TEMP_DIR/${script_name}.done"

    if [ ! -f "$done_file" ]; then
      echo "executing $script_name" >&2
      chmod +x "$ONBOARDING_SCRIPTS_DIR/$script"
      "$ONBOARDING_SCRIPTS_DIR/$script"
      echo "$script_name done" >&2
      touch "$done_file"
    fi
  done
  touch /tmp/all-done
fi
exit 0

