const net = require("net");
const WorkerPool = require("./pool");

// this ONE thread does Listen + Accept + Read for every connection - the pattern C split is
// that once a complete message is framed, PROCESSING it is handed off to the worker pool,
// while this thread immediately goes back to reading more data from any connection.
// it never runs the CPU-heavy work itself - see worker.js for that.
const POOL_SIZE = 4;
const pool = new WorkerPool(POOL_SIZE);

const server = net.createServer((socket) => {
  console.log(`[io-thread] connected: ${socket.remotePort}`);
  let buffer = "";

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;

      const start = Date.now();
      console.log(`[io-thread] framed "${line}" -> dispatching to worker pool`);

      // the io thread does NOT wait here - it immediately returns to reading more data.
      // this .then() callback is what fires once whichever worker picked it up finishes
      pool.run(line).then((result) => {
        console.log(`[io-thread] worker finished "${line}" in ${Date.now() - start}ms`);
        socket.write(result + "\n");
      });
    }
  });

  socket.on("close", () => console.log(`[io-thread] disconnected: ${socket.remotePort}`));
});

server.listen(7100, () =>
  console.log(`server listening on :7100 (1 io thread, ${POOL_SIZE} worker threads)`)
);
