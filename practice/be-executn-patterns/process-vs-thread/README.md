# Practice: Process vs Thread

Concept note: [`the-process-n-the-thread-n-how-they-compete-for-cpu-time.md`](<../../../concepts/be executn patterns/the-process-n-the-thread-n-how-they-compete-for-cpu-time.md>)

## What this demonstrates

Two things the concept note claims, both measured directly instead of just asserted: **CPU-bound
work blocks whatever thread it runs on**, and **spawning a process costs meaningfully more than
spawning a thread**.

## Scenario

Every demo here runs the exact same CPU-bound computation — `fibonacci(38)`, computed the slow,
recursive way on purpose so it takes a genuinely noticeable ~0.5s — while a heartbeat prints
every 100ms in the background. Whether the heartbeat keeps ticking *during* the computation is
the whole experiment.

## Folder structure

```
process-vs-thread/
  cpu-work.js               <- the shared fibonacci(n) computation
  blocking-main-thread.js    <- runs it directly on the main thread (heartbeat STOPS)
  worker-thread-offload.js    <- runs it on a worker_threads Worker (heartbeat keeps going)
  child-process-offload.js     <- runs it in a forked child process (heartbeat keeps going)
  fib-child.js                  <- the child process's entry point
  spawn-overhead.js              <- times 10 thread spawns vs 10 process spawns back to back
  ready-child.js                  <- minimal child process spawn-overhead uses
```

## Run each demo

```bash
node blocking-main-thread.js     # heartbeats STOP while fib(38) runs
node worker-thread-offload.js     # heartbeats keep ticking
node child-process-offload.js      # heartbeats keep ticking, via IPC instead of shared memory
node spawn-overhead.js              # times thread vs process creation directly
```

## What you'll actually see

```
$ node blocking-main-thread.js
heartbeat #1
heartbeat #2
starting fibonacci(38) directly on the main thread...
done: fib(38) = 39088169 in 541ms
                                          <- no heartbeats printed during this ^
heartbeat #3
```

```
$ node worker-thread-offload.js
heartbeat #1
heartbeat #2
starting fibonacci(38) on a worker thread...
heartbeat #3
heartbeat #4
...                                      <- heartbeats never stop
heartbeat #9
done: fib(38) = 39088169 in 787ms
```

```
$ node spawn-overhead.js
10 worker threads created+torn down sequentially: 339ms
10 child processes created+torn down sequentially: 714ms

processes cost ~2.1x what threads cost here
```

(Your exact numbers will vary by machine — the worker/child versions running slightly *slower*
in wall-clock time than the blocking version isn't a bug, it's real: spawning a thread or
process isn't free, so there's setup cost on top of the computation itself. The point isn't
raw speed, it's whether the **main thread stayed responsive** while the work happened.)

## Code walkthrough

The only structural difference between the three "offload" styles is *where* `fibonacci(38)`
actually executes:

```js
// blocking: runs on THIS thread, directly
const result = fibonacci(38);

// worker thread: runs on a separate OS thread, same process, shares nothing implicitly
const worker = new Worker(workerScript, { eval: true, workerData: 38 });
worker.on("message", (result) => { ... });

// child process: runs in a separate OS process entirely
const child = fork("fib-child.js");
child.send(38);
child.on("message", (result) => { ... });
```

The worker thread and child process versions both keep the main thread/process free — but they
get there differently. The worker's result arrives as a structured-clone message over an
internal channel; the child process's result arrives as a **serialized** IPC message
(`process.send`/`process.on("message")`) — there's no way for the two processes to share the
same memory directly the way two threads in one process implicitly could (e.g. via a
`SharedArrayBuffer`).

## Try this yourself

- Change `fibonacci(38)` to `fibonacci(42)` in any of the three demos and watch the timing
  scale — recursive fibonacci is exponential, so a few extra `n` goes a long way.
- In `spawn-overhead.js`, raise `COUNT` to 50 and watch the process-vs-thread ratio hold
  roughly steady — it's a per-spawn cost difference, not a fixed overhead.
- Add a second, concurrent `fibonacci(38)` call inside `worker-thread-offload.js` (a second
  `Worker`) and confirm both run to completion in roughly the same total time as one alone (if
  your machine has ≥2 free cores) — real parallelism, not time-slicing.

## Real-world equivalent

This is the exact tradeoff behind [pattern C's worker pool](<../../../concepts/be executn patterns/single-listener-acceptor-reader-w-message-load-balancing-execution-pattern.md>):
CPU-heavy request handling gets offloaded to worker threads specifically so the I/O-handling
thread never experiences what `blocking-main-thread.js` just demonstrated. It's also exactly
why Node's own `libuv` thread pool exists for filesystem/crypto/DNS calls — those are blocking
C library calls under the hood, offloaded so the JS event loop itself never stalls.
