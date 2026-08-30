# Practice: WebRTC Signaling

Concept note: [`webRTC.md`](<../../../concepts/protocols/webRTC.md>)

## What this demonstrates

The part of WebRTC that's actually a backend engineering concern: the **signaling server**.
The Node server here never touches audio, video, or the eventual peer-to-peer messages — its
only job is relaying SDP offers/answers and ICE candidates between two browser tabs until they
can negotiate a direct connection themselves.

## Scenario

Two browser tabs join the same signaling "room." The first one to create a
`RTCDataChannel` becomes the offerer, the second becomes the answerer. Once negotiation
completes, they exchange chat messages **directly, peer-to-peer** — the signaling server is
no longer in the loop at that point.

## Folder structure

```
webrtc-signaling/
  signaling-server.js   <- ws-based relay server, rooms, never inspects message content
  index.html              <- real RTCPeerConnection + RTCDataChannel (browser built-in, no libs)
```

## Code walkthrough

**The server is intentionally dumb** — it only relays, using the same hand-rolled WebSocket
technique as the [`websockets`](<../websockets>) project:

```js
for (const other of peers) {
  if (other !== socket) send(other, JSON.parse(message)); // relay verbatim, don't inspect
}
```

**The client does all the actual WebRTC work.** The state machine driven by signaling messages
maps directly onto [the concept note's signaling section](<../../../concepts/protocols/webRTC.md>):

```js
if (msg.type === "peer-joined") {
  // we were first - become the offerer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  signaling.send(JSON.stringify({ type: "offer", sdp: offer }));
} else if (msg.type === "offer") {
  // we're second - become the answerer
  await pc.setRemoteDescription(msg.sdp);
  const answer = await pc.createAnswer();
  ...
}
```

**ICE candidates** trickle in asynchronously as the browser discovers possible network paths,
and each one gets relayed the same way an offer/answer does:

```js
pc.onicecandidate = (event) => {
  if (event.candidate) signaling.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
};
```

## Run it

```bash
node signaling-server.js
```

Open `http://localhost:3400/` in **two browser tabs**. Watch the "ice state" log lines
progress toward `connected`, then type in either tab.

## Try this yourself

- Open the browser dev tools Network tab and watch the signaling WebSocket traffic — you'll
  see the raw offer/answer SDP text and ICE candidate JSON flowing through, which is normally
  invisible.
- Try `http://localhost:3400/?room=team-a` in two tabs and `?room=team-b` in two others —
  proof the server is routing by room, not broadcasting globally.
- Add a `console.log` in the server's relay loop and note it never parses SDP or understands
  what "ICE candidate" even means — from the server's point of view, it's just forwarding
  opaque JSON, exactly as [the concept note](<../../../concepts/protocols/webRTC.md>)
  describes signaling being deliberately left undefined by the WebRTC spec itself.

## What's out of scope here (and why)

No TURN server is set up — only a public STUN server
(`stun:stun.l.google.com:19302`), which is enough for two tabs on the same machine/network to
find each other directly. A real deployment behind restrictive NATs/firewalls would also need
a TURN relay (e.g. [coturn](https://github.com/coturn/coturn)) as a fallback — see the concept
note's NAT traversal section for why.

## Real-world equivalent

This is the same signaling pattern used by Google Meet, Discord voice/video, and most WebRTC
video call products — a lightweight relay server (often built on WebSockets exactly like this)
that gets out of the way the moment two peers can talk directly.
