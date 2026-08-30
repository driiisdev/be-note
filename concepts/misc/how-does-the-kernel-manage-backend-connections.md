# How Does the Kernel Manage Backend Connections?

[How the backend accepts connections](<../be executn patterns/how-the-be-accepts-connections.md>)
covers the application-level story — `listen()`, a backlog, `accept()`. This note goes one
level lower: what the **kernel** is actually doing underneath that story, which matters the
moment something goes wrong in a way the application-level abstractions don't explain.

## Two queues, not one

A listening socket on Linux is actually backed by **two** separate queues:

- **The SYN queue** (SYN backlog) — holds **half-open** connections, mid-handshake: a `SYN` has
  arrived and been answered with `SYN-ACK`, but the final `ACK` hasn't arrived yet. Sized by
  `net.ipv4.tcp_max_syn_backlog`.
- **The accept queue** — holds **fully established** connections (handshake complete) that are
  waiting for the application to actually call `accept()` and claim them. Sized by
  `net.core.somaxconn` — this is the same "backlog" number passed to `listen()` at the
  application level, from [how the backend accepts connections](<../be executn patterns/how-the-be-accepts-connections.md>).

If the accept queue fills up — because the application isn't calling `accept()` fast enough —
the kernel can drop or refuse further completed connections, depending on configuration, well
before the application ever becomes aware anything was wrong.

## The kernel owns the entire TCP state machine, regardless of the app

`SYN_SENT`, `SYN_RECEIVED`, `ESTABLISHED`, `FIN_WAIT`, `TIME_WAIT`, `CLOSED`, and every state in
between are tracked entirely by the kernel's TCP stack. The application just sees "connected" or
"data available" — it has no visibility into what state the kernel's TCP stack actually
considers a given connection to be in, unless it explicitly asks (`netstat`, `ss`).

## The kernel buffers data independently of the app's read/write calls

- **Receive buffer**: data can arrive over the network and sit in the kernel's buffer *before*
  the application ever calls `read()`. This is exactly why a socket's "readable" event can fire
  with data the application hasn't touched yet — the kernel already has it.
- **Send buffer**: a `write()` call can return successfully before the data has actually left
  the machine — success just means the kernel accepted the bytes into its own buffer for
  transmission, not that they've been delivered, or even sent yet.

## File descriptor limits — a separate ceiling entirely

Every open socket is a file descriptor, and `ulimit -n` caps how many a process can hold open
at once. A backend under heavy connection load can hit this ceiling and start failing to accept
new connections or open new outbound ones — a completely different failure mode from anything
TCP-level, worth checking independently when a server starts refusing connections under load.

🖼️ **Image needed:** a listening socket with two queues drawn explicitly (SYN queue → accept
queue → `accept()`), each labeled with its controlling sysctl. Search: "linux tcp syn backlog
accept queue diagram".

## Practice project

[`practice/misc/kernel-connection-internals`](../../practice/misc/kernel-connection-internals) —
inspects real OS-level socket state with `netstat`, and reproduces file-descriptor exhaustion
directly.

## Related

- [How the backend accepts connections](<../be executn patterns/how-the-be-accepts-connections.md>) —
  the application-level view this note goes underneath.
- [Running out of TCP ports](<running-out-of-tcp-ports.md>) — a related kernel-level resource
  limit, from the *outbound* connection side instead of the inbound accept side.
