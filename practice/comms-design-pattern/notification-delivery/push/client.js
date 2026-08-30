// Just connects and listens. No request is ever sent — everything it prints
// arrives because the server decided to write it, unprompted.
const net = require("net");

console.log("[client] connecting...");
const socket = net.connect(3006, "localhost", () => {
  console.log("[client] connected, waiting for server to push something...");
});

let buffer = "";
socket.on("data", (chunk) => {
  buffer += chunk.toString();
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);
    const { status } = JSON.parse(line);
    console.log(`[client] pushed status: ${status}`);
  }
});

socket.on("close", () => console.log("[client] connection closed"));
socket.on("error", (err) => console.error("[client] connection failed — is server.js running?", err.message));
