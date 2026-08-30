// Immediately re-requests /order-status as soon as it gets a response.
// Far fewer requests than the polling variant for the same real-time coverage.
const http = require("http");

let requestCount = 0;

function longPoll() {
  requestCount++;
  const startedAt = Date.now();
  http.get("http://localhost:3002/order-status", (res) => {
    let raw = "";
    res.on("data", (c) => (raw += c));
    res.on("end", () => {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      const { status, timedOut } = JSON.parse(raw);
      if (timedOut) {
        console.log(`[client] request #${requestCount} timed out after ${elapsed}s, re-requesting`);
        longPoll();
      } else if (status === "shipped") {
        console.log(`[client] request #${requestCount} learned "shipped" after ${elapsed}s held open. Done.`);
      } else {
        longPoll();
      }
    });
  }).on("error", (err) => {
    console.error("[client] request failed — is server.js running?", err.message);
  });
}

longPoll();
