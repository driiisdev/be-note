// Two endpoints that each take ~1.5s, but very differently: /sync-task blocks
// the whole single-threaded process with a busy-wait loop, /async-task waits
// via a non-blocking timer that lets the event loop keep serving other
// requests in the meantime.
const http = require("http");

const TASK_MS = 1500;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const startedAt = Date.now();

  if (url.pathname === "/sync-task") {
    console.log(`[server] /sync-task started at ${startedAt} — BLOCKING the process for ${TASK_MS}ms`);
    const until = Date.now() + TASK_MS;
    while (Date.now() < until) {
      // deliberately burn CPU — nothing else on this process can run until this loop exits
    }
    console.log(`[server] /sync-task finished, took ${Date.now() - startedAt}ms`);
    res.end("sync done\n");
    return;
  }

  if (url.pathname === "/async-task") {
    console.log(`[server] /async-task started at ${startedAt} — waiting ${TASK_MS}ms without blocking`);
    setTimeout(() => {
      console.log(`[server] /async-task finished, took ${Date.now() - startedAt}ms`);
      res.end("async done\n");
    }, TASK_MS);
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(4200, () => console.log("[server] listening on http://localhost:4200"));
