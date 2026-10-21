/**
 * Bộ máy Phân tích Học tập Độc lập (Standalone Learning Analytics Engine) chạy trực tiếp trên Frontend/Vercel.
 * Thực thi toàn bộ pipeline chuẩn:
 * 1. Đọc file CSV (hỗ trợ cả Dữ liệu mẫu tĩnh `/data/student_risk_looker_studio.csv` và File người dùng Upload)
 * 2. Kiểm tra Schema 20 cột bắt buộc (báo lỗi tiếng Việt chính xác cột bị thiếu)
 * 3. Làm sạch, lọc trùng id_student, trích xuất đặc trưng (Feature Engineering)
 * 4. Chuẩn hóa Z-Score (StandardScaler) + Phân cụm K-Means (k=4) + Giảm chiều PCA 2D (Covariance Power Iteration)
 * 5. Tự động gán nhãn cụm nghiệp vụ từ Tâm cụm (Centroids) và tính Điểm rủi ro (ML & Heuristic 5 trọng số)
 * 6. Sinh lộ trình học tập cá nhân hóa Lai 2 tầng (Hybrid) và mẫu Email nhắc nhở.
 */

import {
  ClusterDistributionItem,
  ClustersResponse,
  DataLoadResponse,
  KpiResponse,
  PcaScatterPoint,
  PersonalizedPathway,
  SendReminderRequest,
  SendReminderResponse,
  StandardRiskLevel,
  StudentListResponse,
  StudentPersonalizeResponse,
  StudentPreviewRecord,
  WatchlistQueryParams,
  WatchlistResponse,
} from "@/types";

export const REQUIRED_COLUMNS: string[] = [
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
];

export const KMEANS_FEATURE_COLUMNS: (keyof StudentPreviewRecord)[] = [
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
];

interface InternalStudentRow extends StudentPreviewRecord {
  pca_x: number;
  pca_y: number;
}

interface StandaloneSession {
  sessionId: string;
  filename: string;
  rows: InternalStudentRow[];
  clusterSummaries: ClusterDistributionItem[];
}

// Bộ nhớ lưu trữ phiên ngay trên trình duyệt
const SESSION_CACHE = new Map<string, StandaloneSession>();
let LAST_ACTIVE_SESSION: StandaloneSession | null = null;

/**
 * Tách một dòng CSV có hỗ trợ dấu ngoặc kép.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Đọc nội dung văn bản CSV, xử lý BOM UTF-8 và kiểm tra 20 cột bắt buộc.
 */
export function parseAndValidateCsv(csvText: string): Record<string, string>[] {
  const cleanedText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanedText) {
    throw new Error("File dữ liệu rỗng hoặc không có bản ghi sinh viên nào.");
  }

  const lines = cleanedText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("File dữ liệu không có dòng bản ghi sinh viên nào.");
  }

  const headers = splitCsvLine(lines[0]).map((h) =>
    h.replace(/^\uFEFF/, "").trim()
  );

  const headerSet = new Set(headers);
  const missingCols = REQUIRED_COLUMNS.filter((col) => !headerSet.has(col));
  if (missingCols.length > 0) {
    throw new Error(
      `File tải lên thiếu ${missingCols.length} cột bắt buộc theo chuẩn OULAD: ${missingCols.join(", ")}.`
    );
  }

  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length < headers.length) continue;
    const rowObj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = values[j] ?? "";
    }
    records.push(rowObj);
  }

  if (records.length === 0) {
    throw new Error("Không đọc được bản ghi hợp lệ nào từ file tải lên.");
  }

  return records;
}

