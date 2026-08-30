# Proxy vs Reverse Proxy

Same underlying mechanism — a middleman relaying traffic between two parties — used for two
opposite purposes depending on *who it's acting on behalf of*. Getting this backwards is a
common source of confusion, so the distinction is worth pinning down precisely before going
any further into this module.

## Forward proxy

Sits in front of **clients**, acting on their behalf when talking to servers.

- The client explicitly knows about and configures it (browser proxy settings, a corporate
  network's forced proxy configuration).
- The destination server doesn't know or care that a proxy is involved — it just sees requests
  arriving from the proxy's IP address, as if the proxy *were* the client.

**Common uses**: content filtering (a corporate network blocking access to certain sites),
caching (an ISP caching popular content close to its users), anonymity (hiding the client's
real IP from the destination), and bypassing geo-restrictions.

## Reverse proxy

Sits in front of **servers**, acting on their behalf when talking to clients.

- The client doesn't know or care — from the client's point of view, the reverse proxy *is*
  the server it's talking to.
- The server(s) behind it are specifically configured to trust and expect traffic arriving
  through it.

**Common uses**: load balancing across multiple backend instances, TLS termination
(centralizing certificate management instead of configuring it on every backend), caching
responses near the edge, and security (hiding internal network topology, absorbing DDoS
traffic, filtering malicious requests with a WAF before they ever reach a real application
server). Examples: nginx, HAProxy, Cloudflare, AWS ALB/ELB.

## The distinction, side by side

| | Forward proxy | Reverse proxy |
|---|---|---|
| Acts on behalf of | The client | The server |
| Client aware of it? | Yes — explicitly configured | No — transparent |
| Server aware of it? | No — just sees the proxy's IP | Yes — configured to trust it |
| Hides | The client's identity, from the server | The server's topology, from the client |

```
Forward proxy:   Client --(configured to use proxy)--> Proxy --> Server
                 (server thinks the proxy IS the client)

Reverse proxy:   Client --> Proxy --(routes to one of several backends)--> Server(s)
                 (client thinks the proxy IS the server)
```

🖼️ **Image needed:** the two diagrams above side by side, with arrows showing which party
each proxy type is transparent to vs. known by. Search: "forward proxy vs reverse proxy
diagram".

## Practice project

[`practice/proxy-n-load-balancing/reverse-proxy-l4-vs-l7`](../../practice/proxy-n-load-balancing/reverse-proxy-l4-vs-l7) —
builds a working reverse proxy and demonstrates it routing traffic to multiple backends,
entirely transparent to the client making the request.

## Related

- [Layer 4 vs Layer 7 load balancers](<layer4-vs-layer7-load-balancers.md>) — the two main
  *mechanisms* a reverse proxy can use to decide where to route traffic.
- [Sidecar pattern](<../comms design pattern/sidecar-pattern.md>) — a reverse proxy is
  essentially a sidecar deployed at the network edge instead of alongside each individual service.
- [TLS](<../protocols/tls.md>) — TLS termination, one of a reverse proxy's most common jobs.
