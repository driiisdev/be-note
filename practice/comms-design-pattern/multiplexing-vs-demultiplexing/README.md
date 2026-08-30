# Practice: Multiplexing vs Demultiplexing

Concept note: [`concepts/comms design pattern/multiplexing-vs-demultiplexing.md`](<../../../concepts/comms design pattern/multiplexing-vs-demultiplexing.md>)

## What this demonstrates

Three independent logical "channels" of messages sharing a single TCP connection, tagged with
a channel id — the server demultiplexes incoming frames back into three separate handlers.
This is the same idea HTTP/2 uses to run many request streams over one connection.

## Scenario

A client opens **one** TCP connection and interleaves messages meant for three different
channels: `chat`, `metrics`, and `logs`. The server reads that single stream of bytes and
routes each frame to the right handler based on a channel id in the frame — the three
"streams" never get their own connection.

## Folder structure

```
multiplexing-vs-demultiplexing/
  server.js   <- one TCP listener; demultiplexes incoming frames by channel id
  client.js   <- one TCP connection; multiplexes frames from three channels onto it
```

## Frame format (deliberately simple — length-prefixed, not text)

```
[1 byte: channel id][4 bytes: payload length, big-endian][payload bytes...]
```

A length prefix is what makes this safe over TCP: TCP has no concept of "messages", only a
byte stream, so without a length prefix the server couldn't tell where one frame ends and the
next begins (this is the same "boundary" idea from
[request-response](<../request-response/README.md>), just applied to raw frames instead of
HTTP).

## Code walkthrough

**Multiplexing (client)** — three logical senders, one physical write target:

```js
function sendFrame(channelId, payload) {
  const header = Buffer.alloc(5);
  header.writeUInt8(channelId, 0);
  header.writeUInt32BE(payload.length, 1);
  socket.write(Buffer.concat([header, payload])); // all channels share this one socket
}
```

**Demultiplexing (server)** — one physical source, routed back out to separate handlers:

```js
const handlers = { 1: handleChat, 2: handleMetrics, 3: handleLogs };

function onFrame(channelId, payload) {
  handlers[channelId](payload); // route based on the tag, same as HTTP/2 does with stream IDs
}
```

## Run it

```bash
# terminal 1
node server.js

# terminal 2
node client.js
```

## What to observe

- The server logs show frames from `chat`, `metrics`, and `logs` arriving **interleaved**,
  all through the exact same socket connection (check the log — only one `client connected`
  line ever appears).
- Comment out two of the three channels in `client.js` and note the connection count doesn't
  change — you're still using exactly one TCP connection no matter how many logical channels
  ride on it, which is the entire efficiency win over "one connection per stream."
- Try feeding the server a corrupted length prefix (e.g. hardcode the wrong length in one
  `sendFrame` call) and watch demultiplexing break — this is why the length prefix has to be
  exactly right; it's the only thing telling the demultiplexer where a frame ends.

## Try this yourself

- Add a fourth channel and handler without touching the multiplexing logic on the client —
  notice you only need to add a new channel id + handler, not a new connection.
