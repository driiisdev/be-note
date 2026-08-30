const http = require("http");

// a keep-alive agent forces both requests onto the SAME tcp connection, so head-of-line
// blocking at the http/1.1 layer is actually observable instead of Node quietly opening a
// second parallel connection for us (which the default agent would do)
const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });

function get(path) {
  const start = Date.now();
  return new Promise((resolve) => {
    http.get({ host: "localhost", port: 3001, path, agent }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        console.log(`[client] ${path} finished after ${Date.now() - start}ms: ${body.trim()}`);
        resolve();
      });
    });
  });
}

async function main() {
  console.log("requesting /slow then /fast on ONE http/1.1 connection (maxSockets: 1)");
  // fired without awaiting the first - but with maxSockets:1 they still queue on one connection
  const slow = get("/slow");
  const fast = get("/fast");
  await Promise.all([slow, fast]);
  console.log("both done - notice /fast had to wait for /slow even though it was requested"
    + " second but needed no real work");
  agent.destroy();
}

main();
