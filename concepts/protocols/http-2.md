# HTTP/2

Same HTTP semantics as [HTTP/1.1](<http-1.1.md>) — same methods, headers, status codes — but a
completely different wire format underneath, aimed squarely at fixing HTTP/1.1's biggest
weakness: head-of-line blocking at the application layer.

## Binary framing

Instead of plain text, HTTP/2 speaks a binary framing protocol. Requests and responses get
broken into frames, tagged with a stream ID, and can be interleaved on the wire.

## Multiplexing

Multiple **streams** share a single TCP connection. Stream A's response doesn't have to
finish before stream B's can start — no more waiting in line on the same connection, and no
more browsers needing to open 6 parallel connections just to fake concurrency.

## HPACK header compression

Headers are compressed and, for repeated headers across requests on the same connection, only
the differences need to be sent — a big win over HTTP/1.1 resending full plain-text headers
every time.

## Stream prioritization and server push

- **Prioritization**: a client can hint which responses matter more, so the server can
  allocate bandwidth accordingly.
- **Server push**: the server can proactively send a resource it knows the client will need
  next (e.g. push a CSS file alongside the HTML that references it). Largely deprecated in
  browsers later on due to mixed real-world benefit, but still part of the spec conceptually.

## The problem it doesn't fix: TCP head-of-line blocking

Multiplexing happens *inside* a single TCP connection, and TCP itself still guarantees
in-order delivery of that one connection's bytes. If a single TCP segment is lost, **TCP blocks
delivery of everything behind it to the application** — including every other HTTP/2 stream
multiplexed on that connection, even ones that had nothing to do with the lost segment.

This is the exact problem [HTTP/3](<http-3.md>) solves by dropping TCP entirely in favor of
QUIC, where streams are independent at the transport level too.

🖼️ **Image needed:** one TCP connection carrying 3 interleaved HTTP/2 streams, then a packet
loss on stream A visibly stalling streams B and C too even though they're "logically"
independent. Search: "http2 multiplexing tcp head of line blocking diagram".

## Practice project

[`practice/protocols/http-evolution`](../../practice/protocols/http-evolution) —
fires concurrent streams over one HTTP/2 connection and shows a slow stream not blocking the
others, using Node's built-in `http2` module.

## Related

- [HTTP/1.1](<http-1.1.md>) — the head-of-line blocking problem HTTP/2 solves at the app layer.
- [HTTP/3](<http-3.md>) — solves the TCP-level head-of-line blocking HTTP/2 still has.
- [TCP](<tcp.md>) — the transport HTTP/2 is still built on.
