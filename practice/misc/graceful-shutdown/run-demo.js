const { fork } = require("child_process");
const http = require("http");
const path = require("path");

// orchestrates the whole experiment: start a server, fire a slow request, send SIGTERM WHILE
// that request is still in flight, and report whether it succeeded or got dropped
function testShutdown(scriptName, port, label) {
  return new Promise((resolve) => {
    const child = fork(path.join(__dirname, scriptName), [], { stdio: "inherit" });

    setTimeout(() => {
      const start = Date.now();
      const req = http.get({ host: "localhost", port, path: "/slow" }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          console.log(`\n[${label}] request SUCCEEDED after ${Date.now() - start}ms: ${body.trim()}`);
          resolve();
        });
      });
      req.on("error", (err) => {
        console.log(`\n[${label}] request FAILED after ${Date.now() - start}ms: ${err.message}`);
        resolve();
      });

      // trigger shutdown shortly after the slow request starts, so it's genuinely in flight.
      // uses an IPC message rather than child.kill("SIGTERM") - see naive-server.js's comment
      // for why (Windows doesn't reliably deliver SIGTERM to a handler via child_process.kill)
      setTimeout(() => {
        console.log(`[${label}] --- triggering shutdown now, request still in flight ---`);
        child.send("shutdown");
      }, 300);
    }, 500); // give the server a moment to start listening
  });
}

async function main() {
  console.log("=== naive-server.js (no graceful shutdown) ===");
  await testShutdown("naive-server.js", 7910, "naive");

  console.log("\n\n=== graceful-server.js (proper shutdown) ===");
  await testShutdown("graceful-server.js", 7911, "graceful");
}

main();
