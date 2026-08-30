// Reverse proxy sitting in front of app.js. All cross-cutting logic (here:
// request logging + timing) lives here, so app.js never has to know about it.
const http = require("http");

const proxy = http.createServer((req, res) => {
  const start = Date.now();

  const forwarded = http.request(
    { host: "localhost", port: 4001, path: req.url, method: req.method, headers: req.headers },
    (appRes) => {
      res.writeHead(appRes.statusCode, appRes.headers);
      appRes.pipe(res);
      appRes.on("end", () => {
        const ms = Date.now() - start;
        console.log(`[sidecar] ${req.method} ${req.url} -> ${appRes.statusCode} (${ms}ms)`);
      });
    }
  );

  forwarded.on("error", (err) => {
    console.error(`[sidecar] failed to reach app.js: ${err.message}`);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "bad gateway", detail: "app unreachable" }));
  });

  req.pipe(forwarded);
});

proxy.listen(4000, () => console.log("[sidecar] listening on http://localhost:4000 (public entrypoint)"));
