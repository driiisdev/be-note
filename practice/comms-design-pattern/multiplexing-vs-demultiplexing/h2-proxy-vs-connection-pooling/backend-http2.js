const http2 = require("http2");

// same simulated backend, but speaking h2c (cleartext http/2) - a proxy talking to THIS
// backend can multiplex many concurrent requests over a single shared connection, no pool
// needed, because http/2 itself supports many concurrent streams per connection.
let inFlight = 0;

const server = http2.createServer();

server.on("stream", (stream, headers) => {
  inFlight++;
  console.log(`[backend-h2] stream start (id ${stream.id}), now ${inFlight} in flight`);

  setTimeout(() => {
    inFlight--;
    stream.respond({ ":status": 200, "content-type": "text/plain" });
    stream.end(`handled by backend-h2 ${headers[":path"]}\n`);
  }, 500); // same simulated work as backend-http1.js, for a fair comparison
});

server.listen(4102, () => console.log("http/2 (h2c) backend listening on :4102"));
