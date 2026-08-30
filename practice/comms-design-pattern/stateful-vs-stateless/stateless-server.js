// No memory between requests at all. The client must send the current count
// on every request; the server just increments what it was given and forgets
// everything the instant it responds.
const http = require("http");

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/increment") {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const { count } = JSON.parse(body);
    const next = count + 1;
    console.log(`[stateless] received count=${count}, responding with count=${next} (nothing stored)`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ count: next }));
  });
});

server.listen(4100, () => console.log("[stateless] listening on http://localhost:4100"));
