#!/usr/bin/env bash
# Generates the RSA keypair the app signs/verifies JWTs with (app.rsa.*).
# The .pem files are gitignored, so every fresh clone and every CI runner
# needs this before booting the app or running Spring tests.
# Idempotent: existing keys are kept.
set -euo pipefail

CERTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/harmonia-app/src/main/resources/certs"
PRIVATE_KEY="${CERTS_DIR}/private.pem"
PUBLIC_KEY="${CERTS_DIR}/public.pem"

mkdir -p "${CERTS_DIR}"

if [[ -f "${PRIVATE_KEY}" && -f "${PUBLIC_KEY}" ]]; then
  echo "RSA keypair already present in ${CERTS_DIR} — nothing to do."
  exit 0
fi

# PKCS#8 private key + X.509 SubjectPublicKeyInfo public key: the formats
# RsaKeyConverters.pkcs8()/x509() expect in JwtConfig.
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "${PRIVATE_KEY}" 2>/dev/null
openssl rsa -in "${PRIVATE_KEY}" -pubout -out "${PUBLIC_KEY}" 2>/dev/null

echo "Generated RSA keypair in ${CERTS_DIR}."
