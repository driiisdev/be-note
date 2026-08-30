const http = require("http");

// the anti-pattern: a BRAND NEW connection for every single request, never reused. each one
// consumes an ephemeral source port, and each one leaves a TIME_WAIT entry behind after it
// closes (see running-out-of-tcp-ports.md). run inspect-connections.js right after this to
// see the pile-up firsthand.
const PORT = 7900; // dedicated port for this demo - see backend.js for why
const agent = new http.Agent({ keepAlive: false }); // explicitly disables connection reuse
const REQUEST_COUNT = 200;

async function main() {
  console.log(`making ${REQUEST_COUNT} requests, each on its OWN new connection (no pooling)...`);
  for (let i = 0; i < REQUEST_COUNT; i++) {
    await new Promise((resolve) => {
      http.get({ host: "localhost", port: PORT, agent }, (res) => {
        res.on("data", () => {});
        res.on("end", resolve);
      });
    });
  }
  console.log(`done - ${REQUEST_COUNT} connections opened and closed, each burning a source port`);
  console.log(`run "node inspect-connections.js ${PORT}" now to see the resulting TIME_WAIT pile-up`);
}

main();
