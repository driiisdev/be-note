const dgram = require("dgram");

const client = dgram.createSocket("udp4");

console.log("[udp] sending 5 datagrams back to back (no connection, no handshake)");
// no handshake, no "connected" callback needed - just fire datagrams
for (let i = 1; i <= 5; i++) {
  client.send(`message ${i}`, 5001, "127.0.0.1");
}

client.on("message", (msg) => {
  console.log(`[udp] server said: ${msg.toString()}`);
});

// with no retry/ack, there is no built-in way to know if a datagram was ever received -
// this timeout is the only thing closing the socket, not a confirmation
setTimeout(() => client.close(), 500);
