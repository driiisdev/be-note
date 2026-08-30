# UDP (User Datagram Protocol)

The other transport layer protocol — where [TCP](<tcp.md>) is built entirely around
reliability, UDP is built around *not paying for reliability you don't need*. No handshake,
no acknowledgment, no ordering, no retransmission. You send a **datagram**, and it either
shows up or it doesn't.

## What you give up

- **Delivery** isn't guaranteed — a dropped packet is just gone, nobody retries it for you.
- **Order** isn't guaranteed — packet 2 can arrive before packet 1.
- **No duplicate detection.**

If an application needs any of that, it has to build it itself on top of UDP, tailored to
exactly what it actually needs (which is often *less* than what TCP forces on everyone).

## What you get in exchange

- A tiny header (8 bytes, vs TCP's 20+) — less overhead per packet.
- No handshake — send immediately, no round trip spent setting up.
- No head-of-line blocking — one lost datagram never blocks any other datagram, because
  there's no ordered stream to block in the first place.
- Native support for broadcast/multicast (send once, many receivers).

## Where it's used

- **DNS queries** — a single request/response, retry-if-no-answer is simpler than a full TCP
  connection for such a tiny exchange.
- **Video/audio streaming, VoIP, online games** — a dropped frame from a second ago is useless
  by the time it'd be retransmitted; better to skip it and keep moving than stall waiting.
- **QUIC / HTTP/3** — built on top of UDP, but QUIC then reimplements its own reliability and
  ordering *in userspace*, cherry-picking TCP's good ideas without inheriting TCP's
  one-lost-packet-blocks-everything problem. See [HTTP/3](<http-3.md>).

## Pros / Cons

**Pros:** low latency, low overhead, no head-of-line blocking, multicast-friendly.

**Cons:** the application owns reliability/ordering if it needs them — that's real complexity
you're taking on, not complexity that disappeared.

🖼️ **Image needed:** side-by-side timeline — TCP retransmitting and stalling a stream on
packet loss vs UDP just dropping the one datagram and moving on. Search: "tcp vs udp packet
loss comparison diagram".

## Practice project

[`practice/protocols/tcp-vs-udp`](../../practice/protocols/tcp-vs-udp) —
sends the same burst of messages over TCP and UDP and observes the difference in ordering
guarantees firsthand.

## Related

- [TCP](<tcp.md>) — the reliable alternative UDP deliberately isn't.
- [HTTP/3](<http-3.md>) — QUIC-over-UDP, reliability rebuilt in userspace.
