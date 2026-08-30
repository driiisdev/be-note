# Protocols

A protocol is an agreed-upon set of rules for how two systems format, send, and receive data.
Neither side gets to freelance — if the client and server don't implement the exact same
rules, they can exchange bytes perfectly fine and still not understand each other.

## What a protocol actually defines

- **Syntax** — the format/structure of the data (where does a message start, where does it end).
- **Semantics** — what each part means (this field is a status code, that one is a body).
- **Timing** — the order messages are allowed to happen in, and what each side does when.

## Protocols are layered

Protocols stack on top of each other. Each layer trusts the layer below it to deliver its
bytes correctly, and only worries about its own job:

```
HTTP      <- application: what the request/response *means*
  |
TCP       <- transport: reliable, ordered delivery
  |
IP        <- network: addressing + routing across networks
  |
Ethernet  <- data link: framing on the local wire
```

This is why you can write an HTTP server and never think about how Ethernet frames work — HTTP
just assumes TCP already handled reliable delivery, and gets to focus purely on request/response
semantics.

## Examples

HTTP, DNS, FTP, SMTP, SSH, TLS, TCP, UDP, IP — every one of these is a protocol operating at a
different layer, solving a different problem.

## Open vs proprietary

Most of the protocols that make the internet work are **open** — published as RFCs, free for
anyone to implement (which is exactly why a Node.js server can talk HTTP to a browser written
by a completely different company). Proprietary protocols exist too, but they trade that
interoperability for whatever benefit the owner wants to keep exclusive.

🖼️ **Image needed:** the layered protocol stack above as a simple stacked-box diagram, each box
labeled with its layer name and one real protocol. Search: "protocol stack diagram http tcp ip".

## Practice project

[`practice/protocols/networking-fundamentals`](../../practice/protocols/networking-fundamentals) —
builds a tiny custom application-layer protocol on top of raw TCP, making the layering concrete.

## Related

- [OSI model](<osi-model.md>) — formalizes "which layer" into a named 7-layer reference.
- [Internet protocol](<internet-protocol.md>) — the addressing/routing layer most transport
  and application protocols ride on.
