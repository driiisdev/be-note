# HTTPS over TCP with TLS 1.3 + 0-RTT

The first mechanism in this module that goes *below* one full round trip of pure handshake
before the request can be sent — by sending the request **during** the handshake's first
flight instead of waiting for the handshake to confirm itself first.

## Prerequisite

The client must already hold a **PSK** (pre-shared key) from an earlier full TLS 1.3 session
with this exact server — delivered via a `NewSessionTicket` message the server sends at the
end of that earlier session. There is no 0-RTT on a genuinely first-ever connection.

## The flights

```
t=0.0  client -> SYN
t=0.5  server -> SYN-ACK
t=1.0  client -> ACK + ClientHello (w/ psk + early_data ext) + ENCRYPTED EARLY DATA
               (the actual HTTP request, encrypted under a key derived from the PSK)
t=1.5  server -> decrypts the early data immediately, processes the request, and sends back
               ServerHello + EncryptedExtensions + Finished AND the actual HTTP RESPONSE,
               all in the same flight
t=2.0  client receives the response (and completes the handshake with its own Finished after)
```

**2.0 RTT total** — one fewer than a fresh (or plainly resumed) TLS 1.3 handshake's 3.0. The
request rode along with the very first flight instead of waiting for a confirmation round trip.

## The nuance: this is *not* the same as plain resumption

Reusing a PSK **without** early data still costs 1 RTT of handshake — identical round-trip
count to a fresh handshake, just cheaper CPU (no certificate signature to verify, since PSK
already proves the client knows a secret only this server issued). The RTT saving specifically
requires **early data**. Verified directly:

```
TLS1.2 full handshake (via proxy):     351.7ms
TLS1.3 full handshake (via proxy):     136.1ms
TLS1.3 resumed handshake (via proxy):  123.3ms   <- barely faster, NOT a full RTT less
```

(measured through the practice project's simulated-latency proxy — see below). The gap between
fresh and resumed TLS 1.3 is small (CPU only); the gap 0-RTT would add on top is a full
simulated RTT, because it changes the flight count, not just the crypto cost.

## The replay caveat

Early data has **no forward secrecy against replay**. An attacker who captures that first
flight (t=1.0) can resend the exact same bytes to the server, and the server has no way to
distinguish it from the legitimate original — it will process it again as if it were a new
request. This means 0-RTT is only safe for **idempotent** operations (a `GET`, never something
like a payment `POST`) unless the application layer adds its own replay defense (e.g. a
one-time token). Servers can also simply choose not to accept early data at all — accepting it
is opt-in on the server side.

🖼️ **Image needed:** the flight diagram above with the "early data" bytes visually highlighted
as riding inside the first flight, next to a red "replay risk" annotation on that same flight.
Search: "tls 1.3 0-rtt early data replay diagram".

## Practice project

[`practice/https/connection-establishment`](../../practice/https/connection-establishment) —
demonstrates *real* 0-RTT using OpenSSL's `s_server`/`s_client -early_data` (Node's TLS API
doesn't cleanly expose client-side 0-RTT), with the server logging "Early data was accepted."

## Related

- [HTTPS over TCP with TLS 1.3 (fresh)](<https-over-tcp-w-tls1.3.md>) — the 3.0 RTT baseline this improves on.
- [HTTPS over TCP Fast Open with TLS 1.3 + 0-RTT](<https-over-tfo-w-tls1.3.md>) — removes one more RTT.
- [HTTPS over QUIC + 0-RTT](<https-over-QUIC-w-ortt.md>) — the same early-data idea without TCP underneath.
