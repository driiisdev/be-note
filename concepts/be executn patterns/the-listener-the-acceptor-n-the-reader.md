# The Listener, the Acceptor, and the Reader

Three conceptual roles that every execution pattern in this module is really just a different
way of assigning to threads. Once these three are clear, every pattern that follows — from the
[simplest](<single-listener-acceptor-n-reader-thread-execution-pattern.md>) to the
[most sharded](<multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md>)
— is just "which of these three roles share a thread, and which don't."

## The three roles

**Listener** — owns the listening socket (bound and listening on a port). Mostly passive: it
exists so the OS has somewhere to park connections that have completed their TCP handshake,
[the backlog queue](<how-the-be-accepts-connections.md>).

**Acceptor** — the thread or code that calls `accept()` to pull a new connection off the
listener's backlog, and hands the resulting per-connection socket off somewhere — to itself
(if it's going to read from it too), or to another thread or pool.

**Reader** — the thread or code that reads application data off an *already-accepted*
connection's socket ([the actual mechanics](<reading-n-sending-socket-data.md>)), and
processes/responds to it.

```
Listener  ---backlog queue--->  Acceptor  ---hands off socket--->  Reader
(passive,                       (calls accept(),                  (recv/read,
 owns the port)                  claims a connection)               does the work)
```

## Same thread, or different threads

These three roles can all live on the **same thread** — the simplest possible design, and
exactly [pattern A](<single-listener-acceptor-n-reader-thread-execution-pattern.md>) — or be
**split across different threads**, which scales better but requires safely handing sockets or
data off between threads.

The rest of this module is a tour of every reasonable way to combine or split these three
roles, and what tradeoff each choice makes:

- Split the **Reader** off from Listener+Acceptor → [pattern B](<single-listener-acceptor-n-multiple-readers-thread-execution-pattern.md>).
- Keep Listener+Acceptor+Reader together, but split **processing** off from reading →
  [pattern C](<single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>).
- Multiply the **Acceptor** → [pattern D](<multiple-accepter-threads-on-a-single-socket-execution-pattern.md>).
- Multiply **all three**, each with its own independent socket →
  [pattern E](<multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md>).

🖼️ **Image needed:** the three-role diagram above, redrawn once per pattern (A through E)
showing which roles share a thread/box in each. Search: "listener acceptor reader thread
pattern diagram".

## Practice project

[`practice/be-executn-patterns/listener-acceptor-reader`](../../practice/be-executn-patterns/listener-acceptor-reader) —
a raw `net` server with each role's action explicitly logged, so the boundary between them is
visible even though Node's event loop plays all three roles internally.

## Related

- [How the backend accepts connections](<how-the-be-accepts-connections.md>) — the Acceptor
  role's mechanics in detail.
- [Reading and sending socket data](<reading-n-sending-socket-data.md>) — the Reader role's
  mechanics in detail.
