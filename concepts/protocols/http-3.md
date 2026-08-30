# HTTP/3

The next step after [HTTP/2](<http-2.md>): same HTTP semantics again, but this time the fix is
underneath the transport layer, not just the framing. HTTP/3 runs over **QUIC**, and QUIC runs
over [UDP](<udp.md>) instead of [TCP](<tcp.md>).

## Why ditch TCP at all

HTTP/2 fixed head-of-line blocking *at the HTTP layer* with multiplexed streams, but every one
of those streams still shared one TCP connection underneath — and TCP itself guarantees strict
in-order delivery for that connection. One lost packet stalls every multiplexed stream, not
just the one it belonged to. That's a transport-layer limitation; you can't fix it by being
clever at the HTTP layer, you have to change the transport.

## What QUIC does instead

QUIC reimplements reliability, ordering, and congestion control itself, in **userspace**,
instead of relying on the operating system's TCP stack:

- **Independent streams** — each QUIC stream is its own ordered sequence. A lost packet only
  blocks the one stream it belongs to; every other stream on the same connection keeps flowing.
- **Faster iteration** — because QUIC lives in userspace/libraries rather than the OS kernel,
  the protocol can evolve without waiting on OS updates to roll out to the whole internet.

## TLS is baked in, not layered on top

QUIC embeds **TLS 1.3** directly into its handshake instead of doing "TCP handshake, then
separate TLS handshake" like HTTP/1.1 and HTTP/2 do. Connection setup and encryption setup
happen together, cutting a round trip off the time to first byte — and QUIC supports **0-RTT**
resumption for repeat connections to the same server.

## Connection migration

A QUIC connection is identified by a **connection ID**, not by the IP:port tuple like TCP.
That means a phone switching from Wi-Fi to cellular mid-connection doesn't have to tear down
and re-establish the connection — it just keeps going on the new network path.

## Adoption and testing it yourself

Support is broad now (Chrome, Firefox, Cloudflare, Google). There's no built-in Node.js
module for QUIC/HTTP-3 as of this course, so hands-on testing needs an external tool — try
`curl --http3 https://<a real http/3 site>` and compare the connection setup timing to a plain
HTTPS request.

🖼️ **Image needed:** the "time to first byte" waterfall for TCP+TLS (2 round trips) vs
QUIC (1 round trip, or 0 for a resumed connection). Search: "quic vs tcp tls handshake round
trip diagram".

## Practice project

[`practice/protocols/http-evolution`](../../practice/protocols/http-evolution) —
covered conceptually alongside the runnable HTTP/1.1 and HTTP/2 demos, with a `curl --http3`
comparison suggested since Node has no core QUIC support.

## Related

- [HTTP/2](<http-2.md>) — the TCP head-of-line blocking problem HTTP/3 solves.
- [UDP](<udp.md>) — the transport QUIC is built on.
- [TLS](<tls.md>) — the encryption QUIC folds directly into its handshake.
