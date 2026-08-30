// Holds each /order-status request open (no res.end()) while the order is still
// "processing", and only answers once it flips to "shipped" (or after a 10s
// timeout). Compare the request count to the plain polling variant.
const http = require("http");

let orderStatus = "processing";
let waitingResponses = [];

const delayMs = 3000 + Math.random() * 3000; // 3-6s
setTimeout(() => {
  orderStatus = "shipped";
  console.log(`\n[server] order shipped! waking ${waitingResponses.length} waiting client(s)`);
  const toNotify = waitingResponses;
  waitingResponses = [];
  for (const res of toNotify) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: orderStatus }));
  }
}, delayMs);

console.log(`[server] order will ship in ~${Math.round(delayMs / 1000)}s`);

const server = http.createServer((req, res) => {
  if (req.url !== "/order-status") {
    res.writeHead(404);
    res.end();
    return;
  }

  if (orderStatus === "shipped") {
    console.log("[server] already shipped, answering immediately");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: orderStatus }));
    return;
  }

  console.log("[server] request parked, waiting for status to change...");
  waitingResponses.push(res);

  const timeout = setTimeout(() => {
    waitingResponses = waitingResponses.filter((r) => r !== res);
    console.log("[server] no change within 10s, responding with timeout");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: orderStatus, timedOut: true }));
  }, 10000);

  res.on("finish", () => clearTimeout(timeout));
});

server.listen(3002, () => console.log("[server] listening on http://localhost:3002"));
