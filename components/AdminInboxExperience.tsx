"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, MailPlus, Send, ShieldCheck } from "lucide-react";
import { MemoryPageShell } from "@/components/MemoryNav";
import type { PublicUserAccount } from "@/data/accounts";
import type { UserFeedback } from "@/data/feedback";

type FeedbackPayload = { feedback: UserFeedback[] };
type AccountsPayload = { users: PublicUserAccount[] };

async function getJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as T & { error?: string };
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}

export default function AdminInboxExperience() {
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [users, setUsers] = useState<PublicUserAccount[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    const [feedbackPayload, accountPayload] = await Promise.all([
      getJson<FeedbackPayload>("/api/admin-feedback"),
      getJson<AccountsPayload>("/api/accounts"),
    ]);
    setFeedback(feedbackPayload.feedback);
    setUsers(accountPayload.users);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const [feedbackPayload, accountPayload] = await Promise.all([
          getJson<FeedbackPayload>("/api/admin-feedback"),
          getJson<AccountsPayload>("/api/accounts"),
        ]);
        if (cancelled) return;
        setFeedback(feedbackPayload.feedback);
        setUsers(accountPayload.users);
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const verifiedUsers = useMemo(
    () => users.filter((user) => user.email && user.emailVerifiedAt).sort((left, right) => left.username.localeCompare(right.username)),
    [users],
  );

  const toggleEmail = (email: string) => {
    setSelectedEmails((current) =>
      current.includes(email) ? current.filter((item) => item !== email) : [...current, email],
    );
  };

  const setAll = () => setSelectedEmails(verifiedUsers.map((user) => user.email!).filter(Boolean));

  const markResolved = async (id: string) => {
    try {
      await fetch("/api/admin-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", id }),
      }).then(async (response) => {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) throw new Error(data?.error || "操作失败");
      });
      await load();
      setStatus("反馈状态已更新。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "操作失败");
    }
  };

  const sendMail = async () => {
    if (!subject.trim() || !body.trim() || selectedEmails.length === 0) return;
    setSending(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, emails: selectedEmails }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "发送失败");
      setStatus(`邮件已提交，目标 ${selectedEmails.length} 人。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  return (
    <MemoryPageShell active="settings">
      <div className="mx-auto max-w-7xl">
        <header className="theme-card theme-floating-shadow rounded-[8px] border p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/78 px-3 py-1.5 text-xs font-semibold text-[#5A6670]/68">
                <ShieldCheck className="h-4 w-4 text-[#D86F82]" />
                Admin operations
              </div>
              <h1 className="mt-5 text-[clamp(30px,5vw,54px)] font-semibold leading-[0.96] text-[#273846]">管理员收件箱</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5A6670]/68">
                这里集中处理两件事：用户反馈收件箱，以及通过 Resend 面向已验证邮箱用户发送单发或群发邮件。
              </p>
            </div>
            <div className="rounded-[8px] border border-[#D6E8F0]/70 bg-[#F6FBFF] px-4 py-3 text-sm text-[#5A6670]/72">
              <p>已验证邮箱用户：{verifiedUsers.length}</p>
              <p className="mt-1">待处理反馈：{feedback.filter((item) => item.status === "new").length}</p>
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="theme-card theme-floating-shadow rounded-[8px] border p-5">
            <div className="flex items-center gap-3">
              <Inbox className="h-5 w-5 text-[#D86F82]" />
              <div>
                <p className="text-sm font-semibold text-[#344451]">用户反馈收件箱</p>
                <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">反馈提交后会先进入这里，再由管理员决定是否标记已处理。</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {loading && <p className="text-sm text-[#5A6670]/58">加载中…</p>}
              {!loading && feedback.length === 0 && <p className="text-sm text-[#5A6670]/58">还没有用户反馈。</p>}
              {feedback.map((item) => (
                <article key={item.id} className="rounded-[8px] border border-[#D8DDD8]/72 bg-white/68 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#344451]">{item.displayName} · {item.username}</p>
                      <p className="mt-1 text-xs text-[#5A6670]/56">{item.email || "未绑定邮箱"} · {new Date(item.createdAt).toLocaleString("zh-CN")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#F5DCE0]/62 px-2.5 py-1 text-xs font-semibold text-[#D86F82]">{item.category}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#5A6670]">{item.status}</span>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#344451]">{item.message}</p>
                  <div className="mt-4 flex justify-end">
                    <button
                      className="inline-flex min-h-9 items-center rounded-[7px] border border-[#D8DDD8]/80 bg-white/72 px-3 text-xs font-semibold text-[#5A6670]"
                      type="button"
                      onClick={() => markResolved(item.id)}
                      disabled={item.status === "resolved"}
                    >
                      {item.status === "resolved" ? "已处理" : "标记已处理"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="theme-card theme-floating-shadow rounded-[8px] border p-5">
            <div className="flex items-center gap-3">
              <MailPlus className="h-5 w-5 text-[#D86F82]" />
              <div>
                <p className="text-sm font-semibold text-[#344451]">邮件发送中心</p>
                <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">只面向已验证邮箱用户。支持逐个勾选，也支持一键全选。</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-9 items-center rounded-[7px] border border-[#D8DDD8]/80 bg-white/72 px-3 text-xs font-semibold text-[#5A6670]"
                type="button"
                onClick={setAll}
              >
                全选已验证邮箱
              </button>
              <button
                className="inline-flex min-h-9 items-center rounded-[7px] border border-[#D8DDD8]/80 bg-white/72 px-3 text-xs font-semibold text-[#5A6670]"
                type="button"
                onClick={() => setSelectedEmails([])}
              >
                清空选择
              </button>
            </div>

            <div className="mt-4 grid max-h-[280px] gap-2 overflow-auto rounded-[8px] border border-[#D8DDD8]/72 bg-[#FAFBF7]/72 p-3">
              {verifiedUsers.map((user) => (
                <label key={user.id} className="flex items-center gap-3 rounded-[7px] border border-white/82 bg-white/78 px-3 py-2 text-sm text-[#344451]">
                  <input
                    checked={selectedEmails.includes(user.email!)}
                    onChange={() => toggleEmail(user.email!)}
                    type="checkbox"
                  />
                  <span className="min-w-0 flex-1 truncate">{user.displayName} · {user.email}</span>
                </label>
              ))}
            </div>

            <input
              className="mt-4 min-h-11 w-full rounded-[8px] border border-[#D8DDD8]/82 bg-white/78 px-3 text-sm text-[#344451] outline-none transition focus:border-[#E8B8C2]"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="邮件主题"
            />
            <textarea
              className="mt-3 min-h-[180px] w-full rounded-[8px] border border-[#D8DDD8]/82 bg-white/78 px-3 py-3 text-sm leading-7 text-[#344451] outline-none transition focus:border-[#E8B8C2]"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="邮件正文"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#5A6670]/56">{status || `当前已选 ${selectedEmails.length} 人`}</p>
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#273846] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(39,56,70,0.16)] transition hover:-translate-y-0.5 disabled:opacity-45"
                type="button"
                onClick={sendMail}
                disabled={sending || !subject.trim() || !body.trim() || selectedEmails.length === 0}
              >
                <Send className="h-4 w-4" />
                {sending ? "发送中" : "发送邮件"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </MemoryPageShell>
  );
}
