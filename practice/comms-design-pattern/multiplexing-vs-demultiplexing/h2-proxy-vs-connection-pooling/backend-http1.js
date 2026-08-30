const http = require("http");

// stands in for a backend service that only speaks HTTP/1.1 - very common for
// internal/legacy services a proxy has to front. HTTP/1.1 allows exactly ONE in-flight
// request per connection, which is the whole reason a proxy talking to this backend needs
// a connection POOL to get any real concurrency.
let inFlight = 0;

const server = http.createServer((req, res) => {
  inFlight++;
  console.log(`[backend-h1] request start, now ${inFlight} in flight`);

  setTimeout(() => {
    inFlight--;
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`handled by backend-h1 ${req.url}\n`);
  }, 500); // simulated work, long enough to make concurrency limits visible
});

server.listen(4101, () => console.log("http/1.1 backend listening on :4101"));
