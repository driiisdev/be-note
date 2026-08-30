# Practice: Idempotency and Nagle's Algorithm

Concept note: [`backend-idempotency.md`](<../../../concepts/be executn patterns/backend-idempotency.md>)

## Part 1: idempotency keys (fully working, reliable demo)

### What this demonstrates

Why a naive retry can silently double-charge a customer, and how an idempotency key fixes it —
measured directly, not just described.

### Scenario

Two endpoints simulate the exact same "network blip causes a client-side retry" situation:

- `/charge/naive` — processes every request it receives, full stop.
- `/charge/safe` — requires an `Idempotency-Key` header; the *first* time a key is seen it
  charges and caches the result, every time after that it returns the cached result without
  charging again.

### Run it

```bash
node server.js       # terminal 1
node client.js         # terminal 2
```

### What you'll see

```
--- naive endpoint ---
{ charged: 10, totalCharged: 10 }
(network blip - client retries...)
{ charged: 10, totalCharged: 20 }        <- totalCharged went up TWICE

--- safe endpoint ---
{ charged: 10, totalCharged: 30 }
(network blip - client retries with the SAME key...)
{ charged: 10, totalCharged: 30 }        <- totalCharged only went up ONCE
```

### Code walkthrough

The entire fix is a lookup before the side effect happens:

```js
if (seenIdempotencyKeys.has(key)) {
  // already processed - return the SAME cached response, don't touch totalCharged again
  res.end(seenIdempotencyKeys.get(key));
  return;
}
totalCharged += 10;                          // only reached for a genuinely new key
seenIdempotencyKeys.set(key, body);
```

The client, not the server, decides what counts as "the same logical operation" — it generates
the key once per checkout attempt and reuses it on every retry of that *same* attempt (a
`crypto.randomUUID()` here; real systems often derive it from something like a cart ID + attempt
number).

### Try this yourself

- Send the safe request with two *different* keys — both should charge, proving the dedup is
  correctly scoped to "same key," not "any request to this endpoint."
- Swap the in-memory `Map` for something with a TTL (a real system needs idempotency keys to
  expire eventually) and think about what a good expiry window would be for a payment API.

## Part 2: Nagle's algorithm — the API, and why there's no big latency number here

### What `nagle-demo.js` shows

The correct way to disable Nagle's algorithm on a Node socket (`socket.setNoDelay(true)`,
which sets the `TCP_NODELAY` socket option) — run with and without it:

```bash
node nagle-demo.js            # Nagle left on (default)
node nagle-demo.js nodelay      # TCP_NODELAY enabled
```

### What you'll actually see

```
client: Nagle's algorithm left on (default) - small writes may be batched
server: received the burst across 1 'data' event(s)

client: TCP_NODELAY enabled - small writes go out immediately, unbatched
server: received the burst across 1 'data' event(s)
```

**Identical either way.** This isn't a bug in the demo — it's an honest, measured result worth
explaining rather than hiding.

### Why there's no observable difference here

Nagle's algorithm holds a small write back only while there's already unacknowledged data
outstanding on the connection, waiting for that earlier data's ACK before sending more. On
**loopback**, the OS acknowledges data in roughly 1-2ms — faster than the time it takes Node's
own event loop to even queue up the next write in this demo's tight `for` loop. There's no
meaningful window in which Nagle's hold-back behavior has anything to bite into: by the time it
would matter, the ACK has usually already arrived.

This was checked directly rather than assumed — an earlier version of this demo measured actual
elapsed time for the same burst, with and without `TCP_NODELAY`, and got **2.2ms vs 2.3ms** —
noise-level, not a real difference. This isn't the same situation as the
[HTTPS module's](<../../https/connection-establishment>) TLS timing demo, which fixed an
identical "loopback hides the effect" problem with a latency-simulating proxy — that trick
doesn't transfer here, because Nagle/delayed-ACK interaction is decided by the **kernel's** ACK
timing on one real TCP hop, invisible to an application-level relay; delaying *forwarded* bytes
in a Node proxy does nothing to slow down how fast the OS underneath actually ACKs what it
already received.

### Where this genuinely does show up

The classic Nagle + delayed-ACK stall (historically up to ~200-500ms) is real, but reproducing
it reliably needs either a connection with genuine non-negligible RTT (a real network, not
loopback), or inspecting the actual packets on the wire. If you want to see it directly:

```bash
# capture loopback traffic while nagle-demo.js runs, and look at the timing between segments
# (Wireshark, or tcpdump -i lo0 / -i \Device\NPF_Loopback depending on OS)
```

Look for TCP segments carrying 1 byte of payload, and check the time gap before the *next*
segment goes out relative to when the ACK for the previous one arrives — that gap is Nagle's
algorithm in action, something a wall-clock `Date.now()` comparison in application code can't
reliably isolate the way a packet capture can.

## Real-world equivalent

Idempotency keys are used by essentially every payment API (Stripe, for instance, requires one
on charge creation) for exactly the reason demonstrated in part 1. `TCP_NODELAY` is commonly
set explicitly on latency-sensitive RPC connections (database drivers, real-time APIs) — Nagle's
default batching behavior is a reasonable choice for throughput-oriented bulk transfers, and a
poor one for chatty, small-message protocols.
