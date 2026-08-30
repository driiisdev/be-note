const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const keyPath = path.join(__dirname, "key.pem");
const certPath = path.join(__dirname, "cert.pem");

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error(
    "missing key.pem/cert.pem - run generate-cert.sh first " +
      "(or the equivalent openssl command from this project's README)"
  );
  process.exit(1);
}

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

https
  .createServer(options, (req, res) => {
    // these only exist because TLS already completed its handshake before this handler runs
    console.log(
      `[https] ${req.method} ${req.url} — protocol: ${req.socket.getProtocol()}, ` +
        `cipher: ${req.socket.getCipher().name}`
    );
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("hello over https\n");
  })
  .listen(3443, () => console.log("https server listening on :3443 (self-signed cert)"));

// plain http on a different port, for contrast — try opening both in a browser
http
  .createServer((req, res) => {
    console.log(`[http] ${req.method} ${req.url} — no encryption, no handshake overhead`);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("hello over plain http\n");
  })
  .listen(3080, () => console.log("plain http server listening on :3080 (for comparison)"));
