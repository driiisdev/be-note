# Backend Idempotency, Nagle's Algorithm, and When to Use Threads

Three related questions from the same note, each a direct, practical follow-up to a concept
covered elsewhere in this module.

## Backend idempotency

An operation is **idempotent** if performing it multiple times has the exact same effect as
performing it once. By HTTP convention, `GET`, `PUT`, and `DELETE` are supposed to be
idempotent; `POST` is not.

**Why this matters specifically for execution patterns**: in *any* of the multi-threaded
patterns covered in this module — a reader pool, a worker pool, sharded workers — a client can
legitimately **retry** a request (a network blip, a timeout, a load balancer giving up and
resending). If the handler isn't idempotent, that retry can cause a **duplicate side effect** —
charging a card twice, creating two orders from one checkout click.

The standard fix is an **idempotency key**: the client generates a unique ID per *logical*
operation (not per HTTP request — the same ID is reused on a retry), and the server checks that
key against a cache or database before processing. If the key's already been seen, the server
returns the cached result instead of doing the work again. This is what makes even a
naturally non-idempotent operation like `POST /charge` safe to retry.

## Nagle's algorithm

Already introduced in [reading and sending socket data](<reading-n-sending-socket-data.md>) —
worth going one level deeper here because of a specific, well-known interaction bug.

By default, TCP doesn't send small outgoing writes immediately. It briefly buffers them,
hoping to combine several small writes into fewer, larger packets — a 1-byte payload wrapped in
~40 bytes of TCP/IP header is a lot of overhead for very little data. This buffering behavior
is **Nagle's algorithm**.

**The interaction that causes trouble**: many TCP receivers also run **delayed ACK** — instead
of acknowledging every packet immediately, they wait a short while, hoping to piggyback the ACK
on outgoing data of their own. When both sides are running these optimizations at once, a
small request/response exchange can stall: the sender is waiting to batch more data before
sending, the receiver is waiting to piggyback its ACK before responding, and neither side
actually has anything more to send — resulting in a real, measurable delay (historically up to
~200-500ms) before the exchange completes.

**The fix**: `TCP_NODELAY` disables Nagle's algorithm for a socket, sending small writes
immediately instead of buffering them. In Node: `socket.setNoDelay(true)`. This matters for any
latency-sensitive backend protocol doing small, frequent request/response exchanges — real-time
APIs, small RPC calls — where sending immediately beats waiting to batch.

## When to use threads?

A direct follow-up to [process vs thread](<the-process-n-the-thread-n-how-they-compete-for-cpu-time.md>),
answered as a decision framework:

- **I/O-bound work** (waiting on network or disk, not CPU) — a single event-loop thread with
  non-blocking I/O usually outperforms thread-per-connection. Threads sitting idle waiting on
  I/O cost real memory and scheduling overhead for essentially no benefit — they're just
  waiting, not computing.
- **CPU-bound work** (real computation) — needs actual parallelism across cores. A single
  event-loop thread would **block** on that computation, stalling *every other* connection
  being serviced by that same thread. This is exactly what
  [pattern C's worker pool](<single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>)
  (or pattern E's independent processes) is for.
- **Blocking legacy APIs with no async equivalent** (e.g. a blocking database driver) — often
  solved with a bounded **worker thread pool** specifically to convert a blocking call into
  something an event loop can wait on without blocking *itself*. This is literally how Node's
  own `libuv` thread pool works by default for filesystem, DNS, and some crypto operations,
  even though JavaScript itself stays single-threaded.

Every pattern in this module is really just a different, more specific answer to this same
question — "how many threads, doing what roles, for what kind of workload."

🖼️ **Image needed:** a decision-tree diagram — "is the work I/O-bound or CPU-bound?" branching
to "event loop" vs "worker pool," with a third branch for "blocking API, no async option" →
"bounded thread pool." Search: "when to use threads decision tree io bound cpu bound".

## Practice project

[`practice/be-executn-patterns/idempotency-and-nagle`](../../practice/be-executn-patterns/idempotency-and-nagle) —
an idempotency-key-protected endpoint that's safe to retry, next to a naive one that isn't; and
`setNoDelay()` toggled on/off with the latency difference measured directly.
[`practice/be-executn-patterns/process-vs-thread`](../../practice/be-executn-patterns/process-vs-thread)
covers the "when to use threads" question with real measurements.

## Related

- [Reading and sending socket data](<reading-n-sending-socket-data.md>) — where Nagle's algorithm first comes up.
- [The process, the thread, and how they compete for CPU time](<the-process-n-the-thread-n-how-they-compete-for-cpu-time.md>) —
  the cost model "when to use threads" is answering against.
- [Pattern C](<single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>) —
  the concrete pattern for CPU-bound work needing a thread pool.
