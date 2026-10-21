"use client";

/**
 * Trang thuyết minh "Cơ chế Sinh Lộ trình Lai 2 Tầng (Hybrid) & Danh mục 4 Lộ trình Hiện có":
 * 1. Trình bày chi tiết Công thức Toán học của từng phần trong Kiến trúc Lai 2 tầng:
 *    - Phần 1 (Tầng 1): Chuẩn hóa Z-Score (StandardScaler), Hàm mục tiêu K-Means (k=4),
 *      Khôi phục tâm cụm gốc và 3 hàm định danh nhãn nghiệp vụ động.
 *    - Phần 2 (Đánh giá Rủi ro): Quy đổi xác suất ML, 5 phương trình thành phần rủi ro (R1..R5),
 *      tổng hợp trọng số chuyên gia và hàm phân tầng ngưỡng rủi ro.
 *    - Phần 3 (Tầng 2): 4 công thức trích xuất chỉ số hành vi cá nhân (Feature Engineering)
 *      và hàm hợp nhất lộ trình cá nhân hóa P(s_i).
 * 2. Hiển thị đầy đủ 4 Khung Lộ trình Học tập hiện có tương ứng với 4 cụm kèm số liệu thực tế.
 */

import React, { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Calculator,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  FileCheck2,
  GitBranch,
  Layers,
  Mail,
  Sliders,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { fetchDashboardClusters } from "@/lib/api";
import { useDataStore } from "@/store/useDataStore";
import { getClusterColor } from "@/components/ClusterChart";

interface CatalogPathway {
  clusterName: string;
  badgeColor: string;
  centroidRule: string;
  typicalMetrics: string;
  clusterDescription: string;
  interventionPriority: string;
  microLearning: {
    title: string;
    duration: string;
    format: string;
    focusArea: string;
  }[];
  supplementaryExercises: {
    title: string;
    difficulty: string;
    estimatedTime: string;
    objective: string;
  }[];
  weeklyGoals: string[];
  dynamicRules: {
    condition: string;
    action: string;
  }[];
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
}

const PATHWAY_CATALOG: CatalogPathway[] = [
  {
    clusterName: "Rời bỏ sớm",
    badgeColor:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    centroidRule:
      "Tâm cụm c* = argmin S_act(c) với S_act(c) = Rank(log_total_clicks) + Rank(active_days) + Rank(total_assessments_submitted).",
    typicalMetrics:
      "Active days rất thấp (0–10 ngày), gần như không có tương tác VLE hoặc bỏ dở ngay từ đầu học phần, nguy cơ bỏ học > 85%.",
    clusterDescription:
      "Sinh viên có mức độ tương tác trên hệ thống VLE rất thấp hoặc gần như bằng 0, số ngày đăng nhập ít và thiếu nhiều bài kiểm tra định kỳ. Nguy cơ bỏ học giữa chừng ở mức báo động.",
    interventionPriority: "Khẩn cấp (Ưu tiên mức 1)",
    microLearning: [
      {
        title:
          "Video khởi động nhanh: Tóm tắt kiến thức cốt lõi học phần trong 15 phút",
        duration: "15 phút",
        format: "Video tương tác",
        focusArea:
          "Hệ thống hóa nền tảng để bắt nhịp lại môn học mà không bị quá tải.",
      },
      {
        title: "Infographic: Lộ trình vượt qua môn học với 30 phút mỗi ngày",
        duration: "10 phút",
        format: "Tài liệu trực quan",
        focusArea:
          "Xây dựng lại thói quen đăng nhập VLE tối thiểu 3 ngày/tuần.",
      },
      {
        title:
          "Podcast/Audio: Giải đáp các rào cản tâm lý và cách xin gia hạn bài tập",
        duration: "12 phút",
        format: "Audio hướng dẫn",
        focusArea:
          "Kết nối lại với cố vấn học tập và nắm quy chế hỗ trợ sinh viên.",
      },
    ],
    supplementaryExercises: [
      {
        title: "Bộ 10 câu hỏi trắc nghiệm chẩn đoán lỗ hổng kiến thức cơ bản",
        difficulty: "Cơ bản",
        estimatedTime: "15 phút",
        objective:
          "Đánh giá nhanh phần kiến thức đã lỡ để gợi ý bài đọc ngắn tương ứng.",
      },
      {
        title:
          "Bài tập thực hành có hướng dẫn từng bước (Step-by-step Walkthrough)",
        difficulty: "Cơ bản",
        estimatedTime: "20 phút",
        objective:
          "Hoàn thành ít nhất 1 bài nộp TMA/CMA để kích hoạt lại tiến độ.",
      },
    ],
    weeklyGoals: [
      "Đăng nhập vào hệ thống VLE tối thiểu 3 ngày trong tuần này (mỗi lần 20 phút).",
      "Hoàn thành 1 bài kiểm tra ngắn (Quiz) hoặc bài tập bổ trợ cơ bản.",
      "Phản hồi email của Cố vấn học tập để xác nhận kế hoạch học bù.",
    ],
    dynamicRules: [
      {
        condition: "quiz_clicks == 0",
        action:
          "Tự động chèn mục tiêu tuần: 'Bạn chưa có lượt tương tác Quiz nào: Hãy hoàn thành ít nhất 1 bài Quiz tự luyện tuần này.'",
      },
      {
        condition: "risk_score >= 70",
        action:
          "Đánh dấu trạng thái 'Nguy cơ Cao' và gắn nhãn tiêu đề email [KHẨN] ưu tiên gửi cảnh báo cho Cố vấn học tập.",
      },
    ],
    emailSubjectTemplate:
      "[KHẨN] Hỗ trợ khôi phục lộ trình học tập - Sinh viên #{id_student}",
    emailBodyTemplate: `Chào bạn (Mã SV: {id_student}),

Hệ thống Phân tích Học tập OULAD ghi nhận mức độ tương tác của bạn hiện đang ở nhóm '{cluster_name}' với điểm rủi ro là {risk_score}/100 (Mức: {risk_level}).
Thông số hiện tại của bạn:
- Số ngày hoạt động trên hệ thống: {active_days} ngày
- Tổng số lượt tương tác (clicks): {total_clicks} lượt
- Số bài đánh giá đã nộp: {total_assessments_submitted} bài (Điểm TB: {avg_score}/100)

Thay vì phải đọc lại toàn bộ giáo trình, hệ thống đã thiết kế riêng cho bạn gói Micro-learning 15 phút/ngày:
1. Xem video tóm tắt cốt lõi học phần (15 phút).
2. Làm bộ 10 câu hỏi chẩn đoán cơ bản để lấy lại nhịp học.
3. Đặt mục tiêu đăng nhập 3 ngày/tuần và hoàn thành 1 bài đánh giá kế tiếp.`,
  },
  {
    clusterName: "Suy giảm dần",
    badgeColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    centroidRule:
      "Sau khi tách cụm Rời bỏ sớm và Ổn định tốt, tâm cụm c* = argmin S_eff(c) với S_eff(c) = 0.60 * active_days + 0.40 * (total_clicks / 50).",
    typicalMetrics:
      "Có đăng ký và nộp bài giai đoạn đầu (3–5 bài), nhưng số ngày hoạt động (20–40 ngày) và lượt tương tác giảm mạnh về giữa kỳ.",
    clusterDescription:
      "Sinh viên khởi đầu môn học khá tốt nhưng tần suất truy cập VLE, thảo luận diễn đàn và tiến độ làm bài kiểm tra đang chững lại rõ rệt theo thời gian.",
    interventionPriority: "Cao (Ưu tiên mức 2)",
    microLearning: [
      {
        title:
          "Flashcards ôn tập nhanh các chủ đề giữa kỳ (Spaced Repetition)",
        duration: "12 phút",
        format: "Thẻ ghi nhớ số",
        focusArea:
          "Củng cố kiến thức các tuần gần đây thông qua cơ chế lặp lại ngắt quãng.",
      },
      {
        title: "Video phân tích các lỗi sai phổ biến trong bài đánh giá giữa kỳ",
        duration: "18 phút",
        format: "Video bài giảng ngắn",
        focusArea:
          "Khắc phục điểm nghẽn khiến điểm trọng số (weighted score) bị giảm.",
      },
      {
        title:
          "Checklist quản lý thời gian theo phương pháp Pomodoro cho sinh viên từ xa",
        duration: "8 phút",
        format: "Hướng dẫn thực hành",
        focusArea:
          "Duy trì nhịp độ học đều đặn thay vì học dồn sát hạn nộp.",
      },
    ],
    supplementaryExercises: [
      {
        title: "Bài tập tự luyện Quiz tương tác cho học phần hiện tại",
        difficulty: "Trung bình",
        estimatedTime: "25 phút",
        objective:
          "Nâng tỷ lệ tương tác Quiz và chuẩn bị cho bài thi trọng số lớn.",
      },
      {
        title: "Thử thách thảo luận ngắn trên Forum học tập (1 chủ đề/tuần)",
        difficulty: "Trung bình",
        estimatedTime: "15 phút",
        objective:
          "Tăng sự gắn kết với nhóm học tập và giảng viên hướng dẫn.",
      },
    ],
    weeklyGoals: [
      "Duy trì tối thiểu 4 ngày hoạt động/tuần trên hệ thống VLE.",
      "Hoàn thành 1 bài luyện Quiz và đối chiếu kỹ phần giải thích đáp án.",
      "Đặt lịch nhắc nhở trước hạn nộp bài đánh giá tiếp theo ít nhất 3 ngày.",
    ],
    dynamicRules: [
      {
        condition: "quiz_clicks == 0",
        action:
          "Tự động bổ sung mục tiêu tuần: 'Hoàn thành ít nhất 1 bài Quiz tự luyện tuần này.'",
      },
      {
        condition: "forum_clicks < 10",
        action:
          "Tự động bổ sung mục tiêu tuần: 'Tăng cường tương tác trên diễn đàn (hiện tại < 10 clicks) để trao đổi kinh nghiệm làm bài.'",
      },
    ],
    emailSubjectTemplate:
      "[Nhắc nhở học tập] Duy trì phong độ và lộ trình tuần mới - SV #{id_student}",
    emailBodyTemplate: `Chào bạn (Mã SV: {id_student}),

Hệ thống ghi nhận bạn đã hoàn thành {total_assessments_submitted} bài đánh giá với điểm trung bình {avg_score}/100. Tuy nhiên, nhịp độ hoạt động gần đây của bạn có dấu hiệu chững lại (Nhóm phân cụm: '{cluster_name}', Điểm rủi ro: {risk_score}/100).

Thông số hiện tại:
- Số ngày hoạt động: {active_days} ngày | Tổng lượt tương tác: {total_clicks} clicks
- Điểm trung bình: {avg_score} | Điểm trọng số: {weighted_score}

Gợi ý lộ trình tuần này dành riêng cho bạn:
1. Dành 12 phút ôn tập bộ Flashcards tổng hợp kiến thức trọng tâm.
2. Thực hành bài Quiz tự luyện (25 phút) để cải thiện điểm trọng số.
3. Duy trì đăng nhập ít nhất 4 ngày/tuần để không bị dồn bài vào cuối kỳ.`,
  },
  {
    clusterName: "Chăm chỉ nhưng điểm thấp",
    badgeColor:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    centroidRule:
      "Tâm cụm c* = argmax S_eff(c) trong 2 cụm trung gian: mật độ tương tác VLE (active_days, total_clicks) cao nhưng weighted_score chưa tối ưu.",
    typicalMetrics:
      "Hoạt động tích cực (50–100+ ngày), đọc tài liệu nhiều (content_clicks cao) nhưng chênh lệch giữa avg_score và weighted_score lớn.",
    clusterDescription:
      "Sinh viên rất tích cực truy cập học liệu và hoạt động nhiều ngày trên VLE, nhưng điểm trung bình hoặc điểm trọng số chưa tương xứng với thời gian bỏ ra.",
    interventionPriority: "Trung bình - Cần tối ưu phương pháp học",
    microLearning: [
      {
        title:
          "Hướng dẫn kỹ thuật làm bài đánh giá (Assessment Rubric & Chiến thuật làm bài)",
        duration: "20 phút",
        format: "Video chuyên đề",
        focusArea:
          "Hiểu rõ tiêu chí chấm điểm để chuyển hóa thời gian đọc tài liệu thành điểm số thực tế.",
      },
      {
        title:
          "Sơ đồ tư duy (Mindmap) liên kết lý thuyết với câu hỏi vận dụng",
        duration: "15 phút",
        format: "Tài liệu Mindmap",
        focusArea:
          "Chuyển từ đọc thụ động (Content clicks cao) sang tư duy giải quyết vấn đề.",
      },
      {
        title:
          "Video chữa mẫu bài tập đạt điểm tối đa (Exemplar Answer Walkthrough)",
        duration: "18 phút",
        format: "Video phân tích mẫu",
        focusArea:
          "Cách trình bày lập luận và tránh mất điểm ở các câu hỏi trọng số lớn.",
      },
    ],
    supplementaryExercises: [
      {
        title:
          "Bộ đề luyện tập mô phỏng theo cấu trúc đề thi chuẩn kèm lời giải chi tiết",
        difficulty: "Trung bình - Khá",
        estimatedTime: "35 phút",
        objective:
          "Rèn kỹ năng phân bổ thời gian và kiểm tra mức độ hiểu sâu.",
      },
      {
        title:
          "Bài tập tự đánh giá (Self-Assessment) đối chiếu theo Rubric chấm điểm",
        difficulty: "Trung bình",
        estimatedTime: "20 phút",
        objective:
          "Thu hẹp khoảng cách giữa điểm trung bình ({avg_score}) và điểm trọng số ({weighted_score}).",
      },
    ],
    weeklyGoals: [
      "Giảm thời gian đọc lướt tài liệu thụ động, dành 60% thời gian cho việc làm Quiz và giải đề.",
      "Xem kỹ video phân tích tiêu chí chấm điểm (Rubric) trước khi nộp bài tiếp theo.",
      "Đặt ít nhất 1 câu hỏi về phần kiến thức chưa rõ trên Forum để được giảng viên giải đáp.",
    ],
    dynamicRules: [
      {
        condition: "Nội suy {avg_score} & {weighted_score}",
        action:
          "Tự động điền điểm thực tế của SV vào mục tiêu bài tập để chỉ rõ độ lệch điểm cần khắc phục.",
      },
      {
        condition: "Nội suy {content_clicks}",
        action:
          "Nhắc nhở sinh viên chuyển bớt thời gian từ {content_clicks} lượt đọc tài liệu thụ động sang luyện đề chủ động.",
      },
    ],
    emailSubjectTemplate:
      "[Cố vấn học tập] Tối ưu phương pháp học & bứt phá điểm số - SV #{id_student}",
    emailBodyTemplate: `Chào bạn (Mã SV: {id_student}),

Hệ thống rất ghi nhận sự nỗ lực của bạn với {active_days} ngày hoạt động và {total_clicks} lượt tương tác trên hệ thống học tập! Hiện tại bạn thuộc nhóm '{cluster_name}' (Điểm TB: {avg_score}, Điểm trọng số: {weighted_score}, Điểm rủi ro: {risk_score}/100).

Để giúp bạn chuyển hóa sự chăm chỉ thành điểm số cao hơn, hệ thống gợi ý bạn điều chỉnh chiến lược học tập trong tuần này:
1. Xem video 'Phân tích tiêu chí chấm điểm (Assessment Rubric)' (20 phút).
2. Chuyển trọng tâm từ đọc tài liệu thuần túy ({content_clicks} lượt xem nội dung) sang làm bài luyện Quiz có giải thích chi tiết.
3. Tham khảo bài giải mẫu để cải thiện điểm trọng số ở các bài thi sắp tới.`,
  },
  {
    clusterName: "Ổn định tốt",
    badgeColor:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    centroidRule:
      "Tâm cụm c* = argmax S_exc(c) với S_exc(c) = 0.45 * Rank(weighted_score) + 0.30 * Rank(assessments) + 0.25 * Rank(active_days).",
    typicalMetrics:
      "Hoạt động bền bỉ (> 90 ngày), tổng tương tác rất cao (> 2.000 clicks), nộp đủ bài kiểm tra và đạt điểm trung bình / trọng số cao (~75–90+).",
    clusterDescription:
      "Sinh viên duy trì kỷ luật học tập xuất sắc, tương tác đều đặn trên cả học liệu, quiz lẫn diễn đàn, đồng thời đạt điểm số và tiến độ nộp bài ấn tượng.",
    interventionPriority: "Duy trì & Phát triển nâng cao",
    microLearning: [
      {
        title:
          "Chuyên đề nâng cao (Masterclass): Ứng dụng thực tiễn & Case Study chuyên sâu",
        duration: "25 phút",
        format: "Bài giảng chuyên sâu",
        focusArea:
          "Mở rộng kiến thức vượt khung chương trình chuẩn để hướng tới điểm Distinction.",
      },
      {
        title:
          "Tài liệu hướng dẫn kỹ năng Peer-Mentoring & Thảo luận học thuật",
        duration: "15 phút",
        format: "Tài liệu đọc",
        focusArea:
          "Nâng cao khả năng phản biện và dẫn dắt thảo luận trên diễn đàn học tập.",
      },
    ],
    supplementaryExercises: [
      {
        title:
          "Bài tập thử thách nâng cao (Challenge Problem Set - Mức Distinction)",
        difficulty: "Nâng cao",
        estimatedTime: "40 phút",
        objective:
          "Chinh phục mức điểm xuất sắc (>85) trong kỳ đánh giá cuối kỳ.",
      },
      {
        title:
          "Hoạt động hỗ trợ giải đáp 2 câu hỏi của bạn học trên Forum",
        difficulty: "Vận dụng cao",
        estimatedTime: "20 phút",
        objective:
          "Củng cố kiến thức sâu sắc hơn thông qua việc giải thích lại cho người khác.",
      },
    ],
    weeklyGoals: [
      "Duy trì nhịp độ học tập ổn định và hoàn thành sớm các bài đánh giá trước hạn.",
      "Thử sức với 1 bài tập tình huống nâng cao (Case Study).",
      "Tham gia đóng góp ý kiến chuyên môn hoặc hỗ trợ thành viên khác trên Forum.",
    ],
    dynamicRules: [
      {
        condition: "forum_clicks < 10",
        action:
          "Khuyến khích sinh viên giỏi tham gia hỗ trợ cộng đồng học tập trên Forum nhiều hơn.",
      },
    ],
    emailSubjectTemplate:
      "[Khen ngợi & Lộ trình nâng cao] Chúc mừng kết quả học tập ấn tượng - SV #{id_student}",
    emailBodyTemplate: `Chào bạn (Mã SV: {id_student}),

Chúc mừng bạn đã duy trì thành tích học tập rất ấn tượng! Hệ thống ghi nhận bạn thuộc nhóm '{cluster_name}' với điểm rủi ro rất thấp ({risk_score}/100 - Mức: {risk_level}).

Thành tích nổi bật của bạn:
- Điểm trung bình: {avg_score}/100 | Điểm trọng số: {weighted_score}/100
- Số bài đánh giá đã hoàn thành: {total_assessments_submitted} bài
- Số ngày hoạt động tích cực: {active_days} ngày ({total_clicks} lượt tương tác)

Lộ trình phát triển nâng cao tuần này dành cho bạn:
1. Khám phá chuyên đề Case Study nâng cao (25 phút) để hướng tới xếp loại Xuất sắc (Distinction).
2. Thử sức với bộ câu hỏi vận dụng cao (Challenge Problem Set).
3. Chia sẻ kinh nghiệm học tập cùng các bạn trên diễn đàn môn học.`,
  },
];

export default function PathwayMechanismPage() {
  const { sessionId } = useDataStore();
  const [selectedClusterName, setSelectedClusterName] =
    useState<string>("Rời bỏ sớm");

  // Nếu đã nạp dữ liệu, lấy thêm thống kê thực tế của 4 cụm từ Backend
  const { data: clustersData } = useSWR(
    sessionId ? ["mechanism-clusters", sessionId] : null,
    () => fetchDashboardClusters(sessionId!)
  );

  const activeCatalog =
    PATHWAY_CATALOG.find((item) => item.clusterName === selectedClusterName) ||
    PATHWAY_CATALOG[0];

  const liveClusterStat = clustersData?.clusters.find(
    (c) => c.cluster_name === activeCatalog.clusterName
  );

  return (
    <div className="space-y-8">
      {/* Header giới thiệu trang */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white p-6 md:p-8 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl space-y-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 border border-indigo-400/30 text-indigo-200">
              <GitBranch className="w-3.5 h-3.5" />
              Kiến trúc Thuật toán & Danh mục Lộ trình
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Cơ chế Sinh Lộ trình Học tập Lai 2 Tầng (Hybrid) & 4 Lộ trình Hiện có
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Thuyết minh chi tiết mô hình toán học kết hợp{" "}
              <strong className="text-white">
                Tầng 1: Phân cụm Học máy K-Means (k=4)
              </strong>{" "}
              với{" "}
              <strong className="text-white">
                Tầng 2: Quy tắc Cá nhân hóa theo chỉ số thực (Rule Engine)
              </strong>{" "}
              để sinh lộ trình học tập và email cảnh báo riêng cho từng sinh viên.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/ca-nhan-hoa"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
            >
              Thử nghiệm trên từng Sinh viên
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* PHẦN 1: CÔNG THỨC TOÁN HỌC CHI TIẾT CHO TỪNG KHỐI TRONG CƠ CHẾ LAI 2 TẦNG */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
            1. Quy trình Tính toán Lộ trình theo Cơ chế Lai 2 Tầng (Hybrid) & Công thức Toán học
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KHỐI 1: TẦNG 1 - HỌC MÁY K-MEANS & ĐỊNH DANH TÂM CỤM */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                  TẦNG 1 • HỌC MÁY KHÔNG GIÁM SÁT
                </span>
                <Cpu className="w-5 h-5 text-indigo-500" />
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Phân cụm K-Means (k=4) & Định danh Tâm cụm Động
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Đưa ma trận <strong>d = 13 đặc trưng hành vi số</strong> qua bộ
                chuẩn hóa Z-Score (đưa về trung bình <strong>μ = 0</strong>, độ
                lệch chuẩn <strong>σ = 1</strong>) rồi tối ưu hàm mục tiêu
                K-Means với <strong>k = 4</strong>:
              </p>

              {/* Hộp công thức 1.1 & 1.2 */}
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/70 space-y-2 text-xs">
                <div>
                  <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                    (1.1) Chuẩn hóa Z-Score (StandardScaler):
                  </div>
                  <div className="mt-1 font-mono bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200">
                    z<sub>i,j</sub> = (x<sub>i,j</sub> − μ<sub>j</sub>) / σ
                    <sub>j</sub> &nbsp; (∀j ∈ 1..13)
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                    (1.2) Hàm mục tiêu K-Means (Khoảng cách Euclidean):
                  </div>
                  <div className="mt-1 font-mono bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200">
                    J = ∑<sub>c=1..4</sub> ∑<sub>z_i ∈ C_c</sub> ‖z<sub>i</sub>{" "}
                    − m<sub>c</sub>‖<sub>2</sub>
                    <sup>2</sup> → min
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                    (1.3) Khôi phục Tâm cụm về thang đo gốc:
                  </div>
                  <div className="mt-1 font-mono bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200">
                    m̂<sub>c,j</sub> = m<sub>c,j</sub> · σ<sub>j</sub> + μ
                    <sub>j</sub>
                  </div>
                </div>
              </div>

              {/* Hộp công thức 1.4: Định danh 4 tâm cụm */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 text-xs space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  (1.4) Công thức gán nhãn từ Tâm cụm m̂<sub>c</sub> (Không gán
                  cứng ID 0,1,2,3):
                </div>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <strong className="text-rose-600 dark:text-rose-400">
                      • Rời bỏ sớm (argmin S<sub>act</sub>):
                    </strong>
                    <br />S<sub>act</sub>(c) = Rank(log_clicks<sub>c</sub>) +
                    Rank(days<sub>c</sub>) + Rank(assessments<sub>c</sub>)
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      • Ổn định tốt (argmax S<sub>exc</sub>):
                    </strong>
                    <br />S<sub>exc</sub>(c) = 0.45·Rank(weighted<sub>c</sub>) +
                    0.30·Rank(assessments<sub>c</sub>) + 0.25·Rank(days
                    <sub>c</sub>)
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <strong className="text-blue-600 dark:text-blue-400">
                      • Chăm chỉ điểm thấp (argmax S<sub>eff</sub>) & Suy giảm
                      dần (argmin S<sub>eff</sub>):
                    </strong>
                    <br />S<sub>eff</sub>(c) = 0.60·active_days<sub>c</sub> +
                    0.40·(total_clicks<sub>c</sub> / 50)
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              Nguồn: backend/app/services/clustering.py
            </div>
          </div>

          {/* KHỐI 2: ĐÁNH GIÁ & ĐỐI CHIẾU RỦI RO */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                  ĐÁNH GIÁ & ĐỐI CHIẾU RỦI RO
                </span>
                <Calculator className="w-5 h-5 text-amber-500" />
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Kết hợp Xác suất ML & Công thức Trọng số Chuyên gia
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Hệ thống quy đổi xác suất{" "}
                <code className="font-mono">risk_probability</code> sang thang
                0–100 và tính song song{" "}
                <code className="font-mono">heuristic_risk_score</code> từ{" "}
                <strong>5 phương trình thành phần</strong>:
              </p>

              {/* Hộp công thức 2.1 & 2.2 */}
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/70 space-y-2 text-xs">
                <div>
                  <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">
                    (2.1) Điểm rủi ro ML & Phương trình Tổng hợp Trọng số (∑w =
                    1.0):
                  </div>
                  <div className="mt-1 font-mono bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-amber-100 dark:border-amber-900 text-slate-800 dark:text-slate-200 space-y-1">
                    <div>
                      Risk<sub>ML</sub> = clip(risk_probability × 100, 0, 100)
                    </div>
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      Risk<sub>Heuristic</sub> = <strong>0.30</strong>·R
                      <sub>điểm</sub> + <strong>0.25</strong>·R
                      <sub>bài_nộp</sub> + <strong>0.20</strong>·R
                      <sub>ngày_HĐ</sub> + <strong>0.15</strong>·R
                      <sub>clicks</sub> + <strong>0.10</strong>·R
                      <sub>học_lại</sub>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hộp công thức 2.2: Chi tiết 5 thành phần rủi ro R1..R5 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 text-xs space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  (2.2) Công thức 5 thành phần rủi ro R<sub>k</sub> ∈ [0, 100]:
                </div>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <strong>1. R_điểm (30%):</strong> 100 − (0.40·avg_score +
                    0.60·weighted_score)
                  </div>
                  <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <strong>2. R_bài_nộp (25%):</strong> [1 −
                    min(assessments / 10, 1)] × 100
                  </div>
                  <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <strong>3. R_ngày_HĐ (20%):</strong> [1 − min(active_days /
                    90, 1)] × 100
                  </div>
                  <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <strong>4. R_clicks (15%):</strong> [1 −
                    min(log_total_clicks / 8.5, 1)] × 100
                  </div>
                  <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <strong>5. R_học_lại (10%):</strong> min(num_of_prev_attempts
                    × 35, 100)
                  </div>
                </div>

                <div className="pt-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <strong>(2.3) Phân tầng:</strong> Cao (≥ 70) • Trung bình (40
                  ≤ Risk &lt; 70) • Thấp (&lt; 40)
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              Nguồn: backend/app/services/risk.py
            </div>
          </div>

          {/* KHỐI 3: TẦNG 2 - CÁ NHÂN HÓA THEO CHỈ SỐ THỰC */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                  TẦNG 2 • CÁ NHÂN HÓA THEO CHỈ SỐ THỰC
                </span>
                <Sliders className="w-5 h-5 text-emerald-500" />
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Trích xuất Chỉ số Cá nhân & Hàm Hợp nhất Lộ trình
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Hệ thống tính toán <strong>4 chỉ số hành vi dẫn xuất</strong>{" "}
                cho từng sinh viên <em>i</em> và áp dụng hàm ánh xạ lộ trình
                động <strong>P(s_i)</strong>:
              </p>

              {/* Hộp công thức 3.1: Feature Engineering */}
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/70 space-y-2 text-xs">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                  (3.1) Công thức 4 chỉ số hành vi cá nhân (Feature
                  Engineering):
                </div>
                <div className="space-y-1.5 font-mono text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900 text-slate-800 dark:text-slate-200">
                  <div>
                    <strong>• Mật độ tương tác:</strong> Click_Density =
                    total_clicks / max(active_days, 1)
                  </div>
                  <div>
                    <strong>• Tỷ lệ ngày học (%):</strong> R<sub>active</sub> =
                    (active_days / module_length) × 100
                  </div>
                  <div>
                    <strong>• Độ lệch điểm số:</strong> Δ<sub>score</sub> =
                    |avg_score − weighted_score|
                  </div>
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <strong>• Chỉ số gắn kết (Engagement ∈ [0,100]):</strong>
                    <br />E<sub>i</sub> = 0.40·Norm(log_clicks) + 0.35·R
                    <sub>active</sub> + 0.25·Norm(assessments)
                  </div>
                </div>
              </div>

              {/* Hộp công thức 3.2: Hàm sinh lộ trình P(s_i) */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 text-xs space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  (3.2) Phương trình Hợp nhất Lộ trình Cá nhân hóa P(s
                  <sub>i</sub>):
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
                  P(s<sub>i</sub>) = BasePathway(C<sub>i</sub>) ∪ Φ
                  <sub>rules</sub>(x<sub>i</sub>) ∪ Ψ<sub>template</sub>(x
                  <sub>i</sub>)
                </div>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 text-[11px]">
                  <li>
                    <strong>
                      BasePathway(C<sub>i</sub>)
                    </strong>
                    : Khung học liệu nền tảng theo cụm K-Means <em>C_i</em>.
                  </li>
                  <li>
                    <strong>
                      Φ<sub>rules</sub>(x<sub>i</sub>)
                    </strong>
                    : Tập mục tiêu cộng thêm khi <code>quiz_clicks == 0</code>{" "}
                    hoặc <code>forum_clicks &lt; 10</code>.
                  </li>
                  <li>
                    <strong>
                      Ψ<sub>template</sub>(x<sub>i</sub>)
                    </strong>
                    : Phép nội suy trực tiếp vector thông số{" "}
                    <code>
                      x_i = (avg_score, weighted_score, active_days,
                      content_clicks, risk_score)
                    </code>{" "}
                    vào bài tập & Email.
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              Nguồn: preprocessing.py & recommender.py
            </div>
          </div>
        </div>
      </div>

      {/* PHẦN 2: DANH MỤC 4 KHUNG LỘ TRÌNH HIỆN CÓ TƯƠNG ỨNG VỚI 4 CỤM */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
              2. Chi tiết 4 Khung Lộ trình Học tập Hiện có (Ứng với 4 Cụm K-Means)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Chọn từng cụm bên dưới để xem toàn bộ cấu hình lộ trình và mẫu Email
            tương ứng
          </span>
        </div>

        {/* 4 Thẻ Tab chọn Cụm lộ trình */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {PATHWAY_CATALOG.map((item) => {
            const isSelected = item.clusterName === selectedClusterName;
            const stat = clustersData?.clusters.find(
              (c) => c.cluster_name === item.clusterName
            );
            const dotColor = getClusterColor(item.clusterName);

            return (
              <button
                key={item.clusterName}
                type="button"
                onClick={() => setSelectedClusterName(item.clusterName)}
                className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? "bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    {item.clusterName}
                  </span>
                  {isSelected && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                      Đang xem
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {item.interventionPriority}
                </div>

                {stat ? (
                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {stat.student_count.toLocaleString("vi-VN")} SV (
                      {stat.percentage}%)
                    </span>
                    <span className="text-slate-400">
                      Điểm TB: {stat.avg_score}
                    </span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    Nhấn để xem cấu hình lộ trình
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Khung hiển thị chi tiết lộ trình của Cụm đang chọn */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          {/* Thông tin nhận diện Cụm & Số liệu thực tế từ phiên hiện tại */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${activeCatalog.badgeColor}`}
                >
                  Cụm K-Means: {activeCatalog.clusterName}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Mức ưu tiên: {activeCatalog.interventionPriority}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeCatalog.clusterDescription}
              </p>
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-1">
                <div>
                  <strong className="text-slate-700 dark:text-slate-200">
                    • Công thức Tâm cụm (Tầng 1):
                  </strong>{" "}
                  <code className="font-mono text-indigo-600 dark:text-indigo-400">
                    {activeCatalog.centroidRule}
                  </code>
                </div>
                <div>
                  <strong className="text-slate-700 dark:text-slate-200">
                    • Đặc trưng hành vi điển hình:
                  </strong>{" "}
                  {activeCatalog.typicalMetrics}
                </div>
              </div>
            </div>

            {/* Thống kê thực tế nếu đã nạp dữ liệu */}
            {liveClusterStat && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 shrink-0 space-y-2 min-w-[240px]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  <Users className="w-4 h-4" />
                  Số liệu thực tế trong phiên
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Số lượng SV:</span>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {liveClusterStat.student_count.toLocaleString("vi-VN")} (
                      {liveClusterStat.percentage}%)
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Điểm TB / TS:</span>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {liveClusterStat.avg_score} /{" "}
                      {liveClusterStat.avg_weighted_score}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Clicks TB:</span>
                    <div className="font-semibold">
                      {liveClusterStat.avg_clicks.toLocaleString("vi-VN")}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Ngày HĐ TB:</span>
                    <div className="font-semibold">
                      {liveClusterStat.avg_active_days} ngày
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3 Cột nội dung Lộ trình: Micro-learning, Bài tập bổ trợ, Mục tiêu tuần & Quy tắc động */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột 1: Học liệu Micro-learning */}
            <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Học liệu Micro-Learning ({activeCatalog.microLearning.length})
                </h3>
              </div>

              <div className="space-y-2.5">
                {activeCatalog.microLearning.map((ml, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {ml.format}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        {ml.duration}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {ml.title}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {ml.focusArea}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cột 2: Bài tập bổ trợ */}
            <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Bài tập Bổ trợ (
                  {activeCatalog.supplementaryExercises.length})
                </h3>
              </div>

              <div className="space-y-2.5">
                {activeCatalog.supplementaryExercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Độ khó: {ex.difficulty}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        {ex.estimatedTime}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {ex.title}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Mục tiêu: {ex.objective}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cột 3: Mục tiêu tuần + Quy tắc cộng thêm Tầng 2 */}
            <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4 space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Mục tiêu Tuần Mặc định
                  </h3>
                </div>
                <ul className="space-y-2">
                  {activeCatalog.weeklyGoals.map((g, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  Quy tắc Cá nhân hóa Động (Tầng 2):
                </div>
                {activeCatalog.dynamicRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70 text-xs space-y-1"
                  >
                    <div className="font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                      Khi: {rule.condition}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      → {rule.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mẫu Email Nhắc nhở tương ứng của Cụm */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-indigo-500" />
                Mẫu Email Nhắc nhở Tự động (Template có gắn biến nội suy cá nhân)
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <Code2 className="w-3.5 h-3.5" />
                Biến động: &#123;id_student&#125;, &#123;risk_score&#125;,
                &#123;avg_score&#125;, &#123;weighted_score&#125;,
                &#123;active_days&#125;, &#123;total_clicks&#125;
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono">
              Tiêu đề: {activeCatalog.emailSubjectTemplate}
            </div>

            <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {activeCatalog.emailBodyTemplate}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
