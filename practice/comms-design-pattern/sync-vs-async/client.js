// Fires N concurrent requests at either /sync-task or /async-task and times
// the whole batch, to make the blocking-vs-nonblocking difference visible.
const http = require("http");

const [, , mode, countArg] = process.argv;
const path = mode === "sync" ? "/sync-task" : "/async-task";
const count = parseInt(countArg, 10) || 5;

console.log(`[client] firing ${count} concurrent requests at ${path}`);
const batchStart = Date.now();

let completed = 0;
for (let i = 1; i <= count; i++) {
  const requestStart = Date.now();
  http.get(`http://localhost:4200${path}`, (res) => {
    res.on("data", () => {});
    res.on("end", () => {
      completed++;
      console.log(`[client] request #${i} finished after ${Date.now() - requestStart}ms`);
      if (completed === count) {
        console.log(`\n[client] all ${count} requests done, total elapsed ${Date.now() - batchStart}ms`);
      }
    });
  }).on("error", (err) => {
    console.error("[client] request failed — is server.js running?", err.message);
  });
}
