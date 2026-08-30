const net = require("net");

// an L4 (transport-layer) load balancer: picks a backend PER CONNECTION using round robin,
// then blindly relays raw bytes both ways - it never parses HTTP, never sees a "path", and
// therefore CANNOT route /a differently from /b within the same connection. this is the
// concrete proof of the concept note's central claim, not just an assertion.
const BACKENDS = [
  { host: "localhost", port: 8001 },
  { host: "localhost", port: 8002 },
];
let nextBackend = 0;

const server = net.createServer((clientSocket) => {
  const backend = BACKENDS[nextBackend];
  nextBackend = (nextBackend + 1) % BACKENDS.length;

  console.log(`[l4-proxy] new TCP connection -> round-robined to backend on :${backend.port} (no idea what path will be requested)`);

  const backendSocket = net.connect(backend.port, backend.host);

  clientSocket.pipe(backendSocket);
  backendSocket.pipe(clientSocket);

  clientSocket.on("error", () => {});
  backendSocket.on("error", () => {});
});

server.listen(8010, () => console.log("L4 proxy listening on :8010 (round-robins by CONNECTION, blind to HTTP content)"));
