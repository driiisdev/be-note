# TCP (Transmission Control Protocol)

The transport layer (OSI layer 4) protocol that turns IP's best-effort, unordered, unreliable
packet delivery into something an application can actually depend on: a reliable, ordered,
full-duplex stream of bytes between two endpoints.

## The 3-way handshake

Before any application data flows, both sides agree the connection exists:

```
client -> server : SYN
server -> client : SYN-ACK
client -> server : ACK
```

Only after this completes is the connection considered "established." This is also exactly
why TCP has a latency cost before the first byte of real data — a full round trip is spent just
opening the door.

## How it gets reliability and ordering

- Every byte sent gets a **sequence number**.
- The receiver sends back **ACKs** confirming what it has received.
- Anything not ACKed within a timeout gets **retransmitted** automatically.
- The receiver reassembles segments in sequence order, even if they arrived out of order over
  the network — the application never sees a scrambled stream.

## Flow control and congestion control

**Flow control**: the receiver advertises a window telling the sender how much it can buffer
right now, so a fast sender can't overwhelm a slow receiver.

**Congestion control**: the sender starts conservatively (slow start) and backs off when it
detects loss, so it doesn't overwhelm the network itself.

## Closing a connection

A 4-step teardown (`FIN`, `ACK`, `FIN`, `ACK`) — since either side can finish sending
independently, both directions have to be closed separately.

## The cost of all this reliability

- **Handshake latency** — a round trip before any data moves.
- **Head-of-line blocking** — if one segment is lost, everything behind it in the stream has to
  wait for the retransmit before the application can read it, even data that already fully
  arrived. This single limitation is the entire reason [HTTP/2's multiplexing still stalls on
  packet loss](<http-2.md>), and the reason [HTTP/3 exists](<http-3.md>).

## Where it's used

HTTP/1.1, HTTP/2, SSH, FTP, SMTP, database wire protocols — essentially anything where
"just work correctly" matters more than shaving off milliseconds.

🖼️ **Image needed:** the 3-way handshake as a simple sequence diagram (SYN / SYN-ACK / ACK),
followed by data flowing, followed by the 4-step close. Search: "tcp three way handshake
diagram".

## Practice project

[`practice/protocols/tcp-vs-udp`](../../practice/protocols/tcp-vs-udp) — a TCP
echo server/client next to a UDP one, run side by side.

## Related

- [UDP](<udp.md>) — the deliberately unreliable alternative.
- [HTTP/2](<http-2.md>) — hits TCP's head-of-line blocking despite multiplexing at the HTTP layer.
