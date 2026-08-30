# Practice: Query Cost and Counting

Concept note: [`how-SELECT-COUNT-ALL-can-impact-be-app-perf.md`](<../../../concepts/misc/how-SELECT-COUNT-ALL-can-impact-be-app-perf.md>)

## An upfront honesty note

**No real database was available in this environment** to demonstrate actual Postgres
`COUNT(*)` behavior (no Postgres, no SQLite, and Docker wasn't running when this was built —
same kind of environment limitation this repo has been upfront about elsewhere, like TCP Fast
Open and QUIC in the HTTPS module). What this demo *does* prove, honestly: the underlying
**algorithmic shape** the concept note describes — counting by scanning is O(n) in table size,
a maintained counter is O(1) regardless of size. It does **not** reproduce Postgres's specific
MVCC-visibility-check cost, which is a different (and real) reason `COUNT(*)` is slow there
specifically — see the concept note for that mechanism.

## What this demonstrates

The core lesson: an operation that "just counts rows" scales linearly with table size when it
has to visit every row, while a counter maintained incrementally as data changes doesn't scale
with table size at all.

## Folder structure

```
query-cost-and-counting/
  demo.js   <- builds synthetic in-memory "tables," times scan-counting vs a maintained counter
```

## Run it

```bash
node demo.js
```

## What you'll see

```
=== COUNT-by-scanning cost at increasing table sizes ===
  scan-count 100,000 rows: 1.84ms
  scan-count 1,000,000 rows: 7.69ms
  scan-count 5,000,000 rows: 45.48ms

scaling check: 5,000,000 rows took ~24.7x longer than 100,000 rows, for 50x more rows -
roughly proportional, which is what O(n) looks like.

=== maintained counter: O(1) regardless of table size ===
  read maintained counter (5,000,000-row table): 0.09ms
```

Scan-counting time grows roughly with table size (not an exact linear match — JIT/GC timing
noise in a short synchronous script makes it directional, not a precision benchmark, and the
README says so rather than overclaiming). Reading the maintained counter takes **0.09ms**
regardless of whether the table backing it has 100 rows or 5 million — because it never scans
anything, it just returns a number that was already kept up to date.

## Code walkthrough

The entire lesson is in the shape of these two operations:

```js
// COUNT(*) equivalent - must visit every row, every time it's asked
function countByScanning(rows) {
  let count = 0;
  for (const row of rows) if (row.active) count++;
  return count;
}

// maintained counter - pays a small cost on every insert/delete, so reads are always instant
class MaintainedCounter {
  insert(row) { if (row.active) this.activeCount++; }
  delete(row) { if (row.active) this.activeCount--; }
  read() { return this.activeCount; }   // O(1), no scan, ever
}
```

The maintained counter isn't free — it costs a tiny bit extra on every write. The tradeoff is
exactly what the concept note describes: pay a small, constant cost continuously (on writes),
or pay a growing cost occasionally (on reads) — which one is better depends entirely on your
read-to-write ratio, and a pagination UI that re-counts on every page load has a *terrible*
read-to-write ratio for this specific tradeoff.

## Try this yourself

- Raise the largest size to `20_000_000` and confirm the scan-count time keeps growing while
  the maintained counter's read time stays flat — the whole point, at an even more dramatic
  scale.
- Add a `deleteRandom()` step that removes rows from the array and calls `counter.delete()` for
  each one, then compare `counter.read()` against a fresh `countByScanning()` — they should
  still match, proving the maintained counter stays correct across both inserts and deletes,
  not just inserts.

## Real-world equivalent

This is precisely the reasoning behind denormalized counter columns/tables in real production
schemas (e.g. a `posts.comment_count` column updated on insert/delete instead of running
`COUNT(*) FROM comments WHERE post_id = ?` on every page load) — a deliberate tradeoff of write
complexity for read speed, made because reads vastly outnumber writes in most such systems.
