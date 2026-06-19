import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { assertWritableStorageConfigured, readJsonValue, writeJsonValue } from "@/lib/server/supabase";

export type EmailCodePurpose = "register" | "recover" | "rebind";

type CaptchaEntry = {
  token: string;
  answerHash: string;
  createdAt: string;
  expiresAt: string;
};

type EmailCodeEntry = {
  id: string;
  purpose: EmailCodePurpose;
  email: string;
  codeHash: string;
  targetUsername?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  attempts: number;
  consumedAt?: string;
};

type EmailDeliveryLog = {
  purpose: EmailCodePurpose;
  email: string;
  sentAt: string;
};

type PasswordResetGrant = {
  token: string;
  accountId: string;
  accountUsername: string;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
};

type VerificationStore = {
  captchas: CaptchaEntry[];
  emailCodes: EmailCodeEntry[];
  resetGrants: PasswordResetGrant[];
  deliveryLog: EmailDeliveryLog[];
};

const storeKey = "auth-verification-store";
const captchaTtlMs = 5 * 60 * 1000;
const emailCodeTtlMs = 10 * 60 * 1000;
const resetGrantTtlMs = 15 * 60 * 1000;
const resendCooldownMs = 60 * 1000;
const resendDailyLimit = 8;
const maxAttempts = 6;
const captchaAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const defaultStore = (): VerificationStore => ({
  captchas: [],
  emailCodes: [],
  resetGrants: [],
  deliveryLog: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const verificationSecret = () => {
  const secret = process.env.VERIFICATION_SECRET ?? process.env.AUTH_COOKIE_SECRET ?? process.env.ACCOUNT_HASH_SECRET;
  if (!secret) throw new Error("VERIFICATION_SECRET or AUTH_COOKIE_SECRET is required");
  return secret;
};

const hashValue = (kind: string, salt: string, value: string) =>
  createHmac("sha256", verificationSecret()).update(`${kind}:${salt}:${value}`).digest("base64url");

const now = () => Date.now();

const readStore = async () => normalizeStore(await readJsonValue(storeKey, defaultStore()));
const writeStore = async (store: VerificationStore) => {
  assertWritableStorageConfigured();
  return writeJsonValue(storeKey, normalizeStore(store));
};

const toIso = (value: number) => new Date(value).toISOString();
const isFuture = (value?: string) => (value ? new Date(value).getTime() > now() : false);

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const normalizeStore = (value: unknown): VerificationStore => {
  if (!isRecord(value)) return defaultStore();

  const captchas = Array.isArray(value.captchas)
    ? value.captchas.flatMap((item) => {
        if (!isRecord(item)) return [];
        const token = cleanString(item.token, 120);
        const answerHash = cleanString(item.answerHash, 200);
        const createdAt = cleanString(item.createdAt, 40);
        const expiresAt = cleanString(item.expiresAt, 40);
        if (!token || !answerHash || !createdAt || !expiresAt) return [];
        return [{ token, answerHash, createdAt, expiresAt }];
      })
    : [];

  const emailCodes: EmailCodeEntry[] = Array.isArray(value.emailCodes)
    ? value.emailCodes.flatMap((item) => {
        if (!isRecord(item)) return [];
        const id = cleanString(item.id, 120);
        const purpose = item.purpose;
        const email = cleanString(item.email, 120).toLowerCase();
        const codeHash = cleanString(item.codeHash, 200);
        const createdAt = cleanString(item.createdAt, 40);
        const updatedAt = cleanString(item.updatedAt, 40);
        const expiresAt = cleanString(item.expiresAt, 40);
        const targetUsername = cleanString(item.targetUsername, 60).toLowerCase() || undefined;
        const consumedAt = cleanString(item.consumedAt, 40) || undefined;
        const attempts = typeof item.attempts === "number" ? item.attempts : 0;
        if (
          !id ||
          (purpose !== "register" && purpose !== "recover" && purpose !== "rebind") ||
          !email ||
          !codeHash ||
          !createdAt ||
          !updatedAt ||
          !expiresAt
        ) {
          return [];
        }
        return [{ id, purpose, email, codeHash, createdAt, updatedAt, expiresAt, attempts, targetUsername, consumedAt }];
      })
    : [];

  const resetGrants = Array.isArray(value.resetGrants)
    ? value.resetGrants.flatMap((item) => {
        if (!isRecord(item)) return [];
        const token = cleanString(item.token, 120);
        const accountId = cleanString(item.accountId, 120);
        const accountUsername = cleanString(item.accountUsername, 60).toLowerCase();
        const createdAt = cleanString(item.createdAt, 40);
        const expiresAt = cleanString(item.expiresAt, 40);
        const consumedAt = cleanString(item.consumedAt, 40) || undefined;
        if (!token || !accountId || !accountUsername || !createdAt || !expiresAt) return [];
        return [{ token, accountId, accountUsername, createdAt, expiresAt, consumedAt }];
      })
    : [];

  const deliveryLog: EmailDeliveryLog[] = Array.isArray(value.deliveryLog)
    ? value.deliveryLog.flatMap((item) => {
        if (!isRecord(item)) return [];
        const purpose = item.purpose;
        const email = cleanString(item.email, 120).toLowerCase();
        const sentAt = cleanString(item.sentAt, 40);
        if ((purpose !== "register" && purpose !== "recover" && purpose !== "rebind") || !email || !sentAt) {
          return [];
        }
        return [{ purpose, email, sentAt }];
      })
    : [];

  const oneDayAgo = now() - 24 * 60 * 60 * 1000;

  return {
    captchas: captchas.filter((item) => isFuture(item.expiresAt)),
    emailCodes: emailCodes.filter((item) => isFuture(item.expiresAt) || Boolean(item.consumedAt)),
    resetGrants: resetGrants.filter((item) => isFuture(item.expiresAt) || Boolean(item.consumedAt)),
    deliveryLog: deliveryLog.filter((item) => new Date(item.sentAt).getTime() >= oneDayAgo),
  };
};

const randomToken = (length = 32) => randomBytes(Math.ceil((length * 3) / 4)).toString("base64url").slice(0, length);

const randomCode = (length = 6) =>
  Array.from({ length }, () => captchaAlphabet[randomInt(captchaAlphabet.length)]).join("");

export async function createCaptchaChallenge() {
  const answer = randomCode(5);
  const token = `captcha-${Date.now()}-${randomToken(18)}`;
  const createdAt = toIso(now());
  const expiresAt = toIso(now() + captchaTtlMs);
  const store = await readStore();
  store.captchas = [
    { token, answerHash: hashValue("captcha", token, answer), createdAt, expiresAt },
    ...store.captchas.filter((item) => item.token !== token),
  ].slice(0, 50);
  await writeStore(store);
  return { token, answer };
}

export async function verifyCaptchaChallenge(token: string, answer: string) {
  const store = await readStore();
  const entry = store.captchas.find((item) => item.token === token);
  if (!entry || !isFuture(entry.expiresAt)) {
    throw new Error("Captcha expired");
  }
  const normalizedAnswer = answer.trim().toUpperCase();
  const matched = safeEqual(hashValue("captcha", token, normalizedAnswer), entry.answerHash);
  store.captchas = store.captchas.filter((item) => item.token !== token);
  await writeStore(store);
  if (!matched) throw new Error("Invalid captcha");
}

export function renderCaptchaSvg(answer: string) {
  const chars = answer.split("");
  const width = 150;
  const height = 52;
  const noise = Array.from({ length: 6 }, (_, index) => {
    const x1 = 10 + index * 22;
    const y1 = 10 + ((index * 11) % 28);
    const x2 = width - 8 - index * 18;
    const y2 = 16 + ((index * 17) % 24);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(216,111,130,0.20)" stroke-width="1.6" />`;
  }).join("");
  const dots = Array.from({ length: 20 }, (_, index) => {
    const cx = 12 + ((index * 29) % (width - 24));
    const cy = 10 + ((index * 17) % (height - 20));
    const r = 0.8 + ((index % 3) * 0.45);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(90,102,112,0.18)" />`;
  }).join("");
  const text = chars
    .map((char, index) => {
      const x = 18 + index * 25;
      const y = 33 + (index % 2 === 0 ? -2 : 3);
      const rotate = index % 2 === 0 ? -8 : 7;
      return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="#344451">${char}</text>`;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="captcha">
      <rect width="${width}" height="${height}" rx="14" fill="#FAFBF7" />
      <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="13.5" fill="none" stroke="rgba(216,221,216,0.9)" />
      ${noise}
      ${dots}
      ${text}
    </svg>
  `.trim();
}

export async function createEmailCode(input: {
  purpose: EmailCodePurpose;
  email: string;
  targetUsername?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const purpose = input.purpose;
  const targetUsername = input.targetUsername?.trim().toLowerCase() || undefined;
  const store = await readStore();
  const nowAt = now();
  const dayAgo = nowAt - 24 * 60 * 60 * 1000;
  const recentSend = store.deliveryLog.find(
    (item) => item.email === email && item.purpose === purpose && nowAt - new Date(item.sentAt).getTime() < resendCooldownMs,
  );
  if (recentSend) {
    throw new Error("Please wait before requesting another code");
  }
  const sentToday = store.deliveryLog.filter(
    (item) => item.email === email && item.purpose === purpose && new Date(item.sentAt).getTime() >= dayAgo,
  ).length;
  if (sentToday >= resendDailyLimit) {
    throw new Error("Daily email limit reached");
  }

  const code = randomCode(6);
  const id = `mail-${purpose}-${Date.now()}-${randomToken(10)}`;
  const createdAt = toIso(nowAt);
  const expiresAt = toIso(nowAt + emailCodeTtlMs);
  const nextEntry: EmailCodeEntry = {
    id,
    purpose,
    email,
    targetUsername,
    codeHash: hashValue("email-code", id, code),
    createdAt,
    updatedAt: createdAt,
    expiresAt,
    attempts: 0,
  };
  store.emailCodes = [
    nextEntry,
    ...store.emailCodes.filter(
      (item) => !(item.purpose === purpose && item.email === email && item.targetUsername === targetUsername && !item.consumedAt),
    ),
  ].slice(0, 120);
  store.deliveryLog = [{ purpose, email, sentAt: createdAt }, ...store.deliveryLog].slice(0, 200);
  await writeStore(store);
  return { code, expiresAt };
}

export async function verifyEmailCode(input: {
  purpose: EmailCodePurpose;
  email: string;
  code: string;
  targetUsername?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim().toUpperCase();
  const purpose = input.purpose;
  const targetUsername = input.targetUsername?.trim().toLowerCase() || undefined;
  const store = await readStore();
  const entry = store.emailCodes.find(
    (item) =>
      item.purpose === purpose &&
      item.email === email &&
      item.targetUsername === targetUsername &&
      !item.consumedAt &&
      isFuture(item.expiresAt),
  );
  if (!entry) {
    throw new Error("Email code expired");
  }
  entry.attempts += 1;
  entry.updatedAt = toIso(now());
  if (entry.attempts > maxAttempts) {
    store.emailCodes = store.emailCodes.filter((item) => item.id !== entry.id);
    await writeStore(store);
    throw new Error("Too many verification attempts");
  }
  const matched = safeEqual(hashValue("email-code", entry.id, code), entry.codeHash);
  if (!matched) {
    await writeStore(store);
    throw new Error("Invalid email code");
  }
  entry.consumedAt = toIso(now());
  entry.updatedAt = entry.consumedAt;
  await writeStore(store);
  return { email: entry.email, targetUsername: entry.targetUsername };
}

export async function issuePasswordResetGrant(accountId: string, accountUsername: string) {
  const token = `reset-${Date.now()}-${randomToken(24)}`;
  const createdAt = toIso(now());
  const expiresAt = toIso(now() + resetGrantTtlMs);
  const store = await readStore();
  store.resetGrants = [
    { token, accountId, accountUsername: accountUsername.trim().toLowerCase(), createdAt, expiresAt },
    ...store.resetGrants.filter((item) => item.accountId !== accountId || item.consumedAt),
  ].slice(0, 80);
  await writeStore(store);
  return { token, expiresAt };
}

export async function consumePasswordResetGrant(token: string) {
  const store = await readStore();
  const entry = store.resetGrants.find((item) => item.token === token);
  if (!entry || entry.consumedAt || !isFuture(entry.expiresAt)) {
    throw new Error("Password reset authorization expired");
  }
  entry.consumedAt = toIso(now());
  await writeStore(store);
  return { accountId: entry.accountId, accountUsername: entry.accountUsername };
}
