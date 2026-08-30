// Exercises both servers a few times, then tells you to manually restart the
// stateful server, so you can rerun this script and watch its in-memory state
// vanish — versus the stateless server, which never depended on it anyway.
const http = require("http");

function post(port, path_, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { host: "localhost", port, path: path_, method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve(JSON.parse(raw)));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  let statelessCount = 0;
  console.log("--- stateless: client tracks and resends the count itself ---");
  for (let i = 0; i < 3; i++) {
    const res = await post(4100, "/increment", { count: statelessCount });
    statelessCount = res.count;
    console.log(`[client] stateless count is now ${statelessCount}`);
  }

  console.log("\n--- stateful: client only ever sends a session id ---");
  for (let i = 0; i < 3; i++) {
    const res = await post(4101, "/increment", { sessionId: "user-42" });
    console.log(`[client] stateful count is now ${res.count}`);
  }

  console.log("\n--- now go restart stateful-server.js (Ctrl+C it, then `node stateful-server.js` again) ---");
  console.log("[client] then rerun `node client.js` — count for session 'user-42' will start back at 1,");
  console.log("[client] because that in-memory sessions map only lived inside the process you just killed.");
  console.log("[client] the stateless server, by contrast, was never affected by any of this.");
}

main();
