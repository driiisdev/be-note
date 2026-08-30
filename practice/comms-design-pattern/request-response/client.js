// Sends one request, waits for the response, parses it. That's it — that's the pattern.
const http = require("http");

console.log("[client] sending request GET /time");

http.get("http://localhost:3000/time", (res) => {
  console.log(`[client] response headers received, status=${res.statusCode}`);

  let raw = "";
  res.on("data", (chunk) => (raw += chunk));
  res.on("end", () => {
    // --- parse ---
    const data = JSON.parse(raw);
    // --- consume ---
    console.log(`[client] parsed response, server time is ${data.serverTime}`);
  });
}).on("error", (err) => {
  console.error("[client] request failed — is server.js running?", err.message);
});
