const net = require("net");

const socket = net.createConnection({ host: "127.0.0.1", port: 5000 }, () => {
  console.log("[tcp] connected, sending 5 messages back to back");
  // fired rapidly, with no gap - watch the responses still come back in order
  for (let i = 1; i <= 5; i++) {
    socket.write(`message ${i}\n`);
  }
});

socket.on("data", (chunk) => {
  console.log(`[tcp] server said: ${chunk.toString().trim()}`);
});

setTimeout(() => socket.end(), 500);
