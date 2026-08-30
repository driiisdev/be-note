const http = require("http");

// usage: node backend.js <port> <label>
const port = Number(process.argv[2]);
const label = process.argv[3];

http
  .createServer((req, res) => {
    console.log(`[backend ${label}] ${req.method} ${req.url}`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ handledBy: label, path: req.url }));
  })
  .listen(port, () => console.log(`backend "${label}" listening on :${port}`));
