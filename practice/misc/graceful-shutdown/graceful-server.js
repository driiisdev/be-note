const http = require("http");

// the fix: stop accepting NEW connections immediately, but let whatever's already in flight
// finish naturally, with a hard timeout fallback so a stuck request can't block shutdown forever
const server = http.createServer((req, res) => {
  console.log(`[graceful] request received: ${req.url}`);
  setTimeout(() => {
    res.writeHead(200);
    res.end("done (slow)\n");
  }, 2000); // same simulated slow work as naive-server.js, for a fair comparison
});

// server.close() alone doesn't track/force-close anything - track sockets manually so a
// grace-period timeout fallback is possible
const sockets = new Set();
server.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
});

server.listen(7911, () => console.log("graceful server listening on :7911"));

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[graceful] shutdown signal received - refusing new connections, draining in-flight ones...");

  // stops accepting NEW connections immediately; its callback only fires once every
  // EXISTING connection has closed naturally
  server.close(() => {
    console.log("[graceful] all connections drained naturally, exiting");
    process.exit(0);
  });

  // force-close anything still open after a grace period, so a stuck request can't hang
  // shutdown forever
  setTimeout(() => {
    if (sockets.size > 0) {
      console.log(`[graceful] grace period expired - force-closing ${sockets.size} remaining socket(s)`);
      for (const socket of sockets) socket.destroy();
    }
  }, 5000);
}

// real production entry point: an actual SIGTERM from the OS/process manager
process.on("SIGTERM", shutdown);

// this demo's entry point - see naive-server.js for why (Windows child_process.kill quirk)
process.on("message", (msg) => { if (msg === "shutdown") shutdown(); });
