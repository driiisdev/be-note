# Practice: HTTP Graceful Connection Shutdown

Concept note: [`http-graceful-connection-shutdown.md`](<../../../concepts/misc/http-graceful-connection-shutdown.md>)

## What this demonstrates

The exact failure the concept note describes, reproduced and fixed: a request that's genuinely
**in flight** when a shutdown is triggered either gets dropped (naive) or allowed to finish
(graceful) — proven by actually sending a slow request and triggering shutdown mid-flight, not
just described in prose.

## A platform note, found while building this

The natural way to trigger this is `child.kill("SIGTERM")` from an orchestrating script — but
on **Windows**, that call doesn't reliably deliver to a `process.on("SIGTERM", ...)` handler at
all; Node's own documentation notes it causes *unconditional termination* of the target process
on Windows instead (confirmed directly: an earlier version of this demo had both the naive
*and* the "graceful" server fail identically, because the graceful server's handler never ran).
The fix: both servers register their real `SIGTERM` handler (what actually runs in production
on Linux/Mac, or under a real process manager), **and** a second entry point triggered by a
plain IPC message, which `run-demo.js` uses instead so the demo behaves identically on every
platform. See the comment in `naive-server.js` for the detail.

## Folder structure

```
graceful-shutdown/
  naive-server.js       <- exits immediately on shutdown, no draining
  graceful-server.js      <- drains in-flight requests, force-closes after a grace period
  run-demo.js                <- orchestrates both: starts a server, fires a slow request,
                                  triggers shutdown mid-flight, reports the outcome
```

## Run it

```bash
node run-demo.js
```

(Each server can also be run standalone with `node naive-server.js` / `node graceful-server.js`
and shut down with a real `Ctrl+C`/`SIGINT` or `SIGTERM` if you're on Linux/Mac — `run-demo.js`
exists specifically to make the mid-flight-request timing reproducible and automatic.)

## What you'll see

```
=== naive-server.js (no graceful shutdown) ===
[naive] request received: /slow
[naive] --- triggering shutdown now, request still in flight ---
[naive] shutdown signal received - exiting IMMEDIATELY, no draining

[naive] request FAILED after 340ms: read ECONNRESET

=== graceful-server.js (proper shutdown) ===
[graceful] request received: /slow
[graceful] --- triggering shutdown now, request still in flight ---
[graceful] shutdown signal received - refusing new connections, draining in-flight ones...
[graceful] all connections drained naturally, exiting

[graceful] request SUCCEEDED after 2020ms: done (slow)
```

The naive server's client sees a hard connection error after **340ms** — right around when
shutdown was triggered, mid-request. The graceful server's client waits the full **~2000ms**
(the simulated slow work) and gets a real, successful response — shutdown didn't interrupt it
at all, it just stopped the server from accepting anything *new*.

## Code walkthrough

The naive version has no concept of "in-flight work" at all:

```js
function shutdown() {
  process.exit(0);   // whatever was in flight just got its connection reset
}
```

The graceful version separates "stop accepting new connections" from "wait for existing ones,"
with a hard timeout so a stuck request can't block shutdown forever:

```js
server.close(() => {
  process.exit(0);          // only fires once every EXISTING connection has closed naturally
});

setTimeout(() => {
  for (const socket of sockets) socket.destroy();   // force-close anything still open
}, 5000);
```

## Try this yourself

- Lower `graceful-server.js`'s simulated work from `2000` to `6000`ms (longer than the 5-second
  grace period) and rerun — now the grace-period timeout fires *before* the request finishes,
  force-closing the socket anyway. This is the deliberate tradeoff the concept note describes:
  graceful shutdown drains what it reasonably can, but never waits forever.
- Add a second concurrent slow request in `run-demo.js` before triggering shutdown, and confirm
  **both** complete successfully on the graceful server — proving `server.close()` drains *all*
  in-flight work, not just the first request it happens to see.
- If you're on Linux/Mac, run `node graceful-server.js` directly in a terminal, fire a slow
  request from another terminal, and press `Ctrl+C` (sends real `SIGINT` — add a
  `process.on("SIGINT", shutdown)` line to try it) mid-request to see the real OS signal path
  work exactly the same way the IPC-triggered demo does.

## Real-world equivalent

This is exactly what Kubernetes' pod termination sequence, PM2's graceful reload, and
`systemd`'s stop timeout all rely on an application to implement correctly — send `SIGTERM`,
wait a configurable grace period, only send `SIGKILL` if the process hasn't exited by then. An
application that behaves like `naive-server.js` under that sequence is exactly what causes
visible client errors during otherwise routine deploys.
