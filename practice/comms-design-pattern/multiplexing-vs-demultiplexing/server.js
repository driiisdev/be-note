// One TCP listener. Reads a single interleaved byte stream and demultiplexes
// it back into three logical channels based on a 1-byte channel id prefixing
// every frame. This is the same shape as HTTP/2 routing frames by stream ID.
const net = require("net");

const CHANNELS = { 1: "chat", 2: "metrics", 3: "logs" };

function handleFrame(channelId, payload) {
  const name = CHANNELS[channelId] || `unknown(${channelId})`;
  console.log(`[server] [${name}] ${payload.toString()}`);
}

const server = net.createServer((socket) => {
  console.log("[server] client connected (one connection, will carry all channels)");
  let buffer = Buffer.alloc(0);

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    // Demultiplex: keep pulling complete frames out of the buffer.
    // Frame = [1 byte channel id][4 bytes length][payload]
    while (buffer.length >= 5) {
      const channelId = buffer.readUInt8(0);
      const length = buffer.readUInt32BE(1);
      const frameTotalLength = 5 + length;
      if (buffer.length < frameTotalLength) break; // wait for the rest of this frame

      const payload = buffer.subarray(5, frameTotalLength);
      handleFrame(channelId, payload);
      buffer = buffer.subarray(frameTotalLength);
    }
  });

  socket.on("close", () => console.log("[server] client disconnected"));
  socket.on("error", () => {});
});

server.listen(4300, () => console.log("[server] listening on tcp://localhost:4300"));
