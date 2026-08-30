const { parentPort, threadId } = require("worker_threads");

// deliberately CPU-bound "processing" step, scaled by message length, so several messages
// genuinely take noticeable, comparable time - stands in for real business logic
function process_(payload) {
  const n = payload.length * 15000;
  let primeCount = 0;
  for (let i = 2; i < n; i++) {
    let isPrime = true;
    for (let j = 2; j * j <= i; j++) {
      if (i % j === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primeCount++;
  }
  return `${payload.toUpperCase()} (worker ${threadId} found ${primeCount} primes under ${n})`;
}

parentPort.on("message", ({ id, payload }) => {
  const result = process_(payload);
  parentPort.postMessage({ id, result });
});
