const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const url = require("url");

// Same hand-rolled websocket handshake/framing technique as the websockets/ practice project —
// WebRTC doesn't define a signaling transport, so here it's built on top of what that project
// already covers, exactly like a real app would reuse websockets for this.

const WS_MAGIC_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(fs.readFileSync(path.join(__dirname, "index.html")));
    return;
  }
  res.writeHead(404).end();
});

// rooms: roomName -> Set of sockets. Two peers join the same room to find each other.
const rooms = new Map();

server.on("upgrade", (req, socket) => {
  if (req.headers["upgrade"] !== "websocket") return socket.destroy();

  const { query } = url.parse(req.url, true);
  const room = query.room || "default";

  const clientKey = req.headers["sec-websocket-key"];
  const acceptKey = crypto
    .createHash("sha1")
    .update(clientKey + WS_MAGIC_GUID)
    .digest("base64");

  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "\r\n",
    ].join("\r\n")
  );

  if (!rooms.has(room)) rooms.set(room, new Set());
  const peers = rooms.get(room);

  console.log(`[signaling] peer joined room "${room}" (${peers.size + 1} now in room)`);

  // the peer that was already waiting becomes the "offerer" once a second peer shows up -
  // the server itself never looks at SDP/ICE content, it's purely a message relay
  if (peers.size === 1) {
    for (const existing of peers) send(existing, { type: "peer-joined" });
  }

  peers.add(socket);

  socket.on("data", (buffer) => {
    const message = decodeFrame(buffer);
    if (message === null) return;
    // relay verbatim to every OTHER peer in the same room
    for (const other of peers) {
      if (other !== socket) send(other, JSON.parse(message));
    }
  });

  const cleanup = () => {
    peers.delete(socket);
    console.log(`[signaling] peer left room "${room}" (${peers.size} remaining)`);
    if (peers.size === 0) rooms.delete(room);
  };
  socket.on("close", cleanup);
  socket.on("error", cleanup);
});

function send(socket, obj) {
  socket.write(encodeFrame(JSON.stringify(obj)));
}

function decodeFrame(buffer) {
  const secondByte = buffer[1];
  let payloadLength = secondByte & 0x7f;
  let offset = 2;
  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    return null; // not needed for small JSON signaling messages
  }
  const maskKey = buffer.slice(offset, offset + 4);
  offset += 4;
  const payload = buffer.slice(offset, offset + payloadLength);
  const decoded = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) decoded[i] = payload[i] ^ maskKey[i % 4];
  return decoded.toString("utf8");
}

function encodeFrame(message) {
  const payload = Buffer.from(message, "utf8");
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  }
  return Buffer.concat([header, payload]);
}

server.listen(3400, () => console.log("webrtc signaling server listening on :3400"));
