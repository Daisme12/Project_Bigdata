"use client";

/**
 * Component hiển thị Lộ trình Học tập Cá nhân hóa cho từng sinh viên:
 * - Học liệu Micro-learning
 * - Bài tập bổ trợ (Supplementary Exercises)
 * - Mục tiêu hành động trong tuần (Weekly Goals)
 */

import React from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileCheck2,
  Sparkles,
  Target,
} from "lucide-react";
import { PersonalizedPathway } from "@/types";

interface PathCardProps {
  pathway: PersonalizedPathway;
}

export function PathCard({ pathway }: PathCardProps) {
  return (
    <div className="space-y-6">
      {/* Banner tóm tắt định hướng can thiệp theo cụm */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            Lộ trình Cá nhân hóa cho cụm: {pathway.cluster_name}
          </span>
          <span className="text-xs font-medium bg-amber-400/20 border border-amber-300/40 px-2.5 py-1 rounded-lg">
            Mức ưu tiên: {pathway.intervention_priority}
          </span>
        </div>
        <p className="text-sm text-indigo-50 leading-relaxed">
          {pathway.cluster_description}
        </p>
      </div>

      {/* 3 Khối lộ trình: Micro-learning, Bài tập bổ trợ, Mục tiêu tuần */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Micro-learning */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Học liệu Micro-Learning
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chia nhỏ kiến thức dễ tiếp thu (10–25 phút)
              </p>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            {pathway.micro_learning.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {item.format}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    {item.duration}
                  </span>
                </div>
                <h5 className="font-semibold text-xs md:text-sm text-slate-900 dark:text-white">
                  {item.title}
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.focus_area}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Bài tập bổ trợ */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Bài tập Bổ trợ & Thực hành
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Củng cố điểm số và lấp lỗ hổng kiến thức
              </p>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            {pathway.supplementary_exercises.map((ex, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium">
                    Độ khó: {ex.difficulty}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    {ex.estimated_time}
                  </span>
                </div>
                <h5 className="font-semibold text-xs md:text-sm text-slate-900 dark:text-white">
                  {ex.title}
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mục tiêu: {ex.objective}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Mục tiêu tuần */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Mục tiêu Hành động Tuần này
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Checklist cam kết dành cho sinh viên
              </p>
            </div>
          </div>

          <ul className="space-y-3 flex-1">
            {pathway.weekly_goals.map((goal, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs md:text-sm text-slate-700 dark:text-slate-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
