# BE - Note

Personal study notes for the **Fundamentals of Backend Engineering** -
raw lecture notes turned into proper write-ups, plus small hands-on projects for each
concept so the ideas stick beyond just reading about them.

## How notes are organized

```
concepts/
  <module name>/            <- matches a course section (e.g. "comms design pattern")
    topic.txt                <- raw notes taken live, during the lecture
    topic.md                 <- write-up: definition, how it works, where it's used,
                                 pros/cons, image callouts, links to related topics
practice/
  <module-name>/             <- kebab-case, these are project folders
    <project>/
      README.md               <- what it demonstrates, folder structure, code walkthrough
      ...code...
```

**Why a `.txt` *and* a `.md` for the same topic?** The `.txt` stays as the honest, messy,
in-the-moment note — good for review. The `.md` is the "I actually
understand this now" version, written after connecting it to how it's used in real systems.

**Why do some `practice/` folders cover multiple topics at once?** Some concepts only make
sense in contrast with each other (e.g. polling vs. long polling vs. SSE vs. push are all
different answers to the same question: *how does a client find out something changed?*).
Where that's true, one project implements several approaches side by side so they can be
compared directly instead of studied in isolation.

## Modules

| Module | Status |
|---|---|
| [Comms design pattern](<concepts/comms design pattern>) | Done — see topic table below |
| [Protocols](concepts/protocols) | Done — see topic table below |
| [HTTPS](concepts/https) | Done — see topic table below |
| [Be execution patterns](<concepts/be executn patterns>) | Done — see topic table below |
| [Proxy n load balancing](<concepts/proxy n load balancing>) | Done — see topic table below |
| [Misc](concepts/misc) | Done — see topic table below |

As each course section gets covered, follow the same loop: drop the raw `.txt` in the
matching `concepts/` folder, write it up as `.md`, and — if it's the kind of concept that
benefits from running code instead of just reading about it — add a project under `practice/`.
The `practice/<module-name>` folder name always matches its `concepts/<module name>` folder
(hyphenated instead of spaced), so the two stay easy to find side by side.

## Comms design pattern — topics

| # | Topic | Note | Practice project |
|---|---|---|---|
| 1 | Request-response | [request-response.md](<concepts/comms design pattern/request-response.md>) | [request-response](practice/comms-design-pattern/request-response) |
| 2 | Polling | [polling.md](<concepts/comms design pattern/polling.md>) | [notification-delivery](practice/comms-design-pattern/notification-delivery) (variant 1) |
| 3 | Long polling | [long-polling.md](<concepts/comms design pattern/long-polling.md>) | [notification-delivery](practice/comms-design-pattern/notification-delivery) (variant 2) |
| 4 | Server-sent events | [server-sent-events.md](<concepts/comms design pattern/server-sent-events.md>) | [notification-delivery](practice/comms-design-pattern/notification-delivery) (variant 3) |
| 5 | Push | [push.md](<concepts/comms design pattern/push.md>) | [notification-delivery](practice/comms-design-pattern/notification-delivery) (variant 4) |
| 6 | Pub/sub | [pub-sub.md](<concepts/comms design pattern/pub-sub.md>) | [pub-sub-chat](practice/comms-design-pattern/pub-sub-chat) |
| 7 | Sidecar pattern | [sidecar-pattern.md](<concepts/comms design pattern/sidecar-pattern.md>) | [sidecar-pattern](practice/comms-design-pattern/sidecar-pattern) |
| 8 | Stateful vs stateless | [stateful-vs-stateless.md](<concepts/comms design pattern/stateful-vs-stateless.md>) | [stateful-vs-stateless](practice/comms-design-pattern/stateful-vs-stateless) |
| 9 | Sync vs async workloads | [sync-vs-async-workloads.md](<concepts/comms design pattern/sync-vs-async-workloads.md>) | [sync-vs-async](practice/comms-design-pattern/sync-vs-async) |
| 10 | Multiplexing vs demultiplexing | [multiplexing-vs-demultiplexing.md](<concepts/comms design pattern/multiplexing-vs-demultiplexing.md>) | [multiplexing-vs-demultiplexing](practice/comms-design-pattern/multiplexing-vs-demultiplexing) (+ [H2 proxying vs. connection pooling](<practice/comms-design-pattern/multiplexing-vs-demultiplexing/h2-proxy-vs-connection-pooling>)) |

