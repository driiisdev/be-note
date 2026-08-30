# Multiplexing vs Demultiplexing

How multiple independent streams of data share a single underlying channel (a TCP connection,
a thread, a wire) instead of each needing their own.

## How it works

**Multiplexing (mux):** combining multiple independent logical streams so they can travel over
one shared physical channel. Each piece is tagged with an identifier so it can be sorted out
again later.

**Demultiplexing (demux):** the reverse — taking that shared channel and splitting it back
out into the original separate streams, using the tags to route each piece to the right
place.

```
Stream A: [A1] [A2] [A3]
Stream B: [B1] [B2]         --mux-->  [A1][B1][A2][B2][A3]  --demux-->  Stream A: [A1][A2][A3]
                                        (one shared channel)             Stream B: [B1][B2]
```

They're always a pair — you multiplex on the way in, demultiplex on the way out, on the
*other end* of the same channel.

## Where it's used

- **HTTP/2 and HTTP/3 stream multiplexing** — many requests share a single TCP (or QUIC)
  connection at once, tagged by stream ID, instead of opening one connection per request like
  HTTP/1.1 did. This is why HTTP/2 fixed "head-of-line blocking at the connection level."
  🖼️ **Image needed:** side-by-side comparing HTTP/1.1 (many parallel TCP connections, one
  per request) vs HTTP/2 (one TCP connection, many interleaved streams tagged by ID). Search:
  "http/2 multiplexing diagram".
- **Transport layer ports** — a single network interface/IP demultiplexes incoming packets to
  the right process based on the destination port number.
- **The OS event loop itself** (`select`/`epoll`/`kqueop`) — one thread multiplexes readiness
  notifications from many sockets, which is exactly what makes
  [async workloads](<sync-vs-async-workloads.md>) possible with so few threads.
- TDM/FDM in telecom (time-division / frequency-division multiplexing) — the original,
  literal meaning of the term, for sharing physical wire/spectrum.

## Pros / Cons

**Pros:** avoids the overhead of one connection (or thread, or wire) per stream — connection
setup (TCP/TLS handshakes) is expensive, so reusing one connection for many logical streams is
a big efficiency win.

**Cons:** streams sharing one channel can still contend with each other (e.g. a huge response
on one HTTP/2 stream can delay bytes for another stream sharing the same TCP connection if the
TCP layer itself stalls); needs a framing/tagging scheme, which adds a bit of protocol
complexity over "just open a new connection".

## A concrete case: H2 proxying vs. connection pooling

This is where mux/demux stops being abstract and turns into a real proxy configuration
decision. Picture a reverse proxy sitting between clients and a backend, where the client
speaks HTTP/2 to the proxy:

```
clients --[one h2 connection, many multiplexed streams]--> proxy --??--> backend
```

The proxy's job on the client side is **demultiplexing** — pulling many concurrent logical
requests back out of that one shared h2 connection. The interesting question is what it does
next, forwarding each of those requests *upstream* to the backend, and that split is exactly
"H2 proxying" vs. "connection pooling":

**H2 proxying (re-multiplex):** if the backend *also* speaks HTTP/2, the proxy can open one
(or a small handful of) long-lived h2 connections to it and **re-multiplex** every demuxed
client request back onto that shared connection as a new stream. Concurrency to the backend
costs nothing extra — one connection already supports many streams — the proxy is just moving
requests from one multiplexed connection to another.

**Connection pooling (fan out):** if the backend only speaks HTTP/1.1, multiplexing isn't an
option — HTTP/1.1 allows exactly one in-flight request per connection. The proxy's only way to
get real concurrency to the backend is to hold open a **pool** of several keep-alive HTTP/1.1
connections and hand each incoming request whichever pooled connection is currently free. Once
every connection in the pool is busy, the next request has to queue for one to free up —
concurrency is capped by pool size, not by anything the protocol itself allows.

```
H2 backend:    proxy --[one shared h2 connection]--------------> backend (many streams, one conn)
H1.1 backend:  proxy --[connection 1]--\
               proxy --[connection 2]---> backend (each conn handles ONE request at a time)
               proxy --[connection N]--/
```

Both are legitimate, common configurations — `nginx`'s `proxy_http_version 1.1` +
`keepalive <pool size>` upstream directives configure connection pooling; `nginx`'s/Envoy's
HTTP/2-upstream support configures the re-multiplexing case. The pooled case just needs more
upstream connections (and more care tuning pool size vs backend concurrency) to reach the same
throughput a single multiplexed h2 connection gets "for free" — though a single shared h2
connection isn't free of tradeoffs either: it reintroduces [TCP head-of-line
blocking](<../protocols/tcp.md>) across *every* multiplexed request if that one
connection stalls, which a pool of independent connections doesn't suffer from (one bad
connection in a pool only stalls the requests on that one connection).

## Practice project

[`practice/comms-design-pattern/multiplexing-vs-demultiplexing`](../../practice/comms-design-pattern/multiplexing-vs-demultiplexing) —
a single TCP connection carries interleaved messages from several logical "channels" (each
frame tagged with a channel id); the server demultiplexes incoming frames back into separate
per-channel handlers, standing in for what HTTP/2 does with request streams. A second demo in
the same project, [`h2-proxy-vs-connection-pooling`](<../../practice/comms-design-pattern/multiplexing-vs-demultiplexing/h2-proxy-vs-connection-pooling>),
runs the same 8 concurrent requests through a connection-pooled HTTP/1.1 proxy and a
re-multiplexed HTTP/2 proxy side by side and times both.

## Related

- [Sync vs async workloads](<sync-vs-async-workloads.md>) — the OS-level demultiplexing
  (`epoll`/`kqueue`) is exactly what makes efficient async servers possible.
- [Request-response](<request-response.md>) — HTTP/1.1 handled concurrency the "expensive"
  way (one connection per request); HTTP/2 multiplexing is a direct fix for that.
