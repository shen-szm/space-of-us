import { createHmac, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  type AccountBindingRequest,
  type AccountStore,
  type BindingRequestStatus,
  type PublicUserAccount,
  type UserAccount,
  defaultAccountStore,
  toPublicAccount,
} from "@/data/accounts";
import { getPrivateDataFilePath } from "@/lib/server/dataDir";
import { assertWritableStorageConfigured, getSupabaseAdmin, readJsonValue, writeJsonValue } from "@/lib/server/supabase";

const storeKey = "accounts";
const localFileName = "accounts.json";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeUsername = (value: string) => value.trim().toLowerCase();
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const requestStatuses = new Set<BindingRequestStatus>(["pending", "accepted", "declined", "cancelled"]);

const cleanBindingRequest = (value: unknown): AccountBindingRequest | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.fromUserId !== "string" ||
    typeof value.fromUsername !== "string" ||
    typeof value.fromDisplayName !== "string" ||
    typeof value.toUserId !== "string" ||
    typeof value.toUsername !== "string" ||
    typeof value.toDisplayName !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    fromUserId: value.fromUserId,
    fromUsername: normalizeUsername(value.fromUsername),
    fromDisplayName: value.fromDisplayName,
    toUserId: value.toUserId,
    toUsername: normalizeUsername(value.toUsername),
    toDisplayName: value.toDisplayName,
    fromAccepted: value.fromAccepted !== false,
    toAccepted: value.toAccepted === true,
    status: requestStatuses.has(value.status as BindingRequestStatus)
      ? (value.status as BindingRequestStatus)
      : "pending",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : undefined,
  };
};

const cleanAccount = (value: unknown): UserAccount | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.username !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.passwordHash !== "string" ||
    typeof value.recoveryHash !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    username: normalizeUsername(value.username),
    displayName: value.displayName,
    email: typeof value.email === "string" ? normalizeEmail(value.email) : undefined,
    emailVerifiedAt: typeof value.emailVerifiedAt === "string" ? value.emailVerifiedAt : undefined,
    passwordHash: value.passwordHash,
    recoveryHash: value.recoveryHash,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    lastLoginAt: typeof value.lastLoginAt === "string" ? value.lastLoginAt : undefined,
    passwordUpdatedAt: typeof value.passwordUpdatedAt === "string" ? value.passwordUpdatedAt : undefined,
    bindingInviteCodeHash: typeof value.bindingInviteCodeHash === "string" ? value.bindingInviteCodeHash : undefined,
    bindingInviteCodePreview:
      typeof value.bindingInviteCodePreview === "string" ? value.bindingInviteCodePreview : undefined,
    bindingInviteCreatedAt:
      typeof value.bindingInviteCreatedAt === "string" ? value.bindingInviteCreatedAt : undefined,
    partnerUserId: typeof value.partnerUserId === "string" ? value.partnerUserId : undefined,
    partnerUsername: typeof value.partnerUsername === "string" ? normalizeUsername(value.partnerUsername) : undefined,
    partnerDisplayName: typeof value.partnerDisplayName === "string" ? value.partnerDisplayName : undefined,
    bindingRequests: Array.isArray(value.bindingRequests)
      ? value.bindingRequests
          .map(cleanBindingRequest)
          .filter((request): request is AccountBindingRequest => Boolean(request))
      : [],
  };
};

const normalizeStore = (value: unknown): AccountStore => {
  if (!isRecord(value) || !Array.isArray(value.users)) return defaultAccountStore();

  return {
    users: value.users.map(cleanAccount).filter((account): account is UserAccount => Boolean(account)),
  };
};

const accountHashSecret = () =>
  process.env.ACCOUNT_HASH_SECRET ?? process.env.AUTH_COOKIE_SECRET ?? "space-of-us-account-hash-v1";

const legacyHashSecrets = () =>
  [
    accountHashSecret(),
    process.env.AUTH_COOKIE_SECRET,
    "map-of-us-local-dev",
    "space-of-us-account-hash-v1",
  ].filter((secret, index, secrets): secret is string => Boolean(secret) && secrets.indexOf(secret) === index);

