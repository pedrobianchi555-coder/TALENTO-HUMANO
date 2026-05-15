import type { Context, MiddlewareHandler } from "hono";

export interface AuthUser {
  id: string;
  email: string;
}

type Bindings = {
  SUPABASE_JWT_SECRET: string;
  [key: string]: unknown;
};

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureInput = `${parts[0]}.${parts[1]}`;
    const signatureBytes = base64UrlDecode(parts[2]);

    const valid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes,
      encoder.encode(signatureInput)
    );

    if (!valid) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const authMiddleware: MiddlewareHandler = async (c: Context, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const bindings = c.env as Bindings;
  const secret = bindings.SUPABASE_JWT_SECRET;

  if (!secret) {
    console.error('[AUTH] SUPABASE_JWT_SECRET not configured');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const payload = await verifyJWT(token, secret);

  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  const authUser: AuthUser = {
    id: payload.sub as string,
    email: payload.email as string,
  };

  c.set('user', authUser);
  await next();
};
