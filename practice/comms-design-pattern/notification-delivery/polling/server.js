// Order starts "processing" and flips to "shipped" after a random delay.
// The server always answers immediately with whatever the current status is —
// it never holds a request open, so the client has to keep asking.
const http = require("http");

let orderStatus = "processing";
const delayMs = 4000 + Math.random() * 4000; // 4-8s
setTimeout(() => {
  orderStatus = "shipped";
  console.log("\n[server] order shipped!");
}, delayMs);

console.log(`[server] order will ship in ~${Math.round(delayMs / 1000)}s`);

const server = http.createServer((req, res) => {
  if (req.url === "/order-status") {
    console.log(`[server] poll received -> answering immediately: ${orderStatus}`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: orderStatus }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(3001, () => console.log("[server] listening on http://localhost:3001"));
