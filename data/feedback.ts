export type FeedbackStatus = "new" | "resolved";

export type UserFeedbackCategory = "bug" | "idea" | "experience" | "other";

export type UserFeedback = {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  category: UserFeedbackCategory;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};
