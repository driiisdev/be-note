# Practice: Cluster Acceptor Scaling (Patterns D & E)

Concept notes: [`multiple-accepter-threads-on-a-single-socket-execution-pattern.md`](<../../../concepts/be executn patterns/multiple-accepter-threads-on-a-single-socket-execution-pattern.md>) (pattern D) ·
[`multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md`](<../../../concepts/be executn patterns/multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md>) (pattern E)

## What this demonstrates

Node's built-in `cluster` module supports two different strategies for spreading incoming
connections across multiple worker **processes** — and they map onto patterns D and E's core
distinction: **who decides** which worker gets the next connection.

- **`SCHED_RR`** — the primary process itself accepts every connection and explicitly rotates
  it to the next worker. One shared decision point, fairness *guaranteed by construction* —
  the spirit of [pattern D](<../../../concepts/be executn patterns/multiple-accepter-threads-on-a-single-socket-execution-pattern.md>).
- **`SCHED_NONE`** — each worker gets handed its own listening socket for the same port, and
  the OS itself decides which worker's `accept()` completes for any given connection, with
  **no shared coordinator** — the spirit of [pattern E](<../../../concepts/be executn patterns/multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md>)'s
  independent, uncoordinated listeners (the exact kernel mechanism is platform-specific — Linux
  uses `SO_REUSEPORT`; see the platform note below for what this looks like on Windows).

## Folder structure

```
cluster-acceptor-scaling/
  worker-server.js   <- the http server every worker runs, responds with its own pid
  cluster-rr.js        <- forks 3 workers with SCHED_RR
  cluster-none.js        <- forks 3 workers with SCHED_NONE
  load-client.js           <- fires 30 CONCURRENT requests, tallies which worker handled each
```

## Run it

```bash
node cluster-rr.js       # terminal 1
node load-client.js        # terminal 2 - watch the distribution, then Ctrl+C terminal 1

node cluster-none.js       # terminal 1 again
node load-client.js        # terminal 2 again
```

## What was actually measured (this repo, Windows, Node 18)

```
=== SCHED_RR ===
distribution across 30 concurrent requests:
  worker 3828: 10 requests
  worker 7772: 10 requests
  worker 17036: 10 requests

=== SCHED_NONE ===
distribution across 30 concurrent requests:
  worker 14520: 20 requests
  worker 13020: 5 requests
  worker 14648: 5 requests
```

`SCHED_RR` split the load **perfectly evenly** — expected, since the primary process is
explicitly counting and rotating through workers one by one, an intentional fairness
guarantee. `SCHED_NONE` did **not** split evenly — one worker took double its fair share.
This isn't a bug in the demo, it's the real, honest tradeoff
[pattern E's concept note](<../../../concepts/be executn patterns/multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md>)
describes: with no shared coordinator, distribution is whatever the OS's own scheduling happens
to produce, not a guaranteed-fair split — you trade coordination overhead for *some* imbalance.

## Platform note: this isn't literally `SO_REUSEPORT`

The concept notes describe `SO_REUSEPORT` (Linux) as the classic socket-sharding mechanism.
Windows doesn't have that exact socket option — Node's `cluster` module on Windows uses a
different underlying mechanism to hand each worker its own accept path, and (per the results
above) doesn't distribute nearly as evenly as `SO_REUSEPORT` typically does on Linux under
similar load. The *concept* (each worker gets its own accept path, no shared coordinator) is
the same either way; the *evenness* of the resulting distribution is genuinely
platform-dependent. If you have access to a Linux machine, rerunning `cluster-none.js` there
is a legitimate way to see a tighter, more even split than what's shown above.

## Code walkthrough

The entire difference between the two files is one line, set **before** any workers are forked:

```js
cluster.schedulingPolicy = cluster.SCHED_RR;    // cluster-rr.js
cluster.schedulingPolicy = cluster.SCHED_NONE;  // cluster-none.js
```

Every worker runs the identical `worker-server.js` — the scheduling policy only changes *how
connections get routed to workers*, never what the workers themselves do.

## Try this yourself

- Raise the fork count from 3 to 8 in both cluster files and rerun `load-client.js` with a
  higher `REQUEST_COUNT` — `SCHED_RR`'s even split should hold at any worker count;
  `SCHED_NONE`'s imbalance may get more or less pronounced depending on your platform.
- Add a deliberate delay (`setTimeout`) inside `worker-server.js`'s handler for one specific
  worker's pid, and rerun `SCHED_RR` — you'll see the primary keeps rotating to that slow
  worker anyway (it doesn't route around slow workers, it just rotates), whereas a
  least-connections-aware load balancer (outside the scope of `cluster`) would avoid doing that.
- Kill one worker mid-test (`cluster.workers[id].kill()` from the primary, or just close one
  terminal manually mid-run) and watch `SCHED_RR` naturally stop routing to it — the primary
  only rotates through workers it currently knows about.

## Real-world equivalent

This exact choice is a real nginx/Envoy configuration decision (worker processes with
`SO_REUSEPORT` vs. a shared listening socket) and a real Node.js production decision (`cluster`
module's scheduling policy, or PM2's cluster mode, which defaults to Node's `cluster` module
under the hood). High-throughput services generally lean toward the uncoordinated,
`SO_REUSEPORT`-style approach specifically *because* the coordination point in `SCHED_RR` — the
primary process handing off every single connection — can itself become a bottleneck at very
high connection rates, the exact problem [pattern D's note](<../../../concepts/be executn patterns/multiple-accepter-threads-on-a-single-socket-execution-pattern.md>)
describes pattern E as solving.
