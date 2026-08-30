// One TCP connection. Multiplexes frames from three independent "channels"
// onto it, each frame tagged with a channel id + length prefix so the server
// can tell them apart and reassemble frame boundaries from the byte stream.
const net = require("net");

const CHAT = 1, METRICS = 2, LOGS = 3;

const socket = net.connect(4300, "localhost", () => {
  console.log("[client] connected, interleaving frames from 3 channels on one socket");

  sendFrame(CHAT, "user joined the room");
  sendFrame(METRICS, "cpu=12%");
  sendFrame(LOGS, "server started");
  sendFrame(CHAT, "hello!");
  sendFrame(METRICS, "cpu=15%");
  sendFrame(LOGS, "handled request /health");
  sendFrame(CHAT, "how's it going?");

  socket.end();
});

function sendFrame(channelId, message) {
  const payload = Buffer.from(message, "utf8");
  const header = Buffer.alloc(5);
  header.writeUInt8(channelId, 0);
  header.writeUInt32BE(payload.length, 1);
  socket.write(Buffer.concat([header, payload]));
}

socket.on("close", () => console.log("[client] connection closed"));
socket.on("error", (err) => console.error("[client] connection failed — is server.js running?", err.message));
