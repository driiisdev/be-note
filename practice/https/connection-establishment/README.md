# Practice: HTTPS Connection Establishment

Concept notes: [`https-comms.md`](<../../../concepts/https/https-comms.md>) (start here — the
six-way comparison table) and its six variant notes in the same folder.

## What this demonstrates

How many round trips it actually costs to get the first byte of a response back over HTTPS,
and where each speed-up (TLS 1.3, 0-RTT, TCP Fast Open, QUIC) actually comes from — measured,
not just claimed. Two things are demonstrated for real here: **TLS 1.2 vs 1.3 handshake cost**
and **genuine TLS 1.3 0-RTT**. TCP Fast Open and QUIC/HTTP-3 are covered conceptually only —
see the note at the bottom for why.

## Why there's a `latency-proxy.js` here at all

On real loopback (`localhost`), round-trip time is close to **0ms** — which completely hides
the entire point of this module. The whole reason TLS 1.3, 0-RTT, and QUIC exist is to shave
round trips off a connection with *real* network latency; on a connection with ~0ms latency,
shaving off "1 RTT" saves ~0ms too. `latency-proxy.js` sits between the client and server and
delays every forwarded chunk by 50ms each way (~100ms simulated round trip — typical for a
cross-country connection), so the differences this module is actually about become visible in
wall-clock time.

## Folder structure

```
connection-establishment/
  generate-cert.sh          <- one-time openssl command, writes key.pem + cert.pem
  server.js                  <- plain https server (Node core `https` module)
  latency-proxy.js            <- simulates ~100ms RTT between client and server
  client-tls-versions.js       <- measures TLS 1.2 vs TLS 1.3 vs TLS 1.3-resumed, via the proxy
  ortt-demo.sh                  <- real TLS 1.3 0-RTT demo, using OpenSSL (not Node)
```

## Setup

Requires `openssl` (already used elsewhere in this repo — see
[`practice/protocols/tls-https`](<../../protocols/tls-https>)):

```bash
cd practice/https/connection-establishment
bash generate-cert.sh
```

## Demo 1: TLS 1.2 vs TLS 1.3 vs TLS 1.3 resumed (no 0-RTT)

```bash
node server.js          # terminal 1
node latency-proxy.js     # terminal 2
node client-tls-versions.js   # terminal 3
```

Example output (your exact numbers will vary run to run — see "what to actually look at"
below):

```
TLS 1.2 full handshake:     592.4ms  (TLSv1.2)
TLS 1.3 full handshake:     122.7ms  (TLSv1.3)
TLS 1.3 resumed (no 0-RTT): 126.6ms  (TLSv1.3)
```

### What to actually look at

Absolute milliseconds will jump around between runs (JIT warmup, OS scheduling noise, which
connection happens to run first) — don't read too much into the exact numbers. Two **relative**
signals are the reliable part:

