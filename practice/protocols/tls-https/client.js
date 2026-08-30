const https = require("https");

// self-signed cert isn't in any trust chain, so verification would fail by default -
// rejectUnauthorized: false is ONLY acceptable for this kind of local learning demo,
// never for talking to a real server
const req = https.get(
  { host: "localhost", port: 3443, path: "/", rejectUnauthorized: false },
  (res) => {
    const socket = res.socket;
    console.log(`negotiated protocol: ${socket.getProtocol()}`);
    console.log(`negotiated cipher: ${socket.getCipher().name}`);
    console.log(`peer certificate subject:`, socket.getPeerCertificate().subject);

    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => console.log("body:", body.trim()));
  }
);

req.on("error", (err) => console.error("request failed:", err.message));
