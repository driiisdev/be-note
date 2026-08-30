# OSI Model

A 7-layer reference model for describing where a networking concern lives. It's less "how
real software is literally built" and more "a shared vocabulary" — when someone says "that's a
layer 3 problem," everyone in networking knows they mean routing/addressing, not a broken app.

## The 7 layers (top to bottom)

| # | Layer | Job | Example |
|---|---|---|---|
| 7 | Application | what the app-level code actually touches | HTTP, DNS, SMTP |
| 6 | Presentation | encoding, compression, encryption formatting | TLS records, gzip |
| 5 | Session | managing/maintaining a session between two hosts | — |
| 4 | Transport | reliability, ordering, flow control, ports | TCP, UDP |
| 3 | Network | addressing + routing across networks | IP, routers |
| 2 | Data link | local addressing, framing | MAC addresses, Ethernet, switches |
| 1 | Physical | raw bits over a medium | copper, fiber, radio |

Mnemonic: **P**lease **D**o **N**ot **T**hrow **S**ausage **P**izza **A**way.

## Why it's mostly a reference model, not a literal one

Real-world networking stacks are usually described with the simpler **TCP/IP model** (4 layers:
link, internet, transport, application) — session and presentation aren't really separate
pieces of code in practice, they get folded into the application layer or handled by a library
(e.g. TLS effectively covers what OSI calls "presentation," but nobody writes a distinct
session-layer module).

## Why it still matters

It gives you a fast way to localize a problem:

- Can't ping a host at all → **physical/data link** (cable unplugged, wrong VLAN).
- Ping works but nothing routes → **network** (bad routing table, firewall).
- Host is reachable but the connection resets/times out → **transport** (port closed, TCP issue).
- Connection is fine but DNS won't resolve or the API returns garbage → **application**.

🖼️ **Image needed:** the 7-layer stack as a vertical diagram, with a one-line "what breaks
here" annotation next to each layer. Search: "osi model 7 layers diagram".

## Practice project

[`practice/protocols/networking-fundamentals`](../../practice/protocols/networking-fundamentals) —
annotates which OSI layer each piece of a tiny client/server exchange actually corresponds to.

## Related

- [Protocols](<protocols.md>) — the general idea of layered rules that OSI formalizes.
- [Internet protocol](<internet-protocol.md>) — the concrete layer-3 protocol.
- [TCP](<tcp.md>) / [UDP](<udp.md>) — the concrete layer-4 protocols.
