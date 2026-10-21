"use client";

/**
 * Menu điều hướng dạng Hamburger nổi (Floating Overlay Drawer):
 * - Mặc định ẩn hoàn toàn cột bên trái để giải phóng 100% không gian màn hình.
 * - Nút Hamburger nổi cố định ở góc trên bên trái (fixed/absolute z-50).
 * - Khi nhấn vào mới trượt/hiện khung điều hướng nổi lên trên cùng kèm lớp nền mờ (Backdrop).
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  Database,
  GitBranch,
  GraduationCap,
  Home,
  Menu,
  Moon,
  Sun,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useDataStore } from "@/store/useDataStore";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Trang chủ",
    href: "/",
    icon: Home,
    description: "Nạp & kiểm tra dữ liệu OULAD",
  },
  {
    label: "Dashboard Phân tích",
    href: "/dashboard",
    icon: BarChart3,
    description: "KPI, Phân cụm K-Means & Watchlist",
  },
  {
    label: "Cá nhân hóa Lộ trình",
    href: "/ca-nhan-hoa",
    icon: UserCheck,
    description: "Hồ sơ SV, lộ trình & gửi nhắc nhở",
  },
  {
    label: "Cơ chế & Khung Lộ trình",
    href: "/co-che-lo-trinh",
    icon: GitBranch,
    description: "Mô hình Lai 2 tầng & 4 lộ trình hiện có",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const {
    sessionId,
    filename,
    totalRows,
    darkMode,
    toggleDarkMode,
    clearSession,
  } = useDataStore();

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Đồng bộ trạng thái client mount & chế độ Dark Mode
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode, mounted]);

  // Tự động đóng menu khi chuyển trang
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Đóng menu khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const hasData = mounted && Boolean(sessionId);

  return (
    <>
      {/* Nút Hamburger nổi hẳn lên trên góc trái (chỉ hiện khi menu đang đóng) */}
      {!isOpen && (
        <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Mở menu điều hướng"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-lg hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all"
          >
            <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold tracking-wide hidden sm:inline">
              Menu
            </span>
            {hasData && (
              <span
                className="w-2 h-2 rounded-full bg-emerald-500"
                title={`Đã nạp ${totalRows.toLocaleString("vi-VN")} sinh viên`}
              />
            )}
          </button>
        </div>
      )}

      {/* Lớp nền mờ (Backdrop) phủ lên toàn trang khi mở menu */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Ngăn kéo Menu nổi tuyệt đối (Fixed/Absolute Overlay Drawer) */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-80 max-w-[88vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        <div>
          {/* Header của Menu nổi + Nút đóng (X) + Nút Sáng/Tối */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                  OULAD Analytics
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Phân tích & Cá nhân hóa
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleDarkMode}
                title="Chuyển đổi chế độ Sáng / Tối"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {mounted && darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Đóng menu"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Danh sách liên kết điều hướng */}
          <nav className="p-4 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/70"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mt-0.5 shrink-0 ${
                      isActive
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                  <div>
                    <div className="text-sm">{item.label}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Trạng thái phiên dữ liệu ở chân Menu */}
        <div className="p-4 m-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Trạng thái dữ liệu
            </span>
            {hasData ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã nạp
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <XCircle className="w-3.5 h-3.5" />
                Chưa nạp
              </span>
            )}
          </div>

          {hasData ? (
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <p className="truncate" title={filename || ""}>
                <span className="text-slate-400">Tệp:</span>{" "}
                <span className="font-medium">{filename}</span>
              </p>
              <p>
                <span className="text-slate-400">Quy mô:</span>{" "}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {totalRows.toLocaleString("vi-VN")} sinh viên
                </span>
              </p>
              <button
                type="button"
                onClick={clearSession}
                className="mt-2 w-full py-1.5 px-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors"
              >
                Xóa phiên dữ liệu hiện tại
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chưa có dữ liệu trong phiên làm việc. Hãy nạp dữ liệu mẫu hoặc tải
              file CSV tại Trang chủ.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
