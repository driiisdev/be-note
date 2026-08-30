// Keeps a count per session id, entirely in this process's memory. The client
// only ever sends a session id — the server is the source of truth. Restart
// this process and every session's count is gone.
const http = require("http");

const sessions = new Map(); // sessionId -> count

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/increment") {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const { sessionId } = JSON.parse(body);
    const count = (sessions.get(sessionId) || 0) + 1;
    sessions.set(sessionId, count);
    console.log(`[stateful] session="${sessionId}" -> count=${count} (${sessions.size} session(s) in memory)`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ count }));
  });
});

server.listen(4101, () => console.log(`[stateful] listening on http://localhost:4101 (pid ${process.pid})`));
