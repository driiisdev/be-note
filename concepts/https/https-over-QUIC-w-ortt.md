# HTTPS over QUIC (HTTP/3) + 0-RTT

The fastest option in this whole module, tied with
[TCP Fast Open + TLS 1.3 + 0-RTT](<https-over-tfo-w-tls1.3.md>) at **1.0 RTT** to first
response byte — but reached natively, without a cookie mechanism or any dependency on
middleboxes cooperating.

## Prerequisite

A PSK from an earlier QUIC session with this exact server — same idea as
[TLS 1.3 0-RTT over TCP](<https-over-tcp-w-tls1.3-n-ortt.md>), except QUIC never needed a
TFO-style cookie to make this safe: 0-RTT was part of QUIC's design from the start, not
retrofitted onto a protocol (TCP) that was never built to carry data in its opening packet.

## The flights

```
t=0.0  client -> Initial packet: ClientHello(psk + early_data) + encrypted early application
               data (the actual HTTP request), all together
t=0.5  server -> decrypts the early data, processes the request, and sends back handshake
               completion AND the actual response, together
t=1.0  client receives the response
```

**1.0 RTT total** — the theoretical floor: one round trip carries the request out and the
response back, with connection setup fully overlapped into that same trip rather than paid for
separately beforehand.

## Why this beats TFO as *the* answer, not just an equal alternative

TCP Fast Open reaches the identical 1.0 RTT number, but only when its cookie mechanism works
and the network path doesn't interfere — see
[the TFO note](<https-over-tfo-w-tls1.3.md>) for why that's a real, frequent failure mode on
the open internet. QUIC reaches the same destination **natively, in userspace, over UDP**,
with none of that fragility: no OS kernel cooperation required beyond basic UDP support, no
middlebox that understands "TCP SYN" needing to also understand "TCP SYN with a payload." This
reliability gap — not the RTT number itself, which is identical — is the real reason the
industry converged on QUIC/HTTP-3 as the long-term answer instead of continuing to push TFO
adoption.

## The replay caveat still applies

Same as every other 0-RTT variant in this module: early data has no forward secrecy against
replay. An attacker who captures the t=0.0 packet can resend it, and the server can't tell it
apart from the original. Only safe for idempotent requests unless the application defends
against replay itself — see
[TLS 1.3 + 0-RTT](<https-over-tcp-w-tls1.3-n-ortt.md>#the-replay-caveat) for the full explanation,
which applies identically here since the risk lives at the TLS 1.3 layer QUIC embeds, not at
the transport layer QUIC changes.

🖼️ **Image needed:** all six variants from [the overview](<https-comms.md>) on one shared time
axis, with this one and TFO+0-RTT visually converging on the same 1.0 RTT mark from different
paths. Search: "quic 0-rtt vs tcp fast open comparison diagram".

## Practice project

Covered conceptually in
[`practice/https/connection-establishment`](../../practice/https/connection-establishment)'s
README, alongside the TFO note, for the same no-portable-Node-core-support reason.

## Related

- [HTTPS overview](<https-comms.md>) — the full six-way comparison this completes.
- [HTTPS over QUIC (fresh)](<https-over-QUIC_http-or-3.md>) — the 2.0 RTT non-resumed version.
- [HTTPS over TCP Fast Open + TLS 1.3 + 0-RTT](<https-over-tfo-w-tls1.3.md>) — same RTT floor, TCP-based.
