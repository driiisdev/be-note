const http = require("http");
const net = require("net");
const crypto = require("crypto");

// this proxy never parses a single websocket frame - see README for why that's the point.
// its only two jobs are: (1) forward the Upgrade handshake correctly, and (2) pick a backend
// consistently per "room" (sticky routing) and relay raw bytes both ways after that.
const BACKENDS = [
  { host: "localhost", port: 9001, label: "A" },
  { host: "localhost", port: 9002, label: "B" },
];

function pickBackend(room) {
  // consistent hashing: the SAME room name always maps to the SAME backend, which is exactly
  // what a stateful, long-lived connection needs (see the sticky sessions concept note)
  const hash = crypto.createHash("md5").update(room).digest()[0];
  return BACKENDS[hash % BACKENDS.length];
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ws-proxy up - connect via websocket with ?room=<name>\n");
});

server.on("upgrade", (req, clientSocket, head) => {
  const url = new URL(req.url, "http://localhost");
  const room = url.searchParams.get("room") || "default";
  const backend = pickBackend(room);

  console.log(`[ws-proxy] upgrade for room "${room}" -> sticky-routed to backend ${backend.label} (:${backend.port})`);

  const backendSocket = net.connect(backend.port, backend.host, () => {
    // reconstruct the raw request line + headers exactly as the client sent them, so the
    // BACKEND computes Sec-WebSocket-Accept from the client's ORIGINAL key - this proxy
    // never touches the handshake crypto itself, just relays the bytes that carry it
    const headerLines = [`${req.method} ${req.url} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headerLines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    backendSocket.write(headerLines.join("\r\n") + "\r\n\r\n");
    if (head && head.length) backendSocket.write(head);

    // from here on: blind bidirectional relay, same as an L4 proxy - no websocket-specific
    // code needed at all for the actual message traffic
    clientSocket.pipe(backendSocket);
    backendSocket.pipe(clientSocket);
  });

  backendSocket.on("error", () => clientSocket.end());
  clientSocket.on("error", () => backendSocket.end());
});

server.listen(9000, () => console.log("ws-proxy listening on :9000 (2 backends, sticky by ?room=)"));
