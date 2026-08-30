const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// the magic GUID from the websocket spec (RFC 6455) - always this exact constant
const WS_MAGIC_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const server = http.createServer((req, res) => {
  // serve the demo page over plain http - the websocket upgrade happens on a separate request
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(fs.readFileSync(path.join(__dirname, "index.html")));
    return;
  }
  res.writeHead(404).end();
});

const clients = new Set();

server.on("upgrade", (req, socket) => {
  if (req.headers["upgrade"] !== "websocket") {
    socket.destroy();
    return;
  }

  // --- the handshake ---
  // the client sends Sec-WebSocket-Key; we prove we understood the protocol by hashing
  // key + magic GUID and sending it back as Sec-WebSocket-Accept. This isn't encryption or
  // security - it just stops a plain http server from accidentally being upgraded by mistake.
  const clientKey = req.headers["sec-websocket-key"];
  const acceptKey = crypto
    .createHash("sha1")
    .update(clientKey + WS_MAGIC_GUID)
    .digest("base64");

  const responseHeaders = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptKey}`,
    "\r\n",
  ].join("\r\n");

  socket.write(responseHeaders);
  // from this point on, this socket no longer speaks http - it speaks ws frames

  console.log("[ws] client connected");
  clients.add(socket);

  socket.on("data", (buffer) => {
    const message = decodeFrame(buffer);
    if (message === null) return; // close frame or unparseable
    console.log(`[ws] received: ${message}`);
    broadcast(`echo: ${message}`, socket);
  });

  socket.on("close", () => {
    console.log("[ws] client disconnected");
    clients.delete(socket);
  });

  socket.on("error", () => clients.delete(socket));
});

function broadcast(message, from) {
  const frame = encodeFrame(message);
  for (const client of clients) {
    client.write(frame);
  }
}

// --- minimal ws frame decode (client -> server frames are always masked, per spec) ---
function decodeFrame(buffer) {
  const secondByte = buffer[1];
  const isMasked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    // 64-bit length, way beyond what this demo needs - not handled
    return null;
  }

  if (!isMasked) return null; // per spec, client frames must be masked

  const maskKey = buffer.slice(offset, offset + 4);
  offset += 4;

  const payload = buffer.slice(offset, offset + payloadLength);
  const decoded = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) {
    decoded[i] = payload[i] ^ maskKey[i % 4]; // unmask: xor each byte with the mask, cyclically
  }

  return decoded.toString("utf8");
}

// --- minimal ws frame encode (server -> client frames are never masked, per spec) ---
function encodeFrame(message) {
  const payload = Buffer.from(message, "utf8");
  const payloadLength = payload.length;

  let header;
  if (payloadLength < 126) {
    header = Buffer.from([0x81, payloadLength]); // 0x81 = FIN + text opcode
  } else {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
  }

  return Buffer.concat([header, payload]);
}

server.listen(3300, () => console.log("websocket demo server listening on :3300"));
