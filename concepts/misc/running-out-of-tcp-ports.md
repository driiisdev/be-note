# Running Out of TCP Ports

A failure mode that looks nothing like its cause: outbound connections start failing with
`EADDRNOTAVAIL` / "cannot assign requested address" — even though the destination service is
completely healthy — because the **client**, not the server, has run out of a resource nobody
usually thinks about: available source ports.

## The 4-tuple, not just the destination

A TCP connection is uniquely identified by **(source IP, source port, destination IP,
destination port)** — all four, not just where it's going. This matters specifically for a
client (or a backend acting as a client toward some other service) making many outbound
connections to the *same* destination.

## The ephemeral port range

When a client opens an outbound connection without explicitly binding a source port, the OS
picks one from the **ephemeral port range** — roughly 32768-60999 on Linux by default, around
28,000 usable ports. Every outbound connection from one client IP to the *same* destination
IP:port draws from this exact same pool.

## `TIME_WAIT` makes it worse

After a connection closes, the side that initiated the close holds that source port in
**`TIME_WAIT`** for 2×MSL (historically around 60 seconds, tunable) — the port isn't reusable
for a *new* connection to the same destination during that window (this exists specifically to
let any last, delayed packets from the old connection safely die out before the port is
reassigned — see [TCP](<../protocols/tcp.md>)). An application that opens a fresh, short-lived
connection **per request** — no keep-alive, no connection pooling — can burn through the entire
ephemeral port range faster than `TIME_WAIT` frees old ones up, especially under high request
volume to one specific downstream service.

## What it looks like in practice

New outbound connections to a specific destination start failing outright, while everything
else on the machine (and the destination service itself) is completely fine — a symptom that
often gets misdiagnosed as a problem with the *destination*, when the actual bottleneck is the
*client's* exhausted local port pool for that one destination pair.

## Mitigations

- **Connection pooling / keep-alive reuse** — the primary fix. Reusing connections instead of
  opening a new one per request means never burning a fresh port for every single request in
  the first place.
- **`tcp_tw_reuse`** — allows a socket sitting in `TIME_WAIT` to be reused sooner for new
  outgoing connections, under conditions where it's safe to do so.
- **Widening the ephemeral port range**, buying more headroom without changing application
  behavior.
- **Spreading outbound traffic across multiple source IPs**, for genuinely extreme scale where
  even a widened single-IP port range isn't enough.

🖼️ **Image needed:** a shrinking pool of available ephemeral ports as request rate increases,
with a "TIME_WAIT" bucket shown draining slower than the pool is being consumed. Search: "tcp
ephemeral port exhaustion time_wait diagram".

## Practice project

[`practice/misc/kernel-connection-internals`](../../practice/misc/kernel-connection-internals) —
deliberately opens many short-lived connections without pooling and observes the resulting
`TIME_WAIT` pile-up directly with `netstat`.

## Related

- [TCP](<../protocols/tcp.md>) — the handshake/close mechanics `TIME_WAIT` comes from.
- [How does the kernel manage backend connections](<how-does-the-kernel-manage-backend-connections.md>) —
  the broader kernel-level view this note's specific failure mode is one instance of.
