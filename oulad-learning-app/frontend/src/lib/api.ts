/**
 * Module giao tiếp dữ liệu cho Frontend OULAD Learning Analytics.
 *
 * Hỗ trợ chế độ "Tự chạy độc lập 100% trên Vercel" (Standalone Client-Side Engine):
 * - Mặc định xử lý trực tiếp trên trình duyệt thông qua `standaloneEngine.ts`
 *   (Nạp dữ liệu mẫu OULAD từ `/data/student_risk_looker_studio.csv`, hoặc đọc file `.csv` mới tải lên,
 *   chạy chuẩn hóa Z-Score, K-Means k=4, PCA 2D, chấm điểm rủi ro và sinh lộ trình Lai 2 tầng).
 * - Nếu cấu hình biến môi trường `NEXT_PUBLIC_USE_REMOTE_BACKEND=true`, hệ thống sẽ ưu tiên gọi
 *   FastAPI Backend và tự động fallback sang Standalone Engine nếu máy chủ Backend không phản hồi.
 */

import {
  ClustersResponse,
  DataLoadResponse,
  KpiResponse,
  SendReminderRequest,
  SendReminderResponse,
  StudentListResponse,
  StudentPersonalizeResponse,
  WatchlistQueryParams,
  WatchlistResponse,
} from "@/types";
import {
  standaloneGetClusters,
  standaloneGetKpi,
  standaloneGetStudentList,
  standaloneGetStudentPersonalization,
  standaloneGetWatchlist,
  standaloneLoadSample,
  standaloneSendReminder,
  standaloneUploadFile,
  triggerStandaloneCsvDownload,
} from "@/lib/standaloneEngine";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const USE_REMOTE_BACKEND =
  process.env.NEXT_PUBLIC_USE_REMOTE_BACKEND === "true";

/**
 * Hàm tiện ích đọc phản hồi JSON từ FastAPI (khi dùng chế độ Remote Backend).
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Lỗi kết nối máy chủ (HTTP ${response.status}).`;
    try {
      const errorBody: { detail?: string } = await response.json();
      if (errorBody && typeof errorBody.detail === "string") {
        errorMessage = errorBody.detail;
      }
    } catch {
      // Bỏ qua nếu response lỗi không phải JSON
    }
    throw new Error(errorMessage);
  }
  return (await response.json()) as T;
}

/**
 * Tải file .csv lên để kiểm tra schema 20 cột OULAD và chạy toàn bộ pipeline phân tích.
 * Chạy trực tiếp 100% trên trình duyệt (hoạt động độc lập trên Vercel).
 */
export async function uploadDatasetFile(file: File): Promise<DataLoadResponse> {
  if (USE_REMOTE_BACKEND) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE_URL}/api/data/upload`, {
        method: "POST",
        body: formData,
      });
      return await handleApiResponse<DataLoadResponse>(response);
    } catch {
      // Tự động chuyển sang xử lý độc lập trên trình duyệt
    }
  }
  return standaloneUploadFile(file);
}

/**
 * Nạp trực tiếp dữ liệu mẫu OULAD (`student_risk_looker_studio.csv`).
 * Chạy trực tiếp từ `/public/data/student_risk_looker_studio.csv` trên Vercel.
 */
export async function loadSampleDataset(): Promise<DataLoadResponse> {
  if (USE_REMOTE_BACKEND) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data/sample`, {
        method: "POST",
      });
      return await handleApiResponse<DataLoadResponse>(response);
    } catch {
      // Tự động chuyển sang xử lý độc lập trên trình duyệt
    }
  }
  return standaloneLoadSample();
}

/**
 * Lấy 3 nhóm chỉ số KPI tổng quan trên Dashboard (áp dụng 4 bộ lọc nhanh nếu có).
 */
