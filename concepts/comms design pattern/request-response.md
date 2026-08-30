# Request-Response

The most fundamental communication pattern in backend engineering: a client asks for
something, a server answers. Almost every other pattern in this module (polling, long
polling, SSE, push, pub/sub) is either built on top of request-response or exists specifically
to work around one of its limitations.

## How it works

1. Client sends a **request** — a structured message with a boundary (where it starts/ends)
   defined by a protocol and a message format.
2. Server **parses** the request (reads the message format, extracts what's being asked).
3. Server **processes** the request (runs business logic, hits a database, etc).
4. Server sends a **response**.
5. Client **parses and consumes** the response.

The request/response boundary matters: both sides have to agree on where one message ends and
the next begins, or bytes from two different messages could bleed into each other. HTTP does
this with headers (`Content-Length` or chunked encoding); other protocols use their own framing.

## Where it's used

- Web / HTTP, DNS, SSH
- RPC (remote procedure calls)
- SQL and database wire protocols
- APIs (REST, SOAP, GraphQL)

## Key trait: it's synchronous from the client's point of view

The client blocks (or at least considers the exchange "open") until the response comes back.
This is simple and easy to reason about, but it means the server can't tell the client
anything *unless* the client asks first. That one limitation is the entire reason
polling, long polling, SSE, and push patterns exist — they're all different answers to
"how do we get the server to speak first?"

## Pros / Cons

**Pros:** simple mental model, easy to debug (one request → one response), maps cleanly onto
most protocols and tooling (HTTP status codes, retries, timeouts).

**Cons:** server can't push unsolicited updates; a slow request blocks the client waiting on
it (unless the client is written to handle concurrency itself).

🖼️ **Image needed:** a simple sequence diagram — Client → Server (request), Server → Client
(response), with a label on the arrow showing "one message, framed by protocol/format".
Search: "request response sequence diagram".

## Practice project

[`practice/comms-design-pattern/request-response`](../../practice/comms-design-pattern/request-response) —
a raw HTTP server and client using only Node's `http` module, with logging on both sides so
the parse → process → respond → parse steps are visible in order.

## Related

- [Polling](<polling.md>) and [Long polling](<long-polling.md>) — client repeatedly does
  request-response to simulate the server pushing.
- [Stateful vs stateless](<stateful-vs-stateless.md>) — whether the server remembers anything
  between one request-response cycle and the next.
