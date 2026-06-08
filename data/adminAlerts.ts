export type AdminAlertType = "storage_quota" | "storage_config";

export type AdminAlert = {
  id: string;
  type: AdminAlertType;
  title: string;
  message: string;
  source?: string;
  createdAt: string;
  seenAt?: string;
};
