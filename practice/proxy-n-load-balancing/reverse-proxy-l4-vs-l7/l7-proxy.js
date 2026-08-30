const http = require("http");

// an L7 (application-layer) reverse proxy: fully parses each incoming HTTP request and picks
// a backend based on the URL PATH - something an L4 proxy structurally cannot do, since it
// never looks past the ip:port level. this is genuinely TWO separate tcp connections per
// request: client <-> this proxy, and this proxy <-> whichever backend it picked.
const ROUTES = [
  { prefix: "/a", target: { host: "localhost", port: 8001 } },
  { prefix: "/b", target: { host: "localhost", port: 8002 } },
];

const server = http.createServer((clientReq, clientRes) => {
  const route = ROUTES.find((r) => clientReq.url.startsWith(r.prefix));

  if (!route) {
    clientRes.writeHead(404, { "Content-Type": "application/json" });
    clientRes.end(JSON.stringify({ error: `no route matches ${clientReq.url}` }));
    return;
  }

  console.log(`[l7-proxy] ${clientReq.url} -> routing to backend on :${route.target.port} (path-based)`);

  // a brand new, separate connection to the chosen backend - NOT the same connection the
  // client used to reach this proxy
  const proxyReq = http.request(
    { host: route.target.host, port: route.target.port, path: clientReq.url, method: clientReq.method, headers: clientReq.headers },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes);
    }
  );

  clientReq.pipe(proxyReq);
});

server.listen(8000, () => console.log("L7 proxy listening on :8000 (routes /a* and /b* to different backends)"));
