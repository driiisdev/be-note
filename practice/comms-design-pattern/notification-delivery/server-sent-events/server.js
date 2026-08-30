// Opens one connection per client and writes status events on it as they
// happen: an initial "processing" event, then "shipped" once the order flips.
// A browser would use `new EventSource(url)`; the demo client parses the raw
// text/event-stream format by hand so the wire format stays visible.
const http = require("http");

let orderStatus = "processing";
const delayMs = 3000 + Math.random() * 3000; // 3-6s
setTimeout(() => {
  orderStatus = "shipped";
}, delayMs);

console.log(`[server] order will ship in ~${Math.round(delayMs / 1000)}s`);

const server = http.createServer((req, res) => {
  if (req.url !== "/events") {
    res.writeHead(404);
    res.end();
    return;
  }

  console.log("[server] client connected, opening event stream");
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (status) => {
    res.write(`data: ${JSON.stringify({ status })}\n\n`);
    console.log(`[server] pushed event: ${status}`);
  };

  send(orderStatus); // tell the client where things stand right away

  const interval = setInterval(() => {
    if (orderStatus === "shipped") {
      send("shipped");
      clearInterval(interval);
      res.end(); // nothing more will ever change, close the stream
      return;
    }
  }, 500);

  req.on("close", () => {
    clearInterval(interval);
    console.log("[server] client disconnected, stream closed");
  });
});

server.listen(3005, () => console.log("[server] listening on http://localhost:3005"));
