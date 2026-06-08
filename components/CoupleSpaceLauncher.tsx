"use client";

import { useState } from "react";
import { Heart, Sparkles, X } from "lucide-react";
import CoupleHub from "@/components/CoupleHub";

export default function CoupleSpaceLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex justify-center px-4">
        <button
          className="liquid-dock pointer-events-auto group flex min-h-16 items-center gap-3 rounded-full border border-white/72 bg-white/42 px-4 pr-6 text-sm font-semibold text-[#344451] shadow-[0_24px_70px_rgba(90,102,112,0.22)] backdrop-blur-2xl transition duration-300 hover:-translate-y-2 hover:scale-[1.03] hover:bg-white/58"
          type="button"
          onClick={() => setOpen(true)}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-[#F5DCE0]/72 text-[#D86F82] shadow-[0_16px_38px_rgba(216,111,130,0.18)] transition duration-300 group-hover:scale-110 group-hover:bg-[#D86F82] group-hover:text-white">
            <Heart className="h-6 w-6 fill-current" />
          </span>
          <span className="leading-tight">
            情侣空间
            <span className="block text-[11px] font-semibold text-[#5A6670]/48">约定 · 菜单 · 订单</span>
          </span>
          <Sparkles className="h-4 w-4 text-[#D86F82]/72 transition group-hover:rotate-12" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-[#273846]/24 px-3 py-4 backdrop-blur-2xl sm:px-6 sm:py-8">
          <button
            className="absolute inset-0 cursor-default"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="关闭情侣空间背景"
          />
          <div className="liquid-panel relative mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[8px] border border-white/76 bg-[#FAFBF7]/76 shadow-[0_36px_110px_rgba(39,56,70,0.26)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/70 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#F5DCE0]/74 text-[#D86F82]">
                  <Heart className="h-5 w-5 fill-current" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#344451]">情侣空间</p>
                  <p className="text-xs text-[#5A6670]/56">约定、菜单和订单都在这里处理</p>
                </div>
              </div>
              <button
                className="grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/60 text-[#5A6670]/62 transition hover:border-[#E8B8C2] hover:text-[#D86F82]"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭情侣空间"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-4 py-5 sm:px-6">
              <CoupleHub embedded />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
