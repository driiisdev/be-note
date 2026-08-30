# Practice: HTTP Evolution (1.1 → 2 → 3)

Concept notes: [`http-1.1.md`](<../../../concepts/protocols/http-1.1.md>) ·
[`http-2.md`](<../../../concepts/protocols/http-2.md>) ·
[`http-3.md`](<../../../concepts/protocols/http-3.md>)

## What this demonstrates

The exact same scenario — one slow request, one fast request — run first on HTTP/1.1, then
on HTTP/2, so the difference multiplexing makes isn't a claim you read, it's a stopwatch you
watch. HTTP/3 is covered conceptually only (see below for why).

## Scenario

A server has two routes: `/fast` (responds immediately) and `/slow` (responds after a 2s
delay). A client requests `/slow` then `/fast`. The question: does `/fast` have to wait?

## Folder structure

```
http-evolution/
  http1/
    server.js   <- plain http module
    client.js   <- keep-alive agent pinned to maxSockets: 1, to actually force serialization
  http2/
    server.js   <- http2 module, h2c (cleartext http/2, no TLS needed for this demo)
    client.js   <- one http2 session, two concurrent streams
```

## Code walkthrough

**HTTP/1.1** — the client's `http.Agent` is deliberately pinned to `maxSockets: 1`. Without
that, Node's default agent would just open a second TCP connection and mask the very thing
being demonstrated:

```js
const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
```

With only one connection available, `/fast`'s request has to sit behind `/slow`'s in the
queue — this is HTTP/1.1's head-of-line blocking, made unavoidable on purpose.

**HTTP/2** — one `http2.connect()` session is opened once, and both requests ride it as
independent streams:

```js
const req = client.request({ ":path": path }); // returns immediately, doesn't block on prior calls
```

`/fast` comes back almost immediately even though `/slow` was requested first and is still
pending — that's multiplexing.

## Run it

```bash
# http/1.1
cd http1
node server.js        # terminal 1
node client.js          # terminal 2 — watch /fast wait ~2s for /slow

# http/2
cd ../http2
node server.js
node client.js          # watch /fast finish almost instantly, /slow still pending
```

## HTTP/3 — why there's no `http3/` folder here

Node has no built-in QUIC/HTTP-3 client or server as of this course, and adding one would mean
pulling in an external dependency, breaking the "core modules only" rule every other project in
this repo follows. Instead:

```bash
curl --http3 -v https://<a known http/3-enabled site>
```

and compare the connection-setup timing/verbose output against a plain `curl -v https://...`
call — you'll see TLS negotiate as part of the same handshake instead of as a separate step
after the transport connects, which is the concrete version of what
[the HTTP/3 note](<../../../concepts/protocols/http-3.md>) describes.

## Try this yourself

- In the HTTP/1.1 client, remove `maxSockets: 1` and rerun — Node's default agent opens a
  second connection and `/fast` stops waiting, which is literally the workaround real browsers
  use (opening ~6 parallel connections per host).
- Add a third route `/slower` (5s delay) to the HTTP/2 server and request all three — all three
  streams progress independently on the one connection.
- Watch `req.stream.id` in the HTTP/2 server log — each concurrent request gets a distinct
  stream ID on the same underlying connection, which is the multiplexing made visible.

## Real-world equivalent

Browser dev tools' Network tab timeline is this same experiment, at scale, every time you load
a page with dozens of resources — switching a site from HTTP/1.1 to HTTP/2 is often visible
directly as fewer, more overlapped request bars.
