import { NextRequest, NextResponse } from 'next/server';
import { validatePassword, createSession, setSessionCookie } from '@/lib/auth';

// Rate limiting map: IP -> { attempts, resetAt }
const rateLimitMap = new Map<string, { attempts: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function getRateLimitKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // Clean up old entries
  if (record && record.resetAt < now) {
    rateLimitMap.delete(key);
  }

  const currentRecord = rateLimitMap.get(key) || { attempts: 0, resetAt: now + RATE_LIMIT_WINDOW };

  if (currentRecord.attempts >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - currentRecord.attempts };
}

function incrementRateLimit(key: string) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { attempts: 0, resetAt: now + RATE_LIMIT_WINDOW };

  record.attempts += 1;
  rateLimitMap.set(key, record);
}

export async function POST(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitKey = getRateLimitKey(req);
    const { allowed, remaining } = checkRateLimit(rateLimitKey);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { password } = body;

    // Validate input
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Validate password
    if (!validatePassword(password)) {
      incrementRateLimit(rateLimitKey);
      return NextResponse.json(
        { error: 'Invalid password', remaining: remaining - 1 },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = await createSession();

    // Set session cookie
    await setSessionCookie(sessionToken);

    return NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}
