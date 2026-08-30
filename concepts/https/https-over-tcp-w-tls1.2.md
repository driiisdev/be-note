# HTTPS over TCP with TLS 1.2

The slow baseline every other variant in this module improves on. Four full round trips
elapse before the client sees a single byte of the actual response — and every one of those
round trips is spent purely on connection setup, not on the request itself.

## The flights

Using `t` in units of 0.5 RTT (one one-way trip):

```
t=0.0  client -> SYN
t=0.5  server -> SYN-ACK
t=1.0  client -> ACK + ClientHello
t=1.5  server -> ServerHello, Certificate, ServerKeyExchange, ServerHelloDone
t=2.0  client -> ClientKeyExchange, ChangeCipherSpec, Finished
t=2.5  server -> ChangeCipherSpec, Finished
t=3.0  client -> (handshake finally done) sends the actual HTTP request
t=3.5  server -> HTTP response
t=4.0  client receives the first response byte
```

**4.0 RTT total** = TCP handshake (1 RTT) + TLS 1.2 full handshake (2 RTT) + the actual
request/response (1 RTT).

## Why the TLS part alone costs 2 full round trips

The server can't finish in one flight, because its own `Finished` message (at t=2.5) depends
on the client's key exchange material, which the client only sends back in the *next* flight
after receiving the server's certificate (at t=2.0). Both sides need proof the other one
derived the same keys correctly before either will trust the channel — and that proof requires
one full extra round trip beyond just exchanging the certificate.

## The one shortcut TLS 1.2 does have

TLS 1.2 supports an **abbreviated handshake** (session ID or session ticket based) that skips
re-sending and re-verifying the certificate on a repeat connection to the same server — that
drops the TLS portion from 2 RTT to 1 RTT (3 RTT total). But TLS 1.2 has no concept of sending
application data *before* the handshake fully confirms itself — there's no 0-RTT equivalent —
so the client always waits for the abbreviated handshake to finish before sending anything real.

🖼️ **Image needed:** the flight sequence above as an actual sequence diagram (client/server
columns, arrows for each flight, RTT count labeled). Search: "tls 1.2 full handshake sequence
diagram".

## Practice project

[`practice/https/connection-establishment`](../../practice/https/connection-establishment) —
measures a TLS 1.2-forced handshake against TLS 1.3, through a simulated-latency proxy so the
difference is actually visible (unlike on real loopback, where RTT is too small to notice).

## Related

- [TLS](<../protocols/tls.md>) — the general handshake mechanics.
- [HTTPS over TCP with TLS 1.3](<https-over-tcp-w-tls1.3.md>) — the direct 1-RTT improvement.
- [HTTPS overview](<https-comms.md>) — the full six-way comparison table.
