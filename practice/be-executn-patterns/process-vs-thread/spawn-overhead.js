const { Worker } = require("worker_threads");
const { fork } = require("child_process");
const path = require("path");

// measures pure creation cost - not the work itself, just "how long until this new
// thread/process is ready" - directly demonstrates the process vs thread note's claim that
// process creation costs more than thread creation (no virtual memory mapping to duplicate
// for a thread, since threads share the parent's address space)
const COUNT = 10;

async function timeThreads() {
  const start = Date.now();
  for (let i = 0; i < COUNT; i++) {
    await new Promise((resolve) => {
      const w = new Worker('require("worker_threads").parentPort.postMessage("ready")', { eval: true });
      w.on("message", () => {
        w.terminate();
        resolve();
      });
    });
  }
  return Date.now() - start;
}

async function timeProcesses() {
  const start = Date.now();
  for (let i = 0; i < COUNT; i++) {
    await new Promise((resolve) => {
      const c = fork(path.join(__dirname, "ready-child.js"));
      c.on("message", () => {
        c.kill();
        resolve();
      });
    });
  }
  return Date.now() - start;
}

async function main() {
  const threadMs = await timeThreads();
  const processMs = await timeProcesses();
  console.log(`${COUNT} worker threads created+torn down sequentially: ${threadMs}ms`);
  console.log(`${COUNT} child processes created+torn down sequentially: ${processMs}ms`);
  console.log(`\nprocesses cost ~${(processMs / threadMs).toFixed(1)}x what threads cost here -`);
  console.log("expected, since spawning a process means the OS sets up a whole new virtual");
  console.log("memory space; a thread just adds a stack inside the existing process");
}

main();
