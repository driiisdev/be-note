const { fork } = require("child_process");
const path = require("path");

// same idea as worker-thread-offload.js, but with a separate PROCESS instead of a thread -
// contrast: communication here is ONLY via serialized IPC messages (child.send / process.send),
// there is no option to share memory directly the way worker_threads can with a
// SharedArrayBuffer - every message is copied/serialized across the process boundary
let ticks = 0;
setInterval(() => console.log(`heartbeat #${++ticks}`), 100);

setTimeout(() => {
  console.log("starting fibonacci(38) in a child process...");
  const start = Date.now();

  const child = fork(path.join(__dirname, "fib-child.js"));
  child.send(38);

  child.on("message", (result) => {
    console.log(`done: fib(38) = ${result} in ${Date.now() - start}ms`);
    console.log("notice: heartbeats kept ticking - same non-blocking benefit as the worker");
    console.log("thread version, but this result arrived via a SERIALIZED ipc message, not");
    console.log("shared memory - child and parent never touched the same bytes");
    child.kill();
    process.exit(0);
  });
}, 250);
