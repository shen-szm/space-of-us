"use client";

import Image from "next/image";
import Link from "next/link";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";
import { useEffect, useId, useRef, useState } from "react";
import {
  Archive,
  BookOpen,
  CalendarDays,
  ExternalLink,
  HandHeart,
  Heart,
  Map as MapIcon,
  MessageCircleMore,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { APP_VERSION } from "@/lib/appVersion";

export type MemoryNavKey =
  | "map"
  | "couple"
  | "memories"
  | "favorites"
  | "anniversaries"
  | "capsule"
  | "feedback"
  | "settings";

type NavItem = {
  key: MemoryNavKey;
  label: string;
  icon: typeof MapIcon;
  href: string;
};

const navItems = [
  { key: "map", label: "\u5730\u56fe", icon: MapIcon, href: "/map" },
  { key: "couple", label: "\u60c5\u4fa3\u4e2d\u5fc3", icon: Heart, href: "/couple" },
  { key: "memories", label: "\u56de\u5fc6\u8bb0\u5f55", icon: BookOpen, href: "/memories" },
  { key: "favorites", label: "\u5730\u70b9\u6536\u85cf", icon: Heart, href: "/favorites" },
  { key: "anniversaries", label: "\u7eaa\u5ff5\u65e5", icon: CalendarDays, href: "/anniversaries" },
  { key: "capsule", label: "\u65f6\u5149\u5b9d\u76d2", icon: Archive, href: "/time-capsule" },
  { key: "settings", label: "\u8bbe\u7f6e", icon: Settings, href: "/settings" },
  { key: "feedback", label: "\u610f\u89c1\u53cd\u9988", icon: MessageCircleMore, href: "/feedback" },
] satisfies NavItem[];

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const getFocusableElements = (container: HTMLElement | null) => {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
  );
};

const focusFirstDialogElement = (container: HTMLElement | null) => {
  const [firstElement] = getFocusableElements(container);
  firstElement?.focus();
};

