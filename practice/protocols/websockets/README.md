# Practice: WebSockets

Concept note: [`websockets.md`](<../../../concepts/protocols/websockets.md>)

## What this demonstrates

The WebSocket handshake and frame format, hand-rolled from Node's raw `http` and `crypto`
modules — no `ws` package — so the "just an HTTP upgrade, then a different framing protocol"
description in the concept note is something you can step through in real code, line by line.

## Scenario

A broadcast chat: any browser tab that sends a message gets `echo: <message>` sent back to
**every** connected tab, not just the sender — enough to show real bidirectional, multi-client
behavior without building a full chat UI.

## Folder structure

```
websockets/
  server.js    <- http server + raw upgrade handshake + minimal frame encode/decode
  index.html   <- browser client using the native WebSocket API (zero dependencies either side)
```

## Code walkthrough

**The handshake** — the server's only job is to prove it understood the protocol, by hashing
the client's key with a fixed magic constant from the spec:

```js
const acceptKey = crypto
  .createHash("sha1")
  .update(clientKey + WS_MAGIC_GUID)
  .digest("base64");

socket.write(
  "HTTP/1.1 101 Switching Protocols\r\n" +
  "Upgrade: websocket\r\n" +
  "Connection: Upgrade\r\n" +
  `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
);
```

After that `write()`, `socket` is still just a raw TCP socket — but by agreement, neither side
will send HTTP on it again. Everything from here on is WebSocket **frames**.

**Frame masking** — client → server frames are always masked (an XOR with a 4-byte key sent in
the frame), server → client frames never are. This isn't encryption, it's a spec requirement
aimed at preventing certain cache-poisoning attacks against proxies that don't understand
WebSocket framing:

```js
for (let i = 0; i < payload.length; i++) {
  decoded[i] = payload[i] ^ maskKey[i % 4];
}
```

## Run it

```bash
node server.js
```

Then open `http://localhost:3300/` in **two separate browser tabs**. Type in one, watch it
appear in both — that's the broadcast, and proof the connection is genuinely bidirectional and
persistent (no request was made to receive that message).

## Try this yourself

- Open the browser Network tab, find the WebSocket connection, and look at its request headers
  — you'll see the exact `Upgrade`/`Sec-WebSocket-Key` headers this server's handshake code
  reads.
- Change `encodeFrame` to send a payload longer than 65535 bytes and see the demo break — it's
  a deliberately minimal implementation, not a spec-complete one (a real `payloadLength === 127`
  case, for 64-bit lengths, is left unhandled on purpose to keep this readable).
- Close a tab while it's mid-broadcast and check the server log — the `close` event removes it
  from `clients`, which is the server doing cleanup for a client it's holding **stateful**
  per-connection resources for (see
  [stateful vs stateless](<../../../concepts/comms design pattern/stateful-vs-stateless.md>)).

## Real-world equivalent

Every production WebSocket server (Socket.IO, `ws`, framework-provided ones) does exactly this
handshake and frame format underneath — they just add reconnect logic, larger-frame handling,
compression, and room/namespace abstractions on top of what's implemented here directly.
