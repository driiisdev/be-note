# Practice: Notification Delivery (Polling / Long Polling / SSE / Push)

Concept notes:
[Polling](<../../../concepts/comms design pattern/polling.md>) ·
[Long polling](<../../../concepts/comms design pattern/long-polling.md>) ·
[Server-sent events](<../../../concepts/comms design pattern/server-sent-events.md>) ·
[Push](<../../../concepts/comms design pattern/push.md>)

## Why these four are one project

They're all answers to the exact same question — *"how does a client find out the server has
new information, without the server being able to just walk over and tell it?"* — in
increasing order of sophistication. Building the same scenario four ways makes the tradeoffs
concrete instead of abstract.

## Scenario

**"Has my order shipped yet?"** — every variant tracks one order that starts as `"processing"`
and flips to `"shipped"` after a random delay (a few seconds, so you don't have to wait long).
The only thing that changes between variants is *how the client learns about that flip*.

## Folder structure

```
notification-delivery/
  README.md
  polling/
    server.js     <- answers "/order-status" immediately, every time, whatever the status is
    client.js     <- asks on a fixed interval (1s)
  long-polling/
    server.js     <- holds "/order-status" open until it flips to shipped, or times out
    client.js     <- immediately re-requests after every response
  server-sent-events/
    server.js     <- opens one connection, writes status events as they happen
    client.js     <- hand-parses the text/event-stream format (no browser EventSource here)
  push/
    server.js     <- raw TCP: pushes the status change unprompted, no request involved
    client.js     <- just listens on the socket
```

## Run any variant

```bash
cd polling            # or long-polling / server-sent-events / push
node server.js         # terminal 1
node client.js         # terminal 2 — try opening two client terminals for push/SSE
```

## Side-by-side comparison

| | Polling | Long polling | SSE | Push (raw TCP) |
|---|---|---|---|---|
| Connections used | many, short-lived | many, held open until answered | one, held open indefinitely | one, held open indefinitely |
| Requests to learn "shipped" | ~1 per poll interval until it flips | 1 (the one that's open when it flips) | 0 (server just writes) | 0 (server just writes) |
| Wasted "no change" traffic | yes, most polls | no | no | no |
| Direction | client asks, server answers | client asks, server answers (late) | server → client only | either direction (this demo: server → client) |
| Server state per client | none | one parked request | one open stream | one open socket |

## Code walkthrough (the part that actually differs)

**Polling** — always answers instantly, so the client has to keep asking:
```js
// server: no waiting, just reports current status
res.end(JSON.stringify({ status: orderStatus }));

// client: asks again on a timer regardless of the answer
setTimeout(poll, 1000);
```

**Long polling** — server parks the response until there's news:
```js
// server: don't respond yet — stash it
if (orderStatus === "processing") {
  waitingResponses.push(res);
} else {
  res.end(JSON.stringify({ status: orderStatus }));
}
// ...later, when the status flips:
waitingResponses.forEach((res) => res.end(JSON.stringify({ status: "shipped" })));
```

**SSE** — one connection, server writes whenever it wants:
```js
res.writeHead(200, { "Content-Type": "text/event-stream" });
res.write(`data: ${JSON.stringify({ status: "processing" })}\n\n`);
// ...later...
res.write(`data: ${JSON.stringify({ status: "shipped" })}\n\n`);
```

**Push (raw TCP)** — no HTTP request/response framing at all, just bytes on a socket:
```js
// server: nothing asked for this, it just happens
socket.write(JSON.stringify({ status: "shipped" }) + "\n");
```

🖼️ **Image needed:** four small timelines stacked vertically (one per variant) over the same
time axis, each showing when requests/connections happen and when the client actually learns
"shipped" — makes the request-count and latency differences visible at a glance. Search:
"polling long polling sse websocket comparison timeline".

## Try this yourself

- Run the polling and long-polling variants side by side and count total requests each makes
  before "shipped" — long polling should make dramatically fewer.
- Open two `client.js` terminals against the SSE or push server — both should receive the
  same status change independently, since each holds its own connection.
- In the push variant, kill the server mid-run and watch the client's socket `close`/`error`
  event — this is the reconnect logic real push clients (WebSocket libraries, mobile push
  SDKs) have to implement and this bare-bones version doesn't.
- Swap the SSE demo's manual parsing for a real browser: serve `server.js`'s `/events` route
  and in a browser console run
  `new EventSource("http://localhost:3005/events").onmessage = e => console.log(e.data)`.

## Real-world equivalent

Polling: a CI job status checker. Long polling: older chat apps (pre-WebSocket). SSE: a
live-updating dashboard or LLM token streaming. Push: WebSockets, mobile push notifications,
IoT device commands over MQTT.
