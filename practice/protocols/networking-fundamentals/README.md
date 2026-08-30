# Practice: Networking Fundamentals (Protocols, OSI Model, IP)

Concept notes:
[`protocols.md`](<../../../concepts/protocols/protocols.md>) ·
[`osi-model.md`](<../../../concepts/protocols/osi-model.md>) ·
[`internet-protocol.md`](<../../../concepts/protocols/internet-protocol.md>)

## What this demonstrates

That "protocol" isn't an abstract idea — it's a rule you write yourself. This project builds
a tiny custom **application-layer protocol** on top of raw TCP, and calls out which OSI layer
each moving part actually belongs to, so the model stops being a table you memorize and
becomes something you can point at in real code.

## Scenario

A line-based mini command protocol: connect over raw TCP, send single-line text commands
(`PING`, `TIME`, `WHOAMI`, or anything else which gets echoed back), get single-line responses.

## Folder structure

```
networking-fundamentals/
  server.js   <- raw net.Server, our custom protocol's message handling, DNS lookup demo
  client.js   <- connects, sends commands, logs the layer-3/4 info Node exposes
```

## Code walkthrough

**The framing rule** is the whole protocol: every message is one line, ending in `\n`.
That's the "syntax" half of what a protocol is — it's the only reason two independent
`data` events (which TCP makes no promise will line up with your messages) can be
reassembled into whole messages on the receiving end:

```js
buffer += chunk.toString("utf8");
let newlineIndex;
while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
  const line = buffer.slice(0, newlineIndex).trim();
  buffer = buffer.slice(newlineIndex + 1);
  // only now do we have one complete, well-formed message
}
```

**Where each OSI layer actually shows up in this code:**

| Layer | Where |
|---|---|
| Physical / Data link | handled entirely by the OS + NIC — never appears in this code |
| Network (IP) | `socket.remoteAddress`, `socket.remoteFamily`, `dns.lookup()` |
| Transport (TCP) | the `net` module itself — handshake already happened by the time `connection`/`connect` fires |
| Application | everything after that: our `\n`-framed command protocol |

## Run it

```bash
# terminal 1
node server.js

# terminal 2
node client.js
```

Expect the server to log the DNS lookup for `example.com`, then each command it receives; the
client logs its local/remote address+family and each server response.

## Try this yourself

- Add a `SLEEP <ms>` command that delays before responding — notice the client's next line
  still waits behind it, since it's all one ordered TCP stream (see
  [TCP](<../../../concepts/protocols/tcp.md>)).
- Change the client to connect to `::1` instead of `127.0.0.1` and see `remoteFamily` change
  from `IPv4` to `IPv6`.
- Send two commands back to back without waiting and log the raw `chunk` before splitting on
  `\n` — you'll likely see both commands arrive in a single `data` event, proof that TCP gives
  you a byte *stream*, not discrete messages; the framing is entirely on you to implement.

## Real-world equivalent

Every text-based protocol you've used works exactly this way: SMTP, IMAP, Redis's RESP
protocol, and (with fancier framing) HTTP itself are all "agree on a message boundary, then
agree on what's inside it" built on top of a raw TCP byte stream, same as this toy protocol.
