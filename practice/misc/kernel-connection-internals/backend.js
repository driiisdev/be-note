const http = require("http");

// a trivial backend - the interesting part of this project isn't the app logic, it's what
// the OS does with the CONNECTIONS the client makes to it.
// usage: node backend.js <port>  (the no-pooling and pooling demos use SEPARATE ports so
// their TIME_WAIT counts never mix together - TIME_WAIT entries linger for a while after a
// connection closes, so reusing one port across both demos would contaminate the comparison)
const port = Number(process.argv[2]) || 7900;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok\n");
  })
  .listen(port, () => console.log(`backend listening on :${port}`));
