const http = require("http");
const crypto = require("crypto");

// same hand-rolled websocket handshake/framing as practice/protocols/websockets - reused here
// because the PROXY in this demo never needs to understand WS framing at all (see README) -
// only the backend does. usage: node backend.js <port> <label>
const port = Number(process.argv[2]);
const label = process.argv[3];

const WS_MAGIC_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

// server-side STATE, per connection - the whole reason a websocket connection can't just be
// load-balanced message-by-message across backends (see the concept note on sticky sessions):
// this counter only exists on whichever backend actually holds the connection
let messageCount = 0;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`backend "${label}" - direct http request, not a websocket\n`);
});

server.on("upgrade", (req, socket) => {
  const clientKey = req.headers["sec-websocket-key"];
  const acceptKey = crypto.createHash("sha1").update(clientKey + WS_MAGIC_GUID).digest("base64");

  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "\r\n",
    ].join("\r\n")
  );

  console.log(`[backend ${label}] websocket connected (room=${req.url})`);

  socket.on("data", (buffer) => {
    const message = decodeFrame(buffer);
    if (message === null) return;
    messageCount++;
    console.log(`[backend ${label}] message #${messageCount}: "${message}"`);
    socket.write(encodeFrame(`[${label}] echo #${messageCount}: ${message}`));
  });

  socket.on("close", () => console.log(`[backend ${label}] websocket disconnected`));
  socket.on("error", () => {});
});

function decodeFrame(buffer) {
  const secondByte = buffer[1];
  let payloadLength = secondByte & 0x7f;
  let offset = 2;
  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    return null;
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

server.listen(port, () => console.log(`backend "${label}" listening on :${port}`));
