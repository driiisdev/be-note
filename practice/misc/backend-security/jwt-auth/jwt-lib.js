const crypto = require("crypto");

// a minimal HMAC-SHA256 JWT implementation, hand-rolled from Node's core crypto module only -
// enough to demonstrate the mechanics, not a spec-complete/production-ready library (no
// algorithm negotiation, no "none" algorithm protection, etc - use a real library in production)

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload, secret, expiresInSeconds = 3600) {
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = crypto.createHmac("sha256", secret).update(signingInput).digest("base64url");

  return `${signingInput}.${signature}`;
}

function verify(token, secret) {
  const [headerB64, payloadB64, signature] = token.split(".");
  if (!headerB64 || !payloadB64 || !signature) throw new Error("malformed token");

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  // timing-safe comparison - a naive === would leak signature bytes via response timing
  const valid =
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  if (!valid) throw new Error("invalid signature");

  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error("token expired");

  return payload;
}

function decode(token) {
  // decodes WITHOUT verifying - proves anyone can read a JWT's payload, signed or not
  const [, payloadB64] = token.split(".");
  return JSON.parse(Buffer.from(payloadB64, "base64url").toString());
}

module.exports = { sign, verify, decode };
