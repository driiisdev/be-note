# HTTPS over TCP with TLS 1.3 (fresh connection)

A fresh TLS 1.3 handshake — no session resumption, no prior connection to this server — and
it's already a full round trip faster than [TLS 1.2's full handshake](<https-over-tcp-w-tls1.2.md>),
purely from redesigning the handshake's flight structure.

## The flights

```
t=0.0  client -> SYN
t=0.5  server -> SYN-ACK
t=1.0  client -> ACK + ClientHello (includes a guessed key_share)
t=1.5  server -> ServerHello, key_share, EncryptedExtensions, Certificate, CertificateVerify,
                 Finished — ALL in ONE flight
t=2.0  client -> Finished + the actual HTTP request, sent together
t=2.5  server -> HTTP response
t=3.0  client receives the first response byte
```

**3.0 RTT total** — one fewer than TLS 1.2's 4.0.

## Where the saved round trip comes from

TLS 1.2 needed a confirmation round trip between the certificate exchange and the actual key
confirmation (`Finished` messages) because of how its flights were split up. TLS 1.3 redesigned
this so the server sends **everything** it needs to in one flight (certificate *and* `Finished`
together at t=1.5), and the client can derive the shared keys and send its own `Finished` *plus*
real application data in the very next flight (t=2.0) — no separate confirmation round trip
needed before real data can move.

## The "guessed key share" trick

The `ClientHello` at t=1.0 doesn't just propose supported groups — it optimistically **sends a
key share** for the group the client thinks the server will pick (usually X25519, since nearly
every server supports it). If the guess is right — which it almost always is — no extra round
trip is spent negotiating which group to use. If the guess is wrong, the server has to ask the
client to retry, adding a round trip back — a rare fallback path that most connections never hit.

## Still not the floor

Even at 3.0 RTT, there's still exactly 1 RTT of pure handshake sitting in front of the actual
request. This is precisely what [TLS 1.3 + 0-RTT](<https-over-tcp-w-tls1.3-n-ortt.md>) removes
— and, importantly, a plain *resumed* TLS 1.3 handshake (PSK, but no early data) does **not**
remove it either; see that note for why.

🖼️ **Image needed:** side-by-side sequence diagrams — TLS 1.2's two server flights vs TLS
1.3's single collapsed server flight. Search: "tls 1.2 vs tls 1.3 handshake flights diagram".

## Practice project

[`practice/https/connection-establishment`](../../practice/https/connection-establishment) —
measures this against TLS 1.2 through a simulated-latency proxy.

## Related

- [HTTPS over TCP with TLS 1.2](<https-over-tcp-w-tls1.2.md>) — the slower baseline this improves on.
- [HTTPS over TCP with TLS 1.3 + 0-RTT](<https-over-tcp-w-tls1.3-n-ortt.md>) — the next round trip removed.
- [TLS](<../protocols/tls.md>) — general handshake background.
