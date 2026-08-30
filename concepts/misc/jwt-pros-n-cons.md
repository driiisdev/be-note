# JWT — Pros and Cons

A JSON Web Token is a compact, **signed** (not encrypted, by default) credential — three
base64url-encoded segments separated by dots: `header.payload.signature`. Anyone can *decode*
and read the payload; what they can't do without the signing key is *forge* a new one that
still passes verification. This distinction — signed vs. encrypted — is the single most common
point of confusion about JWTs, and worth being precise about before anything else.

## What makes it useful: statelessness

The server verifies the signature and trusts the claims inside — it never needs to look up a
session in a database or cache to know who's making the request. This is the concrete,
practical application of [stateful vs stateless](<../comms design pattern/stateful-vs-stateless.md>):
a JWT-authenticated request carries everything the server needs to know about the caller
*inside the request itself*.

## Pros

- **Stateless** — no shared session store needed, which means horizontal scaling is trivial:
  any server instance can verify a token independently, with no coordination required. No
  sticky sessions needed either — a nice contrast with the
  [WebSocket sticky-session problem](<../proxy n load balancing/websocket-proxying.md>), which
  JWT-based auth simply doesn't have, because there's no server-side session state to be
  sticky *to*.
- **Carries arbitrary claims** — roles, permissions, whatever the app needs — avoiding an extra
  database lookup on every request just to answer "what is this user allowed to do."
- **Works across domains/services easily** — any microservice holding the public key (or
  shared secret) can verify a token independently, without a shared session backend.

## Cons

- **Cannot be revoked before expiry** without extra infrastructure — a blocklist or revocation
  list — which quietly reintroduces the exact statefulness JWTs were supposed to eliminate. If
  a token is stolen, or a user needs to be banned *right now*, it stays valid until it expires
  unless a revocation system exists.
- **Token size** — larger than a simple session ID, and it gets sent on *every* request
  (typically in a header), not just once at login.
- **A leaked signing key compromises every token ever issued with it** — not just future ones.
- **The payload isn't encrypted** — never put secrets in a plain JWT; use JWE if the payload
  itself needs to stay confidential, not just tamper-evident.
- **Expiry is a real tradeoff, not a detail** — short expiry is safer but requires refresh-token
  complexity; long expiry is simpler but widens the window of damage if a token is stolen.

## The practical middle ground most real systems land on

Pure stateless JWT auth is rare in production for exactly the revocation reason above. The
common pattern instead: a **short-lived access token** (JWT, stateless, used for most requests)
paired with a **longer-lived refresh token** (stored server-side, genuinely revocable). This
keeps most requests cheap and stateless while still giving the system a real "kill this
session" lever when it's needed.

🖼️ **Image needed:** a JWT's three segments color-coded (header/payload/signature), with an
arrow showing "anyone can read this" over header+payload and "only the key holder can produce
this" over the signature. Search: "jwt structure header payload signature diagram".

## Practice project

[`practice/misc/backend-security`](../../practice/misc/backend-security) — a working JWT auth
flow that demonstrates the revocation problem concretely: a "logged out" token that's still
technically valid until a revocation check is added.

## Related

- [Stateful vs stateless](<../comms design pattern/stateful-vs-stateless.md>) — the general
  concept JWT auth is a specific, concrete instance of.
- [Building a secure backend app — OWASP](<building-secure-be-app-owasp.md>) — where JWT
  weaknesses fit into the broader authentication-failures category.
