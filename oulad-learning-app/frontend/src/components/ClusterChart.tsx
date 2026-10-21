"use client";

/**
 * Component trực quan hóa kết quả phân cụm K-Means (k=4):
 * 1. Biểu đồ Cột / Tròn thể hiện phân bố số lượng và đặc trưng trung bình của 4 cụm.
 * 2. Biểu đồ Phân tán (Scatter Plot) trên không gian giảm chiều PCA 2D.
 */

import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClusterDistributionItem, PcaScatterPoint } from "@/types";

interface ClusterChartProps {
  clusters: ClusterDistributionItem[];
  scatterPoints: PcaScatterPoint[];
}

export const CLUSTER_COLOR_MAP: Record<string, string> = {
  "Rời bỏ sớm": "#ef4444", // Đỏ
  "Suy giảm dần": "#f59e0b", // Cam
  "Chăm chỉ nhưng điểm thấp": "#3b82f6", // Xanh dương
  "Ổn định tốt": "#10b981", // Xanh lá
};

export function getClusterColor(clusterName: string): string {
  return CLUSTER_COLOR_MAP[clusterName] || "#6366f1";
}

export function ClusterChart({ clusters, scatterPoints }: ClusterChartProps) {
  const [chartMode, setChartMode] = useState<"bar" | "pie">("bar");

  // Tách điểm PCA theo từng cụm để hiển thị Legend rõ ràng trên ScatterChart
  const clusterNames = Array.from(
    new Set(clusters.map((item) => item.cluster_name))
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Khối 1: Biểu đồ phân bố cụm (Bar / Pie chuyển đổi linh hoạt) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Phân bố sinh viên theo Cụm K-Means (k=4)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhãn cụm được gán tự động từ đặc trưng trung bình của tâm cụm
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setChartMode("bar")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMode === "bar"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Biểu đồ Cột
              </button>
              <button
                type="button"
                onClick={() => setChartMode("pie")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMode === "pie"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Biểu đồ Tròn
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "bar" ? (
                <BarChart
                  data={clusters}
                  margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="cluster_name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toLocaleString("vi-VN")} sinh viên`,
                      "Số lượng",
                    ]}
                  />
                  <Bar dataKey="student_count" radius={[8, 8, 0, 0]}>
                    {clusters.map((entry) => (
                      <Cell
                        key={entry.cluster_name}
                        fill={getClusterColor(entry.cluster_name)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={clusters}
                    dataKey="student_count"
                    nameKey="cluster_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={50}
                    paddingAngle={3}
                    label={({ cluster_name, percentage }) =>
                      `${cluster_name} (${percentage}%)`
                    }
                  >
                    {clusters.map((entry) => (
                      <Cell
                        key={entry.cluster_name}
                        fill={getClusterColor(entry.cluster_name)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toLocaleString("vi-VN")} sinh viên`,
                      "Số lượng",
                    ]}
                  />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Khối 2: Biểu đồ Phân tán PCA 2D */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Không gian Phân cụm PCA 2 chiều (Scatter Plot)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Giảm chiều từ 13 đặc trưng hành vi học tập gốc xuống 2 thành phần
              chính (PCA1 & PCA2)
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis
                  type="number"
                  dataKey="pca_x"
                  name="PCA 1"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="pca_y"
                  name="PCA 2"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }
                    const pt = payload[0].payload as PcaScatterPoint;
                    return (
                      <div className="rounded-xl bg-slate-900 text-white p-3 text-xs shadow-lg border border-slate-700 space-y-1">
                        <div className="font-bold text-indigo-300">
                          Mã SV: #{pt.id_student}
                        </div>
                        <div>Cụm K-Means: {pt.kmeans_cluster_name}</div>
                        <div>Nhãn gốc CSV: {pt.original_cluster_name}</div>
                        <div>Điểm rủi ro: {pt.risk_score}/100</div>
                        <div>Điểm TB: {pt.avg_score} | Clicks: {pt.total_clicks}</div>
                      </div>
                    );
                  }}
                />
                <Legend />
                {clusterNames.map((cName) => (
                  <Scatter
                    key={cName}
                    name={cName}
                    data={scatterPoints.filter(
                      (pt) => pt.kmeans_cluster_name === cName
                    )}
                    fill={getClusterColor(cName)}
                    fillOpacity={0.75}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bảng tóm tắt đặc trưng trung bình của 4 tâm cụm K-Means */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm overflow-x-auto">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
          Đặc trưng trung bình của từng Cụm K-Means & Đối chiếu nhãn cụm gốc
        </h4>
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <th className="py-2.5 px-3">Tên cụm K-Means</th>
              <th className="py-2.5 px-3 text-right">Số lượng SV</th>
              <th className="py-2.5 px-3 text-right">Tỷ trọng</th>
              <th className="py-2.5 px-3 text-right">Điểm TB</th>
              <th className="py-2.5 px-3 text-right">Điểm trọng số</th>
              <th className="py-2.5 px-3 text-right">Lượt Clicks TB</th>
              <th className="py-2.5 px-3 text-right">Số ngày hoạt động</th>
              <th className="py-2.5 px-3 text-right">Số bài đã nộp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {clusters.map((c) => (
              <tr
                key={c.cluster_id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="py-2.5 px-3 font-semibold flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: getClusterColor(c.cluster_name) }}
                  />
                  {c.cluster_name}
                </td>
                <td className="py-2.5 px-3 text-right font-medium">
                  {c.student_count.toLocaleString("vi-VN")}
                </td>
                <td className="py-2.5 px-3 text-right">{c.percentage}%</td>
                <td className="py-2.5 px-3 text-right">{c.avg_score}</td>
                <td className="py-2.5 px-3 text-right">
                  {c.avg_weighted_score}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {c.avg_clicks.toLocaleString("vi-VN")}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {c.avg_active_days} ngày
                </td>
                <td className="py-2.5 px-3 text-right">
                  {c.avg_assessments} bài
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
