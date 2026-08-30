const { Worker } = require("worker_threads");
const path = require("path");

// a small bounded worker pool - round robin dispatch, requests correlated by id since
// multiple messages can be in flight across different workers at once
class WorkerPool {
  constructor(size) {
    this.workers = [];
    this.nextWorker = 0;
    this.pending = new Map();

    for (let i = 0; i < size; i++) {
      const worker = new Worker(path.join(__dirname, "worker.js"));
      worker.on("message", ({ id, result }) => {
        const resolve = this.pending.get(id);
        if (resolve) {
          resolve(result);
          this.pending.delete(id);
        }
      });
      this.workers.push(worker);
    }
  }

  run(payload) {
    return new Promise((resolve) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      this.pending.set(id, resolve);

      const worker = this.workers[this.nextWorker];
      this.nextWorker = (this.nextWorker + 1) % this.workers.length;
      worker.postMessage({ id, payload });
    });
  }

  destroy() {
    for (const w of this.workers) w.terminate();
  }
}

module.exports = WorkerPool;
