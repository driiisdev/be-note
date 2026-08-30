const net = require("net");

const socket = net.createConnection({ host: "127.0.0.1", port: 7000 }, () => {
  console.log("connected");
  socket.write("hello\n");
  socket.write("this is a second message\n");
});

socket.on("data", (chunk) => {
  console.log(`[server said] ${chunk.toString().trim()}`);
});

setTimeout(() => socket.end(), 500);
