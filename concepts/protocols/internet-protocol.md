# Internet Protocol (IP)

IP is the network layer (OSI layer 3) protocol responsible for **addressing** hosts and
**routing** packets between networks. Everything above it (TCP, UDP, and therefore HTTP,
gRPC, WebSockets, all of it) depends on IP just to have somewhere to send bytes.

## Connectionless and best-effort

IP makes no promises. No handshake, no guaranteed delivery, no guaranteed order, no duplicate
protection. If a packet gets dropped somewhere in the network, IP does not notice or retry —
that job belongs to a layer above it (TCP adds exactly this reliability; UDP doesn't bother,
by design).

## IPv4 vs IPv6

| | IPv4 | IPv6 |
|---|---|---|
| Size | 32-bit | 128-bit |
| Format | dotted decimal (`192.168.1.1`) | colon-separated hex |
| Address space | ~4.3 billion | effectively unlimited for practical purposes |
| Reality | exhausted, patched over with NAT | designed to fix the exhaustion problem |

## Anatomy of a packet

A packet is a **header** (version, TTL, protocol number, source IP, destination IP) plus a
**payload** (whatever the layer above handed down — a TCP segment or UDP datagram).

**TTL (time to live)** is a hop counter, decremented at every router, that prevents a
misconfigured route from looping a packet forever.

## Routing

A packet hops router to router. Each router looks only at the destination IP, consults its own
routing table, and forwards to the next hop — no single router knows the entire path in
advance, the route emerges hop by hop.

## Public vs private addresses, and NAT

Ranges like `10.x.x.x`, `172.16-31.x.x`, and `192.168.x.x` are reserved as **private** —
not routable on the public internet. **NAT** (Network Address Translation) lets many devices on
a private network share one public IP by rewriting addresses at the boundary, which is the main
reason IPv4 exhaustion hasn't actually broken the internet yet.

## DNS, for context

DNS is a separate system, not part of IP itself, but it's the thing that makes IP usable day to
day: it resolves a human-readable hostname (`example.com`) into the IP address that TCP/UDP
actually needs to open a connection to.

🖼️ **Image needed:** a packet hopping through 3–4 routers to its destination, each router
box showing "decrements TTL, checks routing table, forwards." Search: "ip packet routing hops
diagram".

## Practice project

[`practice/protocols/networking-fundamentals`](../../practice/protocols/networking-fundamentals) —
resolves a hostname to an IP with `dns.lookup` and inspects a live socket's local/remote
address and family.

## Related

- [OSI model](<osi-model.md>) — IP is the concrete layer-3 protocol.
- [TCP](<tcp.md>) / [UDP](<udp.md>) — the transport protocols built on top of IP.
