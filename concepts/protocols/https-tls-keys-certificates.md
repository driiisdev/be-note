# HTTPS, Keys & Certificates

HTTPS is just HTTP layered on top of [TLS](<tls.md>) (over TCP, or over QUIC for HTTP/3). The
interesting part isn't HTTP — it's how TLS actually proves the server is who it claims to be,
which comes down to public/private key pairs and certificates.

## Public/private key pairs (asymmetric crypto)

- **Private key** — stays secret on the server, never transmitted anywhere.
- **Public key** — shared with the world, embedded in the certificate.
- What one key encrypts, only the matching key can decrypt (and the reverse holds for
  signing: something signed with the private key can be verified by anyone with the public key).

## What a certificate actually is

A certificate binds a **public key** to an **identity** (a domain name), and is signed by a
**Certificate Authority (CA)** vouching that the binding is legitimate — that the entity
holding this private key really does control this domain.

## Chain of trust

```
Root CA  ->  Intermediate CA  ->  Leaf / server certificate (your domain)
```

Operating systems and browsers ship with a built-in **trust store** of root CAs they already
trust. If a certificate's signature chain traces back to one of those roots, it's trusted —
you never had to manually trust the specific website, only the root.

## What a browser actually checks

1. Does the hostname in the URL match the hostname on the certificate?
2. Is the certificate still within its validity window (not expired)?
3. Does the signature chain verify all the way up to a trusted root?
4. Has the certificate been revoked (checked via CRL or OCSP)?

Fail any of these and you get the "connection is not private" warning.

## Self-signed certificates

A certificate with no CA in its chain — signed by the server itself. The browser has no way to
verify the identity claim, so it warns loudly. Perfectly fine for local development (see the
practice project below); never appropriate for a public production site.

## Let's Encrypt / ACME

An automated protocol (ACME) and free CA (Let's Encrypt) that made getting a real, trusted
certificate a scriptable, no-cost operation — a big part of why the web moved from "HTTPS for
login pages only" to "HTTPS everywhere."

## Why this matters at all

Without it, anything sitting on the network path — a public Wi-Fi hotspot, an ISP, any
on-path attacker — could read or silently modify traffic. HTTPS is what makes it safe to type a
password into a form on an untrusted network.

🖼️ **Image needed:** the chain-of-trust diagram — root CA at the top, intermediate CA in the
middle, leaf certificate at the bottom, with an arrow showing the browser's built-in trust
store validating the root. Search: "tls certificate chain of trust diagram".

## Practice project

[`practice/protocols/tls-https`](../../practice/protocols/tls-https) —
generates a real self-signed certificate with OpenSSL and serves HTTPS with it, so the warning
browsers show (and *why* they show it) is something you see firsthand instead of reading about.

## Related

- [TLS](<tls.md>) — the protocol that actually uses these certificates during its handshake.
