#!/bin/bash
# Copyright (c) 2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eou pipefail

# Use short timeouts so the health check fails fast if Splice hasn't started yet
CURL_OPTS=(--connect-timeout 5 --max-time 10 --silent --show-error -f)

if [ "$APP_USER_PROFILE" = "on" ]; then
  curl "${CURL_OPTS[@]}" "http://localhost:2${VALIDATOR_ADMIN_API_PORT_SUFFIX}/api/validator/readyz"
fi
if [ "$APP_PROVIDER_PROFILE" = "on" ]; then
  curl "${CURL_OPTS[@]}" "http://localhost:3${VALIDATOR_ADMIN_API_PORT_SUFFIX}/api/validator/readyz"
fi
if [ "$SV_PROFILE" = "on" ]; then
  curl "${CURL_OPTS[@]}" "http://localhost:4${VALIDATOR_ADMIN_API_PORT_SUFFIX}/api/validator/readyz"
  curl "${CURL_OPTS[@]}" http://localhost:5012/api/scan/readyz
  curl "${CURL_OPTS[@]}" http://localhost:5014/api/sv/readyz
fi
