# Pattern A: Single Listener + Acceptor + Reader Thread

The simplest possible design, and the baseline every other pattern in this module improves on:
**one thread does everything** — listens, accepts, reads, and processes — all sequentially.

## How it works

```
[ one thread: listen -> accept() -> read() -> process -> respond -> accept() -> ... ]
```

The thread sits in a loop: block in `accept()` until a connection arrives, then block in
`read()` on that connection until data arrives, process it, respond, and only *then* go back to
`accept()` for the next connection.

## The bottleneck

It's entirely sequential. While the thread is busy reading or processing connection #1's data,
it **cannot** accept connection #2, and it **cannot** read more data from any *other*
already-open connection — there's exactly one thread, and it's occupied. Every connection
after the first effectively queues behind whatever the thread is currently doing.

## Where this actually shows up

This is close to what a naive, teaching-example single-threaded blocking server looks like —
almost never used for real concurrent production traffic, since throughput is capped at
roughly "one connection's worth of work at a time." But it's the essential starting point:
every pattern that follows is specifically about removing *this* bottleneck, one role at a time.

## The nuance worth getting right: this is not what Node.js does

Node.js's event loop is superficially similar — one JavaScript thread — but fundamentally
different in a way that matters a lot here: Node uses **non-blocking I/O** with an event loop
(`epoll`/`kqueue` under the hood), so that one thread can be servicing dozens of connections
*concurrently* by never actually blocking on any single one — it just gets notified when each
socket has data ready. Pattern A specifically means **blocking** I/O on one thread — genuinely
stuck waiting, unable to do anything else. Node's default model is architecturally closer to
"pattern A's roles, but done non-blocking," which is a meaningfully different (and far more
scalable) thing.

🖼️ **Image needed:** a single thread's timeline, shown fully occupied processing connection
#1 while connections #2 and #3 sit waiting in the backlog, unable to even be accepted yet.
Search: "single threaded blocking server bottleneck diagram".

## Practice project

[`practice/be-executn-patterns/listener-acceptor-reader`](../../practice/be-executn-patterns/listener-acceptor-reader) —
includes a genuinely blocking version of this pattern (using Node's synchronous file/child-process
APIs to simulate a blocking operation) next to Node's normal non-blocking behavior, so the
difference described above is directly visible instead of just asserted.

## Related

- [The Listener, the Acceptor, and the Reader](<the-listener-the-acceptor-n-the-reader.md>) —
  the three roles this pattern collapses onto one thread.
- [Pattern B](<single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md>) — the
  direct fix: splitting the Reader off onto its own thread(s).
