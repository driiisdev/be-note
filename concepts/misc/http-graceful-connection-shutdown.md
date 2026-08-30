# HTTP Graceful Connection Shutdown

Every backend process eventually has to stop — a deploy, a scale-down, a crash-recovery
restart. What happens to requests that are *in flight* at that exact moment is entirely a
matter of whether the shutdown was handled gracefully or not, and it's one of the most common
sources of visible, avoidable client-facing errors during otherwise-routine deploys.

## The problem with just exiting

If a process exits immediately, any request still in flight has its connection abruptly reset
or dropped mid-response — the client sees a hard connection error, even if the request was
milliseconds away from completing successfully.

## The graceful shutdown sequence

1. **Receive a shutdown signal** — conventionally `SIGTERM` ("please stop, when you get a
   chance"), deliberately distinct from `SIGKILL` ("stop now, no cleanup possible") — the whole
   reason this distinction exists is to give a process the *opportunity* to shut down cleanly.
2. **Stop accepting new connections immediately** — close the listening socket, or simply stop
   calling `accept()` (see
   [how the backend accepts connections](<../be executn patterns/how-the-be-accepts-connections.md>)).
3. **Let already-in-flight requests finish naturally** on their existing connections.
4. **Close idle keep-alive connections** that have no in-flight request sitting on them —
   there's no reason to keep those open once new work has stopped arriving.
5. **After a grace period, forcibly close anything still open** — a single stuck or
   pathologically slow request shouldn't be able to block shutdown indefinitely.
6. **Exit.**

## Node.js specifics

`server.close()` stops the server from accepting *new* connections, but does **not** touch
existing ones — its callback only fires once every existing connection has actually closed on
its own. If a hard timeout fallback is wanted (and it usually is, in production), the
application needs to track open sockets itself and forcibly destroy anything still open after N
seconds — `server.close()` alone provides no timeout mechanism.

## The load balancer side of this matters just as much

Ideally, the load balancer or reverse proxy stops routing *new* traffic to an instance
**before** that instance even receives its shutdown signal — via a failing health check or
explicit connection draining (see
[Proxy vs reverse proxy](<../proxy n load balancing/proxy-vs-reverse-proxy.md>)). Without this,
there's a race: the load balancer can send a brand-new request to an instance that has already
stopped accepting connections, right in the window between "instance decided to shut down" and
"load balancer noticed."

Process managers and orchestrators (Kubernetes, PM2, systemd) implement exactly the signal
sequence described above: send `SIGTERM`, wait a configurable grace period, and only send
`SIGKILL` if the process still hasn't exited by then.

🖼️ **Image needed:** a timeline showing SIGTERM received → new connections refused → in-flight
requests draining → grace period timeout → SIGKILL, with a load balancer's health check
failing slightly *before* SIGTERM is even sent. Search: "graceful shutdown sigterm sigkill
timeline diagram".

## Practice project

[`practice/misc/graceful-shutdown`](../../practice/misc/graceful-shutdown) — a Node server that
correctly drains an in-flight slow request through a `SIGTERM`, while immediately rejecting new
connection attempts, next to a naive version that drops everything abruptly for contrast.

## Related

- [How the backend accepts connections](<../be executn patterns/how-the-be-accepts-connections.md>) —
  the accept-loop this shutdown sequence has to stop.
- [Proxy vs reverse proxy](<../proxy n load balancing/proxy-vs-reverse-proxy.md>) — where
  connection draining fits on the load balancer side of a deploy.