const hashWithSecret = (value: string, salt: string, secret: string) =>
  createHmac("sha256", secret).update(`${salt}:${value}`).digest("base64url");

export const hashAccountSecret = (value: string, salt: string) => hashWithSecret(value, salt, accountHashSecret());

const verifyAccountSecret = (value: string, salt: string, hash: string) =>
  legacyHashSecrets().some((secret) => safeEqual(hashWithSecret(value, salt, secret), hash));

export const createBindingInviteCode = () =>
  Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const readLocalStore = async () => {
  try {
    const content = await readFile(getPrivateDataFilePath(localFileName), "utf8");
    return normalizeStore(JSON.parse(content) as unknown);
  } catch {
    return defaultAccountStore();
  }
};

const writeLocalStore = async (store: AccountStore) => {
  const filePath = getPrivateDataFilePath(localFileName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  return store;
};

export const readAccountStore = async () => {
  if (!getSupabaseAdmin()) {
    assertWritableStorageConfigured();
    return readLocalStore();
  }
  return normalizeStore(await readJsonValue(storeKey, defaultAccountStore()));
};

export const writeAccountStore = async (store: AccountStore) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    assertWritableStorageConfigured();
    return writeLocalStore(store);
  }
  assertWritableStorageConfigured();
  return writeJsonValue(storeKey, store);
};

export const listPublicAccounts = async (): Promise<PublicUserAccount[]> => {
  const store = await readAccountStore();
  return store.users.map(toPublicAccount);
};

export const findAccount = async (username: string) => {
  const normalized = normalizeUsername(username);
  const store = await readAccountStore();
  return store.users.find((account) => account.username === normalized) ?? null;
};

export const findAccountByEmail = async (email: string) => {
  const normalized = normalizeEmail(email);
  const store = await readAccountStore();
  return store.users.find((account) => account.email === normalized) ?? null;
};

export const findPublicAccount = async (username: string) => {
  const account = await findAccount(username);
  return account ? toPublicAccount(account) : null;
};

export const getAccountScopeKey = async (username: string) => {
  const account = await findAccount(username);
  if (!account) return null;

  const pairIds = [account.id, account.partnerUserId].filter((value): value is string => Boolean(value)).sort();
  const scopeKey = pairIds.length > 1 ? `pair:${pairIds.join(":")}` : `user:${account.id}`;

  return {
    account,
    scopeKey,
  };
};

export const verifyAccountPassword = async (identifier: string, password: string) => {
  const account = identifier.includes("@") ? await findAccountByEmail(identifier) : await findAccount(identifier);
  if (!account) return null;

  return verifyAccountSecret(password, account.id, account.passwordHash) ? account : null;
};

const verifyPasswordAgainstAccount = (account: UserAccount, password: string) =>
  verifyAccountSecret(password, account.id, account.passwordHash);

export const registerAccount = async ({
  username,
  displayName,
  email,
  password,
  recoveryPhrase,
}: {
  username: string;
  displayName: string;
  email: string;
  password: string;
  recoveryPhrase?: string;
}) => {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);
  const store = await readAccountStore();
  if (store.users.some((account) => account.username === normalizedUsername)) {
    throw new Error("Account already exists");
  }
  if (store.users.some((account) => account.email === normalizedEmail)) {
    throw new Error("Email already exists");
  }

  const timestamp = new Date().toISOString();
  const account: UserAccount = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username: normalizedUsername,
    displayName: displayName.trim() || username.trim(),
    email: normalizedEmail,
    emailVerifiedAt: timestamp,
    passwordHash: "",
    recoveryHash: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    passwordUpdatedAt: timestamp,
  };

  const fallbackRecovery = recoveryPhrase?.trim() || normalizedEmail;
  account.passwordHash = hashAccountSecret(password, account.id);
  account.recoveryHash = hashAccountSecret(fallbackRecovery, account.id);
  store.users = [account, ...store.users];
  await writeAccountStore(store);

  return toPublicAccount(account);
};

