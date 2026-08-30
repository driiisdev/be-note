const jwt = require("./jwt-lib");

const SECRET = "demo-secret-never-hardcode-this-in-real-code";

console.log("=== 1. issue a token ===");
const token = jwt.sign({ userId: 42, role: "admin" }, SECRET, 3600);
console.log("token:", token);

console.log("\n=== 2. anyone can DECODE it without the secret (proves it's signed, not encrypted) ===");
console.log("decoded payload (no secret needed):", jwt.decode(token));

console.log("\n=== 3. verifying with the CORRECT secret succeeds ===");
console.log(jwt.verify(token, SECRET));

console.log("\n=== 4. verifying with the WRONG secret fails ===");
try {
  jwt.verify(token, "wrong-secret");
} catch (err) {
  console.log("rejected:", err.message);
}

console.log("\n=== 5. THE REVOCATION PROBLEM: this is the actual demo ===");
const revokedTokens = new Set(); // in-memory stand-in for a real revocation store (e.g. redis)

function logout(tokenToRevoke) {
  revokedTokens.add(tokenToRevoke);
  console.log("logged out - token added to revocation set");
}

function checkAccess(tokenToCheck, enforceRevocation) {
  const payload = jwt.verify(tokenToCheck, SECRET); // signature + expiry are still fine
  if (enforceRevocation && revokedTokens.has(tokenToCheck)) {
    throw new Error("token has been revoked");
  }
  return payload;
}

logout(token);

console.log("\naccess check WITHOUT a revocation check (pure stateless jwt - the con in action):");
try {
  const payload = checkAccess(token, false);
  console.log("  ALLOWED:", payload, "<- still works! signature+expiry alone can't know it was 'logged out'");
} catch (err) {
  console.log("  rejected:", err.message);
}

console.log("\naccess check WITH a revocation check (the practical fix, reintroduces some state):");
try {
  checkAccess(token, true);
  console.log("  ALLOWED (should not happen)");
} catch (err) {
  console.log("  rejected:", err.message, "<- correctly blocked, but this needed a lookup, same as a session store would");
}
