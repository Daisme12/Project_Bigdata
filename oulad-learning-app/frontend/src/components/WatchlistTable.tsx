"use client";

/**
 * Bảng Watchlist sử dụng TanStack Table v8 kết hợp bộ lọc đa chiều:
 * Lọc theo độ dài học phần (module_presentation_length), cụm K-Means, mức độ rủi ro,
 * khoảng điểm rủi ro, tìm kiếm mã SV, sắp xếp cột, phân trang và xuất CSV.
 */

import React from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  StudentPreviewRecord,
  WatchlistFilterOptions,
  WatchlistQueryParams,
} from "@/types";
import { downloadWatchlistCsv } from "@/lib/api";
import { useDataStore } from "@/store/useDataStore";

interface WatchlistTableProps {
  sessionId: string;
  items: StudentPreviewRecord[];
  totalFiltered: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filterOptions: WatchlistFilterOptions;
  queryParams: WatchlistQueryParams;
  isLoading: boolean;
  onUpdateQuery: (next: Partial<WatchlistQueryParams>) => void;
  onResetFilters: () => void;
}

export function WatchlistTable({
  sessionId,
  items,
  totalFiltered,
  page,
  pageSize,
  totalPages,
  filterOptions,
  queryParams,
  isLoading,
  onUpdateQuery,
  onResetFilters,
}: WatchlistTableProps) {
  const router = useRouter();
  const { setSelectedStudentId } = useDataStore();

  const handleNavigateToStudent = (idStudent: number) => {
    setSelectedStudentId(idStudent);
    router.push(`/ca-nhan-hoa?id_student=${idStudent}`);
  };

  const handleSort = (columnId: string) => {
    const isSameCol = queryParams.sort_by === columnId;
    const nextOrder =
      isSameCol && queryParams.sort_order === "desc" ? "asc" : "desc";
    onUpdateQuery({ sort_by: columnId, sort_order: nextOrder, page: 1 });
  };

  // Định nghĩa các cột bằng TanStack Table
  const columns: ColumnDef<StudentPreviewRecord>[] = [
    {
      accessorKey: "id_student",
      header: () => (
        <button
          type="button"
          onClick={() => handleSort("id_student")}
          className="inline-flex items-center gap-1 font-semibold hover:text-indigo-600"
        >
          Mã SV <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
          #{row.original.id_student}
        </span>
      ),
    },
    {
      accessorKey: "module_presentation_length",
      header: "Độ dài HP (ngày)",
      cell: ({ row }) => (
        <span>{row.original.module_presentation_length} ngày</span>
      ),
    },
    {
      accessorKey: "kmeans_cluster_name",
      header: "Cụm K-Means (k=4)",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.kmeans_cluster_name}
          </div>
          <div className="text-[11px] text-slate-400">
            Gốc CSV: {row.original.original_cluster_name}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "risk_score",
      header: () => (
        <button
          type="button"
          onClick={() => handleSort("risk_score")}
          className="inline-flex items-center gap-1 font-semibold hover:text-indigo-600"
        >
          Điểm rủi ro <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
      cell: ({ row }) => {
        const score = row.original.risk_score;
        return (
          <div>
            <span className="font-bold text-slate-900 dark:text-white">
              {score.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400"> /100</span>
          </div>
        );
      },
    },
    {
      accessorKey: "risk_level_standard",
      header: "Mức rủi ro",
      cell: ({ row }) => {
        const level = row.original.risk_level_standard;
        const badgeStyle =
          level === "Cao"
            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800"
            : level === "Trung bình"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
        return (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}
          >
            {level}
          </span>
        );
      },
    },
    {
      accessorKey: "avg_score",
      header: () => (
        <button
          type="button"
          onClick={() => handleSort("avg_score")}
          className="inline-flex items-center gap-1 font-semibold hover:text-indigo-600"
        >
          Điểm TB / Trọng số <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span>
          <strong className="text-slate-800 dark:text-slate-200">
            {row.original.avg_score}
          </strong>{" "}
          <span className="text-slate-400">
            ({row.original.weighted_score})
          </span>
        </span>
      ),
    },
    {
      accessorKey: "total_clicks",
      header: () => (
        <button
          type="button"
          onClick={() => handleSort("total_clicks")}
          className="inline-flex items-center gap-1 font-semibold hover:text-indigo-600"
        >
          Lượt Clicks <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <span>{row.original.total_clicks.toLocaleString("vi-VN")}</span>
      ),
    },
    {
      accessorKey: "active_days",
      header: () => (
        <button
          type="button"
          onClick={() => handleSort("active_days")}
          className="inline-flex items-center gap-1 font-semibold hover:text-indigo-600"
        >
          Ngày HĐ <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      ),
      cell: ({ row }) => <span>{row.original.active_days} ngày</span>,
    },
    {
      id: "actions",
      header: "Hành động",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => handleNavigateToStudent(row.original.id_student)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900 transition-colors"
        >
          Lộ trình <ExternalLink className="w-3 h-3" />
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
      {/* Tiêu đề & Nút tải CSV */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            Danh sách Ưu tiên Theo dõi & Can thiệp (Watchlist)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tìm thấy{" "}
            <strong className="text-slate-900 dark:text-white">
              {totalFiltered.toLocaleString("vi-VN")}
            </strong>{" "}
            sinh viên khớp điều kiện lọc
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Đặt lại bộ lọc
          </button>

          <button
            type="button"
            onClick={() => downloadWatchlistCsv(sessionId, queryParams)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất CSV danh sách lọc
          </button>
        </div>
      </div>

      {/* Thanh công cụ lọc đa chiều */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
        {/* Tìm kiếm mã SV */}
        <div>
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
            Tìm Mã Sinh viên
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={queryParams.search || ""}
              onChange={(e) =>
                onUpdateQuery({ search: e.target.value, page: 1 })
              }
              placeholder="VD: 512582..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Lọc theo Độ dài học phần (Module length) */}
        <div>
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
            Độ dài học phần (Module)
          </label>
          <select
            value={queryParams.module ?? ""}
            onChange={(e) =>
              onUpdateQuery({
                module: e.target.value ? Number(e.target.value) : null,
                page: 1,
              })
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="">Tất cả học phần</option>
            {filterOptions.modules.map((mod) => (
              <option key={mod} value={mod}>
                {mod} ngày
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo Cụm K-Means */}
        <div>
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
            Cụm K-Means
          </label>
          <select
            value={queryParams.cluster || "ALL"}
            onChange={(e) =>
              onUpdateQuery({ cluster: e.target.value, page: 1 })
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">Tất cả 4 cụm</option>
            {filterOptions.clusters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo Mức rủi ro */}
        <div>
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
            Mức độ rủi ro
          </label>
          <select
            value={queryParams.risk_level || "ALL"}
            onChange={(e) =>
              onUpdateQuery({ risk_level: e.target.value, page: 1 })
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">Tất cả mức rủi ro</option>
            {filterOptions.risk_levels.map((lvl) => (
              <option key={lvl} value={lvl}>
                Mức: {lvl}
              </option>
            ))}
          </select>
        </div>

        {/* Khoảng điểm rủi ro tối thiểu */}
        <div>
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
            Điểm rủi ro tối thiểu: {queryParams.min_risk ?? 0}
          </label>
          <input
            type="range"
            min={0}
            max={95}
            step={5}
            value={queryParams.min_risk ?? 0}
            onChange={(e) =>
              onUpdateQuery({ min_risk: Number(e.target.value), page: 1 })
            }
            className="w-full accent-indigo-600 mt-1.5"
          />
        </div>
      </div>

      {/* Bảng dữ liệu TanStack Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/30"
              >
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="py-3 px-3 font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx}>
                  <td colSpan={columns.length} className="py-3.5 px-3">
                    <div className="h-5 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 text-center text-slate-500 dark:text-slate-400"
                >
                  Không tìm thấy sinh viên nào phù hợp với điều kiện lọc hiện
                  tại.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3 px-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Hiển thị mỗi trang:</span>
          <select
            value={pageSize}
            onChange={(e) =>
              onUpdateQuery({ page_size: Number(e.target.value), page: 1 })
            }
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            {[10, 15, 25, 50].map((sz) => (
              <option key={sz} value={sz}>
                {sz} dòng
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span>
            Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onUpdateQuery({ page: page - 1 })}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onUpdateQuery({ page: page + 1 })}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
