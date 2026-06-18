"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock, MessageCircleMore, Send, Sparkles } from "lucide-react";
import { MemoryPageShell } from "@/components/MemoryNav";
import type { PublicUserAccount } from "@/data/accounts";
import type { UserFeedbackCategory } from "@/data/feedback";

const categories: Array<{ value: UserFeedbackCategory; label: string; note: string }> = [
  { value: "experience", label: "使用体验", note: "页面结构、交互感受、节奏问题" },
  { value: "bug", label: "问题反馈", note: "异常、报错、状态不同步等" },
  { value: "idea", label: "功能建议", note: "你希望补进来的功能或流程" },
  { value: "other", label: "其他", note: "不方便归类的内容" },
];

async function fetchUser() {
  const response = await fetch("/api/account/security", { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as { user?: PublicUserAccount; error?: string } | null;
  if (!response.ok || !data?.user) {
    throw new Error(data?.error || "加载账户信息失败");
  }
  return data.user;
}

export default function FeedbackExperience() {
  const [user, setUser] = useState<PublicUserAccount | null>(null);
  const [category, setCategory] = useState<UserFeedbackCategory>("experience");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const successDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    fetchUser()
      .then(setUser)
      .catch((error) => setStatus(error instanceof Error ? error.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const dialog = successDialogRef.current;
    if (!dialog) return;
    if (successOpen && !dialog.open) dialog.showModal();
    if (!successOpen && dialog.open) dialog.close();
  }, [successOpen]);

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "提交失败");
      setMessage("");
      setStatus("");
      setSuccessOpen(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MemoryPageShell active="feedback">
      <div className="mx-auto max-w-5xl">
        <header className="theme-card theme-floating-shadow overflow-hidden rounded-[8px] border p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/78 px-3 py-1.5 text-xs font-semibold text-[#5A6670]/68">
                <Sparkles className="h-4 w-4 text-[#D86F82]" />
                Feedback channel
              </div>
              <h1 className="mt-5 text-[clamp(30px,5vw,54px)] font-semibold leading-[0.96] text-[#273846]">意见反馈</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5A6670]/68">
                这里是用户唯一的反馈入口。提交后会直接进入管理员后台收件箱，普通用户不能查看其他反馈内容。
              </p>
            </div>
            <div className="rounded-[8px] border border-[#F5DCE0]/72 bg-[#FDF4F6] px-4 py-3 text-sm text-[#5A6670]/70">
              <p className="font-semibold text-[#344451]">{loading ? "读取中…" : user?.displayName || user?.username || "当前账户"}</p>
              <p className="mt-1 text-xs">{user?.email || "未绑定邮箱"}</p>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="theme-card theme-floating-shadow rounded-[8px] border p-5">
            <div className="flex items-center gap-3">
              <MessageCircleMore className="h-5 w-5 text-[#D86F82]" />
              <div>
                <p className="text-sm font-semibold text-[#344451]">反馈类型</p>
                <p className="mt-1 text-sm leading-6 text-[#5A6670]/62">先选一个最接近的分类，方便管理员后续整理。</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {categories.map((item) => (
                <button
                  key={item.value}
                  className={`rounded-[8px] border p-4 text-left transition ${
                    category === item.value
                      ? "border-[#E8B8C2] bg-[#FDF4F6] shadow-[0_14px_30px_rgba(216,111,130,0.08)]"
                      : "border-[#D8DDD8]/78 bg-white/60 hover:-translate-y-0.5"
                  }`}
                  type="button"
                  onClick={() => setCategory(item.value)}
                >
                  <p className="text-sm font-semibold text-[#344451]">{item.label}</p>
                  <p className="mt-1 text-xs leading-6 text-[#5A6670]/58">{item.note}</p>
                </button>
              ))}
            </div>

            <div className="theme-soft mt-4 rounded-[8px] border px-4 py-3 text-sm text-[#5A6670]/66">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 text-[#D86F82]" />
                <p>提交后仅管理员后台 `/admin/inbox` 可见，普通账户不会看到反馈列表。</p>
              </div>
            </div>
          </div>

          <div className="theme-card theme-floating-shadow rounded-[8px] border p-5">
            <p className="text-sm font-semibold text-[#344451]">写给管理员</p>
            <p className="mt-2 text-sm leading-6 text-[#5A6670]/62">
              尽量写清页面、操作路径、预期和实际结果。功能建议也可以直接描述你希望它如何工作。
            </p>
            <textarea
              className="mt-4 min-h-[260px] w-full rounded-[8px] border border-[#D8DDD8]/82 bg-[#FAFBF7]/78 px-4 py-3 text-sm leading-7 text-[#344451] outline-none transition focus:border-[#E8B8C2]"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="例如：情侣订单完成后，希望发送方可以补一条反馈，并且双方历史里都能看到。"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#5A6670]/52">
                {status || "发送后会写入管理员收件箱，并在邮件链路可用时同步提醒管理员。"}
              </p>
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#273846] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(39,56,70,0.16)] transition hover:-translate-y-0.5 disabled:opacity-45"
                type="button"
                onClick={submit}
                disabled={submitting || !message.trim()}
              >
                <Send className="h-4 w-4" />
                {submitting ? "发送中" : "提交反馈"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <dialog
        ref={successDialogRef}
        className="m-auto w-[min(90vw,400px)] rounded-[14px] border-0 bg-white p-0 text-[#344451] shadow-[0_24px_64px_rgba(39,56,70,0.24)] backdrop:bg-[#273846]/48 backdrop:backdrop-blur-sm"
        onClose={() => setSuccessOpen(false)}
      >
        <div className="p-6 text-center sm:p-7">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FDF4F6] text-[#D86F82]">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-[#273846]">反馈已提交</h2>
          <p className="mt-2 text-sm leading-7 text-[#5A6670]">内容已发送到管理员收件箱。</p>
          <button
            autoFocus
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#273846] px-5 text-sm font-semibold text-white transition hover:bg-[#344451] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D86F82]"
            type="button"
            onClick={() => setSuccessOpen(false)}
          >
            知道了
          </button>
        </div>
      </dialog>
    </MemoryPageShell>
  );
}
