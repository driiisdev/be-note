#!/usr/bin/env bash
# demonstrates REAL TLS 1.3 0-RTT using OpenSSL directly - Node's tls/https client API
# doesn't cleanly expose client-side early data, so this steps outside Node for this one demo.
# run generate-cert.sh first.
set -e

PORT=4443

echo "=== starting openssl s_server with 0-RTT enabled ==="
openssl s_server -accept "$PORT" -cert cert.pem -key key.pem -early_data -tls1_3 -quiet &
SERVER_PID=$!
sleep 1

echo ""
echo "=== connection 1: full handshake (no early data yet - nothing to resume) ==="
printf 'hello-full-handshake\n' | timeout 3 openssl s_client -connect localhost:"$PORT" \
  -tls1_3 -sess_out session.pem -ign_eof 2>&1 | grep -iE "early data|New,|Protocol" || true

sleep 1

echo ""
echo "=== connection 2: resumed session + 0-RTT early data ==="
printf 'hello-0rtt-early-data\n' > early_data.txt
timeout 3 openssl s_client -connect localhost:"$PORT" \
  -tls1_3 -sess_in session.pem -early_data early_data.txt -ign_eof 2>&1 \
  | grep -iE "early data|New,|Protocol|hello-0rtt" || true

kill $SERVER_PID 2>/dev/null
rm -f session.pem early_data.txt
echo ""
echo "=== done ==="
echo "connection 1 should show: Early data was not sent"
echo "connection 2 should show: Early data was accepted -- AND print hello-0rtt-early-data,"
echo "proving the server received and processed that data before the handshake fully confirmed"
