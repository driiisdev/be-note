# Practice: TCP vs UDP

Concept notes: [`tcp.md`](<../../../concepts/protocols/tcp.md>) ·
[`udp.md`](<../../../concepts/protocols/udp.md>)

## What this demonstrates

The same echo scenario, built twice — once on TCP, once on UDP — using only Node's built-in
`net` and `dgram` modules, so the actual API-level differences (connect vs. no-connect,
ordered stream vs. discrete datagrams) are visible directly in the code, not just in a diagram.

## Folder structure

```
tcp-vs-udp/
  tcp/
    server.js   <- net.Server, one persistent connection per client
    client.js   <- net.createConnection, sends 5 messages on one connection
  udp/
    server.js   <- dgram.Socket, no connection state at all
    client.js   <- dgram.Socket, fires 5 independent datagrams
```

## Code walkthrough

**TCP** needs a connection before anything can be sent — `net.createConnection` doesn't
resolve its callback until the 3-way handshake finishes:

```js
const socket = net.createConnection({ host: "127.0.0.1", port: 5000 }, () => {
  // only reachable AFTER the handshake completed
});
```

**UDP** has no such step — `dgram.Socket.send()` just fires a datagram, there's no
"connected" callback to wait for because there's no connection to establish:

```js
client.send(`message ${i}`, 5001, "127.0.0.1"); // no handshake, no prior setup
```

Notice the UDP server has no per-client socket object either — every incoming datagram's
`message` event hands you the sender's address (`rinfo`) fresh, because UDP has no concept of
an ongoing connection to hang state off of.

## Run it

```bash
# tcp
cd tcp
node server.js       # terminal 1
node client.js        # terminal 2

# udp (separate terminals)
cd ../udp
node server.js
node client.js
```

## Try this yourself

- Add `console.log` timestamps to both servers' receive handlers and compare — on a local
  loopback connection you likely won't *see* reordering, since real loss/reorreding needs an
  actual lossy network. Loop back to the [UDP notes](<../../../concepts/protocols/udp.md>)
  for why the guarantee still matters even when you can't easily reproduce its absence
  locally.
- Kill the TCP server mid-run (`Ctrl+C`) while the client is connected and watch the client's
  socket emit an error/close — then do the same to the UDP server: the UDP client's `send()`
  calls silently succeed either way, because UDP never knew whether anyone was listening in
  the first place.
- Change the UDP client to send messages with a `setTimeout` staggered between them instead of
  all at once, and compare against firing them all synchronously — with TCP this makes no
  observable difference to ordering; that's the reliability guarantee doing its job.

## Real-world equivalent

TCP here stands in for anything that must arrive correctly — an HTTP API call, a database
query. UDP stands in for DNS queries and real-time media (video calls, game state updates) —
cases where a stale retried packet is *worse* than a dropped one.
