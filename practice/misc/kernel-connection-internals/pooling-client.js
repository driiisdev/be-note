const http = require("http");

// the fix: ONE reused, keep-alive connection for all 200 requests - no new port consumed
// per request, and nothing left in TIME_WAIT afterward, since the connection never closes
// until the agent itself is torn down
const PORT = 7901; // separate port from no-pooling-client.js - see backend.js for why
const agent = new http.Agent({ keepAlive: true, maxSockets: 1 }); // forces reuse of ONE connection
const REQUEST_COUNT = 200;

async function main() {
  console.log(`making ${REQUEST_COUNT} requests, all reusing the SAME pooled connection...`);
  for (let i = 0; i < REQUEST_COUNT; i++) {
    await new Promise((resolve) => {
      http.get({ host: "localhost", port: PORT, agent }, (res) => {
        res.on("data", () => {});
        res.on("end", resolve);
      });
    });
  }
  console.log(`done - ${REQUEST_COUNT} requests, but only 1 connection was ever opened`);
  console.log(`run "node inspect-connections.js ${PORT}" now - compare against no-pooling-client.js`);
  agent.destroy();
}

main();
