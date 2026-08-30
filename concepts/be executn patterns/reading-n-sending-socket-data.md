# Reading and Sending Socket Data

Once a connection is accepted, this is what the [Reader role](<the-listener-the-acceptor-n-the-reader.md>)
actually does: pull bytes in, push bytes out, and deal with the fact that neither direction has
any idea where one "message" ends and the next begins.

## The two operations

- **`read()`/`recv()`** — pulls bytes off the socket's receive buffer.
- **`write()`/`send()`** — pushes bytes into the socket's send buffer, for the OS to transmit.

## Not message-boundary-aware

TCP is a **byte stream** (see [TCP](<../protocols/tcp.md>)) — there's no concept of "one
`read()` call = one message" built in. The reader has to implement its **own framing**
(length-prefix, delimiter, etc) to know where one logical message ends and the next begins.
This is the exact same idea already demonstrated in this repo's
[`multiplexing-vs-demultiplexing`](<../../practice/comms-design-pattern/multiplexing-vs-demultiplexing>)
and [`networking-fundamentals`](<../../practice/protocols/networking-fundamentals>) practice
projects — a single `data` event (or `read()` call) can contain a partial message, multiple
messages, or a message split across two calls, and the reader has to handle all three.

## Blocking vs non-blocking reads

Same choice as [blocking vs non-blocking `accept()`](<how-the-be-accepts-connections.md>): a
blocking `read()` doesn't return until at least some data is available (or the connection
closes/errors). This choice is tightly coupled to the thread-per-connection vs event-loop
decision — a thread blocked in `read()` can't do anything else until data arrives, which is
fine if that thread owns exactly one connection, and a serious problem if it's supposed to be
servicing many.

## Nagle's algorithm (the send side)

By default, TCP doesn't send small writes immediately — it buffers them briefly, hoping to
combine several small writes into fewer, larger packets, since a tiny payload wrapped in ~40
bytes of TCP/IP header is inefficient use of the network. This is **Nagle's algorithm**, and
it can add real latency to small, latency-sensitive request/response exchanges — especially
when it interacts with the receiver's own "delayed ACK" optimization (see
[backend idempotency](<backend-idempotency.md>#nagles-algorithm) for the full
interaction and how to disable it with `TCP_NODELAY`).

## Backpressure

If the reader can't keep up with incoming data — or the writer can't keep up with how fast the
OS will accept outgoing writes — buffers fill up. This is exactly where
[TCP's flow control](<../protocols/tcp.md>) stops being an invisible transport-layer detail and
becomes something the application has to actively handle (e.g. pausing reads, or queuing
writes) to avoid unbounded memory growth.

🖼️ **Image needed:** a byte stream diagram showing 3 logical messages sent, arriving split
across 2 raw `read()` calls, with the framing logic reassembling them. Search: "tcp byte stream
message framing diagram".

## Practice project

[`practice/be-executn-patterns/listener-acceptor-reader`](../../practice/be-executn-patterns/listener-acceptor-reader) —
the same server used for the Listener/Acceptor demo also frames incoming messages by a
newline delimiter, and the accompanying
[`idempotency-and-nagle`](<../../practice/be-executn-patterns/idempotency-and-nagle>) project
measures Nagle's algorithm's effect directly with `setNoDelay()`.

## Related

- [The Listener, the Acceptor, and the Reader](<the-listener-the-acceptor-n-the-reader.md>) —
  where the Reader role fits among the other two.
- [TCP](<../protocols/tcp.md>) — the byte-stream and flow-control mechanics underneath all of this.
