export type BindingRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type AccountBindingRequest = {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  toUserId: string;
  toUsername: string;
  toDisplayName: string;
  fromAccepted: boolean;
  toAccepted: boolean;
  status: BindingRequestStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type UserAccount = {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  emailVerifiedAt?: string;
  passwordHash: string;
  recoveryHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  passwordUpdatedAt?: string;
  bindingInviteCodeHash?: string;
  bindingInviteCodePreview?: string;
  bindingInviteCreatedAt?: string;
  partnerUserId?: string;
  partnerUsername?: string;
  partnerDisplayName?: string;
  themePreset?: string;
  bindingRequests?: AccountBindingRequest[];
};

export type PublicUserAccount = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  passwordUpdatedAt?: string;
  email?: string;
  emailVerifiedAt?: string;
  bindingInviteCodePreview?: string;
  bindingInviteCreatedAt?: string;
  partnerUserId?: string;
  partnerUsername?: string;
  partnerDisplayName?: string;
  themePreset?: string;
  bindingRequests?: AccountBindingRequest[];
};

export type AccountStore = {
  users: UserAccount[];
};

export const defaultAccountStore = (): AccountStore => ({
  users: [],
});

export const toPublicAccount = (account: UserAccount): PublicUserAccount => ({
  id: account.id,
  username: account.username,
  displayName: account.displayName,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
  lastLoginAt: account.lastLoginAt,
  passwordUpdatedAt: account.passwordUpdatedAt,
  email: account.email,
  emailVerifiedAt: account.emailVerifiedAt,
  bindingInviteCodePreview: account.bindingInviteCodePreview,
  bindingInviteCreatedAt: account.bindingInviteCreatedAt,
  partnerUserId: account.partnerUserId,
  partnerUsername: account.partnerUsername,
  partnerDisplayName: account.partnerDisplayName,
  themePreset: account.themePreset,
  bindingRequests: account.bindingRequests ?? [],
});
