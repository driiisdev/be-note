// No real database is used here - the "proof" is in the QUERY TEXT itself: this shows
// exactly what a naive, string-concatenated query looks like once untrusted input is baked
// into it, which is the standard way this vulnerability class is demonstrated even without
// a live database to run it against.

function buildVulnerableQuery(username, password) {
  // NEVER do this - string concatenation lets user input become part of the QUERY ITSELF,
  // not just a value the query searches for
  return `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
}

console.log("=== normal login ===");
console.log(buildVulnerableQuery("alice", "hunter2"));

console.log("\n=== malicious login attempt ===");
const malicious = buildVulnerableQuery("' OR '1'='1' --", "doesn't matter");
console.log(malicious);

console.log("\nnotice: the WHERE clause now always evaluates true (`'1'='1'`), and `--`");
console.log("comments out the rest of the original query (the password check never even");
console.log("runs). if this text were actually sent to a database, it would return every");
console.log("row in the table - a full authentication bypass - without knowing any password");
