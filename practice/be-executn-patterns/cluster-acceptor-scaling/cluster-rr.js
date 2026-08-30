const cluster = require("cluster");

// SCHED_RR: the primary process itself accepts every connection and explicitly hands each
// one to the next worker in rotation - closest in spirit to pattern D (one shared accept
// point, coordinating fairly across multiple acceptors)
cluster.schedulingPolicy = cluster.SCHED_RR;

if (cluster.isPrimary) {
  console.log(`primary ${process.pid} forking 3 workers (SCHED_RR)`);
  for (let i = 0; i < 3; i++) cluster.fork();
} else {
  require("./worker-server");
}
