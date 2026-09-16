# Sync vs Async Workloads

Once a request reaches a server, how does the server actually process it - does handling one
request block everything else, or can the server work on many at once?

## How it works

**Synchronous processing:** the server works on one request start-to-finish before it can do
anything else. If a request needs to wait on something slow (disk, database, another
service), the server just sits there blocked, doing nothing useful, until it's done.

**Asynchronous processing:** when a request needs to wait on something slow, the server
sets that wait aside (registers a callback / awaits a promise / yields control) and goes to
work on other requests in the meantime. When the slow thing finishes, the server picks the
original request back up and continues.

```
Sync:   [-- request A: wait on DB -------------] [-- request B starts only after A finishes --]
Async:  [-- request A: wait on DB (non-blocking) --]
          [-- request B starts immediately, doesn't wait on A --]
        [-- request A resumes when DB responds, finishes --]
```

Note this is about a *single server's* concurrency model - it's a different axis from
[stateful vs stateless](<stateful-vs-stateless.md>) (which is about what the server
remembers) and from the client-facing patterns like [polling](<polling.md>)/[push](<push.md>)
(which are about how the *client* finds out about updates).

## Where it's used

- **Sync-style:** traditional thread-per-request servers (classic PHP/Apache, older Java
  servlet containers) - simple to reason about, one thread = one request, but one slow
  request ties up one whole thread/worker.
- **Async-style:** Node.js's event loop, Python's `asyncio`, Go's goroutines, Nginx's
  worker model - a single thread/worker can juggle thousands of in-flight requests because
  it never blocks waiting on I/O.

## Pros / Cons

**Sync pros:** simpler mental model (code reads top-to-bottom, no callbacks/promises to
reason about); easier to debug with a normal stack trace.

**Sync cons:** doesn't scale well for I/O-heavy workloads - every blocked request wastes a
whole thread/worker; needs more threads/processes (= more memory) to handle the same load an
async server handles with far fewer.

**Async pros:** one worker can handle a huge number of concurrent I/O-bound requests
efficiently (great for APIs that mostly wait on databases/network calls, not CPU).

**Async cons:** harder to reason about (execution order isn't top-to-bottom anymore); a
single CPU-heavy synchronous chunk of code can still block the whole event loop for
everyone else - async only helps with I/O waits, not CPU work.

🖼️ **synchronous vs asynchronous request handling diagram**
![synchronous vs asynchronous request handling diagram 1](<../../assets/img/sync vs async 1.png>)

![synchronous vs asynchronous request handling diagram 2](<../../assets/img/sync vs async 2.png>)

## Practice project

[`practice/comms-design-pattern/sync-vs-async`](../../practice/comms-design-pattern/sync-vs-async) -
two endpoints on the same server: `/sync-task` deliberately blocks the whole process with a
CPU-bound loop, `/async-task` does an equivalent-length wait via a non-blocking timer - fire
several concurrent requests at each and watch one endpoint serialize while the other doesn't.

## Related

- [Multiplexing vs demultiplexing](<multiplexing-vs-demultiplexing.md>) - the mechanism that
  lets many requests share one connection/thread in the first place.
- [Stateful vs stateless](<stateful-vs-stateless.md>) - a different axis: what the server
  remembers, vs. how it processes.