function toNum(val: string | undefined, fallback = 0): number {
  if (val === undefined || val === "") return fallback;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(val: number, minVal: number, maxVal: number): number {
  return Math.min(maxVal, Math.max(minVal, val));
}

function roundTo(val: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function mapStandardRiskLevel(
  score0to100: number,
  rawLevel: string
): StandardRiskLevel {
  const norm = rawLevel.trim().toLowerCase();
  if (norm.includes("cao")) return "Cao";
  if (norm.includes("trung bình") || norm.includes("trung binh")) {
    return "Trung bình";
  }
  if (
    norm.includes("an toàn") ||
    norm.includes("an toan") ||
    norm.includes("thấp")
  ) {
    return "Thấp";
  }
  if (score0to100 >= 70) return "Cao";
  if (score0to100 >= 40) return "Trung bình";
  return "Thấp";
}

/**
 * Tính hạng phần trăm (Percentile Rank) của mảng số.
 */
function percentileRanks(values: number[]): number[] {
  const n = values.length;
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n).fill(0);
  for (let r = 0; r < n; r++) {
    ranks[indexed[r].i] = (r + 1) / n;
  }
  return ranks;
}

/**
 * Tính 2 trục thành phần chính đầu tiên (PCA 2D) từ ma trận đã chuẩn hóa Z-Score
 * bằng phương pháp lũy thừa (Power Iteration) trên ma trận hiệp phương sai 13x13.
 */
function computePca2D(scaledMatrix: number[][]): { x: number; y: number }[] {
  const n = scaledMatrix.length;
  const d = scaledMatrix[0]?.length || 13;
  if (n === 0) return [];

  // Ma trận hiệp phương sai C (d x d)
  const cov: number[][] = Array.from({ length: d }, () =>
    new Array<number>(d).fill(0)
  );
  for (let i = 0; i < n; i++) {
    const row = scaledMatrix[i];
    for (let j = 0; j < d; j++) {
      for (let k = j; k < d; k++) {
        cov[j][k] += row[j] * row[k];
      }
    }
  }
  for (let j = 0; j < d; j++) {
    for (let k = j; k < d; k++) {
      cov[j][k] /= Math.max(n - 1, 1);
      cov[k][j] = cov[j][k];
    }
  }

  const powerIteration = (mat: number[][], seed: number[]): number[] => {
    let vec = [...seed];
    for (let iter = 0; iter < 40; iter++) {
      const next = new Array<number>(d).fill(0);
      for (let r = 0; r < d; r++) {
        let sum = 0;
        for (let c = 0; c < d; c++) {
          sum += mat[r][c] * vec[c];
        }
        next[r] = sum;
      }
      const norm =
        Math.sqrt(next.reduce((acc, v) => acc + v * v, 0)) || 1e-9;
      vec = next.map((v) => v / norm);
    }
    return vec;
  };

  const seed1 = Array.from({ length: d }, (_, idx) => (idx % 2 === 0 ? 1 : 0.5));
  const pc1 = powerIteration(cov, seed1);

  // Khử thành phần PC1 khỏi ma trận hiệp phương sai để tìm PC2 trực giao
  let lambda1 = 0;
  for (let r = 0; r < d; r++) {
    for (let c = 0; c < d; c++) {
      lambda1 += pc1[r] * cov[r][c] * pc1[c];
    }
  }
  const covDeflated: number[][] = Array.from({ length: d }, (_, r) =>
    Array.from(
      { length: d },
      (__, c) => cov[r][c] - lambda1 * pc1[r] * pc1[c]
    )
  );
  const seed2 = Array.from({ length: d }, (_, idx) =>
    idx % 2 === 0 ? -0.5 : 1
  );
  const pc2 = powerIteration(covDeflated, seed2);

  return scaledMatrix.map((row) => {
    let x = 0;
    let y = 0;
    for (let j = 0; j < d; j++) {
      x += row[j] * pc1[j];
      y += row[j] * pc2[j];
    }
    return { x: roundTo(x, 4), y: roundTo(y, 4) };
  });
}

/**
 * Chạy toàn bộ pipeline: Làm sạch -> Feature Engineering -> StandardScaler ->
 * K-Means (k=4) -> Gán nhãn từ Tâm cụm -> PCA 2D -> Tính điểm rủi ro.
 */
export function runFullStandalonePipeline(
  rawRecords: Record<string, string>[],
  filename: string,
  customSessionId?: string
): StandaloneSession {
  // 1. Chuyển đổi kiểu dữ liệu và lọc trùng id_student (giữ dòng có risk_probability cao nhất)
  const dedupMap = new Map<number, Record<string, string>>();
  for (const r of rawRecords) {
    const id = Math.trunc(toNum(r.id_student, 0));
    if (id <= 0) continue;
    const existing = dedupMap.get(id);
    if (!existing) {
      dedupMap.set(id, r);
    } else {
      const probNew = toNum(r.risk_probability, 0);
      const probOld = toNum(existing.risk_probability, 0);
      if (probNew > probOld) {
        dedupMap.set(id, r);
      }
    }
  }

  const cleanList = Array.from(dedupMap.values());
  if (cleanList.length === 0) {
    throw new Error("Dữ liệu sau khi làm sạch không còn mã sinh viên hợp lệ.");
  }

  // Tìm max_log_clicks và max_assessments để chuẩn hóa Engagement Index
  let maxLogClicks = 1;
  let maxAssessments = 1;
  for (const r of cleanList) {
    maxLogClicks = Math.max(maxLogClicks, toNum(r.log_total_clicks, 0));
    maxAssessments = Math.max(
      maxAssessments,
      toNum(r.total_assessments_submitted, 0)
    );
  }

  // 2. Tạo bản ghi sơ bộ + Feature Engineering + Risk Evaluation
  const rows: InternalStudentRow[] = cleanList.map((r) => {
    const id_student = Math.trunc(toNum(r.id_student));
    const module_presentation_length = Math.max(
      0,
      Math.trunc(toNum(r.module_presentation_length, 240))
    );
    const num_of_prev_attempts = Math.max(
      0,
      Math.trunc(toNum(r.num_of_prev_attempts, 0))
    );
    const studied_credits = Math.max(
      0,
      Math.trunc(toNum(r.studied_credits, 60))
    );
    const date_registration = toNum(r.date_registration, -60);
    const total_assessments_submitted = Math.max(
      0,
      Math.trunc(toNum(r.total_assessments_submitted, 0))
    );
    const avg_score = clamp(toNum(r.avg_score, 0), 0, 100);
    const weighted_score = clamp(toNum(r.weighted_score, 0), 0, 100);
    const total_clicks = Math.max(0, Math.trunc(toNum(r.total_clicks, 0)));
    const log_total_clicks = Math.max(0, toNum(r.log_total_clicks, 0));
    const active_days = Math.max(0, Math.trunc(toNum(r.active_days, 0)));
    const forum_clicks = Math.max(0, Math.trunc(toNum(r.forum_clicks, 0)));
    const content_clicks = Math.max(0, Math.trunc(toNum(r.content_clicks, 0)));
    const quiz_clicks = Math.max(0, Math.trunc(toNum(r.quiz_clicks, 0)));
    const actual_target = Math.trunc(toNum(r.actual_target, 0));
    const risk_probability = toNum(r.risk_probability, 0);
    const predicted_risk = Math.trunc(toNum(r.predicted_risk, 0));
    const cluster_id = Math.trunc(toNum(r.cluster_id, 0));
    const cluster_name = (r.cluster_name || "Chưa phân loại").trim();
    const risk_level = (r.risk_level || "An toàn").trim();

    const clicks_per_active_day =
      active_days > 0 ? roundTo(total_clicks / active_days, 2) : 0;
    const safeLen = module_presentation_length > 0 ? module_presentation_length : 240;
    const active_day_ratio = clamp(
      roundTo((active_days / safeLen) * 100, 2),
      0,
      100
    );

    const normClicks = (log_total_clicks / maxLogClicks) * 100;
    const normAssess = (total_assessments_submitted / maxAssessments) * 100;
    const engagement_index = clamp(
      roundTo(
        0.4 * normClicks + 0.35 * active_day_ratio + 0.25 * normAssess,
        2
      ),
      0,
      100
    );

    // Tính Heuristic Risk Score (5 trọng số chuyên gia)
    const compositeScore = 0.4 * avg_score + 0.6 * weighted_score;
    const scoreRisk = clamp(100 - compositeScore, 0, 100);
    const assessmentRisk =
      (1 - clamp(total_assessments_submitted / 10, 0, 1)) * 100;
    const activeDaysRisk = (1 - clamp(active_days / 90, 0, 1)) * 100;
    const clickRisk = (1 - clamp(log_total_clicks / 8.5, 0, 1)) * 100;
    const attemptRisk = clamp(num_of_prev_attempts * 35, 0, 100);

    const heuristic_risk_score = roundTo(
      0.3 * scoreRisk +
        0.25 * assessmentRisk +
        0.2 * activeDaysRisk +
        0.15 * clickRisk +
        0.1 * attemptRisk,
      2
    );

    const risk_score =
      risk_probability <= 1.05
        ? clamp(roundTo(risk_probability * 100, 2), 0, 100)
        : clamp(roundTo(risk_probability, 2), 0, 100);

    const risk_level_standard = mapStandardRiskLevel(risk_score, risk_level);

    return {
      id_student,
      module_presentation_length,
      num_of_prev_attempts,
      studied_credits,
      date_registration,
      total_assessments_submitted,
      avg_score: roundTo(avg_score, 2),
      weighted_score: roundTo(weighted_score, 2),
      total_clicks,
      log_total_clicks: roundTo(log_total_clicks, 4),
      active_days,
      forum_clicks,
      content_clicks,
      quiz_clicks,
      actual_target,
      risk_probability: roundTo(risk_probability, 4),
      predicted_risk,
      cluster_id,
      cluster_name,
      risk_level,
      kmeans_cluster_id: 0,
      kmeans_cluster_name: "",
      original_cluster_name: cluster_name,
      cluster_match: false,
      risk_score,
      heuristic_risk_score,
      risk_level_standard,
      clicks_per_active_day,
      active_day_ratio,
      engagement_index,
      pca_x: 0,
      pca_y: 0,
    };
  });

  // 3. Chuẩn hóa Z-Score (StandardScaler) cho 13 cột đặc trưng K-Means
  const n = rows.length;
  const d = KMEANS_FEATURE_COLUMNS.length;
  const means = new Array<number>(d).fill(0);
  const stds = new Array<number>(d).fill(1);

  for (let j = 0; j < d; j++) {
    const colKey = KMEANS_FEATURE_COLUMNS[j];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += Number(rows[i][colKey]);
    }
    means[j] = sum / n;

    let sqSum = 0;
    for (let i = 0; i < n; i++) {
      const diff = Number(rows[i][colKey]) - means[j];
      sqSum += diff * diff;
    }
    const variance = sqSum / n;
    stds[j] = variance > 1e-12 ? Math.sqrt(variance) : 1;
  }

  const scaledMatrix: number[][] = rows.map((row) =>
    KMEANS_FEATURE_COLUMNS.map(
      (colKey, j) => (Number(row[colKey]) - means[j]) / stds[j]
    )
  );

  // 4. Phân cụm K-Means (k=4) với khởi tạo phân vị xác định (Deterministic Quantile Seed)
  const k = 4;
  const sortedIndicesByActivity = rows
    .map((r, idx) => ({
      idx,
      score: r.log_total_clicks + r.weighted_score / 20 + r.active_days / 30,
    }))
    .sort((a, b) => a.score - b.score)
    .map((item) => item.idx);

  const centroids: number[][] = [0.1, 0.36, 0.64, 0.9].map((q) => {
    const pickIdx =
      sortedIndicesByActivity[
        Math.min(n - 1, Math.floor(q * (n - 1)))
      ];
    return [...scaledMatrix[pickIdx]];
  });

  const assignments = new Array<number>(n).fill(0);
  for (let iter = 0; iter < 35; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      const pt = scaledMatrix[i];
      let bestC = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        let dist = 0;
        const center = centroids[c];
        for (let j = 0; j < d; j++) {
          const diff = pt[j] - center[j];
          dist += diff * diff;
        }
        if (dist < bestDist) {
          bestDist = dist;
          bestC = c;
        }
      }
      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }

    if (!changed && iter > 0) break;

    const counts = new Array<number>(k).fill(0);
    const sums: number[][] = Array.from({ length: k }, () =>
      new Array<number>(d).fill(0)
    );
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      counts[c]++;
      const pt = scaledMatrix[i];
      for (let j = 0; j < d; j++) {
        sums[c][j] += pt[j];
      }
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let j = 0; j < d; j++) {
          centroids[c][j] = sums[c][j] / counts[c];
        }
      }
    }
  }

  // Khôi phục tâm cụm về thang đo gốc để gán nhãn nghiệp vụ động
  const unscaledCentroids = centroids.map((center) => {
    const obj: Record<string, number> = {};
    KMEANS_FEATURE_COLUMNS.forEach((colKey, j) => {
      obj[colKey] = center[j] * stds[j] + means[j];
    });
    return obj;
  });

  const rankLogClicks = percentileRanks(
    unscaledCentroids.map((c) => c.log_total_clicks)
  );
  const rankActiveDays = percentileRanks(
    unscaledCentroids.map((c) => c.active_days)
  );
  const rankAssessments = percentileRanks(
    unscaledCentroids.map((c) => c.total_assessments_submitted)
  );
  const rankWeighted = percentileRanks(
    unscaledCentroids.map((c) => c.weighted_score)
  );

  const remaining = [0, 1, 2, 3];
  const labelMap: Record<number, string> = {};

  // (1) Cụm "Rời bỏ sớm": argmin S_act
  let earlyIdx = remaining[0];
  let minAct = Infinity;
  for (const cid of remaining) {
    const sAct =
      rankLogClicks[cid] + rankActiveDays[cid] + rankAssessments[cid];
    if (sAct < minAct) {
      minAct = sAct;
      earlyIdx = cid;
    }
  }
  labelMap[earlyIdx] = "Rời bỏ sớm";
  remaining.splice(remaining.indexOf(earlyIdx), 1);

  // (2) Cụm "Ổn định tốt": argmax S_exc
  let stableIdx = remaining[0];
  let maxExc = -Infinity;
  for (const cid of remaining) {
    const sExc =
      0.45 * rankWeighted[cid] +
      0.3 * rankAssessments[cid] +
      0.25 * rankActiveDays[cid];
    if (sExc > maxExc) {
      maxExc = sExc;
      stableIdx = cid;
    }
  }
  labelMap[stableIdx] = "Ổn định tốt";
  remaining.splice(remaining.indexOf(stableIdx), 1);

  // (3) Cụm "Chăm chỉ nhưng điểm thấp" vs "Suy giảm dần"
  const cA = remaining[0];
  const cB = remaining[1];
  const effA =
    0.6 * unscaledCentroids[cA].active_days +
    0.4 * (unscaledCentroids[cA].total_clicks / 50);
  const effB =
    0.6 * unscaledCentroids[cB].active_days +
    0.4 * (unscaledCentroids[cB].total_clicks / 50);

  if (effA >= effB) {
    labelMap[cA] = "Chăm chỉ nhưng điểm thấp";
    labelMap[cB] = "Suy giảm dần";
  } else {
    labelMap[cB] = "Chăm chỉ nhưng điểm thấp";
    labelMap[cA] = "Suy giảm dần";
  }

  // 5. Tính tọa độ PCA 2D
  const pcaCoords = computePca2D(scaledMatrix);

  for (let i = 0; i < n; i++) {
    const cid = assignments[i];
    const cname = labelMap[cid] || "Suy giảm dần";
    rows[i].kmeans_cluster_id = cid;
    rows[i].kmeans_cluster_name = cname;
    const normOrig =
      rows[i].original_cluster_name === "Nguy cơ suy giảm dần"
        ? "Suy giảm dần"
        : rows[i].original_cluster_name;
    rows[i].cluster_match = normOrig === cname;
    rows[i].pca_x = pcaCoords[i].x;
    rows[i].pca_y = pcaCoords[i].y;
  }

  // 6. Tổng hợp thống kê 4 cụm
  const clusterSummaries: ClusterDistributionItem[] = [0, 1, 2, 3].map(
    (cid) => {
      const cname = labelMap[cid];
      const sub = rows.filter((r) => r.kmeans_cluster_id === cid);
      const count = sub.length;
      const avg = (fn: (item: InternalStudentRow) => number) =>
        count > 0 ? sub.reduce((acc, item) => acc + fn(item), 0) / count : 0;

      return {
        cluster_id: cid,
        cluster_name: cname,
        student_count: count,
        percentage: roundTo((count / n) * 100, 2),
        avg_score: roundTo(avg((x) => x.avg_score), 2),
        avg_weighted_score: roundTo(avg((x) => x.weighted_score), 2),
        avg_clicks: roundTo(avg((x) => x.total_clicks), 1),
        avg_active_days: roundTo(avg((x) => x.active_days), 1),
        avg_assessments: roundTo(
          avg((x) => x.total_assessments_submitted),
          2
        ),
        agreement_with_original_pct: roundTo(
          avg((x) => (x.cluster_match ? 100 : 0)),
          2
        ),
      };
    }
  );

  const sessionId =
    customSessionId ||
    `oulad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const session: StandaloneSession = {
    sessionId,
    filename,
    rows,
    clusterSummaries,
  };

  SESSION_CACHE.set(sessionId, session);
  LAST_ACTIVE_SESSION = session;
  return session;
}

/**
 * Tự động nạp dữ liệu mẫu từ `/data/student_risk_looker_studio.csv` nếu người dùng F5 tải lại trang.
 */
export async function ensureStandaloneSession(
  sessionId: string
): Promise<StandaloneSession> {
  const cached = SESSION_CACHE.get(sessionId);
  if (cached) return cached;
  if (LAST_ACTIVE_SESSION) {
    SESSION_CACHE.set(sessionId, LAST_ACTIVE_SESSION);
    return LAST_ACTIVE_SESSION;
  }

  const response = await fetch("/data/student_risk_looker_studio.csv");
  if (!response.ok) {
    throw new Error(
      "Không tìm thấy file dữ liệu mẫu tĩnh (/data/student_risk_looker_studio.csv)."
    );
  }
  const csvText = await response.text();
  const rawRecords = parseAndValidateCsv(csvText);
  return runFullStandalonePipeline(
    rawRecords,
    "student_risk_looker_studio.csv",
    sessionId
  );
}

/**
 * Lọc danh sách sinh viên theo 4 bộ lọc nhanh trên Dashboard.
 */
function applyCommonFilters(
  rows: InternalStudentRow[],
  params?: WatchlistQueryParams
): InternalStudentRow[] {
  if (!params) return rows;
  return rows.filter((r) => {
    if (
      params.module !== undefined &&
      params.module !== null &&
      r.module_presentation_length !== params.module
    ) {
      return false;
    }
    if (
      params.cluster &&
      params.cluster !== "ALL" &&
      r.kmeans_cluster_name !== params.cluster
    ) {
      return false;
    }
    if (
      params.risk_level &&
      params.risk_level !== "ALL" &&
      r.risk_level_standard !== params.risk_level
    ) {
      return false;
    }
    if (params.prev_attempts && params.prev_attempts !== "ALL") {
      if (params.prev_attempts === "0" && r.num_of_prev_attempts !== 0) {
        return false;
      }
      if (params.prev_attempts === "1+" && r.num_of_prev_attempts < 1) {
        return false;
      }
    }
    return true;
  });
}

export async function standaloneLoadSample(): Promise<DataLoadResponse> {
  const response = await fetch("/data/student_risk_looker_studio.csv");
  if (!response.ok) {
    throw new Error(
      "Không thể tải dữ liệu mẫu từ /data/student_risk_looker_studio.csv."
    );
  }
  const csvText = await response.text();
  const rawRecords = parseAndValidateCsv(csvText);
  const session = runFullStandalonePipeline(
    rawRecords,
    "student_risk_looker_studio.csv"
  );

  return {
    session_id: session.sessionId,
    filename: session.filename,
    total_rows: session.rows.length,
    columns: REQUIRED_COLUMNS,
    preview: session.rows.slice(0, 25),
    message: `Đã nạp và phân tích độc lập thành công ${session.rows.length.toLocaleString("vi-VN")} sinh viên từ bộ dữ liệu mẫu OULAD.`,
  };
}

export async function standaloneUploadFile(
  file: File
): Promise<DataLoadResponse> {
  const nameLower = file.name.toLowerCase();
  if (!nameLower.endsWith(".csv")) {
    throw new Error(
      "Trên chế độ chạy độc lập Vercel, vui lòng tải lên tệp định dạng .csv (UTF-8)."
    );
  }
  const text = await file.text();
  const rawRecords = parseAndValidateCsv(text);
  const session = runFullStandalonePipeline(rawRecords, file.name);

  return {
    session_id: session.sessionId,
    filename: session.filename,
    total_rows: session.rows.length,
    columns: REQUIRED_COLUMNS,
    preview: session.rows.slice(0, 25),
    message: `Đã tải lên và phân tích thành công ${session.rows.length.toLocaleString("vi-VN")} sinh viên từ tệp '${file.name}'.`,
  };
}

export async function standaloneGetKpi(
  sessionId: string,
  params?: WatchlistQueryParams
): Promise<KpiResponse> {
  const session = await ensureStandaloneSession(sessionId);
  const filtered = applyCommonFilters(session.rows, params);
  const total = filtered.length;

  if (total === 0) {
    return {
      session_id: sessionId,
      total_students: 0,
      high_risk_count: 0,
      medium_risk_count: 0,
      low_risk_count: 0,
      high_risk_percentage: 0,
      avg_risk_score: 0,
      avg_heuristic_risk_score: 0,
      avg_score: 0,
      avg_active_days: 0,
      kmeans_agreement_rate: 0,
    };
  }

  let high = 0;
  let medium = 0;
  let low = 0;
  let sumRisk = 0;
  let sumHeuristic = 0;
  let sumScore = 0;
  let sumDays = 0;
  let sumMatch = 0;

  for (const r of filtered) {
    if (r.risk_level_standard === "Cao") high++;
    else if (r.risk_level_standard === "Trung bình") medium++;
    else low++;

    sumRisk += r.risk_score;
    sumHeuristic += r.heuristic_risk_score;
    sumScore += r.avg_score;
    sumDays += r.active_days;
    if (r.cluster_match) sumMatch++;
  }

  return {
    session_id: sessionId,
    total_students: total,
    high_risk_count: high,
    medium_risk_count: medium,
    low_risk_count: low,
    high_risk_percentage: roundTo((high / total) * 100, 2),
    avg_risk_score: roundTo(sumRisk / total, 2),
    avg_heuristic_risk_score: roundTo(sumHeuristic / total, 2),
    avg_score: roundTo(sumScore / total, 2),
    avg_active_days: roundTo(sumDays / total, 1),
    kmeans_agreement_rate: roundTo((sumMatch / total) * 100, 2),
  };
}

export async function standaloneGetClusters(
  sessionId: string,
  params?: WatchlistQueryParams
): Promise<ClustersResponse> {
  const session = await ensureStandaloneSession(sessionId);
  const filtered = applyCommonFilters(session.rows, params);
  const total = Math.max(filtered.length, 1);

  const clusters: ClusterDistributionItem[] = session.clusterSummaries.map(
    (base) => {
      const sub = filtered.filter(
        (r) => r.kmeans_cluster_id === base.cluster_id
      );
      const count = sub.length;
      const avg = (fn: (item: InternalStudentRow) => number) =>
        count > 0 ? sub.reduce((acc, item) => acc + fn(item), 0) / count : 0;

      return {
        cluster_id: base.cluster_id,
        cluster_name: base.cluster_name,
        student_count: count,
        percentage: roundTo((count / total) * 100, 2),
        avg_score: roundTo(avg((x) => x.avg_score), 2),
        avg_weighted_score: roundTo(avg((x) => x.weighted_score), 2),
        avg_clicks: roundTo(avg((x) => x.total_clicks), 1),
        avg_active_days: roundTo(avg((x) => x.active_days), 1),
        avg_assessments: roundTo(
          avg((x) => x.total_assessments_submitted),
          2
        ),
        agreement_with_original_pct: roundTo(
          avg((x) => (x.cluster_match ? 100 : 0)),
          2
        ),
      };
    }
  );

  const stride = Math.max(1, Math.floor(filtered.length / 1000));
  const scatter_points: PcaScatterPoint[] = filtered
    .filter((_, idx) => idx % stride === 0)
    .slice(0, 1200)
    .map((r) => ({
      id_student: r.id_student,
      pca_x: r.pca_x,
      pca_y: r.pca_y,
      kmeans_cluster_id: r.kmeans_cluster_id,
      kmeans_cluster_name: r.kmeans_cluster_name,
      original_cluster_name: r.original_cluster_name,
      risk_score: r.risk_score,
      risk_level_standard: r.risk_level_standard,
      avg_score: r.avg_score,
      total_clicks: r.total_clicks,
    }));

  return {
    session_id: sessionId,
    clusters,
    scatter_points,
  };
}

export function filterAndSortWatchlistRows(
  session: StandaloneSession,
  params: WatchlistQueryParams
): InternalStudentRow[] {
  let list = applyCommonFilters(session.rows, params);

  const minRisk = params.min_risk ?? 0;
  const maxRisk = params.max_risk ?? 100;
  list = list.filter((r) => r.risk_score >= minRisk && r.risk_score <= maxRisk);

  if (params.search && params.search.trim() !== "") {
    const q = params.search.trim();
    list = list.filter((r) => String(r.id_student).includes(q));
  }

  const sortCol = (params.sort_by || "risk_score") as keyof InternalStudentRow;
  const asc = params.sort_order === "asc";

  return [...list].sort((a, b) => {
    const va = Number(a[sortCol] ?? 0);
    const vb = Number(b[sortCol] ?? 0);
    return asc ? va - vb : vb - va;
  });
}

export async function standaloneGetWatchlist(
  sessionId: string,
  params: WatchlistQueryParams
): Promise<WatchlistResponse> {
  const session = await ensureStandaloneSession(sessionId);
  const sorted = filterAndSortWatchlistRows(session, params);

  const modules = Array.from(
    new Set(session.rows.map((r) => r.module_presentation_length))
  ).sort((a, b) => a - b);
  const clusters = Array.from(
    new Set(session.rows.map((r) => r.kmeans_cluster_name))
  ).sort();

  const pageSize = params.page_size || 15;
  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, params.page || 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    session_id: sessionId,
    total_filtered: totalFiltered,
    page: safePage,
    page_size: pageSize,
    total_pages: totalPages,
    filter_options: {
      modules,
      clusters,
      risk_levels: ["Cao", "Trung bình", "Thấp"],
    },
    items: sorted.slice(start, start + pageSize),
  };
}

/**
 * Tạo và kích hoạt tải xuống file CSV trực tiếp trên trình duyệt (không cần Backend).
 */
export async function triggerStandaloneCsvDownload(
  sessionId: string,
  params: WatchlistQueryParams
): Promise<void> {
  const session = await ensureStandaloneSession(sessionId);
  const rows = filterAndSortWatchlistRows(session, params);

  const cols: (keyof StudentPreviewRecord)[] = [
    "id_student",
    "module_presentation_length",
    "num_of_prev_attempts",
    "studied_credits",
    "total_assessments_submitted",
    "avg_score",
    "weighted_score",
    "total_clicks",
    "active_days",
    "kmeans_cluster_name",
    "original_cluster_name",
    "risk_score",
    "heuristic_risk_score",
    "risk_level_standard",
  ];

  const headerLine = cols.join(",");
  const bodyLines = rows.map((r) =>
    cols
      .map((c) => {
        const val = r[c];
        return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val;
      })
      .join(",")
  );

  const csvContent = "\uFEFF" + [headerLine, ...bodyLines].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `watchlist_oulad_${rows.length}_sv.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function standaloneGetStudentList(
  sessionId: string,
  query = "",
  limit = 150
): Promise<StudentListResponse> {
  const session = await ensureStandaloneSession(sessionId);
  const q = query.trim();
  const matched = q
    ? session.rows.filter((r) => String(r.id_student).includes(q))
    : session.rows;

  const sorted = [...matched]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, limit)
    .map((r) => ({
      id_student: r.id_student,
      kmeans_cluster_name: r.kmeans_cluster_name,
      original_cluster_name: r.original_cluster_name,
      risk_score: r.risk_score,
      risk_level_standard: r.risk_level_standard,
      avg_score: r.avg_score,
    }));

  return {
    session_id: sessionId,
    total: matched.length,
    students: sorted,
  };
}