## Protocols — topics

This module goes one level below comms design patterns — the actual network protocols those
patterns run on top of (TCP, UDP, HTTP/1.1–3, TLS) plus the higher-level protocols built from
them (WebSockets, WebRTC, gRPC). Several topics share one practice project where they only
make sense side by side (protocol layering, TCP vs UDP, and the HTTP/1.1 → 2 → 3 story).

| # | Topic | Note | Practice project |
|---|---|---|---|
| 1 | Protocols (overview) | [protocols.md](<concepts/protocols/protocols.md>) | [networking-fundamentals](practice/protocols/networking-fundamentals) |
| 2 | OSI model | [osi-model.md](<concepts/protocols/osi-model.md>) | [networking-fundamentals](practice/protocols/networking-fundamentals) |
| 3 | Internet protocol (IP) | [internet-protocol.md](<concepts/protocols/internet-protocol.md>) | [networking-fundamentals](practice/protocols/networking-fundamentals) |
| 4 | TCP | [tcp.md](<concepts/protocols/tcp.md>) | [tcp-vs-udp](practice/protocols/tcp-vs-udp) |
| 5 | UDP | [udp.md](<concepts/protocols/udp.md>) | [tcp-vs-udp](practice/protocols/tcp-vs-udp) |
| 6 | HTTP/1.1 | [http-1.1.md](<concepts/protocols/http-1.1.md>) | [http-evolution](practice/protocols/http-evolution) |
| 7 | HTTP/2 | [http-2.md](<concepts/protocols/http-2.md>) | [http-evolution](practice/protocols/http-evolution) |
| 8 | HTTP/3 | [http-3.md](<concepts/protocols/http-3.md>) | [http-evolution](practice/protocols/http-evolution) (conceptual — no Node core QUIC support) |
| 9 | TLS | [tls.md](<concepts/protocols/tls.md>) | [tls-https](practice/protocols/tls-https) |
| 10 | HTTPS, keys & certificates | [https-tls-keys-certificates.md](<concepts/protocols/https-tls-keys-certificates.md>) | [tls-https](practice/protocols/tls-https) |
| 11 | WebSockets | [websockets.md](<concepts/protocols/websockets.md>) | [websockets](practice/protocols/websockets) |
| 12 | WebRTC | [webRTC.md](<concepts/protocols/webRTC.md>) | [webrtc-signaling](practice/protocols/webrtc-signaling) |
| 13 | gRPC | [grpc.md](<concepts/protocols/grpc.md>) | [grpc-style-rpc](practice/protocols/grpc-style-rpc) |

## HTTPS — topics

A focused deep-dive that builds directly on the Protocols module's [TLS](<concepts/protocols/tls.md>)
and [HTTPS, keys & certificates](<concepts/protocols/https-tls-keys-certificates.md>) notes:
**how many round trips does it actually cost to establish an HTTPS connection**, and how each
newer mechanism (TLS 1.3, 0-RTT, TCP Fast Open, QUIC) shaves another one off. All 6 variants
share one practice project, since they're only meaningful compared side by side.

