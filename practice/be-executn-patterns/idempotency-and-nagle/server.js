const http = require("http");

// simulates a "charge a card" operation - the side effect we care about is `totalCharged`
let totalCharged = 0;
const seenIdempotencyKeys = new Map(); // key -> the response that was returned for it

const server = http.createServer((req, res) => {
  if (req.url === "/charge/naive") {
    // NAIVE: processes every single request, no matter what - a retry is indistinguishable
    // from a brand new charge
    totalCharged += 10;
    console.log(`[naive] charged $10 - totalCharged is now $${totalCharged}`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ charged: 10, totalCharged }));
    return;
  }

  if (req.url === "/charge/safe") {
    const key = req.headers["idempotency-key"];
    if (!key) {
      res.writeHead(400).end(JSON.stringify({ error: "Idempotency-Key header required" }));
      return;
    }

    if (seenIdempotencyKeys.has(key)) {
      // SAME key seen before - this is a retry, not a new charge. return the SAME result,
      // don't touch totalCharged again
      console.log(`[safe] key "${key}" already processed - returning cached result, no new charge`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(seenIdempotencyKeys.get(key));
      return;
    }

    totalCharged += 10;
    console.log(`[safe] key "${key}" is new - charged $10 - totalCharged is now $${totalCharged}`);
    const body = JSON.stringify({ charged: 10, totalCharged });
    seenIdempotencyKeys.set(key, body);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
    return;
  }

  res.writeHead(404).end();
});

server.listen(7800, () => console.log("idempotency demo server listening on :7800"));
