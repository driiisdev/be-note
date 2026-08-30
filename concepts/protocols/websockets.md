# WebSockets

A full-duplex, persistent, bidirectional connection between client and server, running over a
single [TCP](<tcp.md>) connection. Unlike plain HTTP, either side can send a message at any
time — there's no requirement that every message be a response to a request.

## The handshake

A WebSocket connection starts life as an ordinary HTTP request:

```
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: <random base64 value>
```

The server responds `101 Switching Protocols`, and from that point on the connection stops
speaking HTTP entirely and switches to the WebSocket **framing** protocol — a much lighter
binary/text frame format designed for sending many small messages back and forth cheaply.

`Ping`/`Pong` are control frames either side can send to check the connection is still alive —
important because unlike request-response, there's no natural moment where you'd otherwise
notice the other side went away.

## vs Server-Sent Events

The [comms design pattern notes](<../comms design pattern/server-sent-events.md>) already
cover SSE: server → client only, plain HTTP, automatic reconnect built into the browser API.
WebSockets is bidirectional and lower-level — you get more capability, but you also own more of
the plumbing (reconnect logic, message framing on top if you need it).

## The cost: it's stateful

This is exactly the [stateful vs stateless](<../comms design pattern/stateful-vs-stateless.md>)
tradeoff made concrete: the server has to hold one open connection *per client*, for as long as
that client is connected. That has real consequences:

- Doesn't play as nicely with plain HTTP load balancers/caches (there's no discrete
  "request" to route or cache).
- Scaling across multiple server instances needs either sticky sessions (same client always
  hits the same instance) or a shared pub/sub backplane, so a message published on instance A
  can still reach a client whose WebSocket connection happens to be open on instance B.

## Where it's used

Chat apps, live collaborative editing, multiplayer games, live trading/dashboard feeds — any
case where the client genuinely needs to both send and receive without the overhead of a new
HTTP request per message.

🖼️ **Image needed:** the HTTP `Upgrade` handshake turning into a WebSocket connection, then
frames flowing in both directions independently (not request-then-response). Search:
"websocket handshake upgrade diagram".

## Practice project

[`practice/protocols/websockets`](../../practice/protocols/websockets) — a
hand-rolled WebSocket server (handshake + frame parsing, no libraries) talking to a plain
browser client using the native `WebSocket` API.

## Related

- [Push](<../comms design pattern/push.md>) and
  [Server-sent events](<../comms design pattern/server-sent-events.md>) — other answers to
  "how does the server speak first," at different points on the complexity/capability spectrum.
- [Stateful vs stateless](<../comms design pattern/stateful-vs-stateless.md>) — why holding a
  connection open per client is the core cost of this pattern.
- [WebRTC](<webRTC.md>) — also bidirectional and persistent, but peer-to-peer instead of
  client-server.
