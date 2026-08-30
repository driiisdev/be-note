const net = require("net");

// On real loopback, RTT is close to 0ms - which hides the entire point of this module (the
// RTT savings TLS 1.3/0-RTT/etc provide only matter when there's real network latency to
// save). This proxy simulates that latency by delaying every forwarded chunk in both
// directions, so the handshake differences actually show up in wall-clock time.
const ONE_WAY_DELAY_MS = 50; // ~100ms round trip - typical for a cross-country connection

const LISTEN_PORT = 6443;
const TARGET_PORT = 5443;

const proxy = net.createServer((clientSocket) => {
  const serverSocket = net.connect(TARGET_PORT, "localhost");

  clientSocket.on("data", (chunk) => {
    setTimeout(() => serverSocket.write(chunk), ONE_WAY_DELAY_MS);
  });
  serverSocket.on("data", (chunk) => {
    setTimeout(() => clientSocket.write(chunk), ONE_WAY_DELAY_MS);
  });

  clientSocket.on("close", () => serverSocket.end());
  serverSocket.on("close", () => clientSocket.end());
  clientSocket.on("error", () => {});
  serverSocket.on("error", () => {});
});

proxy.listen(LISTEN_PORT, () =>
  console.log(
    `latency proxy :${LISTEN_PORT} -> :${TARGET_PORT} (~${ONE_WAY_DELAY_MS * 2}ms simulated RTT per hop)`
  )
);
