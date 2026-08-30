// Polls /order-status every second, no matter what. Count how many "processing"
// replies are wasted round trips before the one that actually matters.
const http = require("http");

let pollCount = 0;

function poll() {
  pollCount++;
  http.get("http://localhost:3001/order-status", (res) => {
    let raw = "";
    res.on("data", (c) => (raw += c));
    res.on("end", () => {
      const { status } = JSON.parse(raw);
      console.log(`[client] poll #${pollCount} -> ${status}`);
      if (status === "shipped") {
        console.log(`[client] learned it shipped after ${pollCount} polls, stopping.`);
      } else {
        setTimeout(poll, 1000);
      }
    });
  }).on("error", (err) => {
    console.error("[client] request failed — is server.js running?", err.message);
  });
}

poll();
