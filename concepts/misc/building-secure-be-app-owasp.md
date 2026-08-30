# Building a Secure Backend App — OWASP Top 10

The OWASP Top 10 isn't a checklist to memorize once — it's a list of the categories of mistake
that keep recurring across decades of real breaches. The specific list gets revised every few
years, but the underlying themes below are durable, and each one maps to a habit worth building
rather than a box to tick.

## 1. Broken access control

A user can do or see something they shouldn't — the classic example is an **insecure direct
object reference**: changing `?id=123` to `?id=124` in a URL and seeing someone else's data,
because the server checked "is this user logged in?" but never checked "is this user allowed
to see *this specific* resource?"

**Fix**: authorize every request against the specific resource being accessed, server-side,
every time — never trust a client-supplied ID as proof of ownership.

## 2. Cryptographic failures

Sensitive data (passwords, tokens, PII) stored or transmitted without proper protection — weak
or outdated algorithms, hardcoded keys, plaintext where encryption was needed.

**Fix**: [TLS](<../protocols/tls.md>) everywhere, hash passwords with bcrypt/Argon2 (never
store them reversibly), and never log secrets.

## 3. Injection

Untrusted input gets concatenated directly into a query or command. The textbook SQL injection
example:

```js
// NEVER do this
const query = "SELECT * FROM users WHERE id = " + userInput;
```

If `userInput` is `1; DROP TABLE users;--`, that's exactly what runs.

**Fix**: parameterized queries / prepared statements, always — never string-concatenate user
input into a query, command, or interpreter of any kind.

## 4. Insecure design

The vulnerability lives in the *architecture*, not a specific line of code — e.g. a password
reset endpoint with no rate limiting, so an attacker can brute-force it as fast as the network
allows.

**Fix**: threat-model during design, not only during code review — some classes of bug can't be
caught by reading the diff, because the diff looks correct in isolation.

## 5. Security misconfiguration

Default credentials left enabled, verbose error messages leaking stack traces or internal
paths to the client, unnecessary ports/features exposed, missing security headers.

## 6. Vulnerable and outdated components

Running a library or framework version with a known CVE.

**Fix**: dependency scanning, and an actual process for keeping things patched — "we'll get to
it" is how this category stays #6 on every revision of this list.

## 7. Identification and authentication failures

Weak password policies, no rate limiting on login (enabling brute force), session tokens that
never expire or rotate, predictable session IDs. See
[JWT pros & cons](<jwt-pros-n-cons.md>) for the specific tradeoffs of one common approach to
this category.

## 8. Software and data integrity failures

Trusting data or code from an unverified source — an unsigned software update, or
deserializing data from an untrusted origin without validation.

## 9. Security logging and monitoring failures

A breach happens and nobody notices for months, because nothing was logged or alerted on. This
category is uniquely painful: every other item on this list is about preventing an incident;
this one is about how long an incident goes undetected once prevention has already failed.

## 10. Server-side request forgery (SSRF)

An application fetches a URL based on user input, and an attacker points it at an internal-only
endpoint the app can reach but the attacker normally couldn't — a classic target is a cloud
provider's instance metadata service, which often has no authentication because it's assumed
to be reachable only from inside the trusted network.

🖼️ **Image needed:** the OWASP Top 10 as a simple numbered list/icon grid, since this note is
inherently a "10 categories" reference. Search: "owasp top 10 diagram".

## Practice project

[`practice/misc/backend-security`](../../practice/misc/backend-security) — a SQL injection
vulnerability shown side by side with its parameterized-query fix (#3), and a JWT
authentication flow demonstrating the auth-failure/revocation tradeoff from #7.

## Related

- [JWT pros & cons](<jwt-pros-n-cons.md>) — the specific auth mechanism this note's #7 points to.
- [TLS](<../protocols/tls.md>) and [HTTPS, keys & certificates](<../protocols/https-tls-keys-certificates.md>) —
  the cryptographic foundation #2 depends on.
