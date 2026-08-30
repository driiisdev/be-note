const { Worker } = require("worker_threads");

// same heartbeat as blocking-main-thread.js - the difference this file demonstrates is
// whether it keeps ticking while the fibonacci computation runs
let ticks = 0;
setInterval(() => console.log(`heartbeat #${++ticks}`), 100);

setTimeout(() => {
  console.log("starting fibonacci(38) on a worker thread...");
  const start = Date.now();

  const worker = new Worker(`
    const { parentPort, workerData } = require("worker_threads");
    function fibonacci(n) { return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2); }
    parentPort.postMessage(fibonacci(workerData));
  `, { eval: true, workerData: 38 });

  worker.on("message", (result) => {
    console.log(`done: fib(38) = ${result} in ${Date.now() - start}ms`);
    console.log("notice: heartbeats kept ticking throughout - the main thread's event loop");
    console.log("stayed free because the computation ran on a SEPARATE OS thread");
    process.exit(0);
  });
}, 250);
