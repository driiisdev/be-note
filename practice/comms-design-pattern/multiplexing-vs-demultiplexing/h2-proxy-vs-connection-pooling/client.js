const http2 = require("http2");

// usage: node client.js <proxy-port> <concurrency>
//   node client.js 4200 8   -> hits the connection-pool proxy
//   node client.js 4201 8   -> hits the h2-passthrough proxy
const port = process.argv[2] || 4200;
const concurrency = Number(process.argv[3]) || 8;

const client = http2.connect(`http://localhost:${port}`);

function request(i) {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = client.request({ ":path": `/item/${i}` });
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve({ i, ms: Date.now() - start, body: body.trim() }));
    req.end();
  });
}

async function main() {
  console.log(`firing ${concurrency} concurrent requests at proxy on :${port} (one h2 client connection)`);
  const start = Date.now();
  const results = await Promise.all(Array.from({ length: concurrency }, (_, i) => request(i)));
  for (const r of results.sort((a, b) => a.i - b.i)) {
    console.log(`  #${r.i}: ${r.ms}ms — ${r.body}`);
  }
  console.log(`all ${concurrency} requests done in ${Date.now() - start}ms total`);
  client.close();
}

main();
