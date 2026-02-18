#!/bin/bash
# Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
# SPDX-License-Identifier: 0BSD

# This script is executed by the `splice-onboarding` container. It leverages provided functions from `/app/utils`
# and the resolved environment to onboard a backend service user to a participant (handling user creation and rights assignment),
# and propagating the necessary environment variables to the backend service via the `backend-service.sh` script stored in the shared `onboarding` volume.
# The backend service container sources this shared script during its initialization phase, prior to launching the main process.
# Note: This onboarding script is intended for local development environment only and is not meant for production use.

set -eo pipefail

source /app/utils.sh

init() {
  local backendUserId=$1
  create_user "$APP_PROVIDER_PARTICIPANT_ADMIN_TOKEN" $backendUserId $AUTH_APP_PROVIDER_BACKEND_USER_NAME "" "canton:3${PARTICIPANT_JSON_API_PORT_SUFFIX}"
  grant_rights "$APP_PROVIDER_PARTICIPANT_ADMIN_TOKEN" $backendUserId $APP_PROVIDER_PARTY "ReadAs ActAs" "canton:3${PARTICIPANT_JSON_API_PORT_SUFFIX}"
  # Allocate a second party on app-provider participant so we can demo borrower + lender with two users.
  LENDER_PARTY=$(allocate_party "$APP_PROVIDER_PARTICIPANT_ADMIN_TOKEN" "qs-lender" "canton:3${PARTICIPANT_JSON_API_PORT_SUFFIX}")
  grant_rights "$APP_PROVIDER_PARTICIPANT_ADMIN_TOKEN" $backendUserId "$LENDER_PARTY" "ReadAs ActAs" "canton:3${PARTICIPANT_JSON_API_PORT_SUFFIX}"
  export LENDER_PARTY
  # Allocate borrower party on app-provider so backend token can ActAs for app-user (shared-secret demo).
  BORROWER_PARTY=$(allocate_party "$APP_PROVIDER_PARTICIPANT_ADMIN_TOKEN" "qs-borrower" "canton:3${PARTICIPANT_JSON_API_PORT_SUFFIX}")
  grant_rights "$APP_PROVIDER_PARTICIPANT_ADMIN_TOKEN" $backendUserId "$BORROWER_PARTY" "ReadAs ActAs" "canton:3${PARTICIPANT_JSON_API_PORT_SUFFIX}"
  export BORROWER_PARTY
}

if [ "$AUTH_MODE" == "oauth2" ]; then
  init "$AUTH_APP_PROVIDER_BACKEND_USER_ID"
  share_file "backend-service/on/backend-service.sh" <<EOF
  export APP_PROVIDER_PARTY=${APP_PROVIDER_PARTY}
  export LENDER_PARTY=${LENDER_PARTY}
EOF

else
  init "$AUTH_APP_PROVIDER_BACKEND_USER_NAME"
  APP_PROVIDER_BACKEND_USER_TOKEN=$(generate_jwt "$AUTH_APP_PROVIDER_BACKEND_USER_NAME" "$AUTH_APP_PROVIDER_AUDIENCE")
  share_file "backend-service/on/backend-service.sh" <<EOF
  export APP_PROVIDER_PARTY=${APP_PROVIDER_PARTY}
  export LENDER_PARTY=${LENDER_PARTY}
  export APP_PROVIDER_BACKEND_USER_TOKEN=${APP_PROVIDER_BACKEND_USER_TOKEN}
EOF
  # So register-app-user-tenant uses the app-provider-allocated borrower party (backend token has ActAs for it).
  share_file "backend-service/on/app-user-party.env" <<EOF
export APP_USER_PARTY=${BORROWER_PARTY}
EOF
fi
