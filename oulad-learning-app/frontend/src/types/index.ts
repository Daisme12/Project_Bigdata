/**
 * Định nghĩa kiểu dữ liệu TypeScript strict cho toàn bộ ứng dụng Frontend OULAD.
 * Khớp 1-1 với Pydantic schemas của Backend FastAPI.
 */

export type StandardRiskLevel = "Cao" | "Trung bình" | "Thấp";

export interface StudentPreviewRecord {
  id_student: number;
  module_presentation_length: number;
  num_of_prev_attempts: number;
  studied_credits: number;
  date_registration: number;
  total_assessments_submitted: number;
  avg_score: number;
  weighted_score: number;
  total_clicks: number;
  log_total_clicks: number;
  active_days: number;
  forum_clicks: number;
  content_clicks: number;
  quiz_clicks: number;
  actual_target: number;
  risk_probability: number;
  predicted_risk: number;
  cluster_id: number;
  cluster_name: string;
  risk_level: string;
  // Kết quả từ K-Means (k=4) và đánh giá rủi ro
  kmeans_cluster_id: number;
  kmeans_cluster_name: string;
  original_cluster_name: string;
  cluster_match: boolean;
  risk_score: number;
  heuristic_risk_score: number;
  risk_level_standard: StandardRiskLevel;
  clicks_per_active_day: number;
  active_day_ratio: number;
  engagement_index: number;
}

export interface DataLoadResponse {
  session_id: string;
  filename: string;
  total_rows: number;
  columns: string[];
  preview: StudentPreviewRecord[];
  message: string;
}

export interface KpiResponse {
  session_id: string;
  total_students: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  high_risk_percentage: number;
  avg_risk_score: number;
  avg_heuristic_risk_score: number;
  avg_score: number;
  avg_active_days: number;
  kmeans_agreement_rate: number;
}

export interface ClusterDistributionItem {
  cluster_id: number;
  cluster_name: string;
  student_count: number;
  percentage: number;
  avg_score: number;
  avg_weighted_score: number;
  avg_clicks: number;
  avg_active_days: number;
  avg_assessments: number;
  agreement_with_original_pct: number;
}

export interface PcaScatterPoint {
  id_student: number;
  pca_x: number;
  pca_y: number;
  kmeans_cluster_id: number;
  kmeans_cluster_name: string;
  original_cluster_name: string;
  risk_score: number;
  risk_level_standard: StandardRiskLevel;
  avg_score: number;
  total_clicks: number;
}

export interface ClustersResponse {
  session_id: string;
  clusters: ClusterDistributionItem[];
  scatter_points: PcaScatterPoint[];
}

export interface WatchlistFilterOptions {
  modules: number[];
  clusters: string[];
  risk_levels: StandardRiskLevel[];
}

export interface WatchlistQueryParams {
  module?: number | null;
  cluster?: string;
  risk_level?: string;
  prev_attempts?: string;
  min_risk?: number;
  max_risk?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export interface WatchlistResponse {
  session_id: string;
  total_filtered: number;
  page: number;
  page_size: number;
  total_pages: number;
  filter_options: WatchlistFilterOptions;
  items: StudentPreviewRecord[];
}

export interface StudentSearchItem {
  id_student: number;
  kmeans_cluster_name: string;
  original_cluster_name: string;
  risk_score: number;
  risk_level_standard: StandardRiskLevel;
  avg_score: number;
}

export interface StudentListResponse {
  session_id: string;
  total: number;
  students: StudentSearchItem[];
}

export interface MicroLearningItem {
  title: string;
  duration: string;
  format: string;
  focus_area: string;
}

export interface SupplementaryExerciseItem {
  title: string;
  difficulty: string;
  estimated_time: string;
  objective: string;
}

export interface PersonalizedPathway {
  cluster_name: string;
  cluster_description: string;
  intervention_priority: string;
  micro_learning: MicroLearningItem[];
  supplementary_exercises: SupplementaryExerciseItem[];
  weekly_goals: string[];
  email_subject: string;
  email_body: string;
}

export interface StudentPersonalizeResponse {
  session_id: string;
  profile: StudentPreviewRecord;
  pathway: PersonalizedPathway;
}

export interface SendReminderRequest {
  session_id: string;
  id_student: number;
  recipient_email: string;
  subject?: string;
  body?: string;
  dry_run: boolean;
}

export interface SendReminderResponse {
  success: boolean;
  dry_run: boolean;
  recipient_email: string;
  subject: string;
  body: string;
  message: string;
}
