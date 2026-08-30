# Practice: Kernel Connection Internals

Concept notes: [`how-does-the-kernel-manage-backend-connections.md`](<../../../concepts/misc/how-does-the-kernel-manage-backend-connections.md>) ·
[`running-out-of-tcp-ports.md`](<../../../concepts/misc/running-out-of-tcp-ports.md>) ·
[`postgres-failure-caused-by-tcp-issue-cisco-router.md`](<../../../concepts/misc/postgres-failure-caused-by-tcp-issue-cisco-router.md>)

## Part 1: `TIME_WAIT` pile-up, proven with real OS state

### What this demonstrates

The exact failure mode in [running-out-of-tcp-ports.md](<../../../concepts/misc/running-out-of-tcp-ports.md>) —
opening a new connection per request burns a port every time, and each closed connection lingers
in `TIME_WAIT` for a while afterward — measured by asking the **OS itself**, with `netstat`, not
simulated.

### Folder structure

```
kernel-connection-internals/
  backend.js                <- node backend.js <port>
  no-pooling-client.js         <- 200 requests, brand new connection every time (port 7900)
  pooling-client.js              <- 200 requests, ONE reused connection (port 7901)
  inspect-connections.js           <- node inspect-connections.js <port> - real netstat output
  tcp-keepalive.js                   <- part 2, see below
```

### Run it

```bash
node backend.js 7900   # terminal 1
node backend.js 7901     # terminal 2

node no-pooling-client.js  # terminal 3 - then:
node inspect-connections.js 7900

node pooling-client.js       # then:
node inspect-connections.js 7901
```

(Each demo uses its **own port** deliberately — `TIME_WAIT` entries linger for a while after a
connection closes, so reusing one port across both demos would contaminate the comparison with
leftovers from the other run.)

### What you'll see

```
=== no-pooling demo (port 7900) ===
connections touching port 7900, by kernel-reported TCP state:
  TIME_WAIT: 402
  LISTENING: 2

=== pooling demo (port 7901) ===
connections touching port 7901, by kernel-reported TCP state:
  LISTENING: 2
  TIME_WAIT: 1
```

(Exact `TIME_WAIT` counts vary run to run — Windows' default `TIME_WAIT` duration means old
entries from a *previous* run on the same port can still be lingering and get counted too. The
number that matters isn't the precise count, it's the **contrast**: hundreds vs. essentially
one, for the identical 200 requests.)

### Code walkthrough

The only difference between the two clients is whether the `http.Agent` is told to reuse
connections:

```js
new http.Agent({ keepAlive: false });                    // no-pooling-client.js
new http.Agent({ keepAlive: true, maxSockets: 1 });         // pooling-client.js
```

`inspect-connections.js` asks the OS directly, rather than trusting anything the application
itself believes — exactly the point [the kernel-connections concept note](<../../../concepts/misc/how-does-the-kernel-manage-backend-connections.md>)
makes about an application having no visibility into TCP state unless it explicitly asks:

```js
const cmd = process.platform === "win32" ? "netstat -ano" : "netstat -an";
```

## Part 2: TCP keepalive

### What this demonstrates

The concrete, actionable fix from
[the Postgres/router concept note](<../../../concepts/misc/postgres-failure-caused-by-tcp-issue-cisco-router.md>) —
enabling TCP keepalive on a socket. This demo can't reproduce a router silently dropping a
connection (that needs real network hardware sitting between two real machines), but it proves
the API is used correctly, and the code comments explain exactly what it does on a real network.

### Run it

```bash
node tcp-keepalive.js
```

### Code walkthrough

```js
socket.setKeepAlive(true, 5000); // enable keepalive, first probe after 5s of idle time
```

Real-world defaults are usually much longer — Postgres's own `tcp_keepalives_idle` defaults to
2 hours — set low here only so the demo's *intent* is visible without needing to sit idle for
hours. In production, this single option is what periodically "touches" an otherwise-idle
connection, which does two things: keeps an intermediate router/firewall/NAT's own connection
tracking table from silently evicting it, and surfaces a genuinely dead connection immediately
via a failed probe instead of only discovering it mid-query, days or weeks later.

## Try this yourself

- Lower `MS` in `tcp-keepalive.js`'s `setTimeout` and add a real idle period longer than the
  keepalive interval, then capture traffic with Wireshark on loopback — you should be able to
  see the actual keepalive probe packets going out.
- Run `no-pooling-client.js` twice in a row on the same port and watch the `TIME_WAIT` count in
  `inspect-connections.js` roughly double — direct evidence old entries hadn't fully cleared
  between runs, which is exactly the "port exhaustion sneaks up on you" problem the concept
  note describes at production scale.

## Real-world equivalent

This is precisely the failure mode behind "my service works fine at low traffic but starts
throwing connection errors under load" reports that turn out to have nothing to do with the
downstream service's health — and precisely why HTTP clients, database drivers, and connection
poolers all default to (or strongly recommend) keep-alive connection reuse in production.
