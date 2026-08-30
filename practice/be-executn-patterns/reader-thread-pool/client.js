const net = require("net");

// fires 4 messages back to back on ONE connection - if they were processed sequentially by
// one thread, total time would be roughly 4x one message's time. because the io thread hands
// each one to a DIFFERENT worker in the pool, they process in parallel instead.
const socket = net.createConnection({ host: "127.0.0.1", port: 7100 }, () => {
  console.log("connected, sending 4 messages back to back\n");
  const start = Date.now();
  socket.write("alpha\n");
  socket.write("bravo\n");
  socket.write("charlie\n");
  socket.write("delta\n");

  let responses = 0;
  socket.on("data", (chunk) => {
    for (const line of chunk.toString().trim().split("\n")) {
      responses++;
      console.log(`[client] response ${responses}/4 after ${Date.now() - start}ms: ${line}`);
    }
    if (responses >= 4) {
      console.log(`\nall 4 done in ${Date.now() - start}ms total`);
      socket.end();
    }
  });
});
