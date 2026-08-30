# WebRTC

Peer-to-peer real-time communication directly between browsers/clients — audio, video, or
arbitrary data — where, once connected, media flows **directly between the peers** instead of
being relayed through a server. That's the whole point of it: skip the server round trip for
the actual media.

## Signaling: the part WebRTC deliberately leaves out

WebRTC does **not** define how two peers find each other or agree on how to connect — that's
left entirely to the application, via a **signaling** channel (commonly WebSockets or plain
HTTP, both of which this repo already covers). Before a direct connection exists, signaling is
used to exchange:

- **SDP offer/answer** — a session description: what codecs, what media types, what's being
  proposed.
- **ICE candidates** — the possible network paths this peer might be reachable on.

Once both sides have exchanged enough of this, they can attempt the actual peer-to-peer
connection — and the signaling channel isn't needed for the media itself anymore.

## NAT traversal (ICE, STUN, TURN)

Almost every real client sits behind a NAT/firewall, so "just connect directly" isn't simple.
**ICE** (Interactive Connectivity Establishment) is the framework that tries multiple
candidate paths until one works:

- **STUN server** — tells a client its own public IP:port as seen from outside its NAT. Cheap,
  and enough to make most direct peer-to-peer connections succeed.
- **TURN server** — a relay of last resort when direct connection genuinely isn't possible
  (symmetric NATs, restrictive firewalls). All traffic routes through it, which defeats the
  "peer-to-peer" benefit but keeps the call working.

## Encryption is mandatory

Unlike WebSockets (where `ws://` unencrypted is technically allowed), WebRTC media is **always**
encrypted via DTLS-SRTP — there's no plaintext option in the spec.

## The building blocks

- **MediaStream** — mic/camera capture.
- **RTCPeerConnection** — the actual peer-to-peer connection: codec negotiation, ICE, DTLS.
- **RTCDataChannel** — arbitrary (non-media) data between peers, built on SCTP, and
  configurable to behave either TCP-like (reliable, ordered) or UDP-like (unreliable,
  unordered) depending on what the application needs.

## Where the backend actually comes in

The media path is peer-to-peer, but someone still has to build and run:

- The **signaling server** — relays offers/answers/ICE candidates between peers.
- **STUN/TURN infrastructure** — [coturn](https://github.com/coturn/coturn) is a common
  open-source TURN server.
- An **SFU** (Selective Forwarding Unit) for group calls — routes each peer's stream to every
  other peer without a full mesh of direct connections between everyone, which stops scaling
  fast as group size grows.

🖼️ **Image needed:** the full flow — two peers exchanging SDP offer/answer + ICE candidates
through a signaling server, then a direct peer-to-peer media connection forming once negotiation
completes. Search: "webrtc signaling ice stun turn diagram".

## Practice project

[`practice/protocols/webrtc-signaling`](../../practice/protocols/webrtc-signaling) —
a Node signaling server plus a minimal two-tab browser demo that negotiates a real
`RTCPeerConnection` and exchanges messages over an `RTCDataChannel`.

## Related

- [WebSockets](<websockets.md>) — used here as the signaling transport.
- [TLS](<tls.md>) — DTLS (used by WebRTC's media encryption) shares its handshake lineage.
