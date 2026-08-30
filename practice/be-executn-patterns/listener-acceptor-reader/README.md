# Practice: The Listener, the Acceptor, and the Reader

Concept notes: [`the-listener-the-acceptor-n-the-reader.md`](<../../../concepts/be executn patterns/the-listener-the-acceptor-n-the-reader.md>) ·
[`how-the-be-accepts-connections.md`](<../../../concepts/be executn patterns/how-the-be-accepts-connections.md>) ·
[`reading-n-sending-socket-data.md`](<../../../concepts/be executn patterns/reading-n-sending-socket-data.md>) ·
[`single-listener-acceptor-n-reader-thread-execution-pattern.md`](<../../../concepts/be executn patterns/single-listener-acceptor-n-reader-thread-execution-pattern.md>) (pattern A)

## What this demonstrates

Two things: where the Listener/Acceptor/Reader boundary actually falls in real code (`server.js`),
and — separately, in `blocking-demo/` — what pattern A's "one blocked thread stalls everyone"
bottleneck genuinely looks like, which normal Node.js code almost never exhibits by accident.

## Part 1: the three roles, made visible

### Scenario

A newline-framed echo server — same framing idea as
[`networking-fundamentals`](<../../protocols/networking-fundamentals>) — with each role's
action logged explicitly as it happens.

### Folder structure

```
listener-acceptor-reader/
  server.js   <- Listener (listen), Acceptor (connection event), Reader (data event), labeled
  client.js   <- connects, sends two framed messages
```

### Code walkthrough

```js
const server = net.createServer();          // Listener: owns the socket, mostly passive

server.on("connection", (socket) => {        // Acceptor: fires once accept() already happened
  console.log(`[Acceptor] new connection ...`);

  socket.on("data", (chunk) => {              // Reader: raw bytes off an accepted connection
    // ...frame by newline, log each complete message...
  });
});
```

Node's `net` module performs the actual `accept()` call internally, non-blocking — this code
doesn't call `accept()` itself. The labels exist to make the *conceptual* boundary between the
three roles visible in the logs, even though one JS thread is playing all three parts here
(which is fine, because none of it is *blocking* — see part 2 for what would make it not fine).

### Run it

```bash
node server.js     # terminal 1
node client.js       # terminal 2
```

Expect `[Acceptor]` to log once, then `[Reader]` to log once per framed message, in order.

## Part 2: what pattern A's bottleneck actually looks like

### Scenario

Two clients, A and B, connect to the same server about 50ms apart. Client A sends `SLOW`,
which triggers a genuinely synchronous 1.5-second busy-wait on the server (not `setTimeout`,
which would yield back to the event loop — a real `while` loop burning CPU). Client B sends
`FAST`, which needs no real work at all.

### Folder structure

```
blocking-demo/
  blocking-server.js     <- normal net server, EXCEPT "SLOW" triggers a synchronous busy-wait
  concurrent-clients.js   <- client A (SLOW) then client B (FAST), ~50ms apart
```

### Run it

```bash
cd blocking-demo
node blocking-server.js       # terminal 1
node concurrent-clients.js      # terminal 2
```

### What you'll see

```
connecting client A (SLOW) and client B (FAST) nearly simultaneously...

connected: 55768
[55768] received: "SLOW" at 1788071551064
[A] got response after 1521ms: ack: SLOW at 1788071552579
connected: 55769
[55769] received: "FAST" at 1788071552580     <- B's data wasn't even READ until A finished
[B] got response after 1457ms: ack: FAST at 1788071552580
```

Client B connected only ~50ms after client A, but its response took **1457ms** — almost
identical to A's 1521ms — because the server's single JS thread was genuinely, synchronously
stuck inside the busy-wait and couldn't process B's already-arrived data until that finished.
This is precisely [pattern A's bottleneck](<../../../concepts/be executn patterns/single-listener-acceptor-n-reader-thread-execution-pattern.md>),
reproduced on purpose — and specifically **not** what Node.js does under normal circumstances,
which is why `server.js` in part 1 never shows this behavior: normal async code never blocks
the thread like this busy-wait deliberately does.

## Try this yourself

- In `blocking-server.js`, change the busy-wait to `setTimeout(callback, 1500)` instead of a
  real busy-loop, and rerun — client B now gets its response almost immediately, because
  `setTimeout` yields to the event loop instead of blocking it. This is the exact
  non-blocking-vs-blocking distinction [pattern A's concept note](<../../../concepts/be executn patterns/single-listener-acceptor-n-reader-thread-execution-pattern.md>)
  calls out.
- Add a third client, C, sending `FAST` at the same time as B — both B and C should be equally
  delayed, proving it's not just B specifically being penalized, the *entire* server is frozen.
- Reduce the busy-wait to `50` ms and rerun — the delay becomes small enough to be easy to miss
  without the explicit timestamps this demo logs, which is exactly why this kind of accidental
  blocking is a real, sneaky production bug (one slow synchronous call — e.g. a large
  `JSON.parse`, a synchronous crypto operation, a poorly-written regex — can do this by accident).

## Real-world equivalent

Any accidental synchronous, CPU-heavy call inside a Node.js request handler reproduces exactly
this bug in production — which is precisely why CPU-bound work gets offloaded to a worker pool
(see [`reader-thread-pool`](<../reader-thread-pool>) and
[`process-vs-thread`](<../process-vs-thread>)) instead of ever running directly on the thread
that's also responsible for reading everyone else's connections.
