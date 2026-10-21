"use client";

/**
 * Trang chủ:
 * - Kéo thả hoặc chọn file .csv / .xlsx để tải lên và kiểm tra schema.
 * - Nút "Sử dụng dữ liệu mẫu OULAD" nạp trực tiếp file `student_risk_looker_studio.csv`.
 * - Hiển thị thông báo lỗi thiếu cột tiếng Việt rõ ràng.
 * - Bảng Data Preview hiển thị dữ liệu sau khi nạp thành công.
 */

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { loadSampleDataset, uploadDatasetFile } from "@/lib/api";
import { useDataStore } from "@/store/useDataStore";

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { sessionId, filename, totalRows, previewRows, setSessionData } =
    useDataStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Xử lý tải file CSV/XLSX từ máy người dùng
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await uploadDatasetFile(file);
      setSessionData({
        sessionId: res.session_id,
        filename: res.filename,
        totalRows: res.total_rows,
        previewRows: res.preview,
      });
      setSuccessMessage(res.message);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi không xác định khi tải file."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý nạp trực tiếp file mẫu student_risk_looker_studio.csv
  const handleLoadSample = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await loadSampleDataset();
      setSessionData({
        sessionId: res.session_id,
        filename: res.filename,
        totalRows: res.total_rows,
        previewRows: res.preview,
      });
      setSuccessMessage(res.message);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Không thể nạp dữ liệu mẫu từ máy chủ Backend."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      void handleFileUpload(droppedFile);
    }
  };

  return (
    <div className="space-y-8">
      {/* Phần Header giới thiệu hệ thống */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white p-6 md:p-8 shadow-md">
        <div className="max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Đồ án Tốt nghiệp • Learning Analytics & Personalization
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Hệ thống Phân tích Học tập & Cá nhân hóa Lộ trình Sinh viên OULAD
          </h1>
          <p className="text-sm md:text-base text-indigo-100 leading-relaxed">
            Tự động chuẩn hóa dữ liệu hành vi học tập (VLE Clicks, Điểm số, Tiến
            độ nộp bài), phân cụm K-Means (k=4), đối chiếu mức độ rủi ro và thiết
            kế lộ trình học tập kèm email nhắc nhở riêng cho từng sinh viên.
          </p>
        </div>
      </div>

      {/* Khu vực Nạp dữ liệu (Kéo-thả File + Nút nạp dữ liệu mẫu) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ô kéo thả file CSV/XLSX */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`lg:col-span-2 rounded-2xl border-2 border-dashed p-6 md:p-8 transition-all flex flex-col items-center justify-center text-center ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) {
                void handleFileUpload(selected);
              }
            }}
          />

          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
            {isLoading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
            Kéo và thả tệp dữ liệu (.csv, .xlsx) vào đây
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
            Hệ thống sẽ tự động kiểm tra 20 cột chuẩn của{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs">
              student_risk_looker_studio.csv
            </code>
            , chạy mô hình K-Means và trích xuất điểm rủi ro.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Chọn tệp từ máy tính
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleLoadSample}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm transition-colors"
            >
              <Database className="w-4 h-4" />
              Sử dụng dữ liệu mẫu OULAD
            </button>
          </div>
        </div>

        {/* Khối hướng dẫn Schema 20 cột chuẩn */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
              Quy chuẩn dữ liệu đầu vào
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Bộ dữ liệu mặc định{" "}
              <strong>student_risk_looker_studio.csv</strong> gồm 5.983 bản ghi
              sinh viên OULAD với 20 trường chuẩn:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "id_student",
                "module_presentation_length",
                "num_of_prev_attempts",
                "studied_credits",
                "date_registration",
                "total_assessments_submitted",
                "avg_score",
                "weighted_score",
                "total_clicks",
                "log_total_clicks",
                "active_days",
                "forum_clicks",
                "content_clicks",
                "quiz_clicks",
                "actual_target",
                "risk_probability",
                "predicted_risk",
                "cluster_id",
                "cluster_name",
                "risk_level",
              ].map((col) => (
                <span
                  key={col}
                  className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            Mẹo: Nhấn nút{" "}
            <strong className="text-emerald-600 dark:text-emerald-400">
              &ldquo;Sử dụng dữ liệu mẫu OULAD&rdquo;
            </strong>{" "}
            để trải nghiệm ngay toàn bộ tính năng mà không cần tải tệp lên.
          </div>
        </div>
      </div>

      {/* Thông báo Lỗi Schema hoặc Thành công */}
      {errorMessage && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm space-y-1">
            <div className="font-bold">
              Không thể nạp dữ liệu (Lỗi kiểm tra Schema / Định dạng):
            </div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-4 flex flex-wrap items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2.5 text-xs md:text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Mở Dashboard Phân tích <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/ca-nhan-hoa"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              Cá nhân hóa Lộ trình <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Bảng Data Preview sau khi nạp thành công */}
      {sessionId && previewRows.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Xem trước Dữ liệu & Kết quả Phân cụm (Data Preview)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hiển thị {previewRows.length} bản ghi đầu tiên trên tổng số{" "}
                <strong>{totalRows.toLocaleString("vi-VN")}</strong> sinh viên từ
                tệp <strong>{filename}</strong>
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Xem toàn bộ trên Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2.5 px-3">Mã SV</th>
                  <th className="py-2.5 px-3">Độ dài HP</th>
                  <th className="py-2.5 px-3">Tín chỉ</th>
                  <th className="py-2.5 px-3">Bài đã nộp</th>
                  <th className="py-2.5 px-3">Điểm TB</th>
                  <th className="py-2.5 px-3">Điểm trọng số</th>
                  <th className="py-2.5 px-3">Tổng Clicks</th>
                  <th className="py-2.5 px-3">Ngày HĐ</th>
                  <th className="py-2.5 px-3">Cụm gốc CSV</th>
                  <th className="py-2.5 px-3">Cụm K-Means (k=4)</th>
                  <th className="py-2.5 px-3">Điểm rủi ro</th>
                  <th className="py-2.5 px-3">Mức rủi ro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {previewRows.map((row) => (
                  <tr
                    key={row.id_student}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      #{row.id_student}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.module_presentation_length} ngày
                    </td>
                    <td className="py-2.5 px-3">{row.studied_credits}</td>
                    <td className="py-2.5 px-3">
                      {row.total_assessments_submitted}
                    </td>
                    <td className="py-2.5 px-3 font-medium">{row.avg_score}</td>
                    <td className="py-2.5 px-3">{row.weighted_score}</td>
                    <td className="py-2.5 px-3">
                      {row.total_clicks.toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2.5 px-3">{row.active_days}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {row.original_cluster_name}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {row.kmeans_cluster_name}
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {row.risk_score.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          row.risk_level_standard === "Cao"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300"
                            : row.risk_level_standard === "Trung bình"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                        }`}
                      >
                        {row.risk_level_standard}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
