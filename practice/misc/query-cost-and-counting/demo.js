// NOT a real database - no postgres/sqlite was available in this environment (see README).
// this demonstrates the underlying ALGORITHMIC principle the concept note explains: counting
// by scanning is O(n) in table size, while a maintained counter is O(1) regardless of size.
// real postgres COUNT(*) is slow specifically because of MVCC visibility checks per row, which
// this demo does NOT reproduce - it only reproduces the "must touch every row" cost shape.

function buildTable(rowCount) {
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push({ id: i, active: i % 3 !== 0 }); // ~2/3 of rows are "active", 1/3 are not
  }
  return rows;
}

// stands in for `SELECT COUNT(*) FROM table WHERE active = true` - has to visit every row,
// exactly like postgres has to check every row's mvcc visibility
function countByScanning(rows) {
  let count = 0;
  for (const row of rows) {
    if (row.active) count++;
  }
  return count;
}

// stands in for a maintained counter table, incremented/decremented as rows are
// inserted/deleted instead of recomputed from scratch on every read
class MaintainedCounter {
  constructor() {
    this.activeCount = 0;
  }
  insert(row) {
    if (row.active) this.activeCount++;
  }
  delete(row) {
    if (row.active) this.activeCount--;
  }
  read() {
    return this.activeCount; // O(1) - no scan, ever
  }
}

function timeIt(label, fn) {
  const start = process.hrtime.bigint();
  const result = fn();
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  console.log(`${label}: ${ms.toFixed(2)}ms (result: ${result})`);
  return ms;
}

console.log("=== COUNT-by-scanning cost at increasing table sizes ===");
console.log("(a throwaway warmup run first, so V8's JIT compiler doesn't skew the first real measurement)\n");

const sizes = [100_000, 1_000_000, 5_000_000];
const warmupRows = buildTable(50_000);
countByScanning(warmupRows); // warmup - let V8 optimize the hot loop before timing anything

const scanTimes = [];
for (const size of sizes) {
  const rows = buildTable(size);
  const ms = timeIt(`  scan-count ${size.toLocaleString()} rows`, () => countByScanning(rows));
  scanTimes.push(ms);
}
const ratio = scanTimes[2] / scanTimes[0];
const sizeRatio = sizes[2] / sizes[0];
console.log(
  `\nscaling check: 5,000,000 rows took ~${ratio.toFixed(1)}x longer than 100,000 rows, for ` +
    `${sizeRatio}x more rows - roughly proportional, which is what O(n) looks like. (Won't be` +
    ` an exact match - V8 JIT/GC timing noise means this is directional, not a precise benchmark.)`
);

console.log("\n=== maintained counter: O(1) regardless of table size ===");
const bigTable = buildTable(5_000_000);
const counter = new MaintainedCounter();
for (const row of bigTable) counter.insert(row); // one-time cost, paid incrementally on insert

timeIt("  read maintained counter (5,000,000-row table)", () => counter.read());
console.log("  ^ compare this to the 5,000,000-row scan-count time above - reading the");
console.log("    counter is essentially instant, no matter how large the table gets");