export async function fetchDashboardKpi(
  sessionId: string,
  params?: WatchlistQueryParams
): Promise<KpiResponse> {
  if (USE_REMOTE_BACKEND) {
    try {
      const sp = new URLSearchParams();
      if (params?.module !== undefined && params?.module !== null) {
        sp.set("module", String(params.module));
      }
      if (params?.cluster && params.cluster !== "ALL") {
        sp.set("cluster", params.cluster);
      }
      if (params?.risk_level && params.risk_level !== "ALL") {
        sp.set("risk_level", params.risk_level);
      }
      if (params?.prev_attempts && params.prev_attempts !== "ALL") {
        sp.set("prev_attempts", params.prev_attempts);
      }
      const qs = sp.toString() ? `?${sp.toString()}` : "";
      const response = await fetch(
        `${API_BASE_URL}/api/dashboard/${encodeURIComponent(sessionId)}/kpi${qs}`
      );
      return await handleApiResponse<KpiResponse>(response);
    } catch {
      // Fallback sang Standalone Engine
    }
  }
  return standaloneGetKpi(sessionId, params);
}

/**
 * Lấy phân bố 4 cụm K-Means và tọa độ PCA 2D (áp dụng 4 bộ lọc nhanh nếu có).
 */
export async function fetchDashboardClusters(
  sessionId: string,
  params?: WatchlistQueryParams
): Promise<ClustersResponse> {
  if (USE_REMOTE_BACKEND) {
    try {
      const sp = new URLSearchParams();
      if (params?.module !== undefined && params?.module !== null) {
        sp.set("module", String(params.module));
      }
      if (params?.cluster && params.cluster !== "ALL") {
        sp.set("cluster", params.cluster);
      }
      if (params?.risk_level && params.risk_level !== "ALL") {
        sp.set("risk_level", params.risk_level);
      }
      if (params?.prev_attempts && params.prev_attempts !== "ALL") {
        sp.set("prev_attempts", params.prev_attempts);
      }
      const qs = sp.toString() ? `?${sp.toString()}` : "";
      const response = await fetch(
        `${API_BASE_URL}/api/dashboard/${encodeURIComponent(sessionId)}/clusters${qs}`
      );
      return await handleApiResponse<ClustersResponse>(response);
    } catch {
      // Fallback sang Standalone Engine
    }
  }
  return standaloneGetClusters(sessionId, params);
}

/**
 * Lấy danh sách sinh viên ưu tiên theo dõi (Watchlist) có phân trang, sắp xếp và bộ lọc.
 */
export async function fetchWatchlist(
  sessionId: string,
  params: WatchlistQueryParams
): Promise<WatchlistResponse> {
  return standaloneGetWatchlist(sessionId, params);
}

/**
 * Tải trực tiếp file CSV của danh sách sinh viên theo bộ lọc hiện tại (hoạt động 100% trên trình duyệt/Vercel).
 */
export async function downloadWatchlistCsv(
  sessionId: string,
  params: WatchlistQueryParams
): Promise<void> {
  await triggerStandaloneCsvDownload(sessionId, params);
}

/**
 * Lấy danh sách mã sinh viên phục vụ ô tìm kiếm Combobox trên trang Cá nhân hóa.
 */
export async function fetchStudentList(
  sessionId: string,
  query = "",
  limit = 150
): Promise<StudentListResponse> {
  return standaloneGetStudentList(sessionId, query, limit);
}

/**
 * Lấy hồ sơ cá nhân, đối chiếu cụm/rủi ro và lộ trình học tập Lai 2 tầng của 1 sinh viên.
 */
export async function fetchStudentPersonalization(
  sessionId: string,
  idStudent: number
): Promise<StudentPersonalizeResponse> {
  return standaloneGetStudentPersonalization(sessionId, idStudent);
}

/**
 * Gửi email nhắc nhở học tập hoặc xem trước nội dung (Dry Run).
 */
export async function sendStudentReminder(
  payload: SendReminderRequest
): Promise<SendReminderResponse> {
  return standaloneSendReminder(payload);
}
