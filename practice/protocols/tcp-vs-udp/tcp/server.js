const net = require("net");

const server = net.createServer((socket) => {
  console.log(`[tcp] client connected ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on("data", (chunk) => {
    console.log(`[tcp] received: ${chunk.toString().trim()}`);
    socket.write(`echo: ${chunk}`);
  });

  socket.on("close", () => console.log("[tcp] client disconnected"));
});

server.listen(5000, () => console.log("tcp echo server listening on :5000"));
