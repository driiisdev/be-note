const http = require("http");

// one route is artificially slow, to make head-of-line blocking on a single connection visible
const server = http.createServer((req, res) => {
  console.log(`[http/1.1] ${req.method} ${req.url}`);

  if (req.url === "/slow") {
    setTimeout(() => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("slow response (waited 2s)\n");
    }, 2000);
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`fast response for ${req.url}\n`);
});

server.listen(3001, () => console.log("http/1.1 server listening on :3001"));
