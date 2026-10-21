"""
Pydantic v2 Schemas định nghĩa cấu trúc Request và Response cho toàn bộ REST API.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class StudentPreviewRecord(BaseModel):
    """Bản ghi sinh viên rút gọn dùng cho bảng Data Preview và Watchlist."""

    id_student: int
    module_presentation_length: int
    num_of_prev_attempts: int
    studied_credits: int
    date_registration: float
    total_assessments_submitted: int
    avg_score: float
    weighted_score: float
    total_clicks: int
    log_total_clicks: float
    active_days: int
    forum_clicks: int
    content_clicks: int
    quiz_clicks: int
    actual_target: int
    risk_probability: float
    predicted_risk: int
    cluster_id: int
    cluster_name: str
    risk_level: str
    # Các trường bổ sung từ K-Means (k=4) và đánh giá rủi ro
    kmeans_cluster_id: int
    kmeans_cluster_name: str
    original_cluster_name: str
    cluster_match: bool
    risk_score: float
    heuristic_risk_score: float
    risk_level_standard: str
    clicks_per_active_day: float
    active_day_ratio: float
    engagement_index: float


class DataLoadResponse(BaseModel):
    """Response trả về sau khi tải file lên hoặc nạp dữ liệu mẫu thành công."""

    session_id: str
    filename: str
    total_rows: int
    columns: List[str]
    preview: List[StudentPreviewRecord]
    message: str


class KpiResponse(BaseModel):
    """Response các chỉ số tổng quan KPI trên Dashboard."""

    session_id: str
    total_students: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    high_risk_percentage: float
    avg_risk_score: float
    avg_heuristic_risk_score: float
    avg_score: float
    avg_active_days: float
    kmeans_agreement_rate: float


class ClusterDistributionItem(BaseModel):
    """Thống kê phân bố của một cụm sinh viên."""

    cluster_id: int
    cluster_name: str
    student_count: int
    percentage: float
    avg_score: float
    avg_weighted_score: float
    avg_clicks: float
    avg_active_days: float
    avg_assessments: float
    agreement_with_original_pct: float


class PcaScatterPoint(BaseModel):
    """Điểm tọa độ PCA 2 chiều cho biểu đồ phân tán (Scatter Plot)."""

    id_student: int
    pca_x: float
    pca_y: float
    kmeans_cluster_id: int
    kmeans_cluster_name: str
    original_cluster_name: str
    risk_score: float
    risk_level_standard: str
    avg_score: float
    total_clicks: int


class ClustersResponse(BaseModel):
    """Response chứa phân bố cụm và dữ liệu biểu đồ phân tán PCA 2D."""

    session_id: str
    clusters: List[ClusterDistributionItem]
    scatter_points: List[PcaScatterPoint]


class WatchlistFilterOptions(BaseModel):
    """Danh sách giá trị lọc hợp lệ cho bộ lọc Watchlist trên Dashboard."""

    modules: List[int]
    clusters: List[str]
    risk_levels: List[str]


class WatchlistResponse(BaseModel):
    """Response danh sách sinh viên ưu tiên theo dõi (có phân trang & bộ lọc)."""

    session_id: str
    total_filtered: int
    page: int
    page_size: int
    total_pages: int
    filter_options: WatchlistFilterOptions
    items: List[StudentPreviewRecord]


class StudentSearchItem(BaseModel):
    """Thông tin tóm tắt của một sinh viên phục vụ ô tìm kiếm Combobox."""

    id_student: int
    kmeans_cluster_name: str
    original_cluster_name: str
    risk_score: float
    risk_level_standard: str
    avg_score: float


class StudentListResponse(BaseModel):
    """Response danh sách sinh viên cho trang Cá nhân hóa."""

    session_id: str
    total: int
    students: List[StudentSearchItem]


class MicroLearningItem(BaseModel):
    """Học liệu ngắn (Micro-learning) trong lộ trình cá nhân hóa."""

    title: str
    duration: str
    format: str
    focus_area: str


class SupplementaryExerciseItem(BaseModel):
    """Bài tập bổ trợ trong lộ trình cá nhân hóa."""

    title: str
    difficulty: str
    estimated_time: str
    objective: str


class PersonalizedPathway(BaseModel):
    """Cấu trúc lộ trình học tập cá nhân hóa và mẫu email nhắc nhở."""

    cluster_name: str
    cluster_description: str
    intervention_priority: str
    micro_learning: List[MicroLearningItem]
    supplementary_exercises: List[SupplementaryExerciseItem]
    weekly_goals: List[str]
    email_subject: str
    email_body: str


class StudentPersonalizeResponse(BaseModel):
    """Response đầy đủ hồ sơ cá nhân, đối chiếu cụm/rủi ro và lộ trình học tập."""

    session_id: str
    profile: StudentPreviewRecord
    pathway: PersonalizedPathway


class SendReminderRequest(BaseModel):
    """Request gửi email nhắc nhở học tập tới sinh viên."""

    session_id: str = Field(..., description="Mã phiên làm việc")
    id_student: int = Field(..., description="Mã định danh sinh viên")
    recipient_email: str = Field(..., description="Email người nhận")
    subject: Optional[str] = Field(None, description="Tiêu đề email tùy chỉnh")
    body: Optional[str] = Field(None, description="Nội dung email tùy chỉnh")
    dry_run: bool = Field(
        default=True,
        description="Nếu True thì chỉ xem trước nội dung email, không gửi qua SMTP",
    )


class SendReminderResponse(BaseModel):
    """Response kết quả gửi hoặc xem trước email nhắc nhở."""

    success: bool
    dry_run: bool
    recipient_email: str
    subject: str
    body: str
    message: str
