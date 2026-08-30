const http = require("http");
const crypto = require("crypto");

function post(path, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: "localhost", port: 7800, path, method: "POST", headers },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve(JSON.parse(body)));
      }
    );
    req.end();
  });
}

async function main() {
  console.log("--- naive endpoint: simulating a client retrying the SAME logical charge ---");
  console.log(await post("/charge/naive"));
  console.log("(network blip - client never saw the response, so it retries...)");
  console.log(await post("/charge/naive"));
  console.log("^ notice totalCharged went up TWICE - the retry became a duplicate charge\n");

  console.log("--- safe endpoint: same retry scenario, but WITH an idempotency key ---");
  const idempotencyKey = crypto.randomUUID(); // client generates this ONCE per logical operation
  console.log(await post("/charge/safe", { "Idempotency-Key": idempotencyKey }));
  console.log("(network blip - client never saw the response, so it retries with the SAME key...)");
  console.log(await post("/charge/safe", { "Idempotency-Key": idempotencyKey }));
  console.log("^ notice totalCharged only went up ONCE - the retry was recognized and deduped");
}

main();
