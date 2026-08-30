const net = require("net");

// this demonstrates the API correctly - NOT a reliable before/after latency measurement.
// see README.md's "why there's no big latency number here" section for why: on loopback,
// TCP ACKs return in ~1-2ms, faster than Nagle's hold-back window has any real chance to
// matter, so this demo would otherwise show a fake "no difference" result either way.
const noDelay = process.argv[2] === "nodelay";

const server = net.createServer((socket) => {
  let chunks = 0;
  socket.on("data", () => chunks++);
  socket.on("end", () => console.log(`server: received the burst across ${chunks} 'data' event(s)`));
});

server.listen(7801, () => {
  const socket = net.createConnection({ host: "localhost", port: 7801 }, () => {
    if (noDelay) {
      socket.setNoDelay(true); // disables Nagle's algorithm (sets TCP_NODELAY) on this socket
      console.log("client: TCP_NODELAY enabled - small writes go out immediately, unbatched");
    } else {
      console.log("client: Nagle's algorithm left on (default) - small writes may be batched");
    }

    for (let i = 0; i < 20; i++) socket.write("x"); // 20 single-byte writes, back to back
    socket.end();
  });

  socket.on("close", () => server.close());
});
