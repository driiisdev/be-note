# Backend Execution Patterns — Overview

This module answers one specific question: **when a server needs to handle many concurrent
client connections, how does it organize its threads to do that?** Every pattern here is a
different answer, each one fixing a bottleneck the previous answer had.

## The building blocks (covered first)

Before the patterns themselves make sense, four foundational pieces:

1. [The process, the thread, and how they compete for CPU time](<the-process-n-the-thread-n-how-they-compete-for-cpu-time.md>)
   — what a thread actually costs, and why "just add more threads" isn't free.
2. [How the backend accepts connections](<how-the-be-accepts-connections.md>) — the listen
   backlog and `accept()` mechanics every pattern is built on top of.
3. [The Listener, the Acceptor, and the Reader](<the-listener-the-acceptor-n-the-reader.md>) —
   the 3 roles every pattern below is really just a different way of assigning to threads.
4. [Reading and sending socket data](<reading-n-sending-socket-data.md>) — what the Reader role
   actually does once a connection exists.

## The pattern progression

Each pattern fixes a specific bottleneck in the one before it:

| Pattern | Shape | Fixes |
|---|---|---|
| A. [Single listener/acceptor/reader](<single-listener-acceptor-n-reader-thread-execution-pattern.md>) | 1 thread does everything, sequentially | — (the baseline) |
| B. [Single listener/acceptor + multiple readers](<single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md>) | 1 acceptor thread, N reader threads | Accepting no longer blocked behind slow reads |
| C. [Single listener/acceptor/reader + worker pool](<single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>) | 1 I/O thread, N processing workers | Splits I/O from CPU-heavy processing, not just by connection |
| D. [Multiple acceptors, one shared socket](<multiple-accepter-threads-on-a-single-socket-execution-pattern.md>) | N acceptor threads on 1 listening socket | `accept()` itself becoming a bottleneck under high connection churn |
| E. [Multiple listeners, socket sharding](<multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md>) | N fully independent listener+acceptor+reader units | Shared-queue contention — near-linear scaling across cores |

```
A:  [ listen+accept+read ]                                    1 thread, sequential

B:  [ listen+accept ] --> [reader] [reader] [reader]           split by CONNECTION

C:  [ listen+accept+read ] --> [worker][worker][worker]        split by STAGE (io vs cpu)

D:  [accept][accept][accept]  <- one shared socket              parallel accept()

E:  [listen+accept+read]  [listen+accept+read]  [listen+accept+read]   <- SO_REUSEPORT,
     (own socket)          (own socket)          (own socket)             fully independent
```

## Why the "right" pattern depends on the workload

Picking the wrong pattern for a given workload leaves cores idle or creates contention:

- **I/O-bound work** (waiting on network/disk, not CPU) — a single event-loop thread with
  non-blocking I/O (pattern A's spirit, done *non-blocking* — see the practice project's note
  on how this differs from the naive blocking version of pattern A) can outperform thread-per-
  connection, since idle threads waiting on I/O cost memory and scheduling overhead for no gain.
- **CPU-bound work** — needs actual parallelism across cores; pattern C's worker pool (or
  pattern E's independent processes) is the right tool, since a single thread would stall
  *every* connection it's servicing while it churns through one computation.
- **High connection churn** (huge numbers of *new* connections per second, not just
  long-lived ones) — this is specifically what patterns D and E address; B and C don't help
  here, since they're about what happens *after* a connection is accepted, not the accept
  step itself.

## Practice project

Each pattern has its own practice project — see each pattern's note for the specific one.
[`practice/be-executn-patterns/process-vs-thread`](../../practice/be-executn-patterns/process-vs-thread)
is the right starting point, since it demonstrates the cost model this whole module reasons about.

## Related

- [Backend idempotency](<backend-idempotency.md>) — "when to use threads?" is answered directly
  there, as a practical decision framework built on this overview.
- [Sync vs async workloads](<../comms design pattern/sync-vs-async-workloads.md>) — the
  comms-design-pattern module's version of this same "how does one server handle many
  concurrent requests" question, from the application-protocol side rather than the OS-thread side.
