const http2 = require("http2");

// ONE http/2 client session = one tcp connection, multiplexed streams live inside it
const client = http2.connect("http://localhost:3002");

function request(path) {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = client.request({ ":path": path });
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      console.log(`[client] ${path} finished after ${Date.now() - start}ms: ${body.trim()}`);
      resolve();
    });
    req.end();
  });
}

async function main() {
  console.log("requesting /slow then /fast as two MULTIPLEXED streams on one connection");
  const slow = request("/slow");
  const fast = request("/fast");
  await Promise.all([slow, fast]);
  console.log("both done - /fast came back almost immediately, NOT blocked by /slow, because"
    + " they're independent streams on the same http/2 connection");
  client.close();
}

main();
