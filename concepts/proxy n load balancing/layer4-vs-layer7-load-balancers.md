# Layer 4 vs Layer 7 Load Balancers

A [reverse proxy](<proxy-vs-reverse-proxy.md>) that load-balances has to decide, for every
incoming connection or request, *which* backend gets it — and how much information it's
willing to look at to make that decision is exactly what separates a Layer 4 load balancer
from a Layer 7 one (the layer numbers come from the [OSI model](<../protocols/osi-model.md>)).

## Layer 4 (transport) load balancing

Operates purely on **IP address and port** — TCP or UDP level — and never looks inside the
payload at all.

- Routing decisions are based only on source/destination IP, port, and basic TCP flags — never
  on anything HTTP-specific, because the load balancer doesn't parse HTTP in the first place.
- Just forwards packets or connections to a backend chosen by a simple algorithm: round robin,
  least connections, IP hash.
- **Fast and low-overhead** — no protocol parsing means very high throughput and low latency.
- **Cannot** make content-aware decisions: it has no way to route `/api/users` differently from
  `/api/orders`, or to look at a cookie or header, because from its point of view there's no
  such thing as a "path" or "cookie" — just bytes flowing between two IP:port pairs.
- Mechanically, this usually means either NAT-ing the packet (rewriting the destination IP to
  the chosen backend) or **Direct Server Return (DSR)**, where the backend replies directly to
  the client instead of routing the response back through the load balancer, for even lower
  latency on the return path.

Examples: AWS Network Load Balancer (NLB), IPVS/LVS, a basic TCP load balancer.

## Layer 7 (application) load balancing

Operates on the **actual application protocol content**. For HTTP, this means fully
terminating the TCP (and TLS, if HTTPS) connection, parsing the HTTP request, and being able to
inspect the path, headers, cookies, method, and even the body.

- **Can** make content-aware routing decisions: route by URL path, by `Host` header
  (multi-tenant/virtual hosting), by cookie (session affinity), or by header for A/B
  testing/canary releases.
- Also commonly handles TLS termination, request/response rewriting, compression, and caching.
- **More overhead** than L4 — it has to fully receive and parse the request (and complete a TLS
  handshake, if applicable) before it can even decide where to send it. Structurally, an L7
  load balancer is **two separate TCP connections**, not one relayed connection: one connection
  to the client (where it acts as a server) and a completely separate one to whichever backend
  it picked (where it acts as a client).

Examples: nginx, HAProxy (in L7 mode), AWS Application Load Balancer (ALB), Envoy.

## The tradeoff

| | Layer 4 | Layer 7 |
|---|---|---|
| Sees | IP + port only | Full HTTP request |
| Speed | Very fast, low overhead | Slower, more overhead |
| Content-aware routing | No | Yes |
| Connections involved | Relays one connection | Terminates two separate connections |

L4 is fast and dumb; L7 is slower and smart. Most modern microservice/API-gateway
architectures need L7's content-awareness — routing `/checkout` to the payments service and
`/search` to the search service isn't possible any other way.

## Used together in practice

A common real-world architecture stacks both: an L4 load balancer at the very edge absorbs raw
connection volume cheaply and distributes it across a pool of L7 load balancers/reverse
proxies, which then do the smart, HTTP-aware routing to the actual application servers behind
them — for example, an AWS NLB sitting in front of a fleet of nginx or Envoy instances.

🖼️ **Image needed:** a two-tier diagram — one L4 load balancer at the edge fanning out to
three L7 reverse proxies, each of which then routes by path to its own set of backend services.
Search: "l4 l7 load balancer layered architecture diagram".

## Practice project

[`practice/proxy-n-load-balancing/reverse-proxy-l4-vs-l7`](../../practice/proxy-n-load-balancing/reverse-proxy-l4-vs-l7) —
an L7 proxy that routes by URL path, next to an L4 proxy that provably *can't*, hitting both
with the same requests.

## Related

- [Proxy vs reverse proxy](<proxy-vs-reverse-proxy.md>) — the broader role this note's two
  mechanisms both serve.
- [OSI model](<../protocols/osi-model.md>) — where the "layer 4" and "layer 7" numbers come from.
- [TCP](<../protocols/tcp.md>) — what an L4 load balancer actually operates on.
