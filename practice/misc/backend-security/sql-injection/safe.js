// the fix: a PARAMETERIZED query. user input is never concatenated into the query text -
// it's passed separately as DATA, which a real database driver binds in safely, no matter
// what characters it contains.

function buildSafeQuery(username, password) {
  return {
    sql: "SELECT * FROM users WHERE username = ? AND password = ?",
    params: [username, password],
  };
}

console.log("=== normal login ===");
console.log(buildSafeQuery("alice", "hunter2"));

console.log("\n=== the SAME malicious string as vulnerable.js, through the safe version ===");
console.log(buildSafeQuery("' OR '1'='1' --", "doesn't matter"));

console.log("\nnotice: the sql TEXT is IDENTICAL in both calls above - only the params array");
console.log("changes. the malicious string is just treated as a literal value to search a");
console.log("username column for (one that doesn't exist) - it can never break out of being");
console.log("'just data', because it's never part of the query's actual logic/text at all");
