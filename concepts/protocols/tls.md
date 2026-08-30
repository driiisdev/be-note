# TLS (Transport Layer Security)

A cryptographic protocol that gives a connection three properties it wouldn't otherwise have:
**confidentiality** (nobody else can read the data), **integrity** (nobody can silently modify
it in transit), and **authentication** (you can actually verify who you're talking to).

TLS is the successor to SSL — SSL is broken and deprecated, but "SSL certificate" stuck around
in everyday speech even though everything actually in use today is TLS.

## Where it sits

Usually layered on top of [TCP](<tcp.md>) (DTLS is the UDP equivalent), though
[HTTP/3](<http-3.md>) is a special case — it builds TLS 1.3 directly into QUIC's own handshake
rather than running it as a separate layer.

## The handshake (simplified, TLS 1.2 shape)

```
Client -> Server : ClientHello (supported TLS versions + cipher suites)
Server -> Client : ServerHello (chosen cipher suite) + server certificate
             ...  : key exchange (ECDHE preferred over old RSA key exchange)
             ...  : both sides derive the same session key, without ever sending it over the wire
Client <-> Server : Finished messages, then application data flows encrypted
```

**Forward secrecy**: using ephemeral Diffie-Hellman (ECDHE) for the key exchange means each
session's key is thrown away afterward — even if the server's private key leaks *later*, past
sessions can't be decrypted retroactively. Old-style RSA key exchange didn't have this property.

## TLS 1.3

Streamlined the handshake to 1 round trip (sometimes 0-RTT for resumed connections), and
dropped the legacy weak cipher options entirely — every connection now uses (EC)DHE.

## Why two kinds of crypto

Asymmetric crypto (public/private key pairs) is computationally expensive, so it's only used
briefly, during the handshake, to safely agree on a shared secret. Once that's done, both sides
switch to fast **symmetric** encryption for the actual bulk data — this hybrid approach is why
HTTPS doesn't feel meaningfully slower than plain HTTP for everyday browsing.

Certificates come into play during the handshake to prove server identity — see
[HTTPS, keys & certificates](<https-tls-keys-certificates.md>) for how that trust actually gets
established.

🖼️ **Image needed:** the TLS 1.2 vs TLS 1.3 handshake side by side, showing TLS 1.3 completing
in one fewer round trip. Search: "tls 1.2 vs 1.3 handshake diagram".

## Practice project

[`practice/protocols/tls-https`](../../practice/protocols/tls-https) — spins up
an HTTPS server with a locally generated certificate and inspects the negotiated protocol and
cipher.

## Related

- [HTTPS, keys & certificates](<https-tls-keys-certificates.md>) — how certificates establish
  the identity TLS authenticates against.
- [HTTP/3](<http-3.md>) — folds TLS 1.3 directly into QUIC's handshake.
