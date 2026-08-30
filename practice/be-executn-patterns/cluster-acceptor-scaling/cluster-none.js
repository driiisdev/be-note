const cluster = require("cluster");

// SCHED_NONE: each worker gets handed its own listening socket for the same port, and the
// OS decides which worker's accept() actually completes for any given connection - the
// primary process does NOT make this decision itself. Closest in spirit to pattern E
// (independent listeners, OS-level distribution, no shared coordinator) - though the exact
// kernel mechanism differs by platform (Linux uses SO_REUSEPORT; this repo's demo results
// were measured on Windows, which distributes differently under the hood - see README)
cluster.schedulingPolicy = cluster.SCHED_NONE;

if (cluster.isPrimary) {
  console.log(`primary ${process.pid} forking 3 workers (SCHED_NONE)`);
  for (let i = 0; i < 3; i++) cluster.fork();
} else {
  require("./worker-server");
}
