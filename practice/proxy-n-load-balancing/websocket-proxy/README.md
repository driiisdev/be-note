# Practice: WebSocket Proxy (Sticky Routing)

Concept note: [`websocket-proxying.md`](<../../../concepts/proxy n load balancing/websocket-proxying.md>)

## What this demonstrates

A reverse proxy that correctly forwards the WebSocket `Upgrade` handshake, then relays raw
bytes bidirectionally for the life of the connection — and, critically, **sticky routing**: the
same "room" always lands on the same backend, because that backend is the only one holding
that room's in-memory state.

## The key design point: the proxy never parses a WebSocket frame

Once the `Upgrade` handshake's raw bytes are forwarded, this proxy does nothing WebSocket-aware
at all for the rest of the connection — it just pipes bytes both ways, exactly like an
[L4 proxy](<../reverse-proxy-l4-vs-l7>) would. It doesn't need to decode frames, doesn't need to
understand masking, doesn't need to know anything about the WebSocket protocol beyond "don't
break the `Upgrade` request." This is the concrete version of what
[the concept note](<../../../concepts/proxy n load balancing/websocket-proxying.md>) describes:
an upgraded connection behaves like an L4 relay from that point forward, even though it started
as HTTP.

## Folder structure

```
websocket-proxy/
  backend.js       <- node backend.js <port> <label> - hand-rolled WS handshake + per-conn state
  ws-proxy.js         <- forwards the Upgrade handshake, sticky-routes by ?room=, then relays
  test-client.js         <- manual WS client (no libraries) - node test-client.js <room>
```

## Code walkthrough

**Sticky routing** — the same room name always hashes to the same backend:

```js
function pickBackend(room) {
  const hash = crypto.createHash("md5").update(room).digest()[0];
  return BACKENDS[hash % BACKENDS.length];   // consistent: same room -> same backend, always
}
```

**Forwarding the handshake without touching its crypto** — the proxy reconstructs the client's
*original* request (including their `Sec-WebSocket-Key`) and sends it straight to the backend,
so the backend computes `Sec-WebSocket-Accept` from the client's real key, not something the
proxy invented:

```js
const headerLines = [`${req.method} ${req.url} HTTP/1.1`];
for (let i = 0; i < req.rawHeaders.length; i += 2) {
  headerLines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
}
backendSocket.write(headerLines.join("\r\n") + "\r\n\r\n");
```

**Then, blind relay** — identical in spirit to the L4 proxy in the sibling project:

```js
clientSocket.pipe(backendSocket);
backendSocket.pipe(clientSocket);
```

## Run it

```bash
node backend.js 9001 A     # terminal 1
node backend.js 9002 B       # terminal 2
node ws-proxy.js               # terminal 3

node test-client.js chat          # terminal 4 - watch which backend handles it
node test-client.js chat            # same room again - should hit the SAME backend
node test-client.js tech              # different room - may hit the OTHER backend
```

## What you'll see

```
=== room 'chat' ===
[ws-proxy] upgrade for room "chat" -> sticky-routed to backend A (:9001)
[backend A] message #1: "hello from room chat"

=== room 'chat' again ===
[ws-proxy] upgrade for room "chat" -> sticky-routed to backend A (:9001)   <- same backend
[backend A] message #2: "hello from room chat"                              <- counter kept going

=== room 'tech' ===
[ws-proxy] upgrade for room "tech" -> sticky-routed to backend B (:9002)   <- different backend
[backend B] message #1: "hello from room tech"
```

`chat` lands on backend A **both** times, and backend A's message counter continues from where
it left off (1, then 2) — proof the "state" (the counter) genuinely lives on one specific
backend instance, and the proxy is consistently routing there. `tech` independently lands on
backend B, proving rooms genuinely do get distributed, not just stuck on one backend by luck.

## Try this yourself

- Try several room names and tally which backend each lands on — with only 2 backends, roughly
  half should go to each, confirming `pickBackend` isn't secretly favoring one.
- Open the browser dev tools Network tab and connect to `ws://localhost:9000/ws?room=chat`
  using the native `WebSocket` API (same as
  [`practice/protocols/websockets`](<../../protocols/websockets>)'s browser demo) — it behaves
  identically to `test-client.js`, since from the protocol's point of view they're indistinguishable.
- Comment out the `Sec-WebSocket-Key` line in `test-client.js`'s request and rerun — the
  backend's computed `Sec-WebSocket-Accept` will be wrong/missing, and the "handshake complete"
  log never appears, reproducing the classic "proxy silently breaks WebSockets" failure mode
  the concept note warns about (here caused by a malformed client request instead of a
  header-stripping proxy, but the visible symptom — upgrade never completes — is the same).

## Real-world equivalent

This is exactly what `nginx`'s `proxy_set_header Upgrade $http_upgrade;` +
`proxy_set_header Connection "upgrade";` configuration exists to guarantee (passing the
handshake headers through untouched), combined with `ip_hash` or a cookie-based upstream
directive for the sticky-session half of the problem.
