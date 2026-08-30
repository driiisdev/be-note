const net = require("net");

const socket = net.createConnection({ host: "127.0.0.1", port: 4000 }, () => {
  // by the time this callback fires, the TCP 3-way handshake has already completed
  console.log(
    `connected. local ${socket.localAddress}:${socket.localPort} -> ` +
      `remote ${socket.remoteAddress}:${socket.remotePort} (family ${socket.remoteFamily})`
  );

  send("PING");
  send("TIME");
  send("WHOAMI");
  send("hello from the client");
});

let buffer = "";
socket.on("data", (chunk) => {
  buffer += chunk.toString("utf8");
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);
    console.log(`[server said] ${line}`);
  }
});

socket.on("close", () => console.log("connection closed"));

function send(message) {
  console.log(`[send] ${message}`);
  socket.write(message + "\n"); // the "\n" is our protocol's framing rule
}

// give the server a moment to answer everything, then close
setTimeout(() => socket.end(), 500);
