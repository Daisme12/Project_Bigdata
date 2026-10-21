"use client";

/**
 * Trang Dashboard Phân tích Học tập:
 * - Thanh Bộ lọc nhanh 4 tiêu chí ở ngay đầu trang (Học phần, Cụm K-Means, Mức rủi ro, Lịch sử học lại)
 *   tác động đồng bộ lên cả KPI, Biểu đồ Cụm/PCA và Bảng Watchlist.
 * - 3 thẻ KPI tổng quan (Tổng số SV, Số ca nguy cơ cao, Điểm rủi ro trung bình)
 * - Biểu đồ phân bố cụm K-Means (Bar/Pie) và biểu đồ phân tán PCA 2D
 * - Bảng Watchlist có bộ lọc chi tiết, sắp xếp, phân trang và xuất CSV.
 */

import React, { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Database,
  History,
  Layers,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  fetchDashboardClusters,
  fetchDashboardKpi,
  fetchWatchlist,
} from "@/lib/api";
import { useDataStore } from "@/store/useDataStore";
import { KpiCard } from "@/components/KpiCard";
import { ClusterChart } from "@/components/ClusterChart";
import { WatchlistTable } from "@/components/WatchlistTable";
import { StudentListModal } from "@/components/StudentListModal";
import { WatchlistQueryParams } from "@/types";

const INITIAL_QUERY: WatchlistQueryParams = {
  module: null,
  cluster: "ALL",
  risk_level: "ALL",
  prev_attempts: "ALL",
  min_risk: 0,
  max_risk: 100,
  search: "",
  sort_by: "risk_score",
  sort_order: "desc",
  page: 1,
  page_size: 15,
};

