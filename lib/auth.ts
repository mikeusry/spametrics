import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = process.env.AUTH_SECRET || 'your-secret-key-change-this-in-production';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'gaspa2024';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Convert secret key to Uint8Array for jose
const getSecretKey = () => new TextEncoder().encode(SECRET_KEY);

export interface SessionPayload {
  authenticated: boolean;
  expiresAt: number;
  [key: string]: unknown;
}

/**
 * Validates the password against the configured AUTH_PASSWORD
 */
export function validatePassword(password: string): boolean {
  return password === AUTH_PASSWORD;
}

/**
 * Creates an encrypted session token
 */
export async function createSession(): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION;

  const token = await new SignJWT({
    authenticated: true,
    expiresAt,
  } as SessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(expiresAt))
    .sign(getSecretKey());

  return token;
}

/**
 * Verifies and decodes a session token
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    // Check if session has expired
    if (payload.expiresAt && (payload.expiresAt as number) < Date.now()) {
      return null;
    }

    return payload as SessionPayload;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

/**
 * Gets the current session from cookies
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie?.value) {
    return null;
  }

  return verifySession(sessionCookie.value);
}

/**
 * Sets the session cookie
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Clears the session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * Checks if user is authenticated (for use in Server Components)
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.authenticated === true;
}
