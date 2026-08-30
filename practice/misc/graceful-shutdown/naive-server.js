const http = require("http");

// the bug: exits IMMEDIATELY on SIGTERM, with zero regard for whatever request might be
// mid-flight right now
const server = http.createServer((req, res) => {
  console.log(`[naive] request received: ${req.url}`);
  setTimeout(() => {
    res.writeHead(200);
    res.end("done (slow)\n");
  }, 2000); // simulated slow work
});

server.listen(7910, () => console.log("naive server listening on :7910"));

function shutdown() {
  console.log("[naive] shutdown signal received - exiting IMMEDIATELY, no draining");
  process.exit(0); // whatever was in flight just got its connection reset
}

// real production entry point: an actual SIGTERM from the OS/process manager
process.on("SIGTERM", shutdown);

// this demo's entry point: an IPC message from run-demo.js's parent process, used instead
// of child.kill("SIGTERM") specifically because Windows' child_process.kill("SIGTERM") does
// NOT reliably deliver to a SIGTERM handler - Node's own docs note it causes unconditional
// termination on Windows instead. IPC messages work identically on every platform, so this
// keeps the demo portable while still wiring up the real SIGTERM handler above for production.
process.on("message", (msg) => { if (msg === "shutdown") shutdown(); });
