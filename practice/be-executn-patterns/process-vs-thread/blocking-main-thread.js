const { fibonacci } = require("./cpu-work");

// a heartbeat that should tick every 100ms if the main thread is actually free -
// this is what pattern A's bottleneck looks like: one thread, nothing else can run
// while it's busy
let ticks = 0;
setInterval(() => console.log(`heartbeat #${++ticks}`), 100);

setTimeout(() => {
  console.log("starting fibonacci(38) directly on the main thread...");
  const start = Date.now();
  const result = fibonacci(38);
  console.log(`done: fib(38) = ${result} in ${Date.now() - start}ms`);
  console.log("notice: NO heartbeats printed while this was running - the single JS thread");
  console.log("was genuinely blocked the whole time, exactly like pattern A's bottleneck");
  setTimeout(() => process.exit(0), 300);
}, 250);
