// Raw TCP server (net, not http) — stands in for what a WebSocket does at a
// lower level. Clients connect once; the server pushes the status change to
// every connected client the instant it happens, with zero request involved.
const net = require("net");

let orderStatus = "processing";
let clients = [];

const delayMs = 3000 + Math.random() * 3000; // 3-6s
setTimeout(() => {
  orderStatus = "shipped";
  const message = JSON.stringify({ status: orderStatus }) + "\n";
  console.log(`\n[server] order shipped! pushing to ${clients.length} connected client(s)`);
  for (const socket of clients) socket.write(message);
}, delayMs);

console.log(`[server] order will ship in ~${Math.round(delayMs / 1000)}s`);

const server = net.createServer((socket) => {
  console.log("[server] client connected");
  clients.push(socket);
  socket.write(JSON.stringify({ status: orderStatus }) + "\n");

  socket.on("close", () => {
    clients = clients.filter((s) => s !== socket);
    console.log("[server] client disconnected");
  });
  socket.on("error", () => {}); // ignore reset errors from abrupt client exits
});

server.listen(3006, () => console.log("[server] listening on tcp://localhost:3006"));
