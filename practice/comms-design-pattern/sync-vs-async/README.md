# Practice: Sync vs Async Workloads

Concept note: [`concepts/comms design pattern/sync-vs-async-workloads.md`](<../../../concepts/comms design pattern/sync-vs-async-workloads.md>)

## What this demonstrates

One server, two endpoints that each take about the same amount of "time" to complete — one
blocks the entire process while it works, the other doesn't. Firing concurrent requests at
each makes the difference impossible to miss.

## Scenario

- `GET /sync-task` — busy-waits with a CPU-bound loop for ~1.5s. Blocks *everything* on the
  process, including other requests, for that whole time.
- `GET /async-task` — waits ~1.5s using a non-blocking timer (`setTimeout`), during which the
  process is free to handle other requests.

## Folder structure

```
sync-vs-async/
  server.js   <- both endpoints, on the same single-threaded Node process
  client.js   <- fires N concurrent requests at one endpoint and times them
```

## Code walkthrough

**The blocking endpoint** — a tight loop that keeps the CPU (and therefore the whole
single-threaded event loop) busy on purpose:

```js
if (url.pathname === "/sync-task") {
  const until = Date.now() + 1500;
  while (Date.now() < until) { /* deliberately burn CPU, blocking everything */ }
  res.end("sync done");
}
```

**The non-blocking endpoint** — hands the wait off to the event loop instead of spinning:

```js
if (url.pathname === "/async-task") {
  setTimeout(() => res.end("async done"), 1500); // frees the process to handle other requests
}
```

The key line is `while (Date.now() < until) {}` — that's the only difference from a "real"
CPU-bound task (image resizing, heavy computation), and it's exactly what an `await` on a
timer or a database call avoids: the event loop is never handed back to while it spins.

## Run it

```bash
# terminal 1
node server.js

# terminal 2 — fire 5 concurrent requests at the sync endpoint
node client.js sync 5

# then try the async endpoint
node client.js async 5
```

## What to observe

- Against `/sync-task`, 5 concurrent requests take roughly `5 x 1.5s = 7.5s` total — each one
  has to wait for the process to finish being blocked by the one before it.
- Against `/async-task`, all 5 requests finish in roughly `~1.5s` total — they were all
  "waiting" at the same time, because waiting on a timer doesn't occupy the CPU.
- This is the entire reason Node's single-threaded event loop can still serve huge numbers of
  concurrent I/O-bound requests: I/O waits (database, network, timers) don't block it, but a
  synchronous CPU-bound loop always will, no matter which endpoint you call it from.

## Try this yourself

- Replace `/async-task`'s `setTimeout` with a real `await` on something (e.g.
  `fs.promises.readFile`) instead of a fake timer, to see the same effect with genuine I/O.
- Add a third endpoint that runs the blocking loop but for a much shorter time (e.g. 5ms) and
  notice concurrent requests to it barely feel the effect — blocking is only a real problem
  when the blocked duration is large relative to your request rate.

## Real-world equivalent

The sync endpoint is what happens when someone accidentally runs `JSON.parse` on a huge
payload, a synchronous crypto operation, or an unbounded loop inside a Node request handler —
one slow request degrades *every* concurrent request on that process. The async endpoint is
the normal shape of a Node API route awaiting a database query.
