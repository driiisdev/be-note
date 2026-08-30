# Pattern E: Multiple Listeners/Acceptors/Readers with Socket Sharding

The most advanced pattern in this module, and how modern high-performance servers actually
scale across CPU cores: instead of many acceptor threads contending for **one** shared socket
([pattern D](<multiple-accepter-threads-on-a-single-socket-execution-pattern.md>)), give every
worker its **own, fully independent** listening socket — on the *same* port.

## How it works

```
        [ kernel: hashes each new connection's client ip:port to a shard ]
             |                    |                    |
   [listener+acceptor+reader]  [listener+acceptor+reader]  [listener+acceptor+reader]
     (own socket, own backlog)   (own socket, own backlog)   (own socket, own backlog)
```

Each worker — usually a separate **process**, sometimes a thread — creates its own independent
listening socket, all bound to the *same* port using **`SO_REUSEPORT`** (Linux). The kernel
itself load-balances incoming connections across these separate sockets and backlog queues,
typically by hashing the client's IP:port, so a given client consistently lands on the same
shard for the life of that connection.

## Why this beats pattern D

Pattern D still has one shared backlog queue, contended by every acceptor thread — a single
kernel data structure under load. **Socket sharding** gives each worker its own backlog queue
entirely, eliminating that contention (and the thundering-herd concern) altogether. This
enables near-**linear** scaling of `accept()` throughput across CPU cores, since there's no
shared structure any two workers are fighting over.

## Where this shows up in real systems

- **nginx** running multiple worker processes, each with `SO_REUSEPORT` enabled.
- **Node.js's `cluster` module**, which can use this exact mechanism on supporting platforms
  (`cluster.schedulingPolicy = cluster.SCHED_NONE` lets the OS distribute connections directly,
  rather than Node's master process round-robin-distributing them itself).

Each independent listener+acceptor combo in this pattern almost always has its **own reader(s)**
too — so in practice, this pattern means N fully independent listener+acceptor+reader units
(commonly one per CPU core), each capable of handling its slice of traffic with **zero**
cross-unit coordination needed for the accept/read path itself.

## The tradeoff: no free shared state

Because workers here are usually separate **processes** (for full isolation and fault
tolerance — one worker crashing doesn't take the others down), they don't share
application-level memory by default. An in-memory cache built up by one worker isn't visible to
another; a connection counter incremented by one worker doesn't reflect what the others are
doing. Any state that genuinely needs to be shared across workers needs external coordination —
a shared database or cache (Redis, etc), or explicit IPC — something the earlier
"single shared listener" patterns didn't have to think about, since everything lived in one
process's memory.

🖼️ **Image needed:** 4 fully independent listener+acceptor+reader stacks, each with its own
socket icon, all bound to port 443, with a kernel-level hash function routing new connections
between them. Search: "so_reuseport socket sharding diagram".

## Practice project

[`practice/be-executn-patterns/cluster-acceptor-scaling`](../../practice/be-executn-patterns/cluster-acceptor-scaling) —
Node's `cluster` module with `SCHED_NONE`, letting the OS distribute connections directly to
independent worker processes, alongside `SCHED_RR` for direct comparison against pattern D's shape.

## Related

- [Pattern D](<multiple-accepter-threads-on-a-single-socket-execution-pattern.md>) — the
  shared-socket predecessor this pattern's contention-free design improves on.
- [The process, the thread, and how they compete for CPU time](<the-process-n-the-thread-n-how-they-compete-for-cpu-time.md>) —
  why separate processes (not just threads) are the usual choice for this pattern's workers.