const trapDialogTabKey = (event: KeyboardEvent, container: HTMLElement | null) => {
  if (event.key !== "Tab") return;

  const elements = getFocusableElements(container);
  if (elements.length === 0) {
    event.preventDefault();
    return;
  }

  const firstElement = elements[0];
  const lastElement = elements[elements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
};

function NavLinks({ active, compact = false }: Readonly<{ active: MemoryNavKey; compact?: boolean }>) {
  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const selected = item.key === active;

        return (
          <Link
            key={item.key}
            aria-current={selected ? "page" : undefined}
            className={
              compact
                ? `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    selected
                      ? "border-[color-mix(in_srgb,var(--accent-primary)_18%,white)] bg-[var(--accent-wash)] text-[var(--accent-primary)]"
                      : "border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-card)_74%,white)] theme-text-muted"
                  }`
                : `flex w-full items-center gap-3 rounded-[8px] border px-4 py-3 text-sm font-medium transition ${
                    selected
                      ? "border-[color-mix(in_srgb,var(--accent-primary)_18%,white)] bg-[var(--accent-wash)] text-[var(--accent-primary)]"
                      : "border-transparent theme-text-muted hover:border-[var(--border-soft)] hover:bg-[color-mix(in_srgb,var(--surface-card)_58%,white)]"
                  }`
            }
            href={item.href}
          >
            <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

function MobileMemoryNav({ active }: Readonly<{ active: MemoryNavKey }>) {
  return (
    <nav
      aria-label="Primary navigation"
      className="theme-shell sticky top-0 z-40 -mx-6 mb-6 border-b px-4 py-3 shadow-[0_10px_24px_rgba(90,102,112,0.06)] backdrop-blur lg:hidden sm:-mx-10 sm:px-6"
    >
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <NavLinks active={active} compact />
      </div>
    </nav>
  );
}

type SupportDialogProps = {
  closeLabel: string;
  imageAlt: string;
  imageClassName: string;
  imagePriority?: boolean;
  labelledBy: string;
  title: string;
  dialogRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  children?: ReactNode;
};

function SupportDialog({
  closeLabel,
  imageAlt,
  imageClassName,
  imagePriority = false,
  labelledBy,
  title,
  dialogRef,
  onClose,
  onKeyDown,
  children,
}: Readonly<SupportDialogProps>) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#344451]/66 px-6 py-10 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        aria-labelledby={labelledBy}
        aria-modal="true"
        className="relative max-h-full w-full max-w-[980px] overflow-auto rounded-[12px] bg-white p-3 shadow-[0_28px_80px_rgba(52,68,81,0.28)]"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <h2 className="sr-only" id={labelledBy}>
          {title}
        </h2>
        <button
          aria-label={closeLabel}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D8DDD8]/80 bg-white/88 text-[#5A6670] transition hover:border-[#E8B8C2] hover:text-[#D86F82]"
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
        {children}
        <Image
          alt={imageAlt}
          className={imageClassName}
          height={1599}
          priority={imagePriority}
          src="/photos/support-qr.jpg"
          width={1280}
        />
      </div>
    </div>
  );
}

export function MemorySidebar({ active }: Readonly<{ active: MemoryNavKey }>) {
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportPreviewOpen, setSupportPreviewOpen] = useState(false);
  const supportDialogRef = useRef<HTMLDivElement>(null);
  const supportPreviewDialogRef = useRef<HTMLDivElement>(null);
  const supportTriggerRef = useRef<HTMLButtonElement>(null);
  const supportPreviewTriggerRef = useRef<HTMLButtonElement>(null);
  const supportTitleId = useId();
  const supportPreviewTitleId = useId();

  useEffect(() => {
    const activeDialog = supportPreviewOpen ? supportPreviewDialogRef.current : supportOpen ? supportDialogRef.current : null;
    if (!activeDialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => focusFirstDialogElement(activeDialog), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (supportPreviewOpen) {
          setSupportPreviewOpen(false);
          return;
        }

        setSupportOpen(false);
        return;
      }

      trapDialogTabKey(event, activeDialog);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [supportOpen, supportPreviewOpen]);

  useEffect(() => {
    if (!supportOpen) supportTriggerRef.current?.focus();
  }, [supportOpen]);

  useEffect(() => {
    if (!supportPreviewOpen) supportPreviewTriggerRef.current?.focus();
  }, [supportPreviewOpen]);

  return (
    <aside className="theme-shell hidden min-h-screen w-[260px] shrink-0 border-r px-5 py-8 shadow-[12px_0_34px_rgba(90,102,112,0.04)] backdrop-blur lg:block">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center">
          <Heart className="h-10 w-10 fill-[var(--accent-highlight)] text-[color-mix(in_srgb,var(--accent-primary)_72%,white)]" />
        </div>
        <p className="theme-text-main mt-2 text-lg font-semibold">\u6211\u4eec\u7684\u5730\u56fe</p>
        <p className="theme-text-soft mt-1 text-xs">\u53ea\u5c5e\u4e8e\u4e24\u4e2a\u4eba\u7684\u56de\u5fc6\u7a7a\u95f4</p>
      </div>

      <nav aria-label="Primary navigation" className="mt-10 space-y-2">
        <NavLinks active={active} />
      </nav>

      <div className="theme-card theme-floating-shadow mt-10 rounded-[8px] border p-4 text-sm leading-7 theme-text-muted">
        \u5728\u5730\u56fe\u7684\u6bcf\u4e2a\u89d2\u843d\uff0c\u6162\u6162\u6536\u85cf\u4f60\u4eec\u4e00\u8d77\u8d70\u8fc7\u3001\u60f3\u53bb\u3001\u60f3\u8bb0\u4f4f\u7684\u6545\u4e8b\u3002
        <Heart className="ml-1 inline h-3.5 w-3.5 fill-[var(--accent-highlight)] text-[color-mix(in_srgb,var(--accent-primary)_72%,white)]" />
      </div>

      <div className="theme-card theme-floating-shadow mt-4 overflow-hidden rounded-[8px] border p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-3.5 w-3.5 fill-[var(--accent-highlight)] text-[color-mix(in_srgb,var(--accent-primary)_72%,white)]" />
          <p className="theme-text-main text-xs font-semibold">\u5173\u4e8e\u8fd9\u4e2a\u7a7a\u95f4</p>
        </div>
        <p className="theme-text-muted mt-2 text-xs leading-6">
          \u8fd9\u91cc\u7528\u6765\u88c5\u4e0b\u4e24\u4e2a\u4eba\u7684\u57ce\u5e02\u8db3\u8ff9\u3001\u7eaa\u5ff5\u65e5\u3001\u5fc3\u613f\u6e05\u5355\uff0c\u8fd8\u6709\u90a3\u4e9b\u53ea\u60f3\u7559\u7ed9\u5f7c\u6b64\u7684\u5c0f\u7ea6\u5b9a\u3002
        </p>

        <div className="theme-divider mt-3 border-t pt-3">
          <p className="theme-text-soft text-[11px] font-semibold">\u8fd9\u91cc\u4f1a\u8bb0\u5f55\u4ec0\u4e48</p>
          <p className="theme-text-muted mt-1 text-xs leading-6">
            \u60f3\u5403\u7684\u5c0f\u5e97\u3001\u60f3\u559d\u7684\u5976\u8336\u3001\u60f3\u4e00\u8d77\u53bb\u7684\u5730\u65b9\u3001\u5df2\u7ecf\u53d1\u751f\u7684\u77ac\u95f4\uff0c\u90fd\u53ef\u4ee5\u88ab\u8f7b\u8f7b\u653e\u8fdb Space of us\u3002
          </p>
        </div>

        <div className="theme-divider mt-3 border-t pt-3">
          <p className="theme-text-soft text-[11px] font-semibold">\u6211\u4eec\u7684\u7ea6\u5b9a</p>
          <div className="mt-2 rounded-[7px] border border-[color-mix(in_srgb,var(--accent-primary)_18%,white)] bg-[var(--accent-wash)] px-3 py-2 text-xs leading-6 theme-text-muted">
            \u4e0d\u8d76\u65f6\u95f4\uff0c\u4e0d\u6015\u9057\u5fd8\u3002\u628a\u559c\u6b22\u7684\u4e8b\u60c5\u4e00\u4ef6\u4ef6\u5b58\u4e0b\u6765\uff0c\u7b49\u6709\u7a7a\u7684\u65f6\u5019\u4e00\u8d77\u5b8c\u6210\u3002
          </div>
        </div>

        <div className="theme-divider mt-3 border-t pt-3">
          <p className="theme-text-soft text-[11px] font-semibold">\u7075\u611f\u6765\u6e90</p>
          <div className="theme-text-muted mt-2 space-y-2 text-xs leading-6">
            <p>\u611f\u8c22\u539f\u4f5c\u8005\u7684\u5f00\u6e90\u5206\u4eab\u3002</p>
            <p>
              GitHub\uff1a
              <a
                className="ml-1 inline-flex items-center gap-1 text-[var(--accent-primary)] underline decoration-[var(--accent-highlight)] underline-offset-2 transition hover:opacity-80"
                href="https://github.com/zkeyoned/map-of-us-template"
                rel="noreferrer"
                target="_blank"
              >
                github.com/zkeyoned/map-of-us-template
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <p>\u6296\u97f3 ID\uff1asz00726yd</p>
          </div>
        </div>

        <div className="theme-divider mt-3 border-t pt-3">
          <p className="theme-text-soft text-[11px] font-semibold">\u8d5e\u52a9\u652f\u6301</p>
          <p className="theme-text-muted mt-2 text-xs leading-6">
            \u5982\u679c\u8fd9\u4e2a\u9879\u76ee\u5bf9\u4f60\u6709\u5e2e\u52a9\uff0c\u613f\u610f\u7684\u8bdd\u53ef\u4ee5\u901a\u8fc7\u8d5e\u52a9\u652f\u6301\u7ee7\u7eed\u5b8c\u5584 Space of us\u3002
          </p>
          <button
            ref={supportTriggerRef}
            aria-haspopup="dialog"
            aria-expanded={supportOpen}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,var(--accent-primary)_18%,white)] bg-[var(--accent-wash)] px-3 py-2 text-xs font-semibold text-[var(--accent-primary)] transition hover:opacity-88"
            type="button"
            onClick={() => setSupportOpen(true)}
          >
            <HandHeart className="h-3.5 w-3.5" />
            \u613f\u610f\u652f\u6301
          </button>
        </div>

        <div className="theme-divider mt-3 flex items-center justify-between gap-3 border-t pt-3 text-[11px] font-semibold text-[color-mix(in_srgb,var(--accent-primary)_70%,white)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Space of us</span>
          </div>
          <span className="rounded-full border border-[color-mix(in_srgb,var(--accent-primary)_18%,white)] bg-[var(--accent-wash)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--accent-primary)]">
            {APP_VERSION}
          </span>
        </div>
      </div>

      {supportOpen && (
        <SupportDialog
          closeLabel="\u5173\u95ed\u8d5e\u52a9\u56fe\u7247"
          dialogRef={supportDialogRef}
          imageAlt="\u8d5e\u52a9\u652f\u6301\u6536\u6b3e\u7801"
          imageClassName="h-auto w-full rounded-[8px]"
          imagePriority
          labelledBy={supportTitleId}
          onClose={() => setSupportOpen(false)}
          onKeyDown={(event) => trapDialogTabKey(event.nativeEvent, supportDialogRef.current)}
          title="\u8d5e\u52a9\u652f\u6301"
        >
          <button
            ref={supportPreviewTriggerRef}
            aria-label="\u6253\u5f00\u5927\u56fe\u9884\u89c8"
            className="relative mx-auto mb-3 block w-full max-w-[920px]"
            type="button"
            onClick={() => setSupportPreviewOpen(true)}
          >
            <span className="sr-only">\u6253\u5f00\u8d5e\u52a9\u4e8c\u7ef4\u7801\u5927\u56fe</span>
          </button>
        </SupportDialog>
      )}

      {supportPreviewOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#161F27]/88 px-4 py-6 backdrop-blur-md" onClick={() => setSupportPreviewOpen(false)}>
          <div
            ref={supportPreviewDialogRef}
            aria-labelledby={supportPreviewTitleId}
            aria-modal="true"
            className="max-h-full w-full overflow-auto"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => trapDialogTabKey(event.nativeEvent, supportPreviewDialogRef.current)}
          >
            <h2 className="sr-only" id={supportPreviewTitleId}>
              \u8d5e\u52a9\u4e8c\u7ef4\u7801\u5927\u56fe\u9884\u89c8
            </h2>
            <button
              aria-label="Close full preview"
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20"
              type="button"
              onClick={() => setSupportPreviewOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto w-full max-w-[1280px]">
              <Image alt="Support QR preview" className="h-auto w-full rounded-[10px]" height={1599} src="/photos/support-qr.jpg" width={1280} />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export function MemoryPageShell({
  active,
  children,
}: Readonly<{
  active: MemoryNavKey;
  children: ReactNode;
}>) {
  const [adminSession, setAdminSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/accounts", { cache: "no-store" })
      .then((response) => {
        if (!cancelled) setAdminSession(response.ok);
      })
      .catch(() => {
        if (!cancelled) setAdminSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="theme-page relative min-h-screen overflow-hidden">
      <div className="map-mist-band" aria-hidden="true" />
      <span className="absolute left-[38%] top-[9%] h-2 w-2 rounded-full bg-[var(--accent-highlight)]" aria-hidden="true" />
      <span className="absolute right-[17%] top-[15%] h-2 w-2 rounded-full bg-[var(--accent-secondary)]" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen">
        <MemorySidebar active={active} />
        <section className="min-w-0 flex-1 px-6 py-8 sm:px-10">
          <MobileMemoryNav active={active} />
          {children}
        </section>
      </div>
      {adminSession && (
        <Link
          className="theme-card theme-floating-shadow fixed bottom-5 right-5 z-50 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold theme-text-main backdrop-blur-2xl transition hover:-translate-y-0.5 hover:text-[var(--accent-primary)]"
          href="/"
        >
          <ShieldCheck className="h-4 w-4" />
          \u8fd4\u56de\u63a7\u5236\u53f0
        </Link>
      )}
    </main>
  );
}
