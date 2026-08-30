#!/usr/bin/env bash
# generates a self-signed cert + private key for local dev only.
# run this once before any of the other scripts here - writes key.pem and cert.pem.

# MSYS_NO_PATHCONV avoids Git Bash on Windows mangling "/CN=localhost" into a filesystem path
# before openssl ever sees it. Harmless no-op on Linux/macOS.
MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout key.pem -out cert.pem -days 365 \
  -subj "/CN=localhost"

echo "wrote key.pem and cert.pem (valid 365 days, CN=localhost)"
