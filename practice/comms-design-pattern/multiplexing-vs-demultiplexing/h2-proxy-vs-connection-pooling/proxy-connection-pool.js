const http2 = require("http2");
const http = require("http");

// The client-facing side is still http/2, so many client requests demultiplex out of ONE
// client connection - same as every other proxy in this demo. What differs is upstream:
// backend-http1.js only speaks http/1.1, so the only way to get concurrency there is a POOL
// of keep-alive connections. maxSockets caps how many requests can be in flight to the
// backend AT ONCE - anything beyond that queues inside the Node http.Agent automatically.
const POOL_SIZE = 4;
const pool = new http.Agent({ keepAlive: true, maxSockets: POOL_SIZE });

const server = http2.createServer();

server.on("stream", (clientStream, headers) => {
  const start = Date.now();
  const inUse = countInUse(pool);
  console.log(
    `[proxy-pool] stream ${clientStream.id} ${headers[":path"]} — pool in use: ${inUse}/${POOL_SIZE}` +
      (inUse >= POOL_SIZE ? " (queuing for a free connection)" : "")
  );

  const upstreamReq = http.request(
    { host: "localhost", port: 4101, path: headers[":path"], agent: pool },
    (upstreamRes) => {
      clientStream.respond({ ":status": upstreamRes.statusCode });
      upstreamRes.pipe(clientStream);
      upstreamRes.on("end", () => {
        console.log(`[proxy-pool] stream ${clientStream.id} done in ${Date.now() - start}ms`);
      });
    }
  );
  upstreamReq.end();
});

// http.Agent doesn't expose a simple "active count" API, so this pulls it out of its
// internal .sockets map - fine for a learning demo, not something to rely on in production
function countInUse(agent) {
  return Object.values(agent.sockets).reduce((sum, arr) => sum + arr.length, 0);
}

server.listen(4200, () =>
  console.log(`connection-pool proxy listening on :4200 (pool size ${POOL_SIZE}, upstream is http/1.1 backend on :4101)`)
);
