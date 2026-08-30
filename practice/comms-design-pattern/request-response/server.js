// Minimal HTTP server demonstrating the request-response cycle in slow motion.
// No frameworks — just Node's built-in http module, so every step is visible.
const http = require("http");

const server = http.createServer((req, res) => {
  console.log(`\n[server] received request: ${req.method} ${req.url}`);

  // --- parse ---
  const url = new URL(req.url, `http://${req.headers.host}`);
  console.log(`[server] parsed path="${url.pathname}"`);

  // --- process ---
  let body;
  if (url.pathname === "/time") {
    body = { serverTime: new Date().toISOString() };
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    console.log("[server] sent 404 response");
    return;
  }
  console.log("[server] processed request, built response body:", body);

  // --- respond ---
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
  console.log("[server] sent response");
});

server.listen(3000, () => {
  console.log("[server] listening on http://localhost:3000");
  console.log("[server] try: node client.js");
});
