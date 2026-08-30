const net = require("net");

// demonstrates the ACTUAL fix from postgres-failure-caused-by-tcp-issue-cisco-router.md:
// configuring tcp keepalive so an idle connection periodically "touches" itself, both
// preventing silent eviction by an intermediate device AND surfacing a genuinely dead
// connection quickly instead of only discovering it during a real query. This demo can't
// reproduce a router silently dropping a connection (needs real network hardware) - it proves
// the API is being used correctly and explains what it does on a real network.

const server = net.createServer((socket) => {
  console.log("[server] client connected");
  socket.on("data", (chunk) => console.log(`[server] received: ${chunk}`));
  socket.on("close", () => console.log("[server] client disconnected"));
});

server.listen(7902, () => {
  console.log("keepalive demo server listening on :7902\n");

  const socket = net.createConnection({ host: "localhost", port: 7902 }, () => {
    // enable tcp keepalive, with probes starting after 5 seconds of idle time (real defaults
    // are usually much longer, e.g. postgres's tcp_keepalives_idle defaults to 2 hours - set
    // low here just so this demo doesn't need to sit idle for hours to show something)
    socket.setKeepAlive(true, 5000);
    console.log("[client] connected, TCP keepalive enabled (probes after 5s idle)");
    console.log("[client] this socket option is what postgres/pgbouncer configure to avoid");
    console.log("[client] silent connection death at an intermediate router/firewall/nat\n");

    console.log("[client] sitting idle now - in a real deployment, this is exactly when a");
    console.log("[client] keepalive probe would fire if this were actually idle long enough\n");

    setTimeout(() => {
      socket.end();
      server.close();
    }, 1000);
  });
});
