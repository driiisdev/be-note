const http = require("http");
const fs = require("fs");
const path = require("path");

// a mock "chat completion" endpoint - streams a canned response one word at a time with a
// per-word delay, standing in for token-by-token llm generation. POST (not GET) on purpose:
// a real chat completion call sends the prompt in a body, which is exactly why EventSource
// (GET-only) can't be used directly for this - see README and the concept note.
const RESPONSE = "Server-sent events let a backend stream a response as it is generated, instead of making the client wait for the entire thing to finish before seeing anything at all.".split(" ");
const MS_PER_WORD = 120; // exaggerated on purpose so the streaming effect is obviously visible

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(fs.readFileSync(path.join(__dirname, "index.html")));
    return;
  }

  if (req.method !== "POST" || req.url !== "/chat") {
    res.writeHead(404).end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  console.log(`[server] streaming ${RESPONSE.length} words, ${MS_PER_WORD}ms apart`);

  let i = 0;
  const interval = setInterval(() => {
    if (i >= RESPONSE.length) {
      clearInterval(interval);
      res.write(`data: [DONE]\n\n`);
      res.end();
      console.log("[server] stream complete");
      return;
    }
    // sse wire format: "data: <payload>\n\n" - same framing whether consumed via EventSource
    // or hand-rolled, per the concept note
    res.write(`data: ${RESPONSE[i]}\n\n`);
    i++;
  }, MS_PER_WORD);

  req.on("close", () => clearInterval(interval)); // client disconnected mid-stream - stop generating
});

server.listen(8100, () => console.log("llm-style streaming server listening on :8100"));