export default function DashboardPage() {
  const { sessionId, filename } = useDataStore();
  const [watchlistParams, setWatchlistParams] =
    useState<WatchlistQueryParams>(INITIAL_QUERY);

  // State điều khiển Popup danh sách sinh viên khi ấn vào các thẻ KPI
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    riskLevel: string;
  }>({
    isOpen: false,
    title: "",
    riskLevel: "ALL",
  });

  const handleUpdateParams = (next: Partial<WatchlistQueryParams>) => {
    setWatchlistParams((prev) => ({ ...prev, ...next }));
  };

  // Gọi đồng bộ KPI, Clusters và Watchlist theo cùng bộ lọc nhanh
  const quickFilterKey = sessionId
    ? [
        sessionId,
        watchlistParams.module ?? "",
        watchlistParams.cluster ?? "ALL",
        watchlistParams.risk_level ?? "ALL",
        watchlistParams.prev_attempts ?? "ALL",
      ]
    : null;

  const {
    data: kpiData,
    error: kpiError,
    isLoading: kpiLoading,
  } = useSWR(
    quickFilterKey ? ["dashboard-kpi", ...quickFilterKey] : null,
    () => fetchDashboardKpi(sessionId!, watchlistParams),
    { keepPreviousData: true }
  );

  const {
    data: clustersData,
    error: clustersError,
    isLoading: clustersLoading,
  } = useSWR(
    quickFilterKey ? ["dashboard-clusters", ...quickFilterKey] : null,
    () => fetchDashboardClusters(sessionId!, watchlistParams),
    { keepPreviousData: true }
  );

  const {
    data: watchlistData,
    error: watchlistError,
    isLoading: watchlistLoading,
  } = useSWR(
    sessionId ? ["dashboard-watchlist", sessionId, watchlistParams] : null,
    () => fetchWatchlist(sessionId!, watchlistParams),
    { keepPreviousData: true }
  );

  // Empty State khi người dùng chưa nạp dữ liệu
  if (!sessionId) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center max-w-xl mx-auto my-12 shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <Database className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Chưa có dữ liệu phân tích trong phiên hiện tại
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Vui lòng quay về Trang chủ để tải tệp CSV/XLSX hoặc nhấn nút &ldquo;Sử
          dụng dữ liệu mẫu OULAD&rdquo; để khởi tạo Dashboard.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay về Trang chủ nạp dữ liệu
        </Link>
      </div>
    );
  }

  const anyError = kpiError || clustersError || watchlistError;
  const moduleOptions = watchlistData?.filter_options?.modules || [
    234, 240, 241, 261, 262, 268, 269,
  ];
  const clusterOptions = watchlistData?.filter_options?.clusters || [
    "Rời bỏ sớm",
    "Suy giảm dần",
    "Chăm chỉ nhưng điểm thấp",
    "Ổn định tốt",
  ];

  const hasActiveQuickFilter =
    watchlistParams.module !== null ||
    (watchlistParams.cluster && watchlistParams.cluster !== "ALL") ||
    (watchlistParams.risk_level && watchlistParams.risk_level !== "ALL") ||
    (watchlistParams.prev_attempts && watchlistParams.prev_attempts !== "ALL");

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard Phân tích Học tập & Cảnh báo Sớm
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Nguồn dữ liệu đang phân tích:{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {filename}
            </strong>
          </p>
        </div>

        <Link
          href="/ca-nhan-hoa"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
        >
          Chuyển sang Cá nhân hóa Lộ trình
        </Link>
      </div>

      {/* THANH BỘ LỌC NHANH (4 TIÊU CHÍ) NGAY TRÊN ĐẦU DASHBOARD */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Bộ lọc nhanh toàn Dashboard (4 tiêu chí)</span>
          </div>

          {hasActiveQuickFilter && (
            <button
              type="button"
              onClick={() => setWatchlistParams(INITIAL_QUERY)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Xóa lọc nhanh
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Bộ lọc 1: Độ dài học phần (Module) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
              1. Kỳ / Độ dài Học phần
            </label>
            <select
              value={watchlistParams.module ?? ""}
              onChange={(e) =>
                handleUpdateParams({
                  module: e.target.value ? Number(e.target.value) : null,
                  page: 1,
                })
              }
              className="w-full px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tất cả học phần ({moduleOptions.length} kỳ)</option>
              {moduleOptions.map((mod) => (
                <option key={mod} value={mod}>
                  Học phần {mod} ngày
                </option>
              ))}
            </select>
          </div>

          {/* Bộ lọc 2: Nhóm Phân cụm K-Means */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              <Layers className="w-3.5 h-3.5 text-violet-500" />
              2. Cụm Hành vi K-Means
            </label>
            <select
              value={watchlistParams.cluster || "ALL"}
              onChange={(e) =>
                handleUpdateParams({ cluster: e.target.value, page: 1 })
              }
              className="w-full px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả 4 cụm hành vi</option>
              {clusterOptions.map((c) => (
                <option key={c} value={c}>
                  Cụm: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Bộ lọc 3: Mức độ Rủi ro */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              3. Mức độ Rủi ro Học tập
            </label>
            <select
              value={watchlistParams.risk_level || "ALL"}
              onChange={(e) =>
                handleUpdateParams({ risk_level: e.target.value, page: 1 })
              }
              className="w-full px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả mức độ rủi ro</option>
              <option value="Cao">Nguy cơ Cao (Cần can thiệp)</option>
              <option value="Trung bình">Nguy cơ Trung bình</option>
              <option value="Thấp">An toàn (Rủi ro Thấp)</option>
            </select>
          </div>

          {/* Bộ lọc 4: Lịch sử Học lại (num_of_prev_attempts) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              <History className="w-3.5 h-3.5 text-amber-500" />
              4. Lịch sử Học lại Môn
            </label>
            <select
              value={watchlistParams.prev_attempts || "ALL"}
              onChange={(e) =>
                handleUpdateParams({ prev_attempts: e.target.value, page: 1 })
              }
              className="w-full px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả sinh viên</option>
              <option value="0">Học lần đầu (0 lần học lại)</option>
              <option value="1+">Đã từng học lại (≥ 1 lần)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hiển thị lỗi nếu phiên hết hạn */}
      {anyError && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-4 flex items-start justify-between gap-3 text-rose-700 dark:text-rose-300">
          <div className="flex items-start gap-2.5 text-xs md:text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Không thể tải dữ liệu Dashboard:</div>
              <div>
                {anyError instanceof Error
                  ? anyError.message
                  : "Lỗi kết nối máy chủ Backend."}
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white shrink-0"
          >
            Nạp lại dữ liệu
          </Link>
        </div>
      )}

      {/* 3 Thẻ KPI tổng quan (Ấn vào từng thẻ sẽ bật Popup danh sách SV tương ứng) */}
      {kpiLoading && !kpiData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-36 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 animate-pulse"
            />
          ))}
        </div>
      ) : kpiData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Tổng số Sinh viên Phân tích"
            value={kpiData.total_students.toLocaleString("vi-VN")}
            subtitle={`Điểm TB: ${kpiData.avg_score}/100 • Hoạt động: ${kpiData.avg_active_days} ngày`}
            badgeText={`Đồng thuận: ${kpiData.kmeans_agreement_rate}%`}
            actionLabel="Xem toàn bộ SV"
            variant="indigo"
            icon={<Users className="w-6 h-6" />}
            onClick={() =>
              setModalConfig({
                isOpen: true,
                title: "Danh sách Toàn bộ Sinh viên đang Phân tích",
                riskLevel: "ALL",
              })
            }
          />

          <KpiCard
            title="Số ca Nguy cơ Bỏ học Cao"
            value={kpiData.high_risk_count.toLocaleString("vi-VN")}
            subtitle={`TB: ${kpiData.medium_risk_count.toLocaleString(
              "vi-VN"
            )} SV • An toàn: ${kpiData.low_risk_count.toLocaleString(
              "vi-VN"
            )} SV`}
            badgeText={`${kpiData.high_risk_percentage}% nhóm lọc`}
            actionLabel="Kiểm tra các ca này"
            variant="rose"
            icon={<AlertOctagon className="w-6 h-6" />}
            onClick={() =>
              setModalConfig({
                isOpen: true,
                title: "Danh sách Sinh viên Nguy cơ Bỏ học Cao cần Can thiệp",
                riskLevel: "Cao",
              })
            }
          />

          <KpiCard
            title="Điểm Rủi ro Trung bình"
            value={`${kpiData.avg_risk_score} / 100`}
            subtitle={`Chuyên gia (Heuristic): ${kpiData.avg_heuristic_risk_score}/100`}
            badgeText="Thang 0 - 100"
            actionLabel="Tra cứu điểm rủi ro"
            variant="amber"
            icon={<Activity className="w-6 h-6" />}
            onClick={() =>
              setModalConfig({
                isOpen: true,
                title: "Bảng xếp hạng Điểm Rủi ro Sinh viên (Từ cao xuống thấp)",
                riskLevel: watchlistParams.risk_level || "ALL",
              })
            }
          />
        </div>
      ) : null}

      {/* Biểu đồ Phân bố Cụm K-Means & PCA 2D Scatter */}
      {clustersLoading && !clustersData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 animate-pulse" />
          <div className="h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 animate-pulse" />
        </div>
      ) : clustersData ? (
        <ClusterChart
          clusters={clustersData.clusters}
          scatterPoints={clustersData.scatter_points}
        />
      ) : null}

      {/* Bảng Watchlist kèm bộ lọc & xuất CSV */}
      <WatchlistTable
        sessionId={sessionId}
        items={watchlistData?.items || []}
        totalFiltered={watchlistData?.total_filtered || 0}
        page={watchlistData?.page || 1}
        pageSize={watchlistData?.page_size || 15}
        totalPages={watchlistData?.total_pages || 1}
        filterOptions={
          watchlistData?.filter_options || {
            modules: [],
            clusters: [],
            risk_levels: ["Cao", "Trung bình", "Thấp"],
          }
        }
        queryParams={watchlistParams}
        isLoading={watchlistLoading}
        onUpdateQuery={handleUpdateParams}
        onResetFilters={() => setWatchlistParams(INITIAL_QUERY)}
      />

      {/* Popup Modal hiển thị danh sách sinh viên khi ấn vào thẻ KPI */}
      <StudentListModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        sessionId={sessionId}
        modalTitle={modalConfig.title}
        baseQueryParams={watchlistParams}
        initialRiskLevel={modalConfig.riskLevel}
      />
    </div>
  );
}
