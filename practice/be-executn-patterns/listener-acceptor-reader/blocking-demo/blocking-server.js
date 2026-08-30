const net = require("net");

// this server behaves normally UNTIL it receives "SLOW\n", at which point it runs a
// genuinely synchronous busy-wait (not setTimeout, which would yield to the event loop) -
// simulating exactly what pattern A's bottleneck looks like: one thread, well and truly stuck
function busyWaitMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // deliberately burning CPU synchronously - nothing else can run on this thread right now
  }
}

const server = net.createServer((socket) => {
  console.log(`connected: ${socket.remotePort}`);

  let buffer = "";
  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      console.log(`[${socket.remotePort}] received: "${line}" at ${Date.now()}`);
      if (line === "SLOW") {
        busyWaitMs(1500); // this blocks EVERY connection on this server, not just this one
      }
      socket.write(`ack: ${line} at ${Date.now()}\n`);
    }
  });
});

server.listen(7001, () => console.log("blocking-demo server listening on :7001"));
