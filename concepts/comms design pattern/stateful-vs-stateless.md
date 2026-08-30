# Stateful vs Stateless

Whether a server remembers anything about a client between requests. This one distinction
drives most decisions about how a backend scales, fails over, and gets load balanced.

## How it works

**Stateless:** every request carries everything the server needs to handle it (credentials,
context, current data). The server processes it and forgets everything immediately after
responding. No request depends on a previous one having hit this exact server instance.

**Stateful:** the server keeps something in memory (or pinned to a specific instance) between
requests — a session, an open connection, an in-progress transaction — and expects the client
to come back to *that same server* to continue.

```
Stateless request N:  [client sends everything needed] -> server -> forgets after responding
Stateful request N:   [client sends a reference (session id)] -> server looks up state it kept
```

## Where it's used

**Stateless:** most REST APIs (auth token sent on every request, e.g. JWT), DNS lookups,
stateless load-balanced web servers behind a round-robin LB.

**Stateful:** database connections, WebSocket/[push](<push.md>) connections,
[long polling](<long-polling.md>) (state = the parked request, for its duration), in-memory
session stores, multiplayer game servers (authoritative game state lives on one server).

## Pros / Cons

**Stateless pros:** any server instance can handle any request → trivial horizontal scaling,
simple load balancing (round-robin is fine), a crashed instance loses nothing because it held
nothing — the next request just lands on a different instance.

**Stateless cons:** the client has to resend context every time (bigger requests, or a
lookup on every request to fetch context from a shared store like Redis).

**Stateful pros:** avoids repeating context on every request; some things are only possible
this way (an open connection *is* state — you can't have push without it).

**Stateful cons:** the client must reach the *same* server instance every time (needs
"sticky sessions" on the load balancer); a crashed instance loses whatever state it held (its
clients get disconnected/logged out); harder to scale horizontally, since you can't just
throw more identical instances at the problem.

🖼️ **Image needed:** two small diagrams side by side — stateless: 3 identical servers behind
a load balancer, any request going to any of them; stateful: the same 3 servers but one
client's requests all pinned to server #2 with a dotted "must return here" line. Search:
"stateful vs stateless load balancing diagram".

## Practice project

[`practice/comms-design-pattern/stateful-vs-stateless`](../../practice/comms-design-pattern/stateful-vs-stateless) —
two tiny servers implementing the same counter: the stateless one requires the client to
send the current count on every request, the stateful one keeps a per-session count in memory
— restart the stateful server mid-session and watch the count vanish.

## Related

- [Request-response](<request-response.md>) — naturally stateless on its own; state gets
  bolted on top via sessions/cookies.
- [Push](<push.md>) and [Long polling](<long-polling.md>) — both inherently stateful, since
  they require the server to hold something (a connection, a parked request) open per client.
