const tls = require("tls");
const fs = require("fs");

// connects through latency-proxy.js (port 6443), not directly to the server, so the RTT
// differences below are actually visible instead of drowned out by near-zero loopback latency
function timedConnect(opts) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    const socket = tls.connect(
      {
        host: "localhost",
        port: 6443,
        ca: fs.readFileSync("cert.pem"),
        servername: "localhost",
        ...opts,
      },
      () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        resolve({ ms, protocol: socket.getProtocol(), session: socket.getSession() });
        socket.end();
      }
    );
    socket.on("error", reject);
  });
}

async function main() {
  console.log("all connections routed through the ~100ms simulated-RTT proxy on :6443\n");

  const t12 = await timedConnect({ minVersion: "TLSv1.2", maxVersion: "TLSv1.2" });
  console.log(`TLS 1.2 full handshake:    ${t12.ms.toFixed(1)}ms  (${t12.protocol})`);

  const t13 = await timedConnect({ minVersion: "TLSv1.3", maxVersion: "TLSv1.3" });
  console.log(`TLS 1.3 full handshake:    ${t13.ms.toFixed(1)}ms  (${t13.protocol})`);

  // reusing the session from the connection above triggers PSK-based resumption -
  // NOT 0-RTT (Node's client API doesn't expose early data cleanly) - so per the concept
  // note, expect this to be close to the fresh TLS 1.3 time, NOT a full RTT faster
  const resumed = await timedConnect({
    minVersion: "TLSv1.3",
    maxVersion: "TLSv1.3",
    session: t13.session,
  });
  console.log(`TLS 1.3 resumed (no 0-RTT): ${resumed.ms.toFixed(1)}ms  (${resumed.protocol})`);

  console.log(
    "\nnotice: TLS1.3 resumed is close to TLS1.3 fresh, NOT ~1 simulated RTT (100ms) faster -\n" +
      "that's the point: plain resumption saves CPU, not a round trip. See ortt-demo.sh for\n" +
      "the variant that DOES save a full round trip (0-RTT early data)."
  );
}

main();
