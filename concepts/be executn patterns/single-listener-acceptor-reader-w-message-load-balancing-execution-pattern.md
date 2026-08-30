# Pattern C: Single Listener/Acceptor/Reader + Worker Pool (Message Load Balancing)

A different split from [pattern B](<single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md>):
instead of splitting threads **by connection**, this splits them **by stage** — one thread (or
small event loop) does *all* the reading, for *every* connection, and a separate worker pool
does *all* the processing.

## How it works

```
[ listener + acceptor + reader thread ]  --complete message-->  [worker pool]
        (owns every connection's raw bytes)                      (round-robin / least-busy /
                                                                    hashed by connection)
```

The single I/O thread accepts connections and reads raw bytes off all of them (using
non-blocking I/O — it never actually blocks on any one connection). Once it has assembled a
**complete message** (see [reading and sending socket data](<reading-n-sending-socket-data.md>)
for why that framing step is necessary in the first place), it hands that message off to
whichever worker in the pool is available, and immediately goes back to reading more data from
any connection. The worker does the actual business logic — parsing, database calls,
computation — and sends the response back through the I/O thread when it's done.

## Why split this way

The I/O thread's job (read bytes, notice a socket is readable) is cheap and mostly spent
waiting on the network — it doesn't need multiple threads to do it well, non-blocking I/O
already lets one thread service huge numbers of connections. The **processing** step, on the
other hand, can be genuinely CPU-heavy — and CPU-heavy work on the I/O thread would stall
*every other connection* that thread is responsible for while it churns through one computation.
Separating the two means the I/O thread never stalls, and the CPU-heavy work gets real
parallelism across a worker pool sized to the number of available cores.

This is the shape behind **the reactor pattern with a worker thread pool** — extremely common
in real high-performance servers: Netty's `EventLoopGroup` plus a separate business-logic
executor, or Node's own `libuv` thread pool handling filesystem/crypto/DNS operations while the
JavaScript event loop itself stays single-threaded and non-blocking for I/O.

## vs. pattern B, precisely

It's easy to conflate these two, so the distinction is worth being explicit about:

- **Pattern B** splits **by connection** — each reader thread owns some connections *entirely*,
  doing both their reading and their processing.
- **Pattern C** splits **by stage** — one thread/loop does *all* the reading, for *every*
  connection, and a *different* pool does *all* the processing.

These are meaningfully different architectures with different scaling properties, not just two
names for the same idea.

## What "load balancing" means here

The title refers to how completed messages get distributed across the worker pool —
round-robin, picking the least-busy worker, or hashing by connection ID (useful when messages
from the *same* connection need to be processed in order, since otherwise two workers could
race and respond out of order).

🖼️ **Image needed:** one I/O thread's event loop feeding a queue, with a worker pool of N
threads pulling messages off that queue and processing them in parallel. Search: "reactor
pattern worker thread pool diagram".

## Practice project

[`practice/be-executn-patterns/reader-thread-pool`](../../practice/be-executn-patterns/reader-thread-pool) —
same project as pattern B; see its README for how this pattern's shape is what Node's
`worker_threads` naturally supports.

## Related

- [Pattern B](<single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md>) — the by-connection alternative split.
- [Reading and sending socket data](<reading-n-sending-socket-data.md>) — the framing step that produces the "complete message" this pattern hands off.
