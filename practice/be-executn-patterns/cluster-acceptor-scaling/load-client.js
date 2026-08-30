const http = require("http");

// fires 30 CONCURRENT requests (not sequential - sequential requests give a misleadingly
// skewed result on some platforms) and tallies which worker pid handled each one
const REQUEST_COUNT = 30;

async function main() {
  const requests = Array.from({ length: REQUEST_COUNT }, () => new Promise((resolve) => {
    http.get({ host: "localhost", port: 7600, agent: false }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve(body));
    });
  }));

  const pids = await Promise.all(requests);
  const counts = {};
  for (const pid of pids) counts[pid] = (counts[pid] || 0) + 1;

  console.log(`\ndistribution across ${REQUEST_COUNT} concurrent requests:`);
  for (const [pid, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  worker ${pid}: ${count} requests`);
  }
}

main();
