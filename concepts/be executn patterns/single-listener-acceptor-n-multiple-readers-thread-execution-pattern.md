# Pattern B: Single Listener/Acceptor Thread + Multiple Reader Threads

The direct fix for [pattern A's](<single-listener-acceptor-n-reader-thread-execution-pattern.md>)
bottleneck: split the **Reader** role off the Listener+Acceptor thread entirely, onto its own
thread (or pool of threads).

## How it works

```
                    ,--> [reader thread] (connection 1)
[acceptor thread] --+--> [reader thread] (connection 2)
  (loops accept())   `--> [reader thread] (connection 3)
```

One thread's *only* job is accepting: loop calling `accept()`, and as soon as a connection
comes in, hand it off to a reader thread and immediately go back to accepting the next one. The
acceptor never reads application data and is never blocked by slow processing elsewhere.

## Two ways to organize the readers

**Thread-per-connection** — every accepted connection gets a brand-new dedicated thread.
Simple to reason about (each connection's reader can use straightforward blocking reads, no
juggling multiple connections on one thread), but doesn't scale to huge numbers of concurrent
connections — the classic **"C10k problem."** Each OS thread costs real memory (its stack) and
kernel scheduling overhead; with thousands of connections, context-switch overhead (see
[process vs thread](<the-process-n-the-thread-n-how-they-compete-for-cpu-time.md>)) starts
dominating over actual work.

**A bounded reader thread pool** — a fixed number of reader threads, with connections assigned
across them. This caps resource usage, but now a single reader thread may own *multiple*
connections at once, which means it needs its own non-blocking I/O + multiplexing (`epoll` or
similar) internally — this starts to resemble a "multi-reactor" design, one small event loop
per reader thread instead of one thread per connection.

## What this pattern doesn't fix

There's still exactly **one acceptor thread**. Under very high connection *churn* — a burst of
many *new* connections arriving per second, not just many connections being long-lived — that
single acceptor can itself become the bottleneck, since `accept()` calls have real per-call
overhead and only one can complete at a time on one thread. That specific problem is what
[pattern D](<multiple-accepter-threads-on-a-single-socket-execution-pattern.md>) addresses.

🖼️ **Image needed:** one acceptor thread with an arrow fanning out to N reader threads, each
independently reading/blocking on its own connection(s). Search: "thread per connection server
architecture diagram".

## Practice project

[`practice/be-executn-patterns/reader-thread-pool`](../../practice/be-executn-patterns/reader-thread-pool) —
a main thread that accepts and reads connections, handing completed work off to a bounded
`worker_threads` pool. (See that project's README for how Node's constraints make this demo's
shape converge with [pattern C's](<single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>)
— they're architecturally distinct in a classic thread-per-connection server, but Node doesn't
give a clean way to hand off a *live, already-reading* socket to a separate OS thread the way
it hands off an accepted socket between processes via `cluster`.)

## Related

- [Pattern A](<single-listener-acceptor-n-reader-thread-execution-pattern.md>) — the bottleneck this fixes.
- [Pattern C](<single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>) —
  a different split: by processing stage instead of by connection.
- [Pattern D](<multiple-accepter-threads-on-a-single-socket-execution-pattern.md>) — fixes what this pattern doesn't: the acceptor itself becoming a bottleneck.