/**
 * Sinh lộ trình học tập cá nhân hóa theo Cơ chế Lai 2 tầng ngay trên trình duyệt.
 */
export function buildStandalonePathway(
  st: StudentPreviewRecord
): PersonalizedPathway {
  const clusterName = st.kmeans_cluster_name || "Suy giảm dần";

  const extraGoals: string[] = [];
  if (st.quiz_clicks === 0) {
    extraGoals.push(
      "Bạn chưa có lượt tương tác Quiz nào: Hãy hoàn thành ít nhất 1 bài Quiz tự luyện tuần này."
    );
  }
  if (st.forum_clicks < 10 && clusterName !== "Rời bỏ sớm") {
    extraGoals.push(
      "Tăng cường tương tác trên diễn đàn (hiện tại < 10 clicks) để trao đổi kinh nghiệm làm bài."
    );
  }

  if (clusterName === "Rời bỏ sớm") {
    return {
      cluster_name: clusterName,
      cluster_description:
        "Sinh viên có mức độ tương tác trên hệ thống VLE rất thấp hoặc gần như bằng 0, số ngày đăng nhập ít và thiếu nhiều bài kiểm tra định kỳ. Nguy cơ bỏ học giữa chừng ở mức báo động.",
      intervention_priority: "Khẩn cấp (Ưu tiên mức 1)",
      micro_learning: [
        {
          title:
            "Video khởi động nhanh: Tóm tắt kiến thức cốt lõi học phần trong 15 phút",
          duration: "15 phút",
          format: "Video tương tác",
          focus_area:
            "Hệ thống hóa nền tảng để bắt nhịp lại môn học mà không bị quá tải.",
        },
        {
          title:
            "Infographic: Lộ trình vượt qua môn học với 30 phút mỗi ngày",
          duration: "10 phút",
          format: "Tài liệu trực quan",
          focus_area:
            "Xây dựng lại thói quen đăng nhập VLE tối thiểu 3 ngày/tuần.",
        },
        {
          title:
            "Podcast/Audio: Giải đáp các rào cản tâm lý và cách xin gia hạn bài tập",
          duration: "12 phút",
          format: "Audio hướng dẫn",
          focus_area:
            "Kết nối lại với cố vấn học tập và nắm quy chế hỗ trợ sinh viên.",
        },
      ],
      supplementary_exercises: [
        {
          title: "Bộ 10 câu hỏi trắc nghiệm chẩn đoán lỗ hổng kiến thức cơ bản",
          difficulty: "Cơ bản",
          estimated_time: "15 phút",
          objective:
            "Đánh giá nhanh phần kiến thức đã lỡ để gợi ý bài đọc ngắn tương ứng.",
        },
        {
          title:
            "Bài tập thực hành có hướng dẫn từng bước (Step-by-step Walkthrough)",
          difficulty: "Cơ bản",
          estimated_time: "20 phút",
          objective:
            "Hoàn thành ít nhất 1 bài nộp TMA/CMA để kích hoạt lại tiến độ.",
        },
      ],
      weekly_goals: [
        "Đăng nhập vào hệ thống VLE tối thiểu 3 ngày trong tuần này (mỗi lần 20 phút).",
        "Hoàn thành 1 bài kiểm tra ngắn (Quiz) hoặc bài tập bổ trợ cơ bản.",
        "Phản hồi email của Cố vấn học tập để xác nhận kế hoạch học bù.",
        ...extraGoals,
      ],
      email_subject: `[KHẨN] Hỗ trợ khôi phục lộ trình học tập - Sinh viên #${st.id_student}`,
      email_body: `Chào bạn (Mã SV: ${st.id_student}),\n\nHệ thống Phân tích Học tập OULAD ghi nhận mức độ tương tác của bạn hiện đang ở nhóm '${clusterName}' với điểm rủi ro là ${st.risk_score}/100 (Mức: ${st.risk_level_standard}).\nThông số hiện tại của bạn:\n- Số ngày hoạt động trên hệ thống: ${st.active_days} ngày\n- Tổng số lượt tương tác (clicks): ${st.total_clicks} lượt\n- Số bài đánh giá đã nộp: ${st.total_assessments_submitted} bài (Điểm TB: ${st.avg_score}/100)\n\nThay vì phải đọc lại toàn bộ giáo trình, hệ thống đã thiết kế riêng cho bạn gói Micro-learning 15 phút/ngày:\n1. Xem video tóm tắt cốt lõi học phần (15 phút).\n2. Làm bộ 10 câu hỏi chẩn đoán cơ bản để lấy lại nhịp học.\n3. Đặt mục tiêu đăng nhập 3 ngày/tuần và hoàn thành 1 bài đánh giá kế tiếp.\n\nNếu bạn cần gia hạn nộp bài hoặc tư vấn 1-1, vui lòng phản hồi trực tiếp email này.\n\nTrân trọng,\nBan Cố vấn Học tập OULAD`,
    };
  }

  if (clusterName === "Chăm chỉ nhưng điểm thấp") {
    return {
      cluster_name: clusterName,
      cluster_description:
        "Sinh viên rất tích cực truy cập học liệu và hoạt động nhiều ngày trên VLE, nhưng điểm trung bình hoặc điểm trọng số chưa tương xứng với thời gian bỏ ra.",
      intervention_priority: "Trung bình - Cần tối ưu phương pháp học",
      micro_learning: [
        {
          title:
            "Hướng dẫn kỹ thuật làm bài đánh giá (Assessment Rubric & Chiến thuật làm bài)",
          duration: "20 phút",
          format: "Video chuyên đề",
          focus_area:
            "Hiểu rõ tiêu chí chấm điểm để chuyển hóa thời gian đọc tài liệu thành điểm số thực tế.",
        },
        {
          title:
            "Sơ đồ tư duy (Mindmap) liên kết lý thuyết với câu hỏi vận dụng",
          duration: "15 phút",
          format: "Tài liệu Mindmap",
          focus_area:
            "Chuyển từ đọc thụ động (Content clicks cao) sang tư duy giải quyết vấn đề.",
        },
        {
          title:
            "Video chữa mẫu bài tập đạt điểm tối đa (Exemplar Answer Walkthrough)",
          duration: "18 phút",
          format: "Video phân tích mẫu",
          focus_area:
            "Cách trình bày lập luận và tránh mất điểm ở các câu hỏi trọng số lớn.",
        },
      ],
      supplementary_exercises: [
        {
          title:
            "Bộ đề luyện tập mô phỏng theo cấu trúc đề thi chuẩn kèm lời giải chi tiết",
          difficulty: "Trung bình - Khá",
          estimated_time: "35 phút",
          objective:
            "Rèn kỹ năng phân bổ thời gian và kiểm tra mức độ hiểu sâu.",
        },
        {
          title:
            "Bài tập tự đánh giá (Self-Assessment) đối chiếu theo Rubric chấm điểm",
          difficulty: "Trung bình",
          estimated_time: "20 phút",
          objective: `Thu hẹp khoảng cách giữa điểm trung bình (${st.avg_score}) và điểm trọng số (${st.weighted_score}).`,
        },
      ],
      weekly_goals: [
        "Giảm thời gian đọc lướt tài liệu thụ động, dành 60% thời gian cho việc làm Quiz và giải đề.",
        "Xem kỹ video phân tích tiêu chí chấm điểm (Rubric) trước khi nộp bài tiếp theo.",
        "Đặt ít nhất 1 câu hỏi về phần kiến thức chưa rõ trên Forum để được giảng viên giải đáp.",
        ...extraGoals,
      ],
      email_subject: `[Cố vấn học tập] Tối ưu phương pháp học & bứt phá điểm số - SV #${st.id_student}`,
      email_body: `Chào bạn (Mã SV: ${st.id_student}),\n\nHệ thống rất ghi nhận sự nỗ lực của bạn với ${st.active_days} ngày hoạt động và ${st.total_clicks} lượt tương tác trên hệ thống học tập! Hiện tại bạn thuộc nhóm '${clusterName}' (Điểm TB: ${st.avg_score}, Điểm trọng số: ${st.weighted_score}, Điểm rủi ro: ${st.risk_score}/100).\n\nĐể giúp bạn chuyển hóa sự chăm chỉ thành điểm số cao hơn, hệ thống gợi ý bạn điều chỉnh chiến lược học tập trong tuần này:\n1. Xem video 'Phân tích tiêu chí chấm điểm (Assessment Rubric)' (20 phút).\n2. Chuyển trọng tâm từ đọc tài liệu thuần túy (${st.content_clicks} lượt xem nội dung) sang làm bài luyện Quiz có giải thích chi tiết.\n3. Tham khảo bài giải mẫu để cải thiện điểm trọng số ở các bài thi sắp tới.\n\nTrân trọng,\nBan Cố vấn Học tập OULAD`,
    };
  }

  if (clusterName === "Ổn định tốt") {
    return {
      cluster_name: clusterName,
      cluster_description:
        "Sinh viên duy trì kỷ luật học tập xuất sắc, tương tác đều đặn trên cả học liệu, quiz lẫn diễn đàn, đồng thời đạt điểm số và tiến độ nộp bài ấn tượng.",
      intervention_priority: "Duy trì & Phát triển nâng cao",
      micro_learning: [
        {
          title:
            "Chuyên đề nâng cao (Masterclass): Ứng dụng thực tiễn & Case Study chuyên sâu",
          duration: "25 phút",
          format: "Bài giảng chuyên sâu",
          focus_area:
            "Mở rộng kiến thức vượt khung chương trình chuẩn để hướng tới điểm Distinction.",
        },
        {
          title:
            "Tài liệu hướng dẫn kỹ năng Peer-Mentoring & Thảo luận học thuật",
          duration: "15 phút",
          format: "Tài liệu đọc",
          focus_area:
            "Nâng cao khả năng phản biện và dẫn dắt thảo luận trên diễn đàn học tập.",
        },
      ],
      supplementary_exercises: [
        {
          title:
            "Bài tập thử thách nâng cao (Challenge Problem Set - Mức Distinction)",
          difficulty: "Nâng cao",
          estimated_time: "40 phút",
          objective:
            "Chinh phục mức điểm xuất sắc (>85) trong kỳ đánh giá cuối kỳ.",
        },
        {
          title:
            "Hoạt động hỗ trợ giải đáp 2 câu hỏi của bạn học trên Forum",
          difficulty: "Vận dụng cao",
          estimated_time: "20 phút",
          objective:
            "Củng cố kiến thức sâu sắc hơn thông qua việc giải thích lại cho người khác.",
        },
      ],
      weekly_goals: [
        "Duy trì nhịp độ học tập ổn định và hoàn thành sớm các bài đánh giá trước hạn.",
        "Thử sức với 1 bài tập tình huống nâng cao (Case Study).",
        "Tham gia đóng góp ý kiến chuyên môn hoặc hỗ trợ thành viên khác trên Forum.",
        ...extraGoals,
      ],
      email_subject: `[Khen ngợi & Lộ trình nâng cao] Chúc mừng kết quả học tập ấn tượng - SV #${st.id_student}`,
      email_body: `Chào bạn (Mã SV: ${st.id_student}),\n\nChúc mừng bạn đã duy trì thành tích học tập rất ấn tượng! Hệ thống ghi nhận bạn thuộc nhóm '${clusterName}' với điểm rủi ro rất thấp (${st.risk_score}/100 - Mức: ${st.risk_level_standard}).\n\nThành tích nổi bật của bạn:\n- Điểm trung bình: ${st.avg_score}/100 | Điểm trọng số: ${st.weighted_score}/100\n- Số bài đánh giá đã hoàn thành: ${st.total_assessments_submitted} bài\n- Số ngày hoạt động tích cực: ${st.active_days} ngày (${st.total_clicks} lượt tương tác)\n\nLộ trình phát triển nâng cao tuần này dành cho bạn:\n1. Khám phá chuyên đề Case Study nâng cao (25 phút) để hướng tới xếp loại Xuất sắc (Distinction).\n2. Thử sức với bộ câu hỏi vận dụng cao (Challenge Problem Set).\n3. Chia sẻ kinh nghiệm học tập cùng các bạn trên diễn đàn môn học.\n\nTrân trọng,\nBan Cố vấn Học tập OULAD`,
    };
  }

  // Mặc định: Cụm "Suy giảm dần"
  return {
    cluster_name: "Suy giảm dần",
    cluster_description:
      "Sinh viên khởi đầu môn học khá tốt nhưng tần suất truy cập VLE, thảo luận diễn đàn và tiến độ làm bài kiểm tra đang chững lại rõ rệt theo thời gian.",
    intervention_priority: "Cao (Ưu tiên mức 2)",
    micro_learning: [
      {
        title:
          "Flashcards ôn tập nhanh các chủ đề giữa kỳ (Spaced Repetition)",
        duration: "12 phút",
        format: "Thẻ ghi nhớ số",
        focus_area:
          "Củng cố kiến thức các tuần gần đây thông qua cơ chế lặp lại ngắt quãng.",
      },
      {
        title: "Video phân tích các lỗi sai phổ biến trong bài đánh giá giữa kỳ",
        duration: "18 phút",
        format: "Video bài giảng ngắn",
        focus_area:
          "Khắc phục điểm nghẽn khiến điểm trọng số (weighted score) bị giảm.",
      },
      {
        title:
          "Checklist quản lý thời gian theo phương pháp Pomodoro cho sinh viên từ xa",
        duration: "8 phút",
        format: "Hướng dẫn thực hành",
        focus_area:
          "Duy trì nhịp độ học đều đặn thay vì học dồn sát hạn nộp.",
      },
    ],
    supplementary_exercises: [
      {
        title: "Bài tập tự luyện Quiz tương tác cho học phần hiện tại",
        difficulty: "Trung bình",
        estimated_time: "25 phút",
        objective:
          "Nâng tỷ lệ tương tác Quiz và chuẩn bị cho bài thi trọng số lớn.",
      },
      {
        title: "Thử thách thảo luận ngắn trên Forum học tập (1 chủ đề/tuần)",
        difficulty: "Trung bình",
        estimated_time: "15 phút",
        objective:
          "Tăng sự gắn kết với nhóm học tập và giảng viên hướng dẫn.",
      },
    ],
    weekly_goals: [
      "Duy trì tối thiểu 4 ngày hoạt động/tuần trên hệ thống VLE.",
      "Hoàn thành 1 bài luyện Quiz và đối chiếu kỹ phần giải thích đáp án.",
      "Đặt lịch nhắc nhở trước hạn nộp bài đánh giá tiếp theo ít nhất 3 ngày.",
      ...extraGoals,
    ],
    email_subject: `[Nhắc nhở học tập] Duy trì phong độ và lộ trình tuần mới - SV #${st.id_student}`,
    email_body: `Chào bạn (Mã SV: ${st.id_student}),\n\nHệ thống ghi nhận bạn đã hoàn thành ${st.total_assessments_submitted} bài đánh giá với điểm trung bình ${st.avg_score}/100. Tuy nhiên, nhịp độ hoạt động gần đây của bạn có dấu hiệu chững lại (Nhóm phân cụm: 'Suy giảm dần', Điểm rủi ro: ${st.risk_score}/100).\n\nThông số hiện tại:\n- Số ngày hoạt động: ${st.active_days} ngày | Tổng lượt tương tác: ${st.total_clicks} clicks\n- Điểm trung bình: ${st.avg_score} | Điểm trọng số: ${st.weighted_score}\n\nGợi ý lộ trình tuần này dành riêng cho bạn:\n1. Dành 12 phút ôn tập bộ Flashcards tổng hợp kiến thức trọng tâm.\n2. Thực hành bài Quiz tự luyện (25 phút) để cải thiện điểm trọng số.\n3. Duy trì đăng nhập ít nhất 4 ngày/tuần để không bị dồn bài vào cuối kỳ.\n\nTrân trọng,\nBan Cố vấn Học tập OULAD`,
  };
}

