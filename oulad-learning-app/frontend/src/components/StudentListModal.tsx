"use client";

/**
 * Modal Popup hiển thị danh sách sinh viên ngay khi người dùng nhấn vào các thẻ KPI
 * (Tổng sinh viên, Số ca Nguy cơ Cao, Điểm rủi ro trung bình...).
 * Hỗ trợ:
 * - Chuyển nhanh giữa các tab mức độ rủi ro (Tất cả / Nguy cơ Cao / Trung bình / An toàn)
 * - Tìm kiếm nhanh theo Mã SV (id_student)
 * - Sắp xếp theo Điểm rủi ro / Điểm TB / Lượt Clicks
 * - Xuất CSV danh sách đang kiểm tra hoặc chuyển thẳng tới trang Lộ trình Cá nhân hóa của SV.
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Search,
  Users,
  X,
} from "lucide-react";
import { downloadWatchlistCsv, fetchWatchlist } from "@/lib/api";
import { useDataStore } from "@/store/useDataStore";
import { WatchlistQueryParams } from "@/types";

interface StudentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  modalTitle: string;
  baseQueryParams: WatchlistQueryParams;
  initialRiskLevel?: string;
}

export function StudentListModal({
  isOpen,
  onClose,
  sessionId,
  modalTitle,
  baseQueryParams,
  initialRiskLevel = "ALL",
}: StudentListModalProps) {
  const router = useRouter();
  const { setSelectedStudentId } = useDataStore();

  const [riskTab, setRiskTab] = useState<string>(initialRiskLevel);
  const [searchCode, setSearchCode] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("risk_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  // Đồng bộ tab rủi ro khi mở modal từ các thẻ KPI khác nhau
  useEffect(() => {
    if (isOpen) {
      setRiskTab(initialRiskLevel);
      setSearchCode("");
      setPage(1);
    }
  }, [isOpen, initialRiskLevel]);

  // Đóng popup khi nhấn phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const modalQuery: WatchlistQueryParams = {
    ...baseQueryParams,
    risk_level: riskTab,
    search: searchCode,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    page_size: pageSize,
  };

  const { data, isLoading } = useSWR(
    isOpen ? ["modal-student-list", sessionId, modalQuery] : null,
    () => fetchWatchlist(sessionId, modalQuery),
    { keepPreviousData: true }
  );

  if (!isOpen) return null;

  const handleInspectStudent = (idStudent: number) => {
    setSelectedStudentId(idStudent);
    onClose();
    router.push(`/ca-nhan-hoa?id_student=${idStudent}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Lớp nền mờ Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Hộp thoại Popup chính */}
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header Popup */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base md:text-lg text-slate-900 dark:text-white truncate">
                {modalTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đang hiển thị{" "}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {(data?.total_filtered ?? 0).toLocaleString("vi-VN")}
                </strong>{" "}
                sinh viên khớp điều kiện • Nhấn &ldquo;Kiểm tra lộ trình&rdquo;
                để xem chi tiết từng ca
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => downloadWatchlistCsv(sessionId, modalQuery)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải CSV danh sách này</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Đóng cửa sổ"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thanh chuyển nhanh nhóm Rủi ro & Tìm kiếm mã SV */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs mức rủi ro */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "Tất cả sinh viên" },
              { id: "Cao", label: "Nguy cơ Cao" },
              { id: "Trung bình", label: "Nguy cơ Trung bình" },
              { id: "Thấp", label: "An toàn (Thấp)" },
            ].map((tab) => {
              const active = riskTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setRiskTab(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? tab.id === "Cao"
                        ? "bg-rose-600 text-white shadow-xs"
                        : tab.id === "Trung bình"
                        ? "bg-amber-500 text-white shadow-xs"
                        : tab.id === "Thấp"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tìm nhanh Mã SV & Sắp xếp */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => {
                  setSearchCode(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm mã SV (VD: 512582)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [col, ord] = e.target.value.split(":");
                setSortBy(col);
                setSortOrder(ord as "asc" | "desc");
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
            >
              <option value="risk_score:desc">Rủi ro: Cao → Thấp</option>
              <option value="risk_score:asc">Rủi ro: Thấp → Cao</option>
              <option value="avg_score:asc">Điểm TB: Thấp → Cao</option>
              <option value="avg_score:desc">Điểm TB: Cao → Thấp</option>
              <option value="active_days:asc">Ngày HĐ: Ít → Nhiều</option>
            </select>
          </div>
        </div>

        {/* Nội dung bảng danh sách sinh viên cuộn dọc */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    Mã SV
                  </th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    Cụm K-Means
                  </th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    Điểm rủi ro
                  </th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    Mức rủi ro
                  </th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    Điểm TB / Trọng số
                  </th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    Bài đã nộp
                  </th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    Clicks / Ngày HĐ
                  </th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap text-right">
                    Kiểm tra
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {isLoading && !data ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx}>
                      <td colSpan={8} className="py-3 px-3">
                        <div className="h-5 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : !data || data.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-slate-500 dark:text-slate-400"
                    >
                      Không có sinh viên nào trong nhóm này.
                    </td>
                  </tr>
                ) : (
                  data.items.map((st) => (
                    <tr
                      key={st.id_student}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        #{st.id_student}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {st.kmeans_cluster_name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Học phần: {st.module_presentation_length} ngày • Học
                          lại: {st.num_of_prev_attempts} lần
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {st.risk_score.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-400">/100</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            st.risk_level_standard === "Cao"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300"
                              : st.risk_level_standard === "Trung bình"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                          }`}
                        >
                          {st.risk_level_standard}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <strong>{st.avg_score}</strong>{" "}
                        <span className="text-slate-400">
                          ({st.weighted_score})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {st.total_assessments_submitted} bài
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {st.total_clicks.toLocaleString("vi-VN")} clicks /{" "}
                        {st.active_days} ngày
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleInspectStudent(st.id_student)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors"
                        >
                          Kiểm tra lộ trình
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Phân trang của Popup */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>
            Tổng cộng:{" "}
            <strong>
              {(data?.total_filtered ?? 0).toLocaleString("vi-VN")}
            </strong>{" "}
            sinh viên
          </span>

          <div className="flex items-center gap-2">
            <span>
              Trang <strong>{data?.page ?? 1}</strong> /{" "}
              <strong>{data?.total_pages ?? 1}</strong>
            </span>
            <button
              type="button"
              disabled={(data?.page ?? 1) <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={(data?.page ?? 1) >= (data?.total_pages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
