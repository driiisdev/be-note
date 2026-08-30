# Practice: Sidecar Pattern

Concept note: [`concepts/comms design pattern/sidecar-pattern.md`](<../../../concepts/comms design pattern/sidecar-pattern.md>)

## What this demonstrates

Pulling a cross-cutting concern (request logging + timing) completely out of the application
and into a separate proxy process sitting in front of it — the app itself has zero logging
code.

## Scenario

A tiny "app" service that just answers `GET /greet?name=X`. In front of it sits a "sidecar":
a reverse proxy that logs every request's method, path, status, and duration, then forwards
the request unchanged to the app. Callers only ever talk to the sidecar's port.

## Folder structure

```
sidecar-pattern/
  app.js       <- the actual business logic. No logging, no metrics. Port 4001.
  sidecar.js   <- reverse proxy in front of the app. All logging lives here. Port 4000.
  client.js    <- calls the sidecar's port, never talks to app.js directly.
```

```
client --> [sidecar :4000] --(forwards)--> [app :4001]
              |
              logs every request here
```

## Code walkthrough

**`app.js`** — pure business logic, no idea a sidecar even exists:

```js
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const name = url.searchParams.get("name") || "world";
  res.end(JSON.stringify({ message: `Hello, ${name}!` }));
});
server.listen(4001);
```

**`sidecar.js`** — the entire cross-cutting concern lives here, using `http.request` to
forward to the app and pipe its response straight back:

```js
const proxy = http.createServer((req, res) => {
  const start = Date.now();
  const forwarded = http.request(
    { host: "localhost", port: 4001, path: req.url, method: req.method },
    (appRes) => {
      appRes.pipe(res);
      appRes.on("end", () => {
        console.log(`${req.method} ${req.url} -> ${appRes.statusCode} (${Date.now() - start}ms)`);
      });
    }
  );
  req.pipe(forwarded);
});
proxy.listen(4000);
```

Nothing about "logging" appears in `app.js` at all. If tomorrow you swap logging for metrics,
retries, or auth, only `sidecar.js` changes — and the same sidecar could front a completely
different app written in a different language, since it only speaks HTTP.

## Run it

```bash
# terminal 1
node app.js

# terminal 2
node sidecar.js

# terminal 3
node client.js
```

## What to observe

- `client.js` only ever hits port 4000 (the sidecar) — it has no idea `app.js` exists on 4001.
- Every request logged by the sidecar includes timing, without `app.js` doing anything.
- Stop `app.js` while `sidecar.js` keeps running, then call `client.js` again — the sidecar's
  forwarded request fails, which is exactly the new failure mode the note calls out ("what
  happens if the sidecar can't reach the thing it's proxying").

## Try this yourself

- Add a fake auth check in the sidecar (reject requests missing a header) — the app never
  needs to know auth exists.
- Add artificial latency or a simulated failure in `app.js`, then add retry logic to the
  sidecar instead of the app — retries are a classic sidecar responsibility.

## Real-world equivalent

Envoy proxy in an Istio service mesh, Linkerd's per-pod proxy, or a Fluent Bit sidecar
shipping logs — same shape as this demo, just handling mTLS/retries/observability instead of
a toy logger.
