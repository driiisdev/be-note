const { execSync } = require("child_process");

// asks the OS directly what state every connection touching port 7900 is actually in -
// real kernel-level state, not anything the application knows about on its own (see the
// concept note: the app has no visibility into this unless it explicitly asks, same as this
// script is doing)
const PORT = process.argv[2] || "7900"; // usage: node inspect-connections.js <port>

function getNetstatOutput() {
  const cmd = process.platform === "win32" ? "netstat -ano" : "netstat -an";
  return execSync(cmd, { maxBuffer: 1024 * 1024 * 10 }).toString();
}

function tallyByState(output) {
  const tally = {};
  for (const line of output.split("\n")) {
    if (!line.includes(`:${PORT}`)) continue;
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 4) continue;

    // windows netstat -ano: Proto Local Foreign State PID -> state is second-to-last token
    // linux/mac netstat -an: Proto Recv-Q Send-Q Local Foreign State -> state is last token
    const state = process.platform === "win32" ? tokens[tokens.length - 2] : tokens[tokens.length - 1];
    if (!/^[A-Z_]+$/.test(state)) continue; // skip malformed/unexpected lines

    tally[state] = (tally[state] || 0) + 1;
  }
  return tally;
}

const tally = tallyByState(getNetstatOutput());

console.log(`connections touching port ${PORT}, by kernel-reported TCP state:`);
if (Object.keys(tally).length === 0) {
  console.log("  (none found - backend.js may not be running, or all connections already fully closed)");
} else {
  for (const [state, count] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${state}: ${count}`);
  }
}
