type SourceState<T> = {
  data: T[];
  error: string | null;
};

type AdminInboxSources<TFeedback, TAccount> = {
  feedback: SourceState<TFeedback>;
  accounts: SourceState<TAccount>;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "加载失败";

export async function loadAdminInboxSources<TFeedback, TAccount>(
  loadFeedback: () => Promise<TFeedback[]>,
  loadAccounts: () => Promise<TAccount[]>,
): Promise<AdminInboxSources<TFeedback, TAccount>> {
  const [feedbackResult, accountResult] = await Promise.allSettled([
    loadFeedback(),
    loadAccounts(),
  ]);

  return {
    feedback:
      feedbackResult.status === "fulfilled"
        ? { data: feedbackResult.value, error: null }
        : { data: [], error: errorMessage(feedbackResult.reason) },
    accounts:
      accountResult.status === "fulfilled"
        ? { data: accountResult.value, error: null }
        : { data: [], error: errorMessage(accountResult.reason) },
  };
}
