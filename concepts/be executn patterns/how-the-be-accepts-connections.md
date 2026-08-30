# How the Backend Accepts Connections

Before a server can read a single byte from a client, it has to accept the connection — and
that step has its own mechanics, its own failure modes, and its own capacity limit that are
easy to overlook until a server hits them under load.

## The steps

1. Create a socket.
2. **Bind** it to an address:port.
3. Call **`listen()`**.

`listen()` is the step that matters most here — it's what turns a socket into something that
can receive incoming connections at all, and it creates a structure every pattern in this
module has to reason about: the **backlog queue**.

## The backlog queue

Once a client's TCP handshake (see [TCP](<../protocols/tcp.md>)) completes, the connection
doesn't go straight to the application — it gets parked in the backlog queue, waiting for the
application to call `accept()` and claim it.

- The backlog has a **maximum size**, configurable at `listen()` time (POSIX: `listen(fd,
  backlog)`; Node: `server.listen(port, backlog)`).
- If it fills up — because the application isn't calling `accept()` fast enough, or because a
  burst of new connections arrives faster than it can drain — further incoming connection
  attempts can be **dropped or refused**. The client sees a timeout or connection refused; the
  server may never explicitly "see" that failed attempt at all, since it happened before the
  application layer ever got involved.

## `accept()` is a syscall

`accept()` pulls the **next completed connection** off the backlog queue and returns a **new**
socket file descriptor representing that specific client — the original **listening socket
stays open**, untouched, ready to accept the *next* connection. The listening socket itself
never exchanges application data; only the sockets `accept()` returns do.

## Blocking vs non-blocking `accept()`

- **Blocking**: the calling thread simply waits until a connection is available.
- **Non-blocking**: `accept()` returns immediately, with an error if nothing's waiting yet,
  requiring a poll/select/epoll loop to know when to try again.

This single choice is central to which execution pattern is even possible to build — a
blocking `accept()` in a loop, on its own thread, is exactly [pattern A's](<single-listener-acceptor-n-reader-thread-execution-pattern.md>)
starting point; non-blocking `accept()` combined with an event loop is what lets a single
thread stay responsive to many connections at once, the way Node.js itself works internally.

🖼️ **Image needed:** a diagram of the backlog queue — completed handshakes queuing up on one
side, `accept()` draining them from the other, with a "queue full" overflow path shown.
Search: "tcp accept backlog queue diagram".

## Practice project

[`practice/be-executn-patterns/listener-acceptor-reader`](../../practice/be-executn-patterns/listener-acceptor-reader) —
a raw `net` server logging the moment each connection is accepted, separate from when its data
is actually read.

## Related

- [The Listener, the Acceptor, and the Reader](<the-listener-the-acceptor-n-the-reader.md>) —
  names the role this note describes as a mechanism.
- [TCP](<../protocols/tcp.md>) — the handshake that has to complete before a connection ever
  reaches the backlog queue.
