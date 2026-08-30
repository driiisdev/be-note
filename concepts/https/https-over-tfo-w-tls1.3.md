# HTTPS over TCP Fast Open (TFO) with TLS 1.3 + 0-RTT

The fastest classic-TCP-based option in this module — 1.0 RTT to first response byte — reached
by letting even the **SYN packet itself** carry data, instead of treating the TCP handshake as
a data-free formality that has to finish before anything real can be sent.

## Prerequisites

Two things, both obtained from an *earlier* connection to this exact server:

- A **TFO cookie** — the server hands this out in its first SYN-ACK to any client. It exists
  specifically to prove the client isn't spoofing its source IP; without it, a SYN carrying
  data could be used to blast traffic at a victim address without ever completing a real
  handshake, which is why plain TCP forbids data in the SYN.
- A **TLS PSK** — same as [TLS 1.3 0-RTT](<https-over-tcp-w-tls1.3-n-ortt.md>) needs.

A genuinely first-ever connection to a server can't use this fast path — it has to do a normal
handshake first, in the process picking up both a TFO cookie and a PSK for next time.

## The flights

```
t=0.0  client -> SYN + TFO cookie + ClientHello(psk + early_data) + encrypted HTTP request,
               ALL packed into the one initial packet
t=0.5  server -> validates the cookie, accepts the connection, decrypts and processes the
               early data, and sends back SYN-ACK + ServerHello + Finished + the actual
               HTTP RESPONSE — all together in one return flight
t=1.0  client receives everything at once: connection confirmed, handshake done, response in hand
```

**1.0 RTT total.** The TCP handshake itself is no longer a "wasted" round trip spent purely on
setup — it carries real application data on the way out and a real response on the way back.

## Why this isn't the industry's default answer

TFO needs kernel-level support on **both** the client and server OS, and a meaningful fraction
of middleboxes and firewalls on the open internet don't understand a SYN packet carrying a
payload — some silently drop it, which breaks the connection unless the client falls back to a
normal (data-free) SYN and retries. Most operating systems ship TFO either disabled by default
or wired up to fail open (fall back gracefully) specifically because of this unreliability. That
gap between "works great on a controlled network" and "unreliable on the open internet" is a
large part of why the industry ultimately invested in [QUIC](<https-over-QUIC-w-ortt.md>)
instead of pushing harder on TFO adoption — QUIC reaches the identical 1.0 RTT floor without
depending on any of this.

🖼️ **Image needed:** the SYN packet drawn with its extra payload highlighted, next to a
"middlebox" box with a red X showing where TFO can silently fail on real networks. Search:
"tcp fast open middlebox interference diagram".

## Practice project

Covered conceptually in
[`practice/https/connection-establishment`](../../practice/https/connection-establishment)'s
README — TFO has no portable, dependency-free way to demonstrate locally (it needs OS-level
socket options this repo's "core modules only" rule can't reach cleanly, and Windows support in
particular is inconsistent), so this one is explained rather than run.

## Related

- [HTTPS over TCP with TLS 1.3 + 0-RTT](<https-over-tcp-w-tls1.3-n-ortt.md>) — the 2.0 RTT this shaves down further.
- [HTTPS over QUIC + 0-RTT](<https-over-QUIC-w-ortt.md>) — reaches the same 1.0 RTT floor, more reliably.
- [TCP](<../protocols/tcp.md>) — the handshake TFO modifies.