export const resetAccountPassword = async ({
  username,
  recoveryPhrase,
  newPassword,
}: {
  username: string;
  recoveryPhrase: string;
  newPassword: string;
}) => {
  const normalized = normalizeUsername(username);
  const store = await readAccountStore();
  const account = store.users.find((item) => item.username === normalized);
  if (!account) throw new Error("Account not found");

  if (!verifyAccountSecret(recoveryPhrase, account.id, account.recoveryHash)) {
    throw new Error("Invalid recovery phrase");
  }

  const timestamp = new Date().toISOString();
  account.passwordHash = hashAccountSecret(newPassword, account.id);
  account.updatedAt = timestamp;
  account.passwordUpdatedAt = timestamp;
  await writeAccountStore(store);

  return toPublicAccount(account);
};

export const resetAccountPasswordByUsername = async ({
  username,
  newPassword,
}: {
  username: string;
  newPassword: string;
}) => {
  const normalized = normalizeUsername(username);
  const store = await readAccountStore();
  const account = store.users.find((item) => item.username === normalized);
  if (!account) throw new Error("Account not found");

  const timestamp = new Date().toISOString();
  account.passwordHash = hashAccountSecret(newPassword, account.id);
  account.updatedAt = timestamp;
  account.passwordUpdatedAt = timestamp;
  await writeAccountStore(store);

  return toPublicAccount(account);
};

export const adminResetAccountPassword = resetAccountPasswordByUsername;

export const changeOwnAccountPassword = async ({
  username,
  currentPassword,
  newPassword,
}: {
  username: string;
  currentPassword: string;
  newPassword: string;
}) => {
  const normalized = normalizeUsername(username);
  const store = await readAccountStore();
  const account = store.users.find((item) => item.username === normalized);
  if (!account) throw new Error("Account not found");
  if (!verifyPasswordAgainstAccount(account, currentPassword)) {
    throw new Error("Current password is incorrect");
  }

  const timestamp = new Date().toISOString();
  account.passwordHash = hashAccountSecret(newPassword, account.id);
  account.updatedAt = timestamp;
  account.passwordUpdatedAt = timestamp;
  await writeAccountStore(store);

  return toPublicAccount(account);
};

export const updateAccountEmail = async ({
  username,
  email,
}: {
  username: string;
  email: string;
}) => {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);
  const store = await readAccountStore();
  const account = store.users.find((item) => item.username === normalizedUsername);
  if (!account) throw new Error("Account not found");
  const duplicated = store.users.find((item) => item.username !== normalizedUsername && item.email === normalizedEmail);
  if (duplicated) throw new Error("Email already exists");

  const timestamp = new Date().toISOString();
  account.email = normalizedEmail;
  account.emailVerifiedAt = timestamp;
  account.updatedAt = timestamp;
  account.recoveryHash = hashAccountSecret(normalizedEmail, account.id);
  await writeAccountStore(store);
  return toPublicAccount(account);
};

export const markAccountLogin = async (username: string) => {
  const normalized = normalizeUsername(username);
  const store = await readAccountStore();
  const account = store.users.find((item) => item.username === normalized);
  if (!account) return null;

  account.lastLoginAt = new Date().toISOString();
  account.updatedAt = account.updatedAt || account.lastLoginAt;
  await writeAccountStore(store);

  return toPublicAccount(account);
};

const publicUsersById = (store: AccountStore) =>
  new Map(store.users.map((account) => [account.id, toPublicAccount(account)]));

const syncRequestForUsers = (store: AccountStore, request: AccountBindingRequest) => {
  store.users = store.users.map((account) => {
    if (account.id !== request.fromUserId && account.id !== request.toUserId) return account;

    const requests = account.bindingRequests ?? [];
    const nextRequests = requests.some((item) => item.id === request.id)
      ? requests.map((item) => (item.id === request.id ? request : item))
      : [request, ...requests];

    return { ...account, bindingRequests: nextRequests, updatedAt: request.updatedAt };
  });
};

export const getAccountBindingProfile = async (username: string) => {
  const normalized = normalizeUsername(username);
  const store = await readAccountStore();
  const account = store.users.find((item) => item.username === normalized);
  if (!account) throw new Error("Account not found");

  const users = publicUsersById(store);
  const publicAccount = toPublicAccount(account);

  return {
    user: publicAccount,
    partner: account.partnerUserId ? users.get(account.partnerUserId) ?? null : null,
  };
};

