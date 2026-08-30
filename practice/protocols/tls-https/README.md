# Practice: TLS & HTTPS

Concept notes: [`tls.md`](<../../../concepts/protocols/tls.md>) ·
[`https-tls-keys-certificates.md`](<../../../concepts/protocols/https-tls-keys-certificates.md>)

## What this demonstrates

What actually changes at the wire level between plain HTTP and HTTPS — a real (if self-signed)
certificate, a real TLS handshake, and the negotiated protocol/cipher printed out instead of
taken on faith.

## Folder structure

```
tls-https/
  generate-cert.sh   <- one-time openssl command to create a local self-signed cert + key
  server.js           <- https server (port 3443) next to a plain http server (port 3080)
  client.js            <- connects over https, logs the negotiated protocol/cipher/certificate
```

## Generate a certificate first

Requires `openssl` (available by default on macOS/Linux; on Windows, Git Bash — which you're
already using — ships it too):

```bash
cd practice/protocols/tls-https
bash generate-cert.sh
```

This writes `key.pem` (private key — never shared) and `cert.pem` (certificate — includes the
public key, self-signed since there's no real CA involved) into this folder.

## Code walkthrough

**Server** — the interesting bit isn't setup, it's what's available *after* the handshake
already happened, on the socket itself:

```js
console.log(
  `protocol: ${req.socket.getProtocol()}, cipher: ${req.socket.getCipher().name}`
);
```

This is the concrete version of [the TLS handshake](<../../../concepts/protocols/tls.md>) —
by the time your request handler runs, `ClientHello`/`ServerHello`/key exchange are already
done, and the negotiated result is just sitting there on the socket object.

**Client** — deliberately sets `rejectUnauthorized: false`, and the README calls that out
explicitly: a self-signed cert has no CA in its chain, so real verification *should* fail.
This flag exists only to make a local learning demo runnable — see
[chain of trust](<../../../concepts/protocols/https-tls-keys-certificates.md>) for why
this would be a serious mistake against a real server.

## Run it

```bash
node server.js        # terminal 1
node client.js          # terminal 2
```

Expect the client to print the negotiated TLS protocol version (e.g. `TLSv1.3`), the chosen
cipher, and the certificate's subject (`CN=localhost`, matching what `generate-cert.sh` set).

## Try this yourself

- Open `https://localhost:3443` directly in a browser — it will refuse/warn because of the
  self-signed cert. That warning *is* the "does this chain to a trusted root?" check from
  [the certificate notes](<../../../concepts/protocols/https-tls-keys-certificates.md>)
  failing, made visible.
- Open `http://localhost:3080` next to it — same handler logic, but no handshake, no
  certificate, and (on a real network) no protection from eavesdropping.
- Run `openssl s_client -connect localhost:3443` from a terminal and read its handshake output
  line by line against [the TLS handshake steps](<../../../concepts/protocols/tls.md>).

## Real-world equivalent

This is exactly what Let's Encrypt/ACME automates for real public domains — a CA-signed
certificate instead of a self-signed one, so the chain-of-trust check that your browser just
refused actually passes.
