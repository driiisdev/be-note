# How ChatGPT (and Similar LLM Chat UIs) Use Server-Sent Events

A concrete, familiar real-world application of a pattern this repo already covers in the
abstract: [Server-sent events](<../comms design pattern/server-sent-events.md>), used to solve
one of the most visible UX problems in LLM products — the wait.

## The problem: generation is slow, but it doesn't have to feel slow

A language model generates its response **token by token** (or in small chunks), and full
generation of a long answer can take many seconds. If the server buffered the *entire* response
before sending anything, the user would stare at a blank screen for the whole generation time —
technically correct, but it feels broken.

## The fix: stream as you generate

Instead of waiting for the full response, the server streams each token or chunk to the client
the moment it's produced. This is exactly
[the SSE pattern already covered in this repo](<../comms design pattern/server-sent-events.md>),
applied specifically to LLM output.

## Why SSE (or SSE-flavored streaming) is a good fit here

- **One-directional is all that's needed.** Once the prompt has been sent, the client doesn't
  need to send anything back mid-stream — a plain server-to-client stream is sufficient, no
  bidirectional channel required.
- **Built on plain HTTP** — chunked transfer encoding, `text/event-stream` — no protocol
  upgrade needed. This sails through ordinary HTTP infrastructure far more easily than
  WebSockets would; see
  [WebSocket proxying](<../proxy n load balancing/websocket-proxying.md>) for how much more a
  proxy has to do to support a WebSocket connection compared to a plain streamed HTTP response.
- **Improves *perceived* latency dramatically**, even though total generation time is
  unchanged — the user sees output start appearing almost immediately (time-to-first-token),
  rather than waiting for time-to-last-token before seeing anything at all.

## The nuance: often not the literal `EventSource` API

The browser's native `EventSource` object only supports `GET` requests — but a chat completion
call needs to send the prompt (and conversation history) in a request **body**, which means it
has to be a `POST`. Since `EventSource` can't do that, many LLM streaming clients hand-roll the
SSE **wire format** — the same `data: ...\n\n` framing — over `fetch()` combined with a
`ReadableStream` reader, parsing the stream manually instead of using `new EventSource(url)`.
The wire protocol is the same idea either way; only the client-side consumption mechanism
differs.

🖼️ **Image needed:** a chat UI with tokens appearing one at a time in a speech bubble, with an
arrow back to a server icon labeled "each token sent as soon as it's generated." Search: "llm
token streaming server sent events diagram".

## Practice project

[`practice/misc/llm-style-streaming`](../../practice/misc/llm-style-streaming) — a mock chat
completion endpoint that streams a canned response word by word with realistic per-token delay,
consumed both the SSE way and via a hand-rolled `fetch()`+`ReadableStream` client.

## Related

- [Server-sent events](<../comms design pattern/server-sent-events.md>) — the general pattern
  this note is a concrete application of.
- [Request-response](<../comms design pattern/request-response.md>) — the baseline pattern SSE
  streaming departs from (one request, *many* pieces of response over time, instead of one).
