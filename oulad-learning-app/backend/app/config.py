"""
Module cấu hình trung tâm cho hệ thống phân tích học tập OULAD.
Đọc biến môi trường và khai báo các hằng số cột dữ liệu từ file student_risk_looker_studio.csv.
"""

from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Cấu hình hệ thống đọc từ biến môi trường hoặc file .env."""

    app_name: str = "OULAD Learning Analytics & Personalization API"
    frontend_origin: str = "http://localhost:3000"
    session_ttl_seconds: int = 7200

    sample_data_path: str = str(BASE_DIR / "data" / "student_risk_looker_studio.csv")
    model_path: str = str(BASE_DIR / "app" / "models" / "kmeans_model.pkl")

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "Hệ thống Cố vấn Học tập OULAD"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

# ---------------------------------------------------------------------------
# KHAI BÁO HẰNG SỐ SCHEMA DỮ LIỆU (Đúng theo student_risk_looker_studio.csv)
# ---------------------------------------------------------------------------

# Cột mã định danh sinh viên
ID_COLUMN: str = "id_student"

# Danh sách toàn bộ 20 cột chuẩn của file student_risk_looker_studio.csv
REQUIRED_COLUMNS: List[str] = [
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
]

# Các cột đặc trưng số dùng để chuẩn hóa và phân cụm K-Means
KMEANS_FEATURE_COLUMNS: List[str] = [
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
]

# Các cột dùng để lọc nhóm trên Dashboard Watchlist
FILTER_COLUMNS: List[str] = [
    "module_presentation_length",
    "num_of_prev_attempts",
    "studied_credits",
    "cluster_name",
    "risk_level",
]

# Các cột kết quả có sẵn trong file để đối chiếu / so sánh với K-Means
PRECOMPUTED_COLUMNS: List[str] = [
    "actual_target",
    "risk_probability",
    "predicted_risk",
    "cluster_id",
    "cluster_name",
    "risk_level",
]

# Số cụm mặc định cho thuật toán K-Means
KMEANS_N_CLUSTERS: int = 4
KMEANS_RANDOM_STATE: int = 42
