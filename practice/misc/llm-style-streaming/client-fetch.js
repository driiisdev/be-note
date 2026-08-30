// this is exactly the "not the literal EventSource api" case the concept note describes:
// EventSource can't do POST, so this hand-rolls SSE parsing over fetch() + a ReadableStream
// reader instead - the same technique a real browser-based llm chat client would use. Node
// 18+ has global fetch() built in, no imports needed.

async function main() {
  const start = Date.now();
  const response = await fetch("http://localhost:8100/chat", { method: "POST" });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // sse frames are separated by a blank line ("\n\n") - same framing idea as every other
    // "how do you know where one message ends" problem covered elsewhere in this repo
    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const payload = frame.replace(/^data: /, "");
      if (payload === "[DONE]") {
        console.log(`\n\n(stream finished after ${Date.now() - start}ms)`);
        return;
      }
      fullText += payload + " ";
      process.stdout.write(payload + " "); // print each word as it arrives, no buffering
    }
  }
}

main();
