// Minimal pub/sub broker: tracks topic -> set of subscribed sockets, and fans
// out PUBLISH messages only to sockets subscribed to that exact topic.
const net = require("net");

const subscribers = new Map(); // topic -> Set<socket>

function subscribe(socket, topic) {
  if (!subscribers.has(topic)) subscribers.set(topic, new Set());
  subscribers.get(topic).add(socket);
  console.log(`[broker] socket subscribed to "${topic}" (${subscribers.get(topic).size} total)`);
}

function unsubscribeAll(socket) {
  for (const [topic, sockets] of subscribers) {
    if (sockets.delete(socket)) {
      console.log(`[broker] socket removed from "${topic}"`);
    }
  }
}

function publish(topic, message) {
  const sockets = subscribers.get(topic) || new Set();
  console.log(`[broker] publishing to "${topic}" -> ${sockets.size} subscriber(s): ${message}`);
  for (const socket of sockets) socket.write(`MSG ${topic} ${message}\n`);
}

const server = net.createServer((socket) => {
  let buffer = "";
  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;

      const [command, topic, ...rest] = line.split(" ");
      if (command === "SUBSCRIBE") {
        subscribe(socket, topic);
      } else if (command === "PUBLISH") {
        publish(topic, rest.join(" "));
      }
    }
  });

  socket.on("close", () => unsubscribeAll(socket));
  socket.on("error", () => {}); // ignore reset errors from abrupt client exits
});

server.listen(4000, () => console.log("[broker] listening on tcp://localhost:4000"));
