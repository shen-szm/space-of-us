type LoginRateLimitEntry = {
  count: number;
  expiresAt: number;
};

type LoginRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const windowMs = 10 * 60 * 1000;
const maxAttempts = 5;
const attempts = new Map<string, LoginRateLimitEntry>();

const now = () => Date.now();

const getRetryAfterSeconds = (expiresAt: number) => Math.max(1, Math.ceil((expiresAt - now()) / 1000));

const readEntry = (actorKey: string) => {
  const entry = attempts.get(actorKey);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    attempts.delete(actorKey);
    return null;
  }
  return entry;
};

export const getLoginRateLimitStatus = (actorKey: string): LoginRateLimitResult => {
  const entry = readEntry(actorKey);
  if (!entry) {
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: getRetryAfterSeconds(entry.expiresAt),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - entry.count),
    retryAfterSeconds: 0,
  };
};

export const consumeLoginRateLimit = (actorKey: string): LoginRateLimitResult => {
  const entry = readEntry(actorKey);
  if (!entry) {
    attempts.set(actorKey, { count: 1, expiresAt: now() + windowMs });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      retryAfterSeconds: 0,
    };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: getRetryAfterSeconds(entry.expiresAt),
    };
  }

  entry.count += 1;
  attempts.set(actorKey, entry);
  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - entry.count),
    retryAfterSeconds: 0,
  };
};

export const clearLoginRateLimit = (actorKey: string) => {
  attempts.delete(actorKey);
};
