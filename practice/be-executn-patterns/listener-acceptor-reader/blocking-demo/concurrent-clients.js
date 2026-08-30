const net = require("net");

// client A sends SLOW (triggers the 1.5s synchronous busy-wait), client B sends FAST
// immediately after - if the server were truly non-blocking, B's ack would arrive almost
// instantly; because the busy-wait genuinely blocks the ONE JS thread, B has to wait for
// A's busy-wait to finish first, even though B's own request needed no real work at all
function connect(label, message) {
  const start = Date.now();
  const socket = net.createConnection({ host: "127.0.0.1", port: 7001 }, () => {
    socket.write(message + "\n");
  });
  socket.on("data", (chunk) => {
    console.log(`[${label}] got response after ${Date.now() - start}ms: ${chunk.toString().trim()}`);
    socket.end();
  });
}

console.log("connecting client A (SLOW) and client B (FAST) nearly simultaneously...\n");
connect("A", "SLOW");
setTimeout(() => connect("B", "FAST"), 50); // B connects 50ms after A, well before A finishes
