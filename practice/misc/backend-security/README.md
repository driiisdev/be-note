# Practice: Backend Security (SQL Injection & JWT)

Concept notes: [`building-secure-be-app-owasp.md`](<../../../concepts/misc/building-secure-be-app-owasp.md>) ·
[`jwt-pros-n-cons.md`](<../../../concepts/misc/jwt-pros-n-cons.md>)

## Part 1: SQL injection — vulnerable vs. safe

### What this demonstrates

No real database is used — the proof is in the **query text itself**, which is the standard,
honest way this vulnerability is taught even without a live database to run the query against.

### Folder structure

```
sql-injection/
  vulnerable.js   <- string-concatenated query, shows the malicious injected SQL text
  safe.js           <- parameterized query, shows the SQL text stays identical either way
```

### Run it

```bash
node sql-injection/vulnerable.js
node sql-injection/safe.js
```

### What you'll see

```
$ node sql-injection/vulnerable.js
=== malicious login attempt ===
SELECT * FROM users WHERE username = '' OR '1'='1' --' AND password = 'doesn't matter'
```

The injected `' OR '1'='1' --` turns the `WHERE` clause into something that's always true, and
comments out the password check entirely — a full authentication bypass, if this text were
ever actually sent to a database.

```
$ node sql-injection/safe.js
=== the SAME malicious string, through the safe version ===
{
  sql: 'SELECT * FROM users WHERE username = ? AND password = ?',
  params: [ "' OR '1'='1' --", "doesn't matter" ]
}
```

The SQL **text** is identical to the normal-login case — only the `params` array changes. The
malicious string just becomes a literal value being searched for (a username that doesn't
exist); it can never escape being "just data."

### Try this yourself

- Add a third, even nastier payload (e.g. one attempting a second statement, `'; DROP TABLE
  users; --`) to both files and confirm the safe version's query text still never changes.
- Write a tiny mock "interpreter" that actually evaluates the vulnerable query string against
  an in-memory array of users (only needs to handle `WHERE col = 'val' [AND col = 'val']`) and
  watch the injected payload genuinely return every row.

## Part 2: JWT — the revocation problem, demonstrated

### What this demonstrates

[The concept note's](<../../../concepts/misc/jwt-pros-n-cons.md>) central con: a JWT **cannot**
be invalidated before its expiry using signature/expiry checks alone — proven by actually
"logging out" a token and showing it still passes verification.

### Folder structure

```
jwt-auth/
  jwt-lib.js   <- hand-rolled HMAC-SHA256 JWT sign/verify/decode, Node core `crypto` only
  demo.js        <- issues a token, decodes it, revokes it, checks access with and without
                     a revocation check
```

### Run it

```bash
node jwt-auth/demo.js
```

### What you'll see

```
=== 5. THE REVOCATION PROBLEM: this is the actual demo ===
logged out - token added to revocation set

access check WITHOUT a revocation check (pure stateless jwt - the con in action):
  ALLOWED: { userId: 42, role: 'admin', ... } <- still works!

access check WITH a revocation check (the practical fix, reintroduces some state):
  rejected: token has been revoked <- correctly blocked, but needed a lookup
```

### Code walkthrough

The signature and expiry are both still completely valid after "logout" — a JWT has no
built-in concept of being revoked, because revocation requires checking *something outside the
token itself*:

```js
function checkAccess(tokenToCheck, enforceRevocation) {
  const payload = jwt.verify(tokenToCheck, SECRET);  // signature+expiry: still fine
  if (enforceRevocation && revokedTokens.has(tokenToCheck)) {
    throw new Error("token has been revoked");         // only this check catches it
  }
  return payload;
}
```

That `revokedTokens` lookup is exactly the kind of shared state
[stateless auth](<../../../concepts/comms design pattern/stateful-vs-stateless.md>) was meant
to avoid — proving the concept note's point that revocation and pure statelessness are in
tension, not free to have both at once.

### Try this yourself

- Change `demo.js` to issue a token with a 2-second expiry (`jwt.sign(payload, SECRET, 2)`) and
  wait 3 seconds before verifying — see the *expiry* check work correctly, independent of
  revocation, proving expiry alone (no logout needed) is one honest way to bound the damage
  window a stolen or "logged out" token can do.
- Tamper with the token string directly (flip one character in the signature) and rerun —
  `verify()` should reject it, proving the signature check is doing real work, not just present
  for show.

## Real-world equivalent

The SQL injection fix here is exactly what every real database driver's parameterized query
API does (`?` placeholders, or named parameters) — no ORM or raw driver in common use actually
requires string concatenation. The JWT revocation gap is exactly why most production systems
use the short-lived-access-token + revocable-refresh-token pattern described in
[the concept note](<../../../concepts/misc/jwt-pros-n-cons.md>), rather than pure long-lived
stateless JWTs.
