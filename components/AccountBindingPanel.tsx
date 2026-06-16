"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, HeartHandshake, Loader2, Send, X } from "lucide-react";
import type { AccountBindingRequest, PublicUserAccount } from "@/data/accounts";

type BindingPayload = {
  user: PublicUserAccount;
  partner: PublicUserAccount | null;
  inviteCode?: string;
};

const postBinding = async (payload: Record<string, unknown>) => {
  const response = await fetch("/api/account-binding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorPayload?.error ?? "操作失败");
  }

  return (await response.json()) as BindingPayload;
};

const requestTitle = (request: AccountBindingRequest, currentUserId: string) => {
  const other =
    request.fromUserId === currentUserId
      ? request.toDisplayName || request.toUsername
      : request.fromDisplayName || request.fromUsername;

  if (request.status === "accepted") return `已和 ${other} 完成绑定`;
  if (request.status === "declined") return `${other} 已拒绝`;
  if (request.status === "cancelled") return "邀请已取消";

  return request.fromUserId === currentUserId ? `等待 ${other} 同意` : `${other} 想和你绑定`;
};

export default function AccountBindingPanel({
  compact = false,
  className = "",
}: Readonly<{ compact?: boolean; className?: string }>) {
  const [profile, setProfile] = useState<BindingPayload | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    const response = await fetch("/api/account-binding", { cache: "no-store" });
    if (!response.ok) throw new Error("请先使用注册账号登录");
    return (await response.json()) as BindingPayload;
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProfile()
        .then((payload) => setProfile(payload))
        .catch(() => setNotice("使用注册账号登录后，可以在这里进行情侣绑定。"))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const pendingRequests = useMemo(
    () => (profile?.user.bindingRequests ?? []).filter((request) => request.status === "pending"),
    [profile?.user.bindingRequests],
  );

  const run = async (payload: Record<string, unknown>, successText: string) => {
    setSaving(true);
    setNotice("");

    try {
      const nextProfile = await postBinding(payload);
      setProfile(nextProfile);
      if (nextProfile.inviteCode) setInviteCode(nextProfile.inviteCode);
      setNotice(successText);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "操作失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteCode || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(inviteCode).catch(() => undefined);
    setNotice("邀请码已复制。");
  };

  return (
    <section
      className={`rounded-[8px] border border-white/72 bg-white/62 p-4 shadow-[0_18px_54px_rgba(90,102,112,0.08)] backdrop-blur-2xl ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#344451]">情侣绑定</p>
          <p className="mt-1 text-xs leading-5 text-[#5A6670]/58">
            {profile?.partner
              ? `已绑定 ${profile.partner.displayName || profile.partner.username}`
              : "输入邀请码后会先发送邀请，双方同意才正式绑定。"}
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F5DCE0]/70 text-[#D86F82]">
          <HeartHandshake className="h-5 w-5" />
        </span>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#5A6670]/54">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在读取绑定状态
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {profile?.partner && (
            <div className="grid gap-3">
              <div className="rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/72 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#344451]">
                      {profile.user.displayName || profile.user.username} / {profile.partner.displayName || profile.partner.username}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#5A6670]/52">已完成绑定，可以直接进入情侣空间继续处理约定、菜单和订单。</p>
                  </div>
                  <span className="rounded-full bg-[#F5DCE0]/50 px-3 py-1 text-xs font-semibold text-[#D86F82]">已绑定</span>
                </div>
                <div className={`mt-3 grid gap-2 ${compact ? "" : "sm:grid-cols-3"}`}>
                  <div className="rounded-[7px] border border-white/70 bg-white/70 px-3 py-2">
                    <p className="text-[11px] font-semibold text-[#5A6670]/48">我的昵称</p>
                    <p className="mt-1 text-sm font-semibold text-[#344451]">{profile.user.displayName || profile.user.username}</p>
                  </div>
                  <div className="rounded-[7px] border border-white/70 bg-white/70 px-3 py-2">
                    <p className="text-[11px] font-semibold text-[#5A6670]/48">对方昵称</p>
                    <p className="mt-1 text-sm font-semibold text-[#344451]">{profile.partner.displayName || profile.partner.username}</p>
                  </div>
                  <div className="rounded-[7px] border border-white/70 bg-white/70 px-3 py-2">
                    <p className="text-[11px] font-semibold text-[#5A6670]/48">待处理邀请</p>
                    <p className="mt-1 text-sm font-semibold text-[#344451]">{pendingRequests.length} 条</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!profile?.partner && (
            <>
              <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-[1fr_auto]"}`}>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#273846] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(39,56,70,0.16)] transition hover:-translate-y-0.5 disabled:opacity-50"
                  type="button"
                  onClick={() => void run({ action: "generateInvite" }, "邀请码已生成，发给对方后等待确认。")}
                  disabled={saving || !profile}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
                  生成我的邀请码
                </button>

                {inviteCode && (
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-[#F5DCE0] bg-[#F5DCE0]/45 px-4 text-sm font-semibold text-[#D86F82]"
                    type="button"
                    onClick={() => void copyInvite()}
                  >
                    <Copy className="h-4 w-4" />
                    {inviteCode}
                  </button>
                )}
              </div>

              <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-[1fr_auto]"}`}>
                <input
                  className="min-h-11 rounded-[8px] border border-[#D8DDD8]/88 bg-[#FAFBF7]/78 px-3 text-sm uppercase outline-none transition focus:border-[#E8B8C2]"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="输入对方邀请码"
                />
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-[#D8DDD8]/88 bg-white/72 px-4 text-sm font-semibold text-[#344451] transition hover:-translate-y-0.5 hover:border-[#E8B8C2] disabled:opacity-50"
                  type="button"
                  onClick={() => void run({ action: "sendRequest", inviteCode: joinCode }, "邀请已发送，等待双方确认。")}
                  disabled={saving || !profile || joinCode.trim().length < 4}
                >
                  <Send className="h-4 w-4" />
                  发送邀请
                </button>
              </div>
            </>
          )}

          {pendingRequests.length > 0 && (
            <div className="grid gap-2">
              {pendingRequests.map((request) => {
                const needsMyApproval =
                  profile?.user.id === request.fromUserId ? !request.fromAccepted : !request.toAccepted;

                return (
                  <article key={request.id} className="rounded-[8px] border border-[#D8DDD8]/70 bg-[#FAFBF7]/72 p-3">
                    <p className="text-sm font-semibold text-[#344451]">
                      {requestTitle(request, profile?.user.id ?? "")}
                    </p>
                    <p className="mt-1 text-xs text-[#5A6670]/52">
                      {request.fromDisplayName} 与 {request.toDisplayName}
                    </p>
                    {needsMyApproval && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="inline-flex min-h-9 items-center gap-1 rounded-[7px] bg-[#D86F82] px-3 text-xs font-semibold text-white disabled:opacity-50"
                          type="button"
                          onClick={() => void run({ action: "respond", requestId: request.id, accept: true }, "已同意，等待对方确认。")}
                          disabled={saving}
                        >
                          <Check className="h-4 w-4" />
                          同意
                        </button>
                        <button
                          className="inline-flex min-h-9 items-center gap-1 rounded-[7px] border border-[#D8DDD8]/80 bg-white/70 px-3 text-xs font-semibold text-[#5A6670] disabled:opacity-50"
                          type="button"
                          onClick={() => void run({ action: "respond", requestId: request.id, accept: false }, "已拒绝这次邀请。")}
                          disabled={saving}
                        >
                          <X className="h-4 w-4" />
                          拒绝
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {notice && (
        <div className="mt-3 rounded-[8px] border border-[#D6E8F0] bg-[#D6E8F0]/42 px-3 py-2 text-xs font-semibold leading-5 text-[#5A6670]">
          {notice}
        </div>
      )}
    </section>
  );
}