export const generateAccountBindingInvite = async (username: string) => {
  const normalized = normalizeUsername(username);
  const store = await readAccountStore();
  const account = store.users.find((item) => item.username === normalized);
  if (!account) throw new Error("Account not found");
  if (account.partnerUserId) throw new Error("Already bound");

  const code = createBindingInviteCode();
  const timestamp = new Date().toISOString();

  account.bindingInviteCodeHash = hashAccountSecret(code, account.id);
  account.bindingInviteCodePreview = code.slice(-2);
  account.bindingInviteCreatedAt = timestamp;
  account.updatedAt = timestamp;

  await writeAccountStore(store);
  return { ...(await getAccountBindingProfile(username)), inviteCode: code };
};

export const createAccountBindingRequest = async (username: string, inviteCode: string) => {
  const normalized = normalizeUsername(username);
  const code = inviteCode.trim().toUpperCase();
  const store = await readAccountStore();
  const from = store.users.find((item) => item.username === normalized);
  if (!from) throw new Error("Account not found");
  if (from.partnerUserId) throw new Error("Already bound");

  const to = store.users.find((account) => {
    if (!account.bindingInviteCodeHash || account.id === from.id || account.partnerUserId) return false;
    return safeEqual(hashAccountSecret(code, account.id), account.bindingInviteCodeHash);
  });

  if (!to) throw new Error("Invite code not found");

  const openRequest = [from, to]
    .flatMap((account) => account.bindingRequests ?? [])
    .find(
      (request) =>
        request.status === "pending" &&
        ((request.fromUserId === from.id && request.toUserId === to.id) ||
          (request.fromUserId === to.id && request.toUserId === from.id)),
    );
  if (openRequest) throw new Error("Request already pending");

  const timestamp = new Date().toISOString();
  const request: AccountBindingRequest = {
    id: `bind-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fromUserId: from.id,
    fromUsername: from.username,
    fromDisplayName: from.displayName,
    toUserId: to.id,
    toUsername: to.username,
    toDisplayName: to.displayName,
    fromAccepted: true,
    toAccepted: false,
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  syncRequestForUsers(store, request);
  await writeAccountStore(store);
  return getAccountBindingProfile(username);
};

export const respondToAccountBindingRequest = async ({
  username,
  requestId,
  accept,
}: {
  username: string;
  requestId: string;
  accept: boolean;
}) => {
  const normalized = normalizeUsername(username);
  const store = await readAccountStore();
  const account = store.users.find((item) => item.username === normalized);
  if (!account) throw new Error("Account not found");

  const request = (account.bindingRequests ?? []).find((item) => item.id === requestId);
  if (!request || request.status !== "pending") throw new Error("Request not found");
  if (account.id !== request.fromUserId && account.id !== request.toUserId) throw new Error("Forbidden");

  const timestamp = new Date().toISOString();
  const nextRequest: AccountBindingRequest = {
    ...request,
    fromAccepted: account.id === request.fromUserId ? accept : request.fromAccepted,
    toAccepted: account.id === request.toUserId ? accept : request.toAccepted,
    status: accept ? "pending" : "declined",
    updatedAt: timestamp,
  };

  if (nextRequest.fromAccepted && nextRequest.toAccepted) {
    nextRequest.status = "accepted";
    nextRequest.completedAt = timestamp;

    const from = store.users.find((item) => item.id === nextRequest.fromUserId);
    const to = store.users.find((item) => item.id === nextRequest.toUserId);
    if (!from || !to) throw new Error("Account not found");

    from.partnerUserId = to.id;
    from.partnerUsername = to.username;
    from.partnerDisplayName = to.displayName;
    from.updatedAt = timestamp;
    to.partnerUserId = from.id;
    to.partnerUsername = from.username;
    to.partnerDisplayName = from.displayName;
    to.updatedAt = timestamp;
  }

  syncRequestForUsers(store, nextRequest);
  await writeAccountStore(store);
  return getAccountBindingProfile(username);
};
