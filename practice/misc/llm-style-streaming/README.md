# Practice: LLM-Style Token Streaming

Concept note: [`how-chatgpt-uses-server-sent-events.md`](<../../../concepts/misc/how-chatgpt-uses-server-sent-events.md>)

## What this demonstrates

A mock chat-completion endpoint that streams a canned response one word at a time, consumed
two ways: a Node script and a real browser page — both using the exact technique the concept
note describes: **hand-rolled SSE parsing over `fetch()`**, not the native `EventSource` API,
because the request has to be a `POST`.

## Scenario

`POST /chat` streams a fixed sentence back one word every 120ms (exaggerated on purpose so the
streaming effect is obvious), using the same `text/event-stream` wire format SSE always uses —
`data: <payload>\n\n` — regardless of how the client happens to consume it.

## Folder structure

```
llm-style-streaming/
  server.js          <- streams a canned response word-by-word, also serves index.html at /
  client-fetch.js       <- Node script consuming the stream via fetch() + ReadableStream
  index.html               <- same technique, in a real browser page
```

## Why `EventSource` doesn't work here

The browser's native `EventSource` object only issues `GET` requests. A real chat completion
call needs to send the prompt (and conversation history) in a request **body** — which means it
has to be a `POST`, which `EventSource` simply cannot do. So both clients here parse the SSE
wire format manually instead:

```js
const response = await fetch("http://localhost:8100/chat", { method: "POST" });
const reader = response.body.getReader();
// ...manually split on "\n\n", strip the "data: " prefix, per SSE frame...
```

## Run it

```bash
node server.js
```

Then either:

```bash
node client-fetch.js          # words print to the terminal as they arrive
```

or open `http://localhost:8100/` in a browser and click "Send prompt" — watch the words appear
one at a time instead of all at once.

## What you'll see

```
$ node client-fetch.js
Server-sent events let a backend stream a response as it is generated, instead of
making the client wait for the entire thing to finish before seeing anything at all.

(stream finished after 3857ms)
```

Each word prints to the terminal the instant its SSE frame arrives — not buffered and dumped
all at once at the end. In the browser version, the same effect is directly visible: text
appearing progressively, exactly like a real LLM chat UI.

## Code walkthrough

The server never buffers the whole response — each word becomes its own SSE frame the moment
it's "generated" (here, the moment its timer fires):

```js
const interval = setInterval(() => {
  res.write(`data: ${RESPONSE[i]}\n\n`);   // sent immediately, not accumulated
  i++;
}, MS_PER_WORD);
```

The client reassembles frames using the same "where does one message end" framing logic
this repo's other streaming demos use — SSE frames are separated by a blank line:

```js
let boundary;
while ((boundary = buffer.indexOf("\n\n")) !== -1) {
  const frame = buffer.slice(0, boundary);
  buffer = buffer.slice(boundary + 2);
  // ...handle one complete frame...
}
```

## Try this yourself

- Change `MS_PER_WORD` to `0` and rerun — the response arrives essentially all at once,
  reproducing what a *non-streaming* chat completion API feels like, for direct comparison.
- Close the browser tab (or `Ctrl+C` the Node client) mid-stream and watch the server's log —
  the `req.on("close", ...)` handler stops the `setInterval`, meaning the server stops
  "generating" the instant nobody's listening anymore, instead of wastefully continuing.
- Add a second, concurrent client connecting mid-stream and confirm it gets its **own**
  independent word-by-word stream, starting from the beginning — proof each request gets its
  own generation, not a shared broadcast.

## Real-world equivalent

This is structurally identical to how ChatGPT, Claude, and most LLM chat products stream
responses — a `POST` request whose response body is an SSE (or SSE-flavored) stream, consumed
client-side via `fetch()` and a `ReadableStream` reader instead of `EventSource`, for exactly
the reason demonstrated here.
