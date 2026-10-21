"""
Dịch vụ tiền xử lý dữ liệu (ETL & Feature Engineering) cho bộ dữ liệu OULAD
(student_risk_looker_studio.csv).
"""

from typing import List, Tuple
import numpy as np
import pandas as pd

from app.config import (
    ID_COLUMN,
    KMEANS_FEATURE_COLUMNS,
    PRECOMPUTED_COLUMNS,
    REQUIRED_COLUMNS,
)


def normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """
    Loại bỏ ký tự BOM (UTF-8-SIG \\ufeff) và khoảng trắng thừa ở tên cột.

    Args:
        df: DataFrame gốc vừa đọc từ file CSV/XLSX.

    Returns:
        DataFrame đã làm sạch tên cột.
    """
    cleaned_df = df.copy()
    cleaned_df.columns = [
        str(col).replace("\ufeff", "").strip() for col in cleaned_df.columns
    ]
    return cleaned_df


def validate_schema(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """
    Kiểm tra sự tồn tại của các cột bắt buộc theo đúng schema student_risk_looker_studio.csv.
    Báo lỗi tiếng Việt và liệt kê chính xác các cột bị thiếu.

    Args:
        df: DataFrame cần kiểm tra.

    Returns:
        Tuple (hợp_lệ, danh_sách_cột_thiếu).

    Raises:
        ValueError: Nếu thiếu bất kỳ cột bắt buộc nào hoặc dữ liệu rỗng.
    """
    if df is None or df.empty:
        raise ValueError("File dữ liệu rỗng hoặc không có bản ghi sinh viên nào.")

    existing_cols = set(df.columns)
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in existing_cols]

    if missing_cols:
        missing_str = ", ".join(missing_cols)
        raise ValueError(
            f"File tải lên thiếu {len(missing_cols)} cột bắt buộc theo chuẩn OULAD: {missing_str}."
        )

    return True, []


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Làm sạch dữ liệu: ép kiểu số cho các cột đặc trưng, xử lý giá trị thiếu (NaN),
    loại bỏ dòng trùng lặp hoàn toàn và chuẩn hóa giá trị biên.

    Args:
        df: DataFrame đã qua bước validate_schema.

    Returns:
        DataFrame sạch sẵn sàng cho bước trích xuất đặc trưng và phân cụm.
    """
    cleaned = df.copy()

    # Đảm bảo id_student là kiểu số nguyên
    cleaned[ID_COLUMN] = (
        pd.to_numeric(cleaned[ID_COLUMN], errors="coerce").fillna(0).astype(int)
    )
    cleaned = cleaned[cleaned[ID_COLUMN] > 0].copy()

    # Nếu một sinh viên xuất hiện nhiều dòng (học nhiều học phần), giữ bản ghi có rủi ro cao nhất
    if "risk_probability" in cleaned.columns:
        cleaned["risk_probability"] = pd.to_numeric(
            cleaned["risk_probability"], errors="coerce"
        ).fillna(0.0)
        cleaned = (
            cleaned.sort_values(by="risk_probability", ascending=False)
            .drop_duplicates(subset=[ID_COLUMN], keep="first")
            .sort_index()
            .reset_index(drop=True)
        )
    else:
        cleaned = cleaned.drop_duplicates(subset=[ID_COLUMN], keep="first").reset_index(
            drop=True
        )

    # Ép kiểu số và điền giá trị trung vị/0 cho các cột đặc trưng K-Means
    for col in KMEANS_FEATURE_COLUMNS:
        cleaned[col] = pd.to_numeric(cleaned[col], errors="coerce")
        median_val = cleaned[col].median()
        fill_val = 0.0 if pd.isna(median_val) else float(median_val)
        cleaned[col] = cleaned[col].fillna(fill_val)

    # Đảm bảo các cột lượt click, số ngày hoạt động và điểm số không âm
    non_negative_cols = [
        "module_presentation_length",
        "num_of_prev_attempts",
        "studied_credits",
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
    for col in non_negative_cols:
        if col in cleaned.columns:
            cleaned[col] = cleaned[col].clip(lower=0)

    # Giới hạn điểm số trong khoảng [0, 100]
    for score_col in ["avg_score", "weighted_score"]:
        if score_col in cleaned.columns:
            cleaned[score_col] = cleaned[score_col].clip(lower=0.0, upper=100.0)

    # Chuẩn hóa các cột có sẵn trong file để đối chiếu
    if "actual_target" in cleaned.columns:
        cleaned["actual_target"] = (
            pd.to_numeric(cleaned["actual_target"], errors="coerce")
            .fillna(0)
            .astype(int)
        )
    if "predicted_risk" in cleaned.columns:
        cleaned["predicted_risk"] = (
            pd.to_numeric(cleaned["predicted_risk"], errors="coerce")
            .fillna(0)
            .astype(int)
        )
    if "cluster_id" in cleaned.columns:
        cleaned["cluster_id"] = (
            pd.to_numeric(cleaned["cluster_id"], errors="coerce")
            .fillna(0)
            .astype(int)
        )
    if "cluster_name" in cleaned.columns:
        cleaned["cluster_name"] = (
            cleaned["cluster_name"].astype(str).str.strip().fillna("Chưa phân loại")
        )
    if "risk_level" in cleaned.columns:
        cleaned["risk_level"] = (
            cleaned["risk_level"].astype(str).str.strip().fillna("An toàn")
        )

    return cleaned


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Trích xuất các chỉ số hành vi học tập bổ trợ phục vụ phân tích chuyên sâu và hiển thị
    trên hồ sơ cá nhân hóa (giữ nguyên toàn bộ 20 cột gốc của file).

    Các chỉ số trích xuất:
    - clicks_per_active_day: Mật độ tương tác trung bình mỗi ngày hoạt động.
    - active_day_ratio: Tỷ lệ ngày có hoạt động so với độ dài khóa học (%).
    - score_consistency_gap: Độ lệch giữa điểm trung bình và điểm trọng số.
    - engagement_index: Chỉ số gắn kết tổng hợp (thang 0-100).

    Args:
        df: DataFrame đã qua bước clean_data.

    Returns:
        DataFrame có bổ sung các chỉ số phân tích hành vi.
    """
    featured = df.copy()

    safe_active_days = featured["active_days"].replace(0, np.nan)
    featured["clicks_per_active_day"] = (
        (featured["total_clicks"] / safe_active_days).fillna(0.0).round(2)
    )

    safe_length = featured["module_presentation_length"].replace(0, 240)
    featured["active_day_ratio"] = (
        ((featured["active_days"] / safe_length) * 100.0)
        .clip(lower=0.0, upper=100.0)
        .round(2)
    )

    featured["score_consistency_gap"] = (
        (featured["avg_score"] - featured["weighted_score"]).abs().round(2)
    )

    # Tính chỉ số gắn kết học tập (Engagement Index: 0 - 100)
    max_log_clicks = max(float(featured["log_total_clicks"].max()), 1.0)
    max_assessments = max(float(featured["total_assessments_submitted"].max()), 1.0)

    norm_clicks = (featured["log_total_clicks"] / max_log_clicks) * 100.0
    norm_assessments = (
        featured["total_assessments_submitted"] / max_assessments
    ) * 100.0

    featured["engagement_index"] = (
        0.40 * norm_clicks
        + 0.35 * featured["active_day_ratio"]
        + 0.25 * norm_assessments
    ).clip(lower=0.0, upper=100.0).round(2)

    return featured
