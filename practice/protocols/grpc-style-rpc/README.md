# Practice: gRPC-style RPC

Concept note: [`grpc.md`](<../../../concepts/protocols/grpc.md>)

## What this demonstrates — and explicitly does not

This is **not** real gRPC. Real gRPC needs a `.proto` schema, code generation, and the
`@grpc/grpc-js` library, all of which are outside this repo's "Node core modules only" rule.
What this project *does* show, honestly and without pretending otherwise, is the mechanics
gRPC is built on: **method-style routing** and **streaming**, both riding on
[HTTP/2](<../../../concepts/protocols/http-2.md>)'s multiplexed streams, using plain
JSON in place of protobuf.

If you need the real thing for an actual project, reach for `@grpc/grpc-js` + `protoc` — this
project is purely for building intuition about what's underneath.

## Scenario

A `Greeter` service with two "methods," called the way gRPC methods are named
(`/ServiceName/MethodName`):

- `SayHello` — **unary**: one JSON request in, one JSON response out.
- `CountTo` — **server streaming**: one JSON request in, a sequence of JSON messages streamed
  back over time on the same HTTP/2 stream.

## Folder structure

```
grpc-style-rpc/
  server.js   <- http2 server, path-based method dispatch, unary + streaming handlers
  client.js   <- http2 client calling both methods
```

## Code walkthrough

**Method dispatch by path** stands in for what a `.proto`-generated router would normally do
for you:

```js
const methods = {
  "/rpc/Greeter/SayHello": (request, stream) => { ... },
  "/rpc/Greeter/CountTo": (request, stream) => { ... },
};
```

**Server streaming** writes multiple messages to the *same* HTTP/2 stream over time, instead of
one response and done — the newline is our framing rule for "where does one message end,"
same idea as [the networking-fundamentals project](<../networking-fundamentals>)'s `\n`-framed
protocol, just applied to JSON over HTTP/2 instead of raw TCP:

```js
stream.write(JSON.stringify({ count: i }) + "\n");
```

The client reads that the same way it reads any framed stream — buffer chunks, split on `\n`,
parse each complete line as it arrives.

## Run it

```bash
node server.js        # terminal 1
node client.js          # terminal 2
```

Expect the unary call to resolve immediately with `{ message: "Hello, Idris!" }`, then the
streaming call to print `{ count: 1 }` through `{ count: 5 }` roughly 300ms apart each, all
on one connection.

## Try this yourself

- Fire both calls concurrently (`Promise.all` in `main()` instead of sequential `await`s) and
  watch the server log both stream IDs interleaving — this is the same multiplexing behavior
  as [the http-evolution project](<../http-evolution>), just applied to RPC calls instead of
  plain GET requests.
- Add a `client-streaming`-style method where the *client* sends multiple JSON lines before the
  server responds once — you'll notice it requires the same buffering/splitting logic already
  written on the server side for parsing request bodies.
- Compare this project's file size and required setup against what a real gRPC service needs
  (a `.proto` file, `protoc` codegen step, and the `@grpc/grpc-js` dependency) — that gap *is*
  the tradeoff [the concept note](<../../../concepts/protocols/grpc.md>) describes
  gRPC making: more tooling investment, in exchange for a strongly typed, codegen-enforced
  contract instead of a hand-maintained JSON shape like this one.

## Real-world equivalent

Internal microservice-to-microservice calls at companies using gRPC look exactly like this at
the transport level — multiplexed HTTP/2 streams, method-style routing — just with protobuf's
binary encoding and generated stubs instead of JSON and a hand-written `methods` object.
