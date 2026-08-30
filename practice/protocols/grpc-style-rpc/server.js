const http2 = require("http2");

// This is NOT real gRPC. Real gRPC uses Protocol Buffers (a schema + binary wire format) and
// the @grpc/grpc-js library with codegen from a .proto file. This demo hand-rolls the
// MECHANICS gRPC relies on — method-style routing and streaming over multiplexed http/2
// streams — using plain JSON instead, so the "why http/2" part is visible without needing
// external tooling. See this project's README for exactly what's simplified.

const methods = {
  // unary: one request in, one response out - the simplest rpc shape
  "/rpc/Greeter/SayHello": (request, stream) => {
    const { name } = request;
    stream.respond({ ":status": 200, "content-type": "application/json" });
    stream.end(JSON.stringify({ message: `Hello, ${name}!` }));
  },

  // server streaming: one request in, MULTIPLE responses out over time, one stream
  "/rpc/Greeter/CountTo": (request, stream) => {
    const { max } = request;
    stream.respond({ ":status": 200, "content-type": "application/x-ndjson" });

    let i = 1;
    const interval = setInterval(() => {
      if (i > max) {
        clearInterval(interval);
        stream.end();
        return;
      }
      // newline-delimited JSON: our framing rule for "one stream, many messages" over
      // the same http/2 stream, same idea as the newline-framed protocol in the
      // networking-fundamentals practice project
      stream.write(JSON.stringify({ count: i }) + "\n");
      i++;
    }, 300);
  },
};

const server = http2.createServer();

server.on("stream", (stream, headers) => {
  const path = headers[":path"];
  const method = headers[":method"];
  console.log(`[rpc] ${method} ${path} (stream id: ${stream.id})`);

  const handler = methods[path];
  if (!handler) {
    stream.respond({ ":status": 404 });
    stream.end(JSON.stringify({ error: `unknown method ${path}` }));
    return;
  }

  let body = "";
  stream.on("data", (chunk) => (body += chunk));
  stream.on("end", () => {
    const request = body ? JSON.parse(body) : {};
    handler(request, stream);
  });
});

server.listen(3500, () => console.log("grpc-style rpc server (h2c) listening on :3500"));
