#!/bin/sh
# Creates the self-signed development certificate used by BOTH containers.
# Run automatically by the "certs" service in docker-compose.yml.
# The certificate lists localhost, 127.0.0.1 AND "api", so the nginx
# container can verify the API container's certificate by name.
set -e
DIR=/certs
if [ -f "$DIR/cert.pem" ] && [ -f "$DIR/key.pem" ] && grep -q "api" "$DIR/.san" 2>/dev/null; then
  # Make sure the non-root users in both containers can read it, even if it
  # was created earlier on the host with "npm run generate-certs".
  chmod 644 "$DIR/cert.pem" "$DIR/key.pem"
  echo "Certificate already present."
  exit 0
fi
apk add --no-cache openssl >/dev/null
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$DIR/key.pem" -out "$DIR/cert.pem" \
  -subj "/C=ZA/ST=KwaZulu-Natal/L=Durban/O=HustleHubPlus/OU=Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:api,IP:127.0.0.1"
echo "DNS:localhost,DNS:api,IP:127.0.0.1" > "$DIR/.san"
# Readable by the non-root users in the api (uid 1000) and client (uid 101)
# containers. Local development only: production would use a CA-issued
# certificate supplied as a Docker secret.
chmod 644 "$DIR/cert.pem" "$DIR/key.pem"
echo "Self-signed certificate created in api/certs"
