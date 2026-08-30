# Practice: Reverse Proxy, L4 vs L7

Concept notes: [`proxy-vs-reverse-proxy.md`](<../../../concepts/proxy n load balancing/proxy-vs-reverse-proxy.md>) ·
[`layer4-vs-layer7-load-balancers.md`](<../../../concepts/proxy n load balancing/layer4-vs-layer7-load-balancers.md>)

## What this demonstrates

The core claim of the L4-vs-L7 concept note, proven rather than asserted: an L7 proxy can route
by URL path; an L4 proxy structurally **cannot**, because it never looks past the IP:port level.

## Scenario

Two backends (`A` and `B`) sit behind two different proxies. The L7 proxy routes `/a/*` to
backend A and `/b/*` to backend B, correctly, every time. The L4 proxy just round-robins each
new *connection* to the next backend in line — with no way to know or care what path is about
to be requested on it.

## Folder structure

```
reverse-proxy-l4-vs-l7/
  backend.js     <- node backend.js <port> <label> - identifies itself in every response
  l7-proxy.js      <- HTTP-aware, routes by URL path (two separate TCP connections per request)
  l4-proxy.js        <- TCP-only, round-robins by connection, never parses HTTP at all
  client.js             <- hits both proxies and prints what actually happened
```

## Code walkthrough

**The L7 proxy** parses the request first, and only then decides where it goes — this is only
possible because it's terminating the client's connection and speaking real HTTP:

```js
const route = ROUTES.find((r) => clientReq.url.startsWith(r.prefix));   // <- reads the PATH
const proxyReq = http.request({ host: route.target.host, ... });          // separate connection
clientReq.pipe(proxyReq);
```

**The L4 proxy** never does this — it picks a backend the moment a raw TCP connection arrives,
before a single HTTP byte has even been read, and then just pipes bytes both ways, blind to
whatever ends up flowing through:

```js
const backend = BACKENDS[nextBackend];       // decided BEFORE any data arrives
nextBackend = (nextBackend + 1) % BACKENDS.length;
clientSocket.pipe(backendSocket);              // blind byte relay, no parsing, ever
backendSocket.pipe(clientSocket);
```

## Run it

```bash
node backend.js 8001 A     # terminal 1
node backend.js 8002 B       # terminal 2
node l7-proxy.js               # terminal 3
node l4-proxy.js                 # terminal 4
node client.js                     # terminal 5
```

## What you'll see

```
=== L7 proxy: /a/foo then /b/bar ===
/a/foo -> {"handledBy":"A","path":"/a/foo"}
/b/bar -> {"handledBy":"B","path":"/b/bar"}

=== L4 proxy: the SAME path /a/foo, twice ===
/a/foo (1st connection) -> {"handledBy":"A","path":"/a/foo"}
/a/foo (2nd connection) -> {"handledBy":"B","path":"/a/foo"}   <- same path, different backend!
```

The L7 proxy routes consistently by path, every time. The L4 proxy sends the **identical**
path to two **different** backends purely because it landed on two different connections —
concrete, unambiguous proof it never looked at the path at all.

## Try this yourself

- Change `l4-proxy.js`'s algorithm from round-robin to always picking `BACKENDS[0]` and rerun
  — now both `/a/foo` requests land on the same backend, but *only* because there's nowhere
  else to go, not because it understood the path. Add a third backend to break that illusion.
- Add a third route to `l7-proxy.js` (e.g. `/c` → a `backend.js` on port 8003) — no changes
  needed to `l4-proxy.js` at all, because it was never routing by path to begin with.
- Log `clientReq.headers` in `l7-proxy.js` and route by a header instead of the path — this is
  exactly how cookie-based session affinity or A/B testing headers get used in real L7 load
  balancers, mentioned in [the concept note](<../../../concepts/proxy n load balancing/layer4-vs-layer7-load-balancers.md>).

## Real-world equivalent

This is the exact shape of a real production setup: an L4 load balancer (AWS NLB, IPVS) doing
cheap, high-throughput connection distribution at the edge, in front of a pool of L7 reverse
proxies (nginx, Envoy) doing the actual path/header-aware routing to application services.
