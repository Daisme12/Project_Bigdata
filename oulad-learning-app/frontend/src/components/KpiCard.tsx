"use client";

/**
 * Thẻ hiển thị chỉ số KPI tổng quan trên Dashboard.
 * Hỗ trợ nhấn trực tiếp vào thẻ (onClick) để mở Popup danh sách sinh viên chi tiết.
 */

import React from "react";
import { ArrowUpRight } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  badgeText?: string;
  actionLabel?: string;
  variant?: "indigo" | "rose" | "amber" | "emerald";
  icon: React.ReactNode;
  onClick?: () => void;
}

const VARIANT_STYLES: Record<
  NonNullable<KpiCardProps["variant"]>,
  { iconBg: string; badge: string; hoverBorder: string }
> = {
  indigo: {
    iconBg:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400",
    badge:
      "bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800",
    hoverBorder:
      "hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md",
  },
  rose: {
    iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400",
    badge:
      "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800",
    hoverBorder:
      "hover:border-rose-400 dark:hover:border-rose-500 hover:shadow-md",
  },
  amber: {
    iconBg:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400",
    badge:
      "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800",
    hoverBorder:
      "hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md",
  },
  emerald: {
    iconBg:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400",
    badge:
      "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800",
    hoverBorder:
      "hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md",
  },
};

export function KpiCard({
  title,
  value,
  subtitle,
  badgeText,
  actionLabel = "Xem danh sách",
  variant = "indigo",
  icon,
  onClick,
}: KpiCardProps) {
  const style = VARIANT_STYLES[variant];

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between transition-all ${
        onClick ? `cursor-pointer hover:-translate-y-0.5 ${style.hoverBorder}` : ""
      }`}
    >
      {/* Hàng trên: Tiêu đề, Giá trị chính + Badge nằm gọn trên 1 dòng và Icon */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
            {title}
          </p>
          <div className="flex flex-wrap items-baseline gap-2.5 mt-1.5">
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
              {value}
            </h3>
            {badgeText && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 ${style.badge}`}
              >
                {badgeText}
              </span>
            )}
          </div>
        </div>

        <div className={`p-2.5 rounded-xl shrink-0 ${style.iconBg}`}>
          {icon}
        </div>
      </div>

      {/* Hàng dưới: Subtitle gọn 1 dòng + Nút gợi ý mở Popup */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <span
          className="text-xs text-slate-500 dark:text-slate-400 truncate"
          title={subtitle}
        >
          {subtitle}
        </span>

        {onClick && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap shrink-0 group-hover:translate-x-0.5 transition-transform">
            {actionLabel}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
