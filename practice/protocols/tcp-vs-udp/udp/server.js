const dgram = require("dgram");

const server = dgram.createSocket("udp4");

server.on("message", (msg, rinfo) => {
  console.log(`[udp] received from ${rinfo.address}:${rinfo.port}: ${msg.toString()}`);
  // no connection to "reply on" - just send a datagram straight back to where it came from
  server.send(`echo: ${msg}`, rinfo.port, rinfo.address);
});

server.bind(5001, () => console.log("udp echo server listening on :5001"));
