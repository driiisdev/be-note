const http2 = require("http2");

// h2c = http/2 over cleartext (no TLS), fine for a local demo, keeps this dependency-free.
// Real-world http/2 deployments almost always require TLS, but Node's http2 module supports
// unencrypted h2c specifically for cases like this.
const server = http2.createServer((req, res) => {
  console.log(`[http/2] ${req.method} ${req.url} (stream id: ${req.stream.id})`);

  if (req.url === "/slow") {
    setTimeout(() => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("slow response (waited 2s)\n");
    }, 2000);
    return;
  }

  res.writeHead(200, { "content-type": "text/plain" });
  res.end(`fast response for ${req.url}\n`);
});

server.listen(3002, () => console.log("http/2 (h2c) server listening on :3002"));
