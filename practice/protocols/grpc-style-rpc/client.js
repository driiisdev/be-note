const http2 = require("http2");

const client = http2.connect("http://localhost:3500");

function unaryCall(path, request) {
  return new Promise((resolve) => {
    const stream = client.request({ ":path": path, ":method": "POST" });
    stream.end(JSON.stringify(request));

    let body = "";
    stream.on("data", (chunk) => (body += chunk));
    stream.on("end", () => resolve(JSON.parse(body)));
  });
}

function serverStreamingCall(path, request, onMessage) {
  return new Promise((resolve) => {
    const stream = client.request({ ":path": path, ":method": "POST" });
    stream.end(JSON.stringify(request));

    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line) onMessage(JSON.parse(line));
      }
    });
    stream.on("end", resolve);
  });
}

async function main() {
  console.log("--- unary call: SayHello ---");
  const reply = await unaryCall("/rpc/Greeter/SayHello", { name: "Idris" });
  console.log("reply:", reply);

  console.log("--- server streaming call: CountTo ---");
  await serverStreamingCall("/rpc/Greeter/CountTo", { max: 5 }, (msg) => {
    console.log("stream message:", msg);
  });

  console.log("done");
  client.close();
}

main();
