# gRPC

An RPC (remote procedure call) framework, originally from Google, built on top of
[HTTP/2](<http-2.md>). Where REST is resource-oriented ("here's a URL, here's a JSON body"),
gRPC is action-oriented — you call a *method* with typed arguments and get a typed result back,
much closer to calling a function than crafting an HTTP request.

## Protocol Buffers (protobuf)

gRPC uses **protobuf** as both its interface definition language and its wire format. You
define a `.proto` file describing a service and its message types:

```protobuf
service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply);
}
message HelloRequest { string name = 1; }
message HelloReply   { string message = 1; }
```

Tooling then generates client and server stub code in whatever language you're using — the
contract is defined once and enforced by codegen, not by hoping both sides agree on a JSON
shape.

## Four call types

All made possible by HTTP/2's multiplexed streams underneath:

| Type | Shape |
|---|---|
| Unary | one request → one response (feels like a normal function call) |
| Server streaming | one request → a stream of responses |
| Client streaming | a stream of requests → one response |
| Bidirectional streaming | both sides stream independently |

## Why teams reach for it

- **Strongly typed, schema-first contracts** — a mismatch between client and server gets
  caught at codegen/compile time instead of surfacing as a runtime 500.
- **Performance** — binary protobuf encodes/decodes faster and smaller than JSON, and HTTP/2
  multiplexing avoids opening a pile of connections the way many REST clients do.

## Where it fits (and where it doesn't)

Best for **internal service-to-service communication**, where you control both ends of the
call and want speed and type safety. Weaker fit for **public browser-facing APIs** — browsers
can't easily do everything gRPC needs over HTTP/2 (trailers, in particular), so a
`grpc-web` proxy layer is needed to bridge the gap. REST/JSON remains the simpler default for
anything a browser calls directly.

🖼️ **Image needed:** REST (client → JSON over HTTP/1.1 → server) next to gRPC (client →
protobuf over HTTP/2 streams → server), captioned with the tradeoff each makes. Search: "rest
vs grpc comparison diagram".

## Practice project

[`practice/protocols/grpc-style-rpc`](../../practice/protocols/grpc-style-rpc) —
hand-rolls the *mechanics* of gRPC (unary + server-streaming calls over Node's built-in
`http2` module) using JSON instead of protobuf, to show what's underneath without needing
external codegen tooling. Explicitly not a protobuf replacement — see that project's README
for how it differs from the real thing.

## Related

- [HTTP/2](<http-2.md>) — the transport gRPC's multiplexed streaming depends on.
