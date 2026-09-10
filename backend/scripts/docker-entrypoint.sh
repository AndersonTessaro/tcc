#!/bin/sh
# Resolves the RSA keypair the app signs JWTs with, then hands off to the JVM.
#
# The .pem files are deliberately never baked into the image (see .dockerignore),
# so one of these has to hold at start-up:
#   1. APP_RSA_PRIVATE_KEY / APP_RSA_PUBLIC_KEY point at the keys yourself
#   2. the keys are mounted into /app/certs
#   3. HARMONIA_DEV_KEYS=true, and a throwaway pair is minted for local runs
set -eu

CERTS_DIR=/app/certs

if [ -z "${APP_RSA_PRIVATE_KEY:-}" ] && [ -z "${APP_RSA_PUBLIC_KEY:-}" ]; then
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
  else
    echo "ERROR: no JWT signing keys available." >&2
    echo "ERROR: mount a PKCS#8 private.pem and an X.509 public.pem into ${CERTS_DIR}," >&2
    echo "ERROR: or set APP_RSA_PRIVATE_KEY and APP_RSA_PUBLIC_KEY, or set" >&2
    echo "ERROR: HARMONIA_DEV_KEYS=true for a throwaway pair in local development." >&2
    exit 1
  fi
fi

exec "$@"