1. **TLS 1.2 is dramatically slower than TLS 1.3** — consistent with
   [TLS 1.2 costing 2 RTT of handshake vs TLS 1.3's 1 RTT](<../../../concepts/https/https-over-tcp-w-tls1.2.md>),
   which at ~100ms simulated RTT should show up as roughly 100ms+ of difference, and does.
2. **TLS 1.3 resumed is close to TLS 1.3 fresh — NOT ~100ms faster.** This is the important,
   non-obvious result: per
   [the 0-RTT concept note](<../../../concepts/https/https-over-tcp-w-tls1.3-n-ortt.md>), plain
   PSK resumption *without* early data doesn't save a round trip, it only saves the CPU cost of
   skipping certificate verification. If resumed came back a full ~100ms faster here, that
   would actually be the *wrong* result for what this code does — Node's `session` reuse alone
   never sends early data. That gap only opens up with genuine 0-RTT — demo 2.

### Code walkthrough

The only interesting bit is what makes something "resumed": passing the previous connection's
session back into the next `tls.connect()` call:

```js
const t13 = await timedConnect({ minVersion: "TLSv1.3", maxVersion: "TLSv1.3" });
// ...
const resumed = await timedConnect({
  minVersion: "TLSv1.3",
  maxVersion: "TLSv1.3",
  session: t13.session, // <- reusing the PSK-bearing session ticket from the connection above
});
```

## Demo 2: real TLS 1.3 0-RTT (early data)

Node's `tls`/`https` client API doesn't cleanly expose sending early data, so this one steps
outside Node and uses OpenSSL's `s_server`/`s_client` directly — both already installed as a
dependency of `generate-cert.sh`:

```bash
bash ortt-demo.sh
```

Expected output (trimmed):

```
=== connection 1: full handshake (no early data yet - nothing to resume) ===
Early data was not sent
    Max Early Data: 16384

=== connection 2: resumed session + 0-RTT early data ===
hello-0rtt-early-data
Early data was accepted
```

### What this proves

Connection 2's server output shows `hello-0rtt-early-data` — the payload from
`early_data.txt` — printed **before** `Early data was accepted` is confirmed, meaning the
server decrypted and processed that data as part of the very first flight, exactly as
described in [the 0-RTT concept note's flight diagram](<../../../concepts/https/https-over-tcp-w-tls1.3-n-ortt.md>).
This *is* the round-trip saving demo 1 didn't show — because demo 1 never sent early data.

### Code walkthrough

The two-step shape mirrors the concept note directly: a full handshake to obtain a session
(connection 1), then a resumed handshake that also sends application data immediately
(connection 2):

```bash
# connection 1: get a resumable session
openssl s_client -connect localhost:4443 -tls1_3 -sess_out session.pem

# connection 2: resume it AND send early_data.txt as 0-RTT application data
openssl s_client -connect localhost:4443 -tls1_3 -sess_in session.pem -early_data early_data.txt
```

## Try this yourself

- Change `ONE_WAY_DELAY_MS` in `latency-proxy.js` to `0` and rerun demo 1 — the TLS 1.2 vs
  1.3 gap shrinks toward noise level, which is exactly the "on real loopback this doesn't show
  up" problem the proxy exists to fix.
- Change `ortt-demo.sh`'s `early_data.txt` content and rerun — the new content is what shows up
  server-side, proving the server is genuinely decrypting whatever you put there, not just
  echoing a fixed string.
- Run `ortt-demo.sh` a second time back-to-back without regenerating anything — connection 2's
  `session.pem` is reused across script runs' connection-1 step is required each time because
  the script deletes `session.pem` on exit; this is deliberate, since a real 0-RTT session
  ticket has a server-side expiry too.

## TCP Fast Open and QUIC/HTTP-3 — conceptual only, and why

- **TCP Fast Open** needs OS kernel-level socket options on both client and server that Node's
  `net`/`tls` modules don't expose portably, and Windows support in particular is inconsistent
  — there's no reliable dependency-free way to demonstrate it here. See
  [the TFO concept note](<../../../concepts/https/https-over-tfo-w-tls1.3.md>) for the full
  flight breakdown instead.
- **QUIC / HTTP-3** has no Node core module (same limitation as
  [`practice/protocols/http-evolution`](<../../protocols/http-evolution>)'s HTTP/3 section). Try
  `curl --http3 -v https://<a known http/3-enabled site>` and compare its connection-setup
  timing against a plain `curl -v https://...` call to the same site — see
  [the QUIC concept notes](<../../../concepts/https/https-over-QUIC_http-or-3.md>) for what
  you're looking at in that output.

## Real-world equivalent

This exact TLS-1.2-vs-1.3-vs-0-RTT tradeoff is a real, live server configuration decision —
`nginx`'s `ssl_protocols`, `ssl_early_data on;`, and `ssl_session_tickets` directives (and the
equivalent in Envoy, Caddy, and most CDNs) are configuring precisely what this project
measures. CDNs in particular care a lot about this, since they're often terminating TLS for
clients on genuinely high-latency mobile connections, where 1 saved RTT is directly felt as
faster page loads.
