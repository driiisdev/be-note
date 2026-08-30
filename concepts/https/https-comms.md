# HTTPS Connection Establishment — Overview

This module answers one specific question: **how many round trips does it actually take
before a client gets the first byte of a real response back, over HTTPS?** — and how each
newer mechanism (TLS 1.3, 0-RTT, TCP Fast Open, QUIC) shaves another round trip off that cost.

This builds directly on [`TLS`](<../protocols/tls.md>) and
[`HTTPS, keys & certificates`](<../protocols/https-tls-keys-certificates.md>), which cover
*what* the handshake does (authenticate the server, agree on keys). This module is about
*how expensive* that handshake is in round trips, and the six concrete ways of establishing an
HTTPS connection this course covers, ranked slowest to fastest.

## The unit: round trips, not milliseconds

Every mechanism below is measured in **RTTs (round trips)** — how many "client waits for
server, then reacts" cycles happen before the first real response byte arrives, assuming the
server answers instantly. This deliberately isolates the **connection-setup tax** from actual
server processing time, and from real network latency (which varies wildly — a loopback
connection has ~0ms RTT, a cross-continent one might have 150ms+, so 1 RTT saved matters a lot
more on the second connection than the first).

## The six variants, slowest to fastest

| # | Setup | RTT to first response byte | Needs a prior connection? |
|---|---|---|---|
| 1 | [TCP + TLS 1.2 (full)](<https-over-tcp-w-tls1.2.md>) | **4.0** | No |
| 2 | [TCP + TLS 1.3 (full)](<https-over-tcp-w-tls1.3.md>) | **3.0** | No |
| 3 | [TCP + TLS 1.3 + 0-RTT](<https-over-tcp-w-tls1.3-n-ortt.md>) | **2.0** | Yes — PSK from an earlier session |
| 4 | [TCP Fast Open + TLS 1.3 + 0-RTT](<https-over-tfo-w-tls1.3.md>) | **1.0** | Yes — TFO cookie *and* a PSK |
| 5 | [QUIC / HTTP-3 (fresh)](<https-over-QUIC_http-or-3.md>) | **2.0** | No |
| 6 | [QUIC / HTTP-3 + 0-RTT](<https-over-QUIC-w-ortt.md>) | **1.0** | Yes — PSK from an earlier session |

```
TCP+TLS1.2 full        [====][====][====][====]                    4.0 RTT
TCP+TLS1.3 full         [====][====][====]                          3.0 RTT
TCP+TLS1.3 0-RTT              [====][====]                          2.0 RTT
TFO+TLS1.3 0-RTT                    [====]                          1.0 RTT
QUIC fresh               [====][====]                               2.0 RTT
QUIC 0-RTT                     [====]                               1.0 RTT
                        request sent →              → response received
```

🖼️ **Image needed:** a proper waterfall diagram of all six, aligned on the same time axis,
showing exactly where each one's flights overlap the ones above it. Search: "tls 1.3 0-rtt
quic handshake round trip comparison diagram".

## The nuance that isn't obvious: resumption alone isn't 0-RTT

It's tempting to assume "session resumption" and "0-RTT" are the same thing. They're not, and
the difference matters:

- **TLS 1.2's** abbreviated (resumed) handshake genuinely saves a round trip (2 RTT → 1 RTT)
  purely by skipping the certificate exchange — TLS 1.2's full handshake had "slack" to cut.
- **TLS 1.3's** full handshake is *already* down to 1 RTT. Resuming it with just a PSK (no
  early data) doesn't save a round trip at all — it's still 1 RTT of handshake, just cheaper
  CPU (no certificate signature to verify). The RTT saving specifically requires **early data
  (0-RTT)**: sending the actual request encrypted under the PSK in that very first flight,
  before the handshake has even finished confirming itself.

See [TCP + TLS 1.3 + 0-RTT](<https-over-tcp-w-tls1.3-n-ortt.md>) for the precise flight-by-flight
breakdown, and the practice project below for this measured directly (not just claimed).

## Why TFO and QUIC land at the same floor, differently

TCP Fast Open and QUIC's 0-RTT both bottom out at **1.0 RTT** — but they get there in very
different ways. TFO retrofits "send data before the handshake finishes" onto TCP using a
special cookie mechanism that needs OS kernel support on both ends, and a lot of middleboxes on
the open internet don't understand SYN packets carrying data and silently drop them. QUIC
reaches the same destination natively, in userspace, over UDP, with 0-RTT as a first-class
design feature from day one — no cookie dance, no depending on network hardware cooperating.
This reliability gap is a big part of why the industry invested in QUIC/HTTP-3 rather than
pushing harder on TFO adoption. See [HTTP/3](<../protocols/http-3.md>) for the transport-level
reasons QUIC exists in the first place.

## The replay caveat that applies to every 0-RTT variant

Early data has **no forward secrecy against replay** — an attacker who captures that first
flight can resend it verbatim, and the server has no built-in way to tell it apart from the
original. This means 0-RTT is only safe for **idempotent** requests (a `GET`, not a `POST`
that charges a card) unless the application adds its own anti-replay defense. This applies
identically whether the 0-RTT is riding TCP+TLS1.3, TFO, or QUIC — the replay risk lives at the
TLS layer, not the transport layer.

## Practice project

[`practice/https/connection-establishment`](../../practice/https/connection-establishment) —
measures TLS 1.2 vs TLS 1.3 handshake cost through a simulated-latency proxy (so the RTT
differences actually show up, unlike on real loopback where RTT ≈ 0), and demonstrates genuine
TLS 1.3 0-RTT using OpenSSL's `s_server`/`s_client -early_data`. TCP Fast Open and QUIC are
covered conceptually in that project's README, since neither has portable, dependency-free
tooling to demonstrate locally.

## Related

- [TLS](<../protocols/tls.md>) — the handshake mechanics this module measures the cost of.
- [HTTPS, keys & certificates](<../protocols/https-tls-keys-certificates.md>) — what the
  handshake is actually authenticating.
- [HTTP/3](<../protocols/http-3.md>) — why QUIC exists and how it relates to TCP+TLS.
- [TCP](<../protocols/tcp.md>) — the connection-oriented handshake TFO modifies.