export async function standaloneGetStudentPersonalization(
  sessionId: string,
  idStudent: number
): Promise<StudentPersonalizeResponse> {
  const session = await ensureStandaloneSession(sessionId);
  const found =
    session.rows.find((r) => r.id_student === idStudent) || session.rows[0];
  if (!found) {
    throw new Error(`Không tìm thấy sinh viên có mã #${idStudent}.`);
  }

  return {
    session_id: sessionId,
    profile: found,
    pathway: buildStandalonePathway(found),
  };
}

export async function standaloneSendReminder(
  payload: SendReminderRequest
): Promise<SendReminderResponse> {
  const session = await ensureStandaloneSession(payload.session_id);
  const found =
    session.rows.find((r) => r.id_student === payload.id_student) ||
    session.rows[0];
  const pathway = buildStandalonePathway(found);

  const subject = payload.subject?.trim() || pathway.email_subject;
  const body = payload.body?.trim() || pathway.email_body;

  if (payload.dry_run) {
    return {
      success: true,
      dry_run: true,
      recipient_email: payload.recipient_email,
      subject,
      body,
      message:
        "Chế độ xem trước (Dry Run): Đã kiểm tra và sinh nội dung email cá nhân hóa thành công ngay trên trình duyệt.",
    };
  }

  // Trên Vercel Standalone, mở trình gửi mail mặc định với sẵn người nhận, tiêu đề và nội dung
  if (typeof window !== "undefined") {
    const mailtoUrl = `mailto:${encodeURIComponent(
      payload.recipient_email
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
  }

  return {
    success: true,
    dry_run: false,
    recipient_email: payload.recipient_email,
    subject,
    body,
    message: `Đã chuẩn bị và mở ứng dụng gửi email tới '${payload.recipient_email}' (Chế độ độc lập trên Vercel).`,
  };
}