- Simulate two clients connecting at once and confirm the server tracks per-connection state
  correctly (no channel data leaking between the two clients' sockets).

## Real-world equivalent

HTTP/2 and HTTP/3 multiplex many request/response streams over one connection using a stream
ID in each frame, exactly like this demo's channel id — that's what let browsers stop opening
6+ parallel TCP connections per site (the HTTP/1.1 workaround) and eliminated
connection-level head-of-line blocking.

## Second demo: H2 proxying vs. connection pooling

Concept: [`H2 proxying vs. connection pooling`](<../../../concepts/comms design pattern/multiplexing-vs-demultiplexing.md#a-concrete-case-h2-proxying-vs-connection-pooling>)

The channel-tagging demo above shows mux/demux as a raw protocol mechanic. This one shows the
same idea as a real proxy configuration decision: a reverse proxy accepts one multiplexed
HTTP/2 client connection, **demultiplexes** it into individual requests, and then has to decide
*how* to forward each one upstream — and that decision looks completely different depending on
whether the backend can multiplex too.

### Proxy demo scenario

The same 8 concurrent requests, sent through two different proxies:

- **`proxy-connection-pool.js`** forwards to an **HTTP/1.1** backend. Since HTTP/1.1 allows
  only one in-flight request per connection, the proxy holds a **pool** of 4 keep-alive
  connections — the 5th, 6th, 7th, and 8th requests have to queue for one to free up.
- **`proxy-h2-passthrough.js`** forwards to an **HTTP/2** backend over **one shared,
  long-lived connection**, opened once at proxy startup. Every incoming request gets
  re-multiplexed onto that same connection as a new stream — no pool, no queuing, because
  HTTP/2 itself supports many concurrent streams per connection.

### Proxy demo folder structure

```
h2-proxy-vs-connection-pooling/
  backend-http1.js          <- plain http server, 500ms simulated work per request
  backend-http2.js          <- h2c server, same simulated work, for a fair comparison
  proxy-connection-pool.js  <- h2 in, forwards via a pooled http.Agent (maxSockets: 4)
  proxy-h2-passthrough.js   <- h2 in, forwards via ONE shared http2 session
  client.js                 <- fires N concurrent requests at whichever proxy you point it at
```

### Proxy demo code walkthrough

**Connection pooling** — concurrency to the backend is capped by `maxSockets`; Node's
`http.Agent` queues anything beyond that internally:

```js
const pool = new http.Agent({ keepAlive: true, maxSockets: 4 });
http.request({ host: "localhost", port: 4101, path, agent: pool }, ...);
```

**H2 passthrough** — one session, opened once, reused for every request as a new stream:

```js
const backendSession = http2.connect("http://localhost:4102"); // opened once at startup

server.on("stream", (clientStream, headers) => {
  const upstreamStream = backendSession.request({ ":path": headers[":path"] }); // reused, not pooled
  ...
});
```

### Run the proxy demo

```bash
# 4 terminals for the backends + proxies
node backend-http1.js
node backend-http2.js
node proxy-connection-pool.js
node proxy-h2-passthrough.js

# then, in a 5th terminal
node client.js 4200 8   # hits the connection-pool proxy (upstream: http/1.1)
node client.js 4201 8   # hits the h2-passthrough proxy   (upstream: http/2)
```

### What the proxy demo shows

With 8 concurrent requests, each taking ~500ms of simulated backend work, and a pool size of 4:

- The **pooled** proxy's log shows requests 5–8 logged as `"queuing for a free connection"` —
  the pool is full at 4/4, so those requests wait for the first batch to finish. Total time
  lands around **~1100ms** (two batches of ~550ms each).
- The **h2-passthrough** proxy's log shows all 8 streams starting on the backend
  **immediately**, all on the same shared connection. Total time lands around **~560ms** — one
  batch, because HTTP/2 concurrency didn't need extra connections to begin with.

### Try the proxy demo yourself

- Raise `POOL_SIZE` in `proxy-connection-pool.js` to 8 and rerun — the queuing disappears and
  timing gets close to the h2-passthrough proxy's, at the cost of 8 open upstream connections
  instead of 1.
- Lower it to 1 and watch every request serialize, one at a time — this is what a proxy
  forwarding to HTTP/1.1 looks like with *no* pooling at all.
- Kill `backend-http2.js` while `proxy-h2-passthrough.js` is still running and send another
  request — the shared session errors out for *every* pending stream at once, since they're
  all riding the one connection. Compare that to killing `backend-http1.js` mid-flight: only
  the requests on the specific pooled connection to that dead socket are affected. This is the
  head-of-line-blocking-vs-isolation tradeoff called out at the end of [the concept
  note](<../../../concepts/comms design pattern/multiplexing-vs-demultiplexing.md>).

### Proxy demo real-world equivalent

This is precisely what `nginx`'s `proxy_http_version 1.1` + `keepalive <N>` upstream config
does (connection pooling) versus its HTTP/2-upstream support (re-multiplexing) — and it's a
real capacity-planning decision, not just a code detail: pool size for an HTTP/1.1 backend has
to be tuned against expected concurrency, while an HTTP/2 backend mostly needs enough
*connections* for redundancy/throughput, not for concurrency itself.
