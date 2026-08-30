# Practice: Request-Response

Concept note: [`concepts/comms design pattern/request-response.md`](<../../../concepts/comms design pattern/request-response.md>)

## What this demonstrates

The plain HTTP request-response cycle, with every stage logged so the mechanics that a
framework normally hides are visible: **parse → process → respond → parse**.

## Scenario

A tiny "time service" — the client asks the server what time it is, once, and gets one
answer back. No frameworks, no dependencies: just Node's built-in `http` module.

## Folder structure

```
request-response/
  server.js   <- listens on :3000, handles GET /time
  client.js   <- makes one request, logs each stage of handling the response
```

## Code walkthrough

**`server.js`** — the four stages from the concept note, made explicit:

```js
const server = http.createServer((req, res) => {
  // 1. parse: figure out what's being asked
  const url = new URL(req.url, `http://${req.headers.host}`);

  // 2. process: build the answer
  const body = { serverTime: new Date().toISOString() };

  // 3. respond
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
});
```

**`client.js`** — sends the request, then parses + consumes the response:

```js
http.get("http://localhost:3000/time", (res) => {
  let raw = "";
  res.on("data", (chunk) => (raw += chunk));   // response arrives in chunks
  res.on("end", () => {
    const data = JSON.parse(raw);              // 4. parse
    console.log(data.serverTime);              // 5. consume
  });
});
```

The important detail: `res.on("data", ...)` can fire multiple times for one response (HTTP
responses stream in over TCP), so the client has to buffer chunks and only parse once
`"end"` fires. This is easy to miss when a framework does it for you.

## Run it

```bash
# terminal 1
node server.js

# terminal 2
node client.js
```

Expect the client to print something like `server time is 2026-08-30T01:18:08.409Z`, and the
server to log each of its four stages in order.

## Try this yourself

- Hit a path that doesn't exist (change the client's URL to `/nope`) and see the 404 branch.
- Add a second route, e.g. `/echo`, that reflects a query parameter back — reinforces the
  "parse the request" step actually doing something with the request instead of ignoring it.
- Run the client twice in a row and note the server has zero memory of the first request —
  ties directly into [stateful vs stateless](<../../../concepts/comms design pattern/stateful-vs-stateless.md>).

## Real-world equivalent

Every REST API call, every `fetch()`/`axios` request in a frontend app, and (at a lower
level) DNS lookups and SSH session setup are all this same pattern with fancier framing.
