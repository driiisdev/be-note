# Practice: Stateful vs Stateless

Concept note: [`concepts/comms design pattern/stateful-vs-stateless.md`](<../../../concepts/comms design pattern/stateful-vs-stateless.md>)

## What this demonstrates

The same feature — a request counter — built two ways, so the tradeoff is something you can
watch happen instead of just read about.

## Scenario

**Stateless counter:** the client sends the current count on every request; the server just
increments it and hands it back. The server remembers nothing.

**Stateful counter:** the client sends a session id; the server looks up (or creates) an
in-memory counter for that session and increments it. The server remembers everything, and
only *that* server instance has the memory.

## Folder structure

```
stateful-vs-stateless/
  stateless-server.js   <- no memory at all between requests
  stateful-server.js    <- in-memory sessions, keyed by a session id
  client.js             <- exercises both servers, and simulates a stateful-server restart
```

## Code walkthrough

**`stateless-server.js`** — everything the server needs arrives in the request itself:

```js
const server = http.createServer((req, res) => {
  const { count } = JSON.parse(body); // client sends the current count
  res.end(JSON.stringify({ count: count + 1 })); // server forgets this immediately after
});
```

**`stateful-server.js`** — the server is the one holding the truth:

```js
const sessions = new Map(); // sessionId -> count, lives only in this process's memory

const server = http.createServer((req, res) => {
  const { sessionId } = JSON.parse(body);
  const count = (sessions.get(sessionId) || 0) + 1;
  sessions.set(sessionId, count);
  res.end(JSON.stringify({ count }));
});
```

The `sessions` map is the entire "state" in stateful-vs-stateless. It only exists in this one
process — restart the process, and it's gone.

## Run it

```bash
# terminal 1
node stateless-server.js     # port 4100

# terminal 2
node stateful-server.js      # port 4101

# terminal 3
node client.js
```

`client.js` calls both servers several times each, then tells you to manually restart
`stateful-server.js` (Ctrl+C, then run it again) and rerun the client — that's when the
memory loss becomes visible.

## What to observe

- The stateless server's count only ever goes up if the client itself tracks and resends the
  right number — pass the wrong number and the server happily "trusts" it, since it has no
  independent memory to check against.
- The stateful server's count survives across requests without the client resending
  anything — just a session id.
- After the simulated restart, the stateful server's count for that session resets to 0 (or
  errors, depending on how you query it) even though the client kept asking for the same
  session — its memory was local to the process that no longer exists. The stateless server
  is completely unaffected by a restart, because it never depended on server memory anyway.

## Try this yourself

- Point two separate client "users" (different session ids) at the stateful server
  simultaneously — confirm their counts don't interfere.
- Imagine load-balancing 2 instances of the stateful server round-robin — sketch out (in the
  README or as a comment) why a session's count would become inconsistent depending on which
  instance handles which request. This is exactly why stateful services need "sticky
  sessions" or a shared store like Redis instead of in-process memory.

## Real-world equivalent

Stateless: a REST API authenticated with a JWT that encodes everything needed per request.
Stateful: a traditional in-memory session store (`express-session` with the default
`MemoryStore`), a WebSocket connection's in-memory state, or a database transaction pinned to
one connection.
