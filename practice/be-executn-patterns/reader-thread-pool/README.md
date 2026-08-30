# Practice: Reader Thread Pool (Patterns B & C)

Concept notes: [`single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md`](<../../../concepts/be executn patterns/single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md>) (pattern B) ·
[`single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md`](<../../../concepts/be executn patterns/single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>) (pattern C)

## Why one project covers two patterns

In a classic OS-thread server, patterns B and C are architecturally distinct: B splits work
**by connection** (each reader thread owns some connections entirely — reading *and*
processing them); C splits work **by stage** (one thread does *all* the reading, a separate
pool does *all* the processing). Node doesn't give a clean way to hand off a *live,
already-reading* socket to a separate `worker_threads` thread the way patterns B needs — sockets
aren't transferable to workers the way accepted connections are transferable between
**processes** via `cluster` (see [`cluster-acceptor-scaling`](<../cluster-acceptor-scaling>)
for that). What Node *does* give cleanly is pattern C's shape: one thread reads everything, a
worker pool processes. This project builds that — pattern C, honestly, not a fudged version of B.

## What this demonstrates

A single I/O thread accepts connections and reads every byte off every one of them — never
running CPU-heavy work itself — while a bounded pool of `worker_threads` does the actual
processing, in parallel, for whichever complete messages the I/O thread hands off.

## Scenario

One client connection sends 4 messages back to back. Each message triggers a genuinely
CPU-bound "processing" step (counting primes, scaled by message length) inside a worker. If
processing were sequential on one thread, total time would be roughly 4× one message's cost —
because it's spread across a 4-worker pool instead, all 4 process in parallel.

## Folder structure

```
reader-thread-pool/
  worker.js     <- runs in each worker_threads Worker: does the actual CPU-bound "processing"
  pool.js         <- WorkerPool: round-robin dispatch, correlates responses by request id
  server.js         <- the io thread: accepts, reads, frames messages, dispatches to the pool
  client.js           <- sends 4 messages back to back on one connection
```

## Code walkthrough

The I/O thread's handler never does the CPU work itself — it dispatches and immediately
returns to reading more data, exactly as [pattern C's note](<../../../concepts/be executn patterns/single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>) describes:

```js
socket.on("data", (chunk) => {
  // ...frame into complete messages...
  pool.run(line).then((result) => {          // dispatched, NOT awaited here
    socket.write(result + "\n");              // this callback fires later, whenever it's done
  });
  // the io thread is already back here, ready to read the NEXT chunk of data
});
```

`pool.js` round-robins across a fixed set of workers and correlates each response back to its
request using a generated id, since multiple messages can be in flight across different workers
simultaneously:

```js
run(payload) {
  return new Promise((resolve) => {
    const id = /* unique per call */;
    this.pending.set(id, resolve);
    this.workers[this.nextWorker].postMessage({ id, payload });   // round robin
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;
  });
}
```

## Run it

```bash
node server.js       # terminal 1
node client.js         # terminal 2
```

## What you'll see

```
[io-thread] framed "alpha" -> dispatching to worker pool
[io-thread] framed "bravo" -> dispatching to worker pool
[io-thread] framed "charlie" -> dispatching to worker pool
[io-thread] framed "delta" -> dispatching to worker pool
[io-thread] worker finished "alpha" in 18ms
[io-thread] worker finished "bravo" in 18ms
[client] response 1/4 after 20ms: ALPHA (worker 1 found 7393 primes under 75000)
[io-thread] worker finished "delta" in 18ms
[client] response 2/4 after 21ms: BRAVO (worker 2 found 7393 primes under 75000)
[client] response 3/4 after 21ms: DELTA (worker 4 found 7393 primes under 75000)
...
all 4 done in 25ms total
```

All 4 messages get **dispatched immediately** (no waiting for the previous one to finish), and
finish in **overlapping order** — worker 4 finishes "delta" before worker 3 finishes "charlie,"
even though charlie was dispatched first — direct evidence they ran concurrently across
separate workers, not queued one after another on a single thread.

## Try this yourself

- Change `POOL_SIZE` in `server.js` to `1` and rerun — the messages now visibly serialize
  (each "worker finished" log waits for the previous one), reproducing pattern B/C's
  bottleneck without a pool at all.
- Send 8 messages instead of 4 from the client and watch some finish, then more dispatch —
  once all workers are busy, later messages queue inside `pool.js`'s round-robin the same way
  a bounded thread pool would in a classic server.
- Add a `console.log(process.hrtime())`-based timestamp to `worker.js` and confirm two workers'
  logs genuinely interleave in wall-clock time — proof this is parallelism, not the event loop
  just interleaving async callbacks on one thread.

## Real-world equivalent

This is the shape behind Netty's `EventLoopGroup` + separate business-logic executor, and
conceptually similar to how Node's own `libuv` thread pool handles filesystem/crypto/DNS work
without ever blocking the JS event loop — an I/O-handling thread that never does heavy lifting
itself, backed by a pool that does nothing *but* heavy lifting.