| # | Topic | Note | Practice project |
|---|---|---|---|
| 1 | Overview & comparison | [https-comms.md](<concepts/https/https-comms.md>) | [connection-establishment](practice/https/connection-establishment) |
| 2 | HTTPS over TCP + TLS 1.2 | [https-over-tcp-w-tls1.2.md](<concepts/https/https-over-tcp-w-tls1.2.md>) | [connection-establishment](practice/https/connection-establishment) |
| 3 | HTTPS over TCP + TLS 1.3 | [https-over-tcp-w-tls1.3.md](<concepts/https/https-over-tcp-w-tls1.3.md>) | [connection-establishment](practice/https/connection-establishment) |
| 4 | HTTPS over TCP + TLS 1.3 + 0-RTT | [https-over-tcp-w-tls1.3-n-ortt.md](<concepts/https/https-over-tcp-w-tls1.3-n-ortt.md>) | [connection-establishment](practice/https/connection-establishment) |
| 5 | HTTPS over TCP Fast Open + TLS 1.3 | [https-over-tfo-w-tls1.3.md](<concepts/https/https-over-tfo-w-tls1.3.md>) | [connection-establishment](practice/https/connection-establishment) (conceptual — no portable OS-level TFO API) |
| 6 | HTTPS over QUIC / HTTP-3 | [https-over-QUIC_http-or-3.md](<concepts/https/https-over-QUIC_http-or-3.md>) | [connection-establishment](practice/https/connection-establishment) (conceptual — no Node core QUIC support) |
| 7 | HTTPS over QUIC + 0-RTT | [https-over-QUIC-w-ortt.md](<concepts/https/https-over-QUIC-w-ortt.md>) | [connection-establishment](practice/https/connection-establishment) (conceptual) |

## Be execution patterns — topics

