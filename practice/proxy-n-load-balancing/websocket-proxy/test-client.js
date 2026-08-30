const net = require("net");
const crypto = require("crypto");

// a minimal, manual websocket client - no libraries, so this proxy demo stays entirely
// core-modules-only. usage: node test-client.js <room>
const room = process.argv[2] || "default";
const key = crypto.randomBytes(16).toString("base64");

const socket = net.connect(9000, "localhost", () => {
  socket.write(
    [
      `GET /ws?room=${room} HTTP/1.1`,
      "Host: localhost:9000",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Key: ${key}`,
      "Sec-WebSocket-Version: 13",
      "\r\n",
    ].join("\r\n")
  );
});

let handshakeDone = false;
let buffer = Buffer.alloc(0);

socket.on("data", (chunk) => {
  if (!handshakeDone) {
    const text = chunk.toString();
    if (text.includes("101 Switching Protocols")) {
      handshakeDone = true;
      console.log(`[client:${room}] handshake complete, sending a message`);
      socket.write(encodeFrame(`hello from room ${room}`));
    }
    return;
  }
  buffer = Buffer.concat([buffer, chunk]);
  const message = decodeServerFrame(buffer);
  if (message !== null) {
    console.log(`[client:${room}] received: "${message}"`);
    socket.end();
    process.exit(0);
  }
});

function encodeFrame(message) {
  // client frames MUST be masked per the websocket spec
  const payload = Buffer.from(message, "utf8");
  const mask = crypto.randomBytes(4);
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];

  const header = Buffer.from([0x81, 0x80 | payload.length]); // FIN+text opcode, masked bit set
  return Buffer.concat([header, mask, masked]);
}

function decodeServerFrame(buffer) {
  if (buffer.length < 2) return null;
  const payloadLength = buffer[1] & 0x7f; // server frames are never masked
  const payload = buffer.slice(2, 2 + payloadLength);
  if (payload.length < payloadLength) return null; // wait for more data
  return payload.toString("utf8");
}

socket.on("error", (err) => console.error(`[client:${room}] error:`, err.message));
