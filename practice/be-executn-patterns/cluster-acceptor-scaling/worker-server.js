const http = require("http");

// every worker runs this same handler - each one's own pid in the response is what proves
// which worker actually handled a given request
http
  .createServer((req, res) => {
    console.log(`[worker ${process.pid}] handled a request`);
    res.end(String(process.pid));
  })
  .listen(7600);
