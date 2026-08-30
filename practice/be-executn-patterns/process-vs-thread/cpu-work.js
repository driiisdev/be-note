// genuinely CPU-bound, synchronous work - no I/O, no awaiting anything, just the CPU
// grinding - used by every demo in this project so they're all measuring the same workload
function fibonacci(n) {
  return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}

module.exports = { fibonacci };
