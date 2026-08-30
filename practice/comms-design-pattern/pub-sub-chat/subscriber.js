// Connects to the broker, subscribes to a topic given on the command line,
// and just prints whatever the broker forwards. No publishing logic at all —
// a subscriber has no idea who is publishing.
const net = require("net");

const topic = process.argv[2];
if (!topic) {
  console.error("usage: node subscriber.js <topic>");
  process.exit(1);
}

const socket = net.connect(4000, "localhost", () => {
  socket.write(`SUBSCRIBE ${topic}\n`);
  console.log(`[subscriber] subscribed to "${topic}", waiting for messages...`);
});

let buffer = "";
socket.on("data", (chunk) => {
  buffer += chunk.toString();
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);
    if (line.startsWith("MSG ")) {
      const [, msgTopic, ...rest] = line.split(" ");
      console.log(`[subscriber] (${msgTopic}) ${rest.join(" ")}`);
    }
  }
});

socket.on("close", () => console.log("[subscriber] disconnected from broker"));
socket.on("error", (err) => console.error("[subscriber] connection failed — is broker.js running?", err.message));
