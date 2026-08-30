// Node has no built-in EventSource, so this hand-parses the text/event-stream
// format: buffer bytes, split on blank lines, strip the "data: " prefix.
// A browser would just do: new EventSource("http://localhost:3005/events").
const http = require("http");

console.log("[client] connecting to event stream...");

http.get("http://localhost:3005/events", (res) => {
  console.log(`[client] connected, status=${res.statusCode} (one connection, stays open)`);

  let buffer = "";
  res.on("data", (chunk) => {
    buffer += chunk.toString();
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = rawEvent.split("\n").find((l) => l.startsWith("data: "));
      if (line) {
        const data = JSON.parse(line.slice("data: ".length));
        console.log(`[client] received status: ${data.status}`);
      }
    }
  });

  res.on("end", () => console.log("[client] stream ended (server closed it)"));
}).on("error", (err) => {
  console.error("[client] connection failed — is server.js running?", err.message);
});
