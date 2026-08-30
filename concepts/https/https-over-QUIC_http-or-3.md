# HTTPS over QUIC (HTTP/3), Fresh Connection

A fresh QUIC connection — no session resumption — already beats a fresh
[TCP + TLS 1.3 connection](<https-over-tcp-w-tls1.3.md>) by a full round trip, for a structural
reason: QUIC never pays for a separate, crypto-free transport handshake before starting the
crypto handshake. There's no TCP SYN/SYN-ACK step happening *before* TLS gets to say anything.

## The flights

```
t=0.0  client -> Initial packet: QUIC transport parameters + TLS 1.3 ClientHello, together
t=0.5  server -> Initial + Handshake packets: ServerHello, certificate, Finished, AND QUIC's
               own connection confirmation — all in this one flight (no separate "SYN-ACK")
t=1.0  client -> Finished + the actual HTTP/3 request
t=1.5  server -> HTTP response
t=2.0  client receives the first response byte
```

**2.0 RTT total** for a fresh connection — matching what TLS 1.3 alone costs over TCP, except
this number now *includes* what would otherwise have been a separate TCP handshake.

## The structural reason this works

Classic HTTPS pays for two handshakes in sequence: TCP first (pure connection setup, zero
crypto), then TLS on top of it (pure crypto, zero transport concerns). QUIC was designed from
the start to avoid that sequencing — the very first packet a QUIC client sends already contains
both the transport parameters *and* the TLS `ClientHello`, because QUIC's transport and
security layers were co-designed rather than stacked. See
[HTTP/3](<../protocols/http-3.md>) for the broader transport-level motivations (independent
streams, connection migration) — this note is specifically about the RTT payoff of folding
the two handshakes together.

🖼️ **Image needed:** TCP+TLS1.3's two sequential handshakes (transport, then crypto) next to
QUIC's one combined handshake, on the same time axis, showing the saved round trip visually.
Search: "quic vs tcp tls combined handshake diagram".

## Practice project

Covered conceptually in
[`practice/https/connection-establishment`](../../practice/https/connection-establishment)'s
README — Node has no core QUIC/HTTP-3 support (same limitation noted in
[the HTTP/3 concept note](<../protocols/http-3.md>)), so this one points to a
`curl --http3` comparison against a real HTTP/3-enabled site instead of runnable code.

## Related

- [HTTPS over TCP with TLS 1.3](<https-over-tcp-w-tls1.3.md>) — the 3.0 RTT TCP-based equivalent.
- [HTTPS over QUIC + 0-RTT](<https-over-QUIC-w-ortt.md>) — the resumed, faster version of this.
- [HTTP/3](<../protocols/http-3.md>) — QUIC's broader design and motivations.