*(Folder name keeps the original "executn" spelling from the course notes — see
[How notes are organized](#how-notes-are-organized) for why filenames aren't normalized.)*

How a backend server actually organizes its threads to handle many concurrent connections —
process vs thread, the `accept()`/backlog mechanics, and five increasingly sophisticated ways
to assign the **Listener**, **Acceptor**, and **Reader** roles to threads, each fixing a
bottleneck the previous one had. Builds directly on [TCP](<concepts/protocols/tcp.md>) from the
Protocols module. `backend-idempotency.txt` had real notes already (idempotency, Nagle's
algorithm, when to use threads) — everything else was written from scratch, same as the
Protocols and HTTPS modules.

| # | Topic | Note | Practice project |
|---|---|---|---|
| 1 | Process vs thread | [the-process-n-the-thread-n-how-they-compete-for-cpu-time.md](<concepts/be executn patterns/the-process-n-the-thread-n-how-they-compete-for-cpu-time.md>) | [process-vs-thread](practice/be-executn-patterns/process-vs-thread) |
| 2 | Execution patterns (overview) | [be-execution-patterns.md](<concepts/be executn patterns/be-execution-patterns.md>) | — |
| 3 | How the backend accepts connections | [how-the-be-accepts-connections.md](<concepts/be executn patterns/how-the-be-accepts-connections.md>) | [listener-acceptor-reader](practice/be-executn-patterns/listener-acceptor-reader) |
| 4 | The Listener, the Acceptor, the Reader | [the-listener-the-acceptor-n-the-reader.md](<concepts/be executn patterns/the-listener-the-acceptor-n-the-reader.md>) | [listener-acceptor-reader](practice/be-executn-patterns/listener-acceptor-reader) |
| 5 | Reading & sending socket data | [reading-n-sending-socket-data.md](<concepts/be executn patterns/reading-n-sending-socket-data.md>) | [listener-acceptor-reader](practice/be-executn-patterns/listener-acceptor-reader) |
| 6 | Pattern A: single listener/acceptor/reader | [single-listener-acceptor-n-reader-thread-execution-pattern.md](<concepts/be executn patterns/single-listener-acceptor-n-reader-thread-execution-pattern.md>) | [listener-acceptor-reader](practice/be-executn-patterns/listener-acceptor-reader) (`blocking-demo/`) |
| 7 | Pattern B: single acceptor, multiple readers | [single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md](<concepts/be executn patterns/single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md>) | [reader-thread-pool](practice/be-executn-patterns/reader-thread-pool) |
| 8 | Pattern C: worker pool, message load balancing | [single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md](<concepts/be executn patterns/single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>) | [reader-thread-pool](practice/be-executn-patterns/reader-thread-pool) |
| 9 | Pattern D: multiple acceptors, one socket | [multiple-accepter-threads-on-a-single-socket-execution-pattern.md](<concepts/be executn patterns/multiple-accepter-threads-on-a-single-socket-execution-pattern.md>) | [cluster-acceptor-scaling](practice/be-executn-patterns/cluster-acceptor-scaling) |
| 10 | Pattern E: socket sharding | [multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md](<concepts/be executn patterns/multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md>) | [cluster-acceptor-scaling](practice/be-executn-patterns/cluster-acceptor-scaling) |
| 11 | Idempotency, Nagle's algorithm, when to use threads | [backend-idempotency.md](<concepts/be executn patterns/backend-idempotency.md>) | [idempotency-and-nagle](practice/be-executn-patterns/idempotency-and-nagle) |

## Proxy n load balancing — topics

Every one of these three topics leans directly on something already covered elsewhere in this
repo: [TCP](<concepts/protocols/tcp.md>) and the [OSI model](<concepts/protocols/osi-model.md>)
for L4 vs L7, and [WebSockets](<concepts/protocols/websockets.md>) plus
[stateful vs stateless](<concepts/comms design pattern/stateful-vs-stateless.md>) for
WebSocket proxying specifically.

| # | Topic | Note | Practice project |
|---|---|---|---|
| 1 | Proxy vs reverse proxy | [proxy-vs-reverse-proxy.md](<concepts/proxy n load balancing/proxy-vs-reverse-proxy.md>) | [reverse-proxy-l4-vs-l7](practice/proxy-n-load-balancing/reverse-proxy-l4-vs-l7) |
| 2 | Layer 4 vs Layer 7 load balancers | [layer4-vs-layer7-load-balancers.md](<concepts/proxy n load balancing/layer4-vs-layer7-load-balancers.md>) | [reverse-proxy-l4-vs-l7](practice/proxy-n-load-balancing/reverse-proxy-l4-vs-l7) |
| 3 | WebSocket proxying | [websocket-proxying.md](<concepts/proxy n load balancing/websocket-proxying.md>) | [websocket-proxy](practice/proxy-n-load-balancing/websocket-proxy) |

## Misc — topics

A grab-bag on purpose — practical topics and real-world "war stories" that don't belong to any
single module above, but lean on nearly all of them. Unlike the other modules, these don't
build on each other in sequence; each one stands alone and is listed here with whichever
earlier module it connects back to.

| # | Topic | Note | Practice project |
|---|---|---|---|
| 1 | Building a secure backend app (OWASP) | [building-secure-be-app-owasp.md](<concepts/misc/building-secure-be-app-owasp.md>) | [backend-security](practice/misc/backend-security) |
| 2 | JWT pros & cons | [jwt-pros-n-cons.md](<concepts/misc/jwt-pros-n-cons.md>) | [backend-security](practice/misc/backend-security) |
| 3 | How `SELECT COUNT(*)` impacts perf | [how-SELECT-COUNT-ALL-can-impact-be-app-perf.md](<concepts/misc/how-SELECT-COUNT-ALL-can-impact-be-app-perf.md>) | [query-cost-and-counting](practice/misc/query-cost-and-counting) (synthetic — no live DB in this environment) |
| 4 | How ChatGPT uses SSE | [how-chatgpt-uses-server-sent-events.md](<concepts/misc/how-chatgpt-uses-server-sent-events.md>) | [llm-style-streaming](practice/misc/llm-style-streaming) |
| 5 | How the kernel manages connections | [how-does-the-kernel-manage-backend-connections.md](<concepts/misc/how-does-the-kernel-manage-backend-connections.md>) | [kernel-connection-internals](practice/misc/kernel-connection-internals) |
| 6 | HTTP graceful connection shutdown | [http-graceful-connection-shutdown.md](<concepts/misc/http-graceful-connection-shutdown.md>) | [graceful-shutdown](practice/misc/graceful-shutdown) |
| 7 | Postgres failure from a router-level TCP issue | [postgres-failure-caused-by-tcp-issue-cisco-router.md](<concepts/misc/postgres-failure-caused-by-tcp-issue-cisco-router.md>) | [kernel-connection-internals](practice/misc/kernel-connection-internals) |
| 8 | Running out of TCP ports | [running-out-of-tcp-ports.md](<concepts/misc/running-out-of-tcp-ports.md>) | [kernel-connection-internals](practice/misc/kernel-connection-internals) |

## Learning roadmap

A suggested order for tying these topics together (roughly the order dependencies make sense
in, not necessarily the course's lecture order):

1. **Foundations** — [Request-response](<concepts/comms design pattern/request-response.md>)
   first: almost everything else is either built on it or exists to work around its limits.
2. **"How does the client find out something changed?"** — work through
   [Polling](<concepts/comms design pattern/polling.md>) →
   [Long polling](<concepts/comms design pattern/long-polling.md>) →
   [Server-sent events](<concepts/comms design pattern/server-sent-events.md>) →
   [Push](<concepts/comms design pattern/push.md>) in that order — each one is a direct
   response to the previous one's weakest point.
3. **Fan-out to many clients** — [Pub/sub](<concepts/comms design pattern/pub-sub.md>): once
   push works for one client, the next question is how a server pushes different things to
   different groups of clients efficiently.
4. **What "state" costs you** —
   [Stateful vs stateless](<concepts/comms design pattern/stateful-vs-stateless.md>). This
   one recolors everything above it — long polling and push both need the server to hold
   *some* state (an open connection, at minimum) per client, which is exactly what makes
   them harder to scale than plain stateless request-response.
5. **What happens inside the server while it's "processing"** —
   [Sync vs async workloads](<concepts/comms design pattern/sync-vs-async-workloads.md>) and
   [Multiplexing vs demultiplexing](<concepts/comms design pattern/multiplexing-vs-demultiplexing.md>):
   how one server handles many concurrent requests without one slow request blocking
   everyone else — including how a proxy demultiplexes one client connection and either
   re-multiplexes or pools connections going upstream.
6. **Composing services** —
   [Sidecar pattern](<concepts/comms design pattern/sidecar-pattern.md>): once you have
   multiple services talking over these patterns, cross-cutting concerns (logging, retries,
   auth, metrics) get pulled out into a sidecar instead of duplicated in every service.
7. **Drop down a level — what's actually carrying these patterns** —
   [Protocols](<concepts/protocols/protocols.md>) →
   [OSI model](<concepts/protocols/osi-model.md>) →
   [Internet protocol](<concepts/protocols/internet-protocol.md>): comms design
   patterns assume *some* transport underneath them. This is what that transport actually is.
8. **The two ways to move bytes reliably vs fast** —
   [TCP](<concepts/protocols/tcp.md>) vs
   [UDP](<concepts/protocols/udp.md>): request-response, WebSockets, and most of this
   repo assume TCP's guarantees; polling-style and real-time media patterns are where UDP's
   tradeoffs start to matter.
9. **How a server actually organizes threads to handle connections** — the
   [Be execution patterns module](<concepts/be executn patterns/be-execution-patterns.md>):
   [process vs thread](<concepts/be executn patterns/the-process-n-the-thread-n-how-they-compete-for-cpu-time.md>) →
   [how a backend accepts connections](<concepts/be executn patterns/how-the-be-accepts-connections.md>) →
   [the Listener/Acceptor/Reader roles](<concepts/be executn patterns/the-listener-the-acceptor-n-the-reader.md>) →
   patterns A through E. Step 8's TCP is what makes `accept()` and the backlog queue exist in
   the first place; this module is about what a server's threads actually *do* with that.
10. **HTTP's own evolution** —
    [HTTP/1.1](<concepts/protocols/http-1.1.md>) →
    [HTTP/2](<concepts/protocols/http-2.md>) →
    [HTTP/3](<concepts/protocols/http-3.md>): each version is a direct fix for the
    previous one's head-of-line blocking, first at the app layer, then by dropping TCP itself.
11. **Trust and encryption** —
    [TLS](<concepts/protocols/tls.md>) →
    [HTTPS, keys & certificates](<concepts/protocols/https-tls-keys-certificates.md>):
    orthogonal to everything above it — any of these protocols can run encrypted or not, this
    is what makes "encrypted" actually mean something verifiable.
12. **Bidirectional and peer-to-peer, revisited at the protocol level** —
    [WebSockets](<concepts/protocols/websockets.md>) is the concrete transport behind
    the [push](<concepts/comms design pattern/push.md>) pattern from step 2;
    [WebRTC](<concepts/protocols/webRTC.md>) goes further and takes the server out of
    the media path entirely.
13. **A different shape of request-response** —
    [gRPC](<concepts/protocols/grpc.md>): revisits step 1's request-response, but
    contract-first and streaming-capable, built on HTTP/2 from step 10.
14. **How expensive is "secure," exactly** — the [HTTPS module](<concepts/https/https-comms.md>):
    now that TLS (step 11) and HTTP/1.1–3 (step 10) are both covered, this measures the actual
    round-trip cost of combining them six different ways, from the slowest (TCP + TLS 1.2, 4
    round trips) down to the fastest (QUIC + 0-RTT, 1 round trip) — and *why* TLS 1.3 alone
    isn't enough to reach that floor without 0-RTT specifically.
15. **Where all of this actually meets, at the edge** — the
    [Proxy n load balancing module](<concepts/proxy n load balancing/proxy-vs-reverse-proxy.md>):
    [proxy vs reverse proxy](<concepts/proxy n load balancing/proxy-vs-reverse-proxy.md>) sets
    up the vocabulary, [L4 vs L7 load balancing](<concepts/proxy n load balancing/layer4-vs-layer7-load-balancers.md>)
    revisits the OSI model from step 7 as a real routing decision, and
    [WebSocket proxying](<concepts/proxy n load balancing/websocket-proxying.md>) forces
    together nearly everything above it at once — step 4's statefulness, step 3's pub/sub for
    cross-instance fan-out, and step 12's WebSocket handshake, all in one concrete problem
    (why a stateful, long-lived connection can't just be load-balanced like a stateless
    request). This closes the loop: every module in this repo ends up being a piece of the
    answer to "how does a request actually get from a client to the right backend instance,
    correctly, at scale."
16. **Practical extras, any time, any order** — the
    [Misc module](<concepts/misc/building-secure-be-app-owasp.md>) doesn't build on itself in
    sequence the way steps 1-15 do; each topic there stands alone and is best read once its
    prerequisite from above clicks — e.g. [JWT](<concepts/misc/jwt-pros-n-cons.md>) right after
    step 4's statefulness, [running out of TCP ports](<concepts/misc/running-out-of-tcp-ports.md>)
    and [the kernel's connection internals](<concepts/misc/how-does-the-kernel-manage-backend-connections.md>)
    right after step 9, [WebSocket-style streaming for LLMs](<concepts/misc/how-chatgpt-uses-server-sent-events.md>)
    right after step 2.

## Best practices for learning backend fundamentals

- **Compare, don't memorize.** "SSE is one-directional, WebSockets are bidirectional" is a
  fact you'll forget. "SSE is enough until the client also needs to send data, then you need
  something bidirectional" is a judgment call you'll actually reuse. Every note in this repo
  is written pros/cons-first for that reason.
- **Ask "what does this cost the server?" for every pattern.** Stateless request-response
  costs nothing between requests. Long polling and push cost an open connection per client.
  Pub/sub costs a broker. This one question predicts most of the scaling conversations in
  backend engineering.
- **Run the code, don't just read it.** Reading "the server holds the request open" is not
  the same as watching a terminal sit there for 8 seconds before responding. Every project in
  `practice/` is meant to be run, not just skimmed.
- **Watch out for numbers that only look impressive on localhost.** RTT-saving optimizations
  (TLS 1.3, 0-RTT, QUIC) show almost no difference on loopback, where round-trip time is
  already ~0ms — their entire value only shows up under real network latency. The
  [HTTPS practice project](<practice/https/connection-establishment>) simulates that latency
  deliberately, for exactly this reason.
- **Use real tools to look at the wire, not just the docs.** `curl -v`, your browser's Network
  tab, and Wireshark show you what a protocol *actually* sends, which is often more precise
  than the mental model a course gives you.
- **Revisit stateful-vs-stateless and sync-vs-async constantly.** They're not one topic each —
  they're a lens you reapply to every other pattern (is polling stateful? no. is long polling?
  sort of, for the duration of the held request. is push? yes, for the life of the connection).
- **Write the note after building the project, not before.** It's tempting to write up a
  concept right after the lecture, but the write-up gets sharper once you've actually hit the
  concept's edge case in code (e.g. what happens when a long-polling client disconnects
  mid-wait — you only really notice that by building it).

## Practice projects

Every project under `practice/` uses **plain Node.js core modules only**
(`http`, `http2`, `https`, `net`, `dgram`, `tls`, `crypto`, `dns`, `events`) — no `npm install`
required, so there's nothing between you and the concept. Requires Node.js 18+.

```bash
cd practice/comms-design-pattern/<project>      # or practice/protocols/<project>,
node server.js       # practice/https/<project>, practice/be-executn-patterns/<project>,
# in a second terminal          # practice/proxy-n-load-balancing/<project>,
node client.js                                   # practice/misc/<project>
```

A few projects need one extra step beyond `node server.js` + `node client.js`, each called out
in that project's own README:

- **`protocols/tls-https`** and **`https/connection-establishment`** need a local self-signed
  certificate first (`bash generate-cert.sh`, needs `openssl` — already on macOS/Linux, and on
  Windows via Git Bash).
- **`https/connection-establishment`**'s real 0-RTT demo (`ortt-demo.sh`) runs entirely through
  `openssl s_server`/`s_client`, not Node — Node's TLS client API doesn't cleanly expose
  sending early data.
- **`protocols/websockets`** and **`protocols/webrtc-signaling`** are driven from a real
  browser tab (`http://localhost:<port>/`) instead of a second `node` client, since the whole
  point is exercising the browser's native `WebSocket`/`RTCPeerConnection` APIs against a
  hand-rolled Node server.
- **`protocols/http-evolution`**'s HTTP/3 topic, and **`https/connection-establishment`**'s TCP
  Fast Open and QUIC topics, have no runnable Node demo (no core QUIC support, no portable
  TFO socket API) — their READMEs point to a `curl --http3` comparison instead.
- **`be-executn-patterns/process-vs-thread`**, **`reader-thread-pool`**, and
  **`cluster-acceptor-scaling`** use `worker_threads`/`child_process`/`cluster` instead of the
  usual server+client pair — each is a single `node <file>.js` run, no second terminal needed.
- **`be-executn-patterns/idempotency-and-nagle`**'s Nagle demo is honest about a real
  limitation: the classic Nagle+delayed-ACK latency stall doesn't reproduce reliably on
  loopback (kernel ACK timing, not something an app-level proxy can simulate the way the HTTPS
  module's RTT proxy can) — its README explains why and what the code demonstrates instead.
- **`proxy-n-load-balancing/reverse-proxy-l4-vs-l7`** and **`websocket-proxy`** each need
  multiple backend processes running before their proxy — see each project's README for the
  exact `node backend.js <port> <label>` invocations.
- **`misc/query-cost-and-counting`** is honest about a real limitation: no Postgres/SQLite was
  available in this environment, so it demonstrates the underlying O(n)-scan-vs-O(1)-counter
  principle with a synthetic in-memory dataset rather than real database behavior.
- **`misc/kernel-connection-internals`** shells out to `netstat` to inspect real OS socket
  state — output parsing is platform-specific (Windows vs. Linux/Mac column layout differ).
- **`misc/graceful-shutdown`** is a single `node run-demo.js` — it orchestrates spawning each
  server, firing a request, and triggering shutdown mid-flight itself, no second terminal
  needed (and works around a Windows-specific `child_process.kill("SIGTERM")` limitation — see
  that project's README).
- **`misc/backend-security`** has two independent halves — `node sql-injection/vulnerable.js` /
  `safe.js`, and `node jwt-auth/demo.js` — no server/client pair for either.

Each project's `README.md` explains: what it demonstrates, the folder structure, a walkthrough
of the key code with the concept called out inline, and what real-world technology it stands
in for (e.g. the SSE variant hand-rolls `text/event-stream` parsing that a browser's
`EventSource` normally does for you, so the mechanics stay visible instead of hidden).

