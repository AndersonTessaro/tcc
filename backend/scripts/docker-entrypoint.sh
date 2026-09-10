#!/bin/sh
# Resolves the RSA keypair the app signs JWTs with, then hands off to the JVM.
#
# Resolution order at start-up:
#   1. APP_RSA_PRIVATE_KEY / APP_RSA_PUBLIC_KEY point at the keys yourself
#   2. the keys are mounted into /app/certs
#   3. HARMONIA_DEV_KEYS=true, and a throwaway pair is minted for local runs
#   4. none of the above - the pair committed under src/main/resources/certs is used
set -eu

CERTS_DIR=/app/certs

# Both or neither - one alone only fails later, deep inside Spring.
if [ -n "${APP_RSA_PRIVATE_KEY:-}" ] && [ -z "${APP_RSA_PUBLIC_KEY:-}" ]; then
  echo "ERROR: APP_RSA_PRIVATE_KEY is set but APP_RSA_PUBLIC_KEY is not - set both." >&2
  exit 1
fi
if [ -n "${APP_RSA_PUBLIC_KEY:-}" ] && [ -z "${APP_RSA_PRIVATE_KEY:-}" ]; then
  echo "ERROR: APP_RSA_PUBLIC_KEY is set but APP_RSA_PRIVATE_KEY is not - set both." >&2
  exit 1
fi

if [ -z "${APP_RSA_PRIVATE_KEY:-}" ]; then
  if [ -f "${CERTS_DIR}/private.pem" ] && [ -f "${CERTS_DIR}/public.pem" ]; then
    APP_RSA_PRIVATE_KEY="file:${CERTS_DIR}/private.pem"
    APP_RSA_PUBLIC_KEY="file:${CERTS_DIR}/public.pem"
    export APP_RSA_PRIVATE_KEY APP_RSA_PUBLIC_KEY
  elif [ "${HARMONIA_DEV_KEYS:-false}" = "true" ]; then
    echo "WARNING: HARMONIA_DEV_KEYS=true - minting a throwaway RSA keypair." >&2
    echo "WARNING: every restart invalidates every token already issued." >&2
    echo "WARNING: never use this outside local development." >&2
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "${CERTS_DIR}/private.pem" 2>/dev/null
    openssl rsa -in "${CERTS_DIR}/private.pem" -pubout -out "${CERTS_DIR}/public.pem" 2>/dev/null
    APP_RSA_PRIVATE_KEY="file:${CERTS_DIR}/private.pem"
    APP_RSA_PUBLIC_KEY="file:${CERTS_DIR}/public.pem"
    export APP_RSA_PRIVATE_KEY APP_RSA_PUBLIC_KEY
  fi
  # Nothing set and nothing mounted: fall through to the keypair bundled on the
  # classpath (harmonia-app/src/main/resources/certs). Committed for the TCC so the
  # image boots with no configuration - rotate and mount real keys before any
  # deployment that matters.
fi

exec "$@"
