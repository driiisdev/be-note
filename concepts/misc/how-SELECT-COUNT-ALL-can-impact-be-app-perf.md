# How `SELECT COUNT(*)` Can Impact Backend App Performance

A query that looks harmless — "just count the rows" — is one of the most common accidental
performance bombs in backend applications, precisely because it's easy to write, easy to
overlook, and invisible in a local dev environment with a hundred rows in the table.

## Why it's expensive on a large table

Postgres (and MySQL's InnoDB) use **MVCC** (multi-version concurrency control): multiple
versions of a row can exist simultaneously, one for each transaction that might still need to
see an older snapshot. There is no single "row count" value the database can just read off a
counter somewhere — to answer `COUNT(*)` correctly, it generally has to walk every row and
check which ones are actually **visible** to the current transaction's snapshot.

This means `COUNT(*)` is typically an **O(n) sequential or index scan** — not an O(1) lookup —
even with an index on the table. (MyISAM, MySQL's older non-transactional engine, used to cache
an exact count precisely because it didn't have MVCC's visibility problem — InnoDB does have
that problem, and pays the same cost Postgres does.)

## The classic footgun: pagination

A "Page 1 of 5,213" style UI often runs a fresh `COUNT(*)` query on **every single page load**,
just to compute the total page count — on top of the query that actually fetches that page's
rows. This is fine at a hundred rows. At a few million, the count query can end up costing more
than the actual data being displayed, and it scales with total table size, not with what the
user is looking at.

## Mitigations

- **Approximate counts** — Postgres's `pg_class.reltuples` (updated by autovacuum/`ANALYZE`,
  not exact but close and effectively instant), or reading the row estimate out of `EXPLAIN`.
- **Keyset/cursor pagination** instead of offset-plus-total-count — a "load more" or
  next-cursor UI never needs a total count at all, sidestepping the problem entirely.
- **A maintained counter** — a separate row or table incremented on insert and decremented on
  delete, instead of counting the live table on every read.
- **Caching the count** with a short TTL, when exactness isn't actually required (most "about
  5,213 results" UIs don't need to be precise to the row).

🖼️ **Image needed:** a bar chart comparing query time for `COUNT(*)` vs. a maintained-counter
read, at increasing table sizes (1K, 100K, 10M rows) — the maintained counter stays flat, the
`COUNT(*)` line grows linearly. Search: "count star performance vs table size chart".

## Practice project

[`practice/misc/query-cost-and-counting`](../../practice/misc/query-cost-and-counting) —
demonstrates the core O(n)-scan-vs-O(1)-counter principle with a synthetic in-memory dataset
(no real database was available in this environment — see that project's README for exactly
what's being approximated and what isn't).

## Related

No real database was set up as part of this repo's practice projects elsewhere, so this note
stands a bit apart from the rest — but the underlying lesson (an operation that looks cheap can
secretly be O(n) in disguise) rhymes with
[`multiplexing-vs-demultiplexing`](<../comms design pattern/multiplexing-vs-demultiplexing.md>)'s
theme of things that look free until they're measured at scale.
