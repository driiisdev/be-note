const https = require("https");
const fs = require("fs");

// plain https server - the same one used for every timing test in this project. tls version
// negotiation happens client-side (see client-tls-versions.js), the server just accepts
// whatever version the client asks for.
const server = https.createServer(
  { key: fs.readFileSync("key.pem"), cert: fs.readFileSync("cert.pem") },
  (req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok\n");
  }
);

server.listen(5443, () => console.log("https test server listening on :5443"));
