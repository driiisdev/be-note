# The Process, the Thread, and How They Compete for CPU Time

The foundation everything else in this module builds on. Every execution pattern that follows
is really just a different answer to one question: *how many threads should be doing what,
and why does that number matter?* Answering that requires knowing what a thread actually costs.

## Process vs thread

**A process** is an instance of a running program. It owns its own isolated virtual memory
address space and resources (file descriptors, etc) — it's the operating system's main unit of
resource ownership and isolation. Two processes can't accidentally read each other's memory.

**A thread** is a unit of execution *within* a process. All threads in the same process
**share** that process's memory — the heap, global variables, open file descriptors — but each
thread keeps its own stack and its own CPU register state (program counter, stack pointer).
This shared memory is exactly what makes threads useful for concurrent work that needs to
cooperate cheaply, and exactly what makes threads dangerous (two threads can race on the same
memory if you're not careful).

## Competing for CPU time

A CPU core executes **one thread at a time** (hyperthreading aside). The OS scheduler
time-slices the CPU across *every* runnable thread and process on the entire machine — not
just the ones in your program, against everything else running too.

- With **N cores**, up to N threads can run **truly simultaneously** (real parallelism).
- Beyond that, threads share cores via **time-slicing** (concurrency — interleaved execution,
  not actually simultaneous, even though it looks that way from outside).

## Context switches aren't free

A **context switch** is the OS pausing one thread and resuming another on the same core. It
has real, measurable cost: registers have to be saved and restored, and the CPU's caches and
TLB (translation lookaside buffer) go cold for the new thread and have to warm back up. Run too
many threads competing for too few cores, and context-switching overhead starts eating more CPU
time than the actual work does — informally called **thrashing**.

Switching between **threads** in the same process is cheaper than switching between
**processes**, because a thread switch doesn't need to swap the entire virtual memory mapping
(the TLB stays mostly valid) — this is part of why threads, not separate processes, are the
usual tool when tasks need to communicate or share state cheaply.

## Why this matters for backend design

How many threads should a server actually run?

- **Too few** and available cores sit idle while work queues up.
- **Too many** and context-switch overhead eats the parallelism gains you were trying to get.

This exact tension is the entire reason the rest of this module exists — every pattern from
[the simplest, single-threaded model](<single-listener-acceptor-n-reader-thread-execution-pattern.md>)
to [socket sharding across cores](<multiple-listeners-acceptors-n-readers-w-socket-sharding-execution-pattern.md>)
is a different tradeoff on exactly this question, tuned for a different kind of workload.

🖼️ **Image needed:** a timeline showing 2 CPU cores time-slicing 5 threads, with context-switch
gaps drawn between each slice. Search: "cpu scheduling context switch timeline diagram".

## Practice project

[`practice/be-executn-patterns/process-vs-thread`](../../practice/be-executn-patterns/process-vs-thread) —
runs the same CPU-bound work as a separate process (`child_process`) vs a worker thread
(`worker_threads`) and measures the difference in startup cost and memory sharing.

## Related

- [Backend idempotency](<backend-idempotency.md>) — "when to use threads?" answered directly,
  building on this note.
- [The listener, the acceptor, and the reader](<the-listener-the-acceptor-n-the-reader.md>) — the
  3 roles that get assigned to threads in every pattern that follows.
