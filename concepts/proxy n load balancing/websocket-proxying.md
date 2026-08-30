# WebSocket Proxying

Every reverse proxy technique covered so far assumes a request has a clean beginning and end —
[Layer 7 load balancing](<layer4-vs-layer7-load-balancers.md>) parses one HTTP request, routes
it, gets one response back, and it's done. [WebSockets](<../protocols/websockets.md>) break that
assumption entirely, and a proxy that doesn't account for it will silently fail.

## It starts as HTTP, then stops being HTTP

A WebSocket connection begins as a normal HTTP request carrying an `Upgrade: websocket`
header (see [WebSockets](<../protocols/websockets.md>) for the full handshake). A proxy sitting
in the middle has to specifically forward this `Upgrade` request and correctly relay the `101
Switching Protocols` response back — a lot of older or default-configured proxies **don't** pass
`Upgrade`/`Connection` headers through by default, which silently breaks WebSocket connections
routed through them (a request that works fine with plain HTTP just... never upgrades).

## After the handshake, the proxy has to change modes

Once upgraded, the connection is no longer "one request, one response" — it's long-lived,
bidirectional, and can carry frames in both directions for hours. A proxy handling this has to
switch from its normal L7 mode (parse a request, forward it, wait for one response, done) into
something that behaves much more like an [L4 proxy](<layer4-vs-layer7-load-balancers.md>): blind,
bidirectional byte relaying, for as long as the connection stays open, even though the
connection *started* as HTTP and the proxy may have needed to be HTTP-aware just to get it
there.

## Sticky sessions are no longer optional

This is the part that trips people up most: because a WebSocket connection is
[stateful](<../comms design pattern/stateful-vs-stateless.md>) and long-lived, the **same**
backend instance has to keep handling it for the connection's entire lifetime. Individual
WebSocket *messages* can't be load-balanced round-robin across different backend instances the
way independent HTTP requests can — the specific backend that accepted the connection is the
only one holding the in-memory state (subscriptions, session data) that connection depends on.

Common techniques to guarantee this:

- **IP-hash routing** — the same client IP always maps to the same backend.
- **Cookie-based affinity** — the load balancer sets a cookie identifying which backend handled
  the initial connection, and uses it to route any reconnect back to the same place.
- **Consistent hashing** — spreads clients across backends while minimizing reshuffling when a
  backend is added or removed.

## Idle connections and timeouts

WebSocket connections can sit **idle** for long stretches with no data flowing in either
direction — a legitimate, expected state for a chat app open in a background tab, for example.
Many proxies and load balancers have a default idle-connection timeout that assumes a quiet
connection is dead, and will silently close it. Fixing this means either configuring a longer
timeout explicitly, or having the application send `ping`/`pong` control frames (see
[WebSockets](<../protocols/websockets.md>)) to keep the connection looking active.

## Scaling beyond one backend, without relying purely on stickiness

Sticky sessions solve *routing* a given connection consistently, but not the problem of one
backend needing to notify a client connected to a *different* backend (e.g. a chat message from
a user on backend A needs to reach a recipient connected to backend B). That requires a shared
**pub/sub backplane** — see [Pub/sub](<../comms design pattern/pub-sub.md>) — so a message
published on any backend instance can still reach any connected client, regardless of which
instance actually holds that client's socket.

🖼️ **Image needed:** a WebSocket client connected through a proxy to backend A, with backend B
publishing a message to a shared pub/sub layer that backend A subscribes to and forwards down
the client's existing connection. Search: "websocket load balancing sticky sessions pub sub
diagram".

## Practice project

[`practice/proxy-n-load-balancing/websocket-proxy`](../../practice/proxy-n-load-balancing/websocket-proxy) —
a proxy that correctly forwards the WebSocket handshake, then relays raw bytes bidirectionally
for the life of the connection, with sticky routing keeping a client pinned to one backend.

## Related

- [WebSockets](<../protocols/websockets.md>) — the handshake and framing this note builds on.
- [Stateful vs stateless](<../comms design pattern/stateful-vs-stateless.md>) — why sticky
  sessions are non-negotiable here, unlike for stateless HTTP traffic.
- [Pub/sub](<../comms design pattern/pub-sub.md>) — how backends coordinate when a client on
  one instance needs a message that originated on another.
- [Layer 4 vs Layer 7 load balancers](<layer4-vs-layer7-load-balancers.md>) — why an upgraded
  WebSocket connection ends up handled more like an L4 relay than an L7 request.
