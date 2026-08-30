const net = require("net");

// each of the 3 roles from the concept note, called out explicitly where it actually happens -
// Node's net module plays all 3 roles internally (non-blocking), this just makes the
// boundary between them visible in the logs instead of hidden inside the module

// --- Listener ---
// owns the listening socket - mostly passive, just gives the OS somewhere to park
// completed handshakes (the backlog queue)
const server = net.createServer();

server.on("connection", (socket) => {
  // --- Acceptor ---
  // this callback fires once accept() has already pulled a connection off the backlog -
  // Node's net module called accept() for us; this is where a hand-off to a reader would
  // happen in a multi-threaded server (see the reader-thread-pool project for that)
  console.log(`[Acceptor] new connection from ${socket.remoteAddress}:${socket.remotePort}`);

  let buffer = "";

  socket.on("data", (chunk) => {
    // --- Reader ---
    // reading raw bytes off an ALREADY-accepted connection - note this can fire many times
    // for one logical message, or once for many messages, since TCP is a byte stream with
    // no built-in message boundaries (see reading-n-sending-socket-data.md)
    buffer += chunk.toString("utf8");

    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line.length === 0) continue;

      console.log(`[Reader] framed message: "${line}"`);
      socket.write(`echo: ${line}\n`);
    }
  });

  socket.on("close", () => {
    console.log(`[Acceptor] connection closed: ${socket.remoteAddress}:${socket.remotePort}`);
  });
});

server.listen(7000, () => {
  console.log("[Listener] listening on :7000 (backlog queue ready for new connections)");
});
