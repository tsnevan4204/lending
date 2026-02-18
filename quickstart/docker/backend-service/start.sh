#!/bin/bash
# Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
# SPDX-License-Identifier: 0BSD

set -eou pipefail

# Ensure Spring uses the same auth mode as the environment (compose may not substitute env_file vars)
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-$AUTH_MODE}"

# source all scripts from /onboarding/backend-service/on so that env variables exported by them are available in the main process
for script in /onboarding/backend-service/on/*.sh; do
# shellcheck disable=SC1090
  [ -f "$script" ] && source "$script"
done
# AppUser party (qs-borrower) from onboarding so application-shared-secret.yml binds the correct party and app-user can create contracts
if [ -f /onboarding/backend-service/on/app-user-party.env ]; then
  set -a
  # shellcheck disable=SC1090
  source /onboarding/backend-service/on/app-user-party.env
  set +a
fi

# CAUTION: Not intended for use in production environments.
# Activates the test profile in the backend service.
# When enabled, party ID resolution is derived from the JWT token's party_id claim, overriding the tenant registration's party ID.
# This feature is designed for testing purposes to generate a unique AppUser party for each test run and ensure isolation.
if [ "$TEST_MODE" == "on" ]; then
  export SPRING_PROFILES_ACTIVE="$SPRING_PROFILES_ACTIVE,test"
fi

tar -xf /backend.tar -C /opt
/opt/backend/bin/backend
