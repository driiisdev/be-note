// Connects, sends one PUBLISH command with the topic and message given on
// the command line, then exits. The publisher never talks to subscribers
// directly — only to the broker.
const net = require("net");

const [topic, ...messageParts] = process.argv.slice(2);
if (!topic || messageParts.length === 0) {
  console.error('usage: node publisher.js <topic> "<message>"');
  process.exit(1);
}
const message = messageParts.join(" ");

const socket = net.connect(4000, "localhost", () => {
  socket.write(`PUBLISH ${topic} ${message}\n`);
  console.log(`[publisher] published to "${topic}": ${message}`);
  socket.end();
});

socket.on("error", (err) => console.error("[publisher] connection failed — is broker.js running?", err.message));
