# HTTP/1.1

The version of HTTP that shaped the web for two decades: text-based, request-response,
running over [TCP](<tcp.md>). Simple enough to read a raw request with your own eyes over a
telnet connection, which is part of why it lasted so long.

## Persistent connections

HTTP/1.0 opened a brand new TCP connection for every single request — paying the full
handshake cost every time. HTTP/1.1 defaults to **keep-alive**: reuse one TCP connection for
multiple sequential requests, amortizing the handshake cost across all of them.

## Head-of-line blocking (at the HTTP layer)

Requests on the *same* connection are handled strictly one at a time, in order. **Pipelining**
(firing multiple requests without waiting for each response) exists in the spec but is barely
supported in practice due to implementation bugs — a slow response at the front of the queue
blocks everything behind it.

The workaround browsers adopted: open several parallel TCP connections per host (commonly ~6)
to get real concurrency. It works, but it means paying for multiple handshakes and juggling
multiple TCP connections just to get around a single-connection limitation — exactly the
inefficiency [HTTP/2's multiplexing](<http-2.md>) was designed to remove.

## Headers, uncompressed

Every request resends its headers in full, as plain text — no compression. For APIs with
large, repetitive headers (auth tokens, cookies, user-agent strings) this adds up request after
request.

## Methods and status codes

- Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, etc — each with agreed-upon semantics
  (e.g. `GET` should be safe/idempotent).
- Status codes: `2xx` success, `3xx` redirect, `4xx` client error, `5xx` server error.

## Chunked transfer encoding

Lets a server stream a response without knowing the total `Content-Length` upfront — it sends
the body in labeled chunks and a zero-length chunk marks the end. This is how a server can
start responding before it's finished generating the whole body.

🖼️ **Image needed:** a timeline showing one HTTP/1.1 connection processing requests strictly
serially, next to 6 parallel connections doing the same work faster — the browser's actual
workaround. Search: "http 1.1 head of line blocking diagram".

## Practice project

[`practice/protocols/http-evolution`](../../practice/protocols/http-evolution) —
demonstrates the serial-request bottleneck on one keep-alive connection.

## Related

- [HTTP/2](<http-2.md>) — fixes this exact head-of-line blocking with multiplexed streams.
- [TCP](<tcp.md>) — the transport HTTP/1.1 (and 2) depend on.
