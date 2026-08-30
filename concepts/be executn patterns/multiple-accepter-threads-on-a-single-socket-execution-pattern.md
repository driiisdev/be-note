# Pattern D: Multiple Acceptor Threads on a Single (Shared) Socket

Every pattern so far has scaled *reading and processing*. This one scales something different:
**the accept step itself**, for workloads where the bottleneck isn't slow connections — it's
too *many new* connections arriving too fast.

## How it works

```
                [ shared listening socket / backlog queue ]
                    |          |          |
              [acceptor]  [acceptor]  [acceptor]   <- all call accept() on the SAME fd
```

Multiple threads all call `accept()` on the *same* listening socket at once — the file
descriptor is shared, since all these threads belong to the same process. Each thread blocks
in `accept()`, and the OS wakes **one** of them up whenever a new connection completes its
handshake and lands in the backlog.

## Why this helps

Under high connection **churn** — a burst of many new connections per second, e.g. a
flash-crowd scenario — a single acceptor thread (as in
[pattern B](<single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md>)) can
itself become the bottleneck: `accept()` has real per-call overhead, and only one call can
complete at a time on one thread. Having N threads all blocked in `accept()` on the same socket
means the "pull the next connection off the backlog" work itself gets parallelized.

## The thundering herd problem (and why it's mostly fixed today)

Historically, when a new connection arrived, the OS would wake up **every** thread blocked in
`accept()` on that socket — even though only one of them could actually win the race and claim
the connection. Every thread that lost the race had spent a context switch for nothing,
wasting CPU proportional to how many acceptor threads there were. Modern kernels (Linux since
roughly 2.6) mitigate this with **wake-one** semantics — only one waiting thread gets woken per
new connection — but it's worth knowing the failure mode existed, since older systems or
naive implementations elsewhere can still hit it.

## What this pattern is *not* about

This is specifically about scaling the **accept** step. It says nothing about how reading or
processing is then organized — in practice, this pattern is almost always paired with a reader
strategy from [pattern B](<single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md>)
or [pattern C](<single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>).

## The one thing it doesn't fix

There's still exactly **one** listening socket and **one** backlog queue, shared by every
acceptor thread. Under extreme load, that shared queue is itself still a single point of
contention — which is exactly what [pattern E](<multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md>)
eliminates by giving every worker its own, fully independent socket.

🖼️ **Image needed:** one listening socket's backlog with 4 acceptor threads all blocked on
`accept()`, one getting woken (highlighted) while the other three stay asleep — illustrating
wake-one semantics vs. the old thundering-herd behavior. Search: "accept thundering herd
wake-one diagram".

## Practice project

[`practice/be-executn-patterns/cluster-acceptor-scaling`](../../practice/be-executn-patterns/cluster-acceptor-scaling) —
Node's `cluster` module with round-robin scheduling (`SCHED_RR`), the closest built-in
approximation of this pattern's spirit (a shared accept point distributing to multiple workers).

## Related

- [How the backend accepts connections](<how-the-be-accepts-connections.md>) — the backlog and
  `accept()` mechanics this pattern parallelizes.
- [Pattern E](<multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md>) —
  removes the shared-socket contention this pattern still has.
