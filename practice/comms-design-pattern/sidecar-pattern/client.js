// Only ever talks to the sidecar's port (4000) — has no idea app.js (4001)
// exists at all. This is the point: the sidecar is the entrypoint.
const http = require("http");

http.get("http://localhost:4000/greet?name=Idris", (res) => {
  let raw = "";
  res.on("data", (c) => (raw += c));
  res.on("end", () => {
    console.log(`[client] response: ${raw}`);
  });
}).on("error", (err) => {
  console.error("[client] request failed — is sidecar.js running?", err.message);
});
