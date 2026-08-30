const http2 = require("http2");

// ONE long-lived http/2 session to the backend, opened once at startup and shared for the
// life of the proxy. Every incoming client stream gets re-multiplexed onto this SAME
// connection as a new stream - no pool needed, because http/2 already supports many
// concurrent streams per connection on both sides.
const backendSession = http2.connect("http://localhost:4102");
backendSession.on("error", (err) => console.error("[proxy-h2] backend session error:", err.message));

const server = http2.createServer();

server.on("stream", (clientStream, headers) => {
  const start = Date.now();
  console.log(
    `[proxy-h2] stream ${clientStream.id} ${headers[":path"]} — re-multiplexed onto the ` +
      `one shared backend connection`
  );

  const upstreamStream = backendSession.request({ ":path": headers[":path"] });

  upstreamStream.on("response", (upstreamHeaders) => {
    clientStream.respond({ ":status": upstreamHeaders[":status"] });
  });
  upstreamStream.pipe(clientStream);
  upstreamStream.on("end", () => {
    console.log(`[proxy-h2] stream ${clientStream.id} done in ${Date.now() - start}ms`);
  });
});

server.listen(4201, () =>
  console.log("h2-passthrough proxy listening on :4201 (1 shared connection, upstream is http/2 backend on :4102)")
);
