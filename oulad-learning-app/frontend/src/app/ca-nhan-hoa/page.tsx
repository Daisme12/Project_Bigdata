"use client";

/**
 * Trang Cá nhân hóa Lộ trình Học tập & Gửi Email Nhắc nhở:
 * - Ô chọn / tìm kiếm mã sinh viên (Combobox trực quan)
 * - Thẻ hồ sơ sinh viên + đối chiếu cụm K-Means với cụm gốc + điểm rủi ro
 * - Lộ trình học tập cá nhân hóa theo cụm (Micro-learning, Bài tập bổ trợ, Mục tiêu tuần)
 * - Trình soạn thảo & xem trước Email nhắc nhở (Dry Run) và gửi thật qua Gmail SMTP.
 */

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Database,
  Eye,
  Loader2,
  Mail,
  MousePointerClick,
  Search,
  Send,
  User,
} from "lucide-react";
import {
  fetchStudentList,
  fetchStudentPersonalization,
  sendStudentReminder,
} from "@/lib/api";
import { useDataStore } from "@/store/useDataStore";
import { PathCard } from "@/components/PathCard";

function PersonalizeContent() {
  const searchParams = useSearchParams();
  const queryStudentId = searchParams.get("id_student");

  const { sessionId, selectedStudentId, setSelectedStudentId } = useDataStore();

  const [searchKeyword, setSearchKeyword] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("student.demo@ou.ac.uk");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    success: boolean;
    dryRun: boolean;
    message: string;
  } | null>(null);

  // Đồng bộ id_student từ URL query nếu có
  useEffect(() => {
    if (queryStudentId) {
      const parsed = Number(queryStudentId);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setSelectedStudentId(parsed);
      }
    }
  }, [queryStudentId, setSelectedStudentId]);

  // Lấy danh sách sinh viên cho ô Combobox
  const { data: studentListData, isLoading: listLoading } = useSWR(
    sessionId ? ["student-list", sessionId, searchKeyword] : null,
    () => fetchStudentList(sessionId!, searchKeyword, 120),
    { keepPreviousData: true }
  );

  // Tự động chọn sinh viên đầu tiên nếu chưa có selectedStudentId
  useEffect(() => {
    if (
      !selectedStudentId &&
      studentListData &&
      studentListData.students.length > 0
    ) {
      setSelectedStudentId(studentListData.students[0].id_student);
    }
  }, [selectedStudentId, studentListData, setSelectedStudentId]);

  // Lấy hồ sơ và lộ trình cá nhân hóa của sinh viên đang chọn
  const {
    data: personalizeData,
    error: personalizeError,
    isLoading: personalizeLoading,
  } = useSWR(
    sessionId && selectedStudentId
      ? ["student-personalize", sessionId, selectedStudentId]
      : null,
    () => fetchStudentPersonalization(sessionId!, selectedStudentId!)
  );

  // Cập nhật nội dung email mẫu khi đổi sinh viên
  useEffect(() => {
    if (personalizeData?.pathway) {
      setCustomSubject(personalizeData.pathway.email_subject);
      setCustomBody(personalizeData.pathway.email_body);
      setEmailStatus(null);
    }
  }, [personalizeData]);

  if (!sessionId) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center max-w-xl mx-auto my-12 shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <Database className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Chưa có dữ liệu sinh viên để cá nhân hóa
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Vui lòng quay về Trang chủ và nạp dữ liệu mẫu OULAD hoặc tải tệp CSV
          của bạn lên trước.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay về Trang chủ
        </Link>
      </div>
    );
  }

  const handleSendEmail = async (dryRun: boolean) => {
    if (!sessionId || !selectedStudentId) return;
    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await sendStudentReminder({
        session_id: sessionId,
        id_student: selectedStudentId,
        recipient_email: recipientEmail,
        subject: customSubject,
        body: customBody,
        dry_run: dryRun,
      });
      setEmailStatus({
        success: res.success,
        dryRun: res.dry_run,
        message: res.message,
      });
    } catch (err) {
      setEmailStatus({
        success: false,
        dryRun,
        message:
          err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi khi xử lý email nhắc nhở.",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const profile = personalizeData?.profile;
  const pathway = personalizeData?.pathway;

  return (
    <div className="space-y-8">
      {/* Header & Thanh chọn sinh viên (Combobox tìm kiếm + Dropdown) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-5">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Cá nhân hóa Lộ trình Học tập Sinh viên
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tra cứu mã sinh viên để xem phân tích hành vi, đối chiếu cụm
              K-Means và gửi lộ trình học tập qua Email.
            </p>
          </div>

          {/* Ô nhập từ khóa lọc mã SV */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Tìm nhanh Mã Sinh viên
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Nhập mã SV (VD: 512582)..."
                className="w-full pl-9 pr-3 py-2 text-xs md:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Combobox chọn sinh viên */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Chọn Sinh viên ({studentListData?.total || 0} kết quả khớp)
            </label>
            <select
              value={selectedStudentId ?? ""}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              disabled={listLoading}
              className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
            >
              {studentListData?.students.map((st) => (
                <option key={st.id_student} value={st.id_student}>
                  #{st.id_student} — {st.kmeans_cluster_name} (Rủi ro:{" "}
                  {st.risk_score.toFixed(1)} - {st.risk_level_standard})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Trạng thái lỗi nếu không tìm thấy sinh viên */}
      {personalizeError && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-4 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>
            {personalizeError instanceof Error
              ? personalizeError.message
              : "Không thể tải hồ sơ sinh viên."}
          </span>
        </div>
      )}

      {/* Trạng thái Loading Skeleton */}
      {personalizeLoading || !profile || !pathway ? (
        <div className="space-y-6">
          <div className="h-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
          <div className="h-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
        </div>
      ) : (
        <>
          {/* Thẻ Hồ sơ Sinh viên + Đối chiếu Cụm + Điểm Rủi ro */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột 1: Thông tin định danh & Phân cụm */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">
                      Hồ sơ Sinh viên
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                      #{profile.id_student}
                    </h2>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    profile.risk_level_standard === "Cao"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300"
                      : profile.risk_level_standard === "Trung bình"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                  }`}
                >
                  Rủi ro: {profile.risk_level_standard}
                </span>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cụm K-Means (k=4):</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {profile.kmeans_cluster_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nhãn cụm gốc (CSV):</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {profile.original_cluster_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Độ dài học phần:</span>
                  <span className="font-medium">
                    {profile.module_presentation_length} ngày
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tín chỉ đăng ký:</span>
                  <span className="font-medium">
                    {profile.studied_credits} tín chỉ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số lần học lại trước đó:</span>
                  <span className="font-medium">
                    {profile.num_of_prev_attempts} lần
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày đăng ký học phần:</span>
                  <span className="font-medium">
                    Ngày {profile.date_registration}
                  </span>
                </div>
              </div>
            </div>

            {/* Cột 2: Điểm số & Đánh giá Rủi ro */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Thành tích Đánh giá & Điểm Rủi ro
                </h3>
              </div>

              {/* Thanh tiến trình điểm rủi ro */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-medium text-slate-500">
                    Điểm rủi ro chính thức (ML):
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {profile.risk_score.toFixed(1)}
                    <span className="text-xs font-normal text-slate-400">
                      /100
                    </span>
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      profile.risk_score >= 70
                        ? "bg-rose-500"
                        : profile.risk_score >= 40
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, profile.risk_score)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>
                    Điểm chuyên gia (Heuristic): {profile.heuristic_risk_score}
                    /100
                  </span>
                  <span>Mức gốc: {profile.risk_level}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-400">Điểm TB</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {profile.avg_score}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-400">Trọng số</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {profile.weighted_score}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-400">Bài đã nộp</div>
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {profile.total_assessments_submitted}
                  </div>
                </div>
              </div>
            </div>

            {/* Cột 3: Tương tác trên hệ thống VLE */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <MousePointerClick className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Mức độ Tương tác Hệ thống VLE
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400">Tổng lượt Clicks</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {profile.total_clicks.toLocaleString("vi-VN")}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400">Số ngày Hoạt động</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {profile.active_days} ngày ({profile.active_day_ratio}%)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400">Content / Quiz Clicks</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {profile.content_clicks} / {profile.quiz_clicks}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400">Forum / Chỉ số gắn kết</span>
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {profile.forum_clicks} clicks ({profile.engagement_index}đ)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Khối Lộ trình Cá nhân hóa */}
          <PathCard pathway={pathway} />

          {/* Khối Xem trước & Gửi Email Nhắc nhở qua Gmail SMTP */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Xem trước & Gửi Email Nhắc nhở Học tập (Gmail SMTP)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nội dung email được sinh tự động theo cụm{" "}
                    <strong>{pathway.cluster_name}</strong> và thông số cá nhân
                    của sinh viên #{profile.id_student}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={sendingEmail}
                  onClick={() => handleSendEmail(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
                >
                  {sendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  Kiểm tra xem trước (Dry Run)
                </button>

                <button
                  type="button"
                  disabled={sendingEmail}
                  onClick={() => handleSendEmail(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                >
                  {sendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Gửi Email thật (SMTP)
                </button>
              </div>
            </div>

            {emailStatus && (
              <div
                className={`p-4 rounded-xl border text-xs md:text-sm flex items-start gap-2.5 ${
                  emailStatus.success
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                }`}
              >
                {emailStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>{emailStatus.message}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Địa chỉ Email người nhận
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs md:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Tiêu đề Email nhắc nhở
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs md:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nội dung Email cá nhân hóa (Có thể chỉnh sửa trước khi gửi)
              </label>
              <textarea
                rows={11}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="w-full p-3.5 text-xs md:text-sm font-mono leading-relaxed rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function PersonalizePage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
      }
    >
      <PersonalizeContent />
    </Suspense>
  );
}
