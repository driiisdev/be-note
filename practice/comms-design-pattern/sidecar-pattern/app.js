// The actual business logic. No logging, no metrics, no cross-cutting concerns
// at all — that's the whole point of the sidecar pattern. Never called directly
// by the client in this demo; only sidecar.js talks to it.
const http = require("http");

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/greet") {
    const name = url.searchParams.get("name") || "world";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: `Hello, ${name}!` }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(4001, () => console.log("[app] listening on http://localhost:4001 (internal only)"));
