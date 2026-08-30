const net = require("net");
const dns = require("dns");

// --- OSI layers this file touches ---
// Physical + Data link (layers 1-2): handled entirely by the OS/NIC, invisible here.
// Network   (layer 3, IP):           net.Socket exposes it via .remoteAddress/.remoteFamily.
// Transport (layer 4, TCP):          the `net` module IS the TCP layer - handshake, ordering,
//                                     and reliability all happen before "connection" even fires.
// Application (layer 7):             everything below this comment - OUR custom protocol.

// --- our tiny custom application-layer protocol ---
// Rule: every message is a single line of UTF-8 text, terminated by "\n".
// That newline IS the framing - it's how both sides agree where one message ends and the
// next begins. HTTP does the same job with Content-Length/chunked encoding; we do it with "\n".
//
// Commands understood: "PING", "TIME", "WHOAMI", anything else -> echoed back.

const PORT = 4000;

const server = net.createServer((socket) => {
  // layer 3 (IP) + layer 4 (TCP) info, already resolved for us by the time this fires
  console.log(
    `[connect] ${socket.remoteAddress} (family ${socket.remoteFamily}) port ${socket.remotePort}`
  );

  let buffer = "";

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");

    let newlineIndex;
    // a TCP "data" event can deliver a partial line, multiple lines, or a line split across
    // two events - the newline framing is what lets us pull out only COMPLETE messages
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line.length === 0) continue;

      handleMessage(socket, line);
    }
  });

  socket.on("close", () => {
    console.log(`[disconnect] ${socket.remoteAddress}:${socket.remotePort}`);
  });
});

function handleMessage(socket, line) {
  console.log(`[recv] ${line}`);
  const [command, ...rest] = line.split(" ");

  switch (command.toUpperCase()) {
    case "PING":
      socket.write("PONG\n");
      break;
    case "TIME":
      socket.write(`${new Date().toISOString()}\n`);
      break;
    case "WHOAMI":
      socket.write(`you are ${socket.remoteAddress}:${socket.remotePort}\n`);
      break;
    default:
      socket.write(`ECHO ${line}\n`);
  }
}

server.listen(PORT, () => {
  console.log(`networking-fundamentals server listening on :${PORT}`);

  // layer 3 in action: resolve a hostname to an ip before anyone connects
  dns.lookup("example.com", (err, address, family) => {
    if (err) return console.log("dns lookup failed:", err.message);
    console.log(`(dns) example.com resolves to ${address} (IPv${family})`);
  });
});
