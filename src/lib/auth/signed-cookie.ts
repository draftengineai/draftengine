import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';

function getSecret(): Uint8Array {
  const secret = process.env.DRAFTENGINE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DRAFTENGINE_SECRET environment variable is required in production');
    }
    return new TextEncoder().encode('dev-secret-not-for-production');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign a cookie payload (e.g. { role: 'writer' }) into a JWT string.
 */
export async function signCookie(payload: { role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

/**
 * Verify a signed cookie string and return the payload, or null if invalid/expired.
 */
export async function verifyCookie(token: string): Promise<{ role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.role === 'string') {
      return { role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}
