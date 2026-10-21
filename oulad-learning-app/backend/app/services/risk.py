"""
Dịch vụ đánh giá điểm rủi ro học tập (0 - 100) và phân tầng mức độ rủi ro (Thấp / Trung bình / Cao).
Hỗ trợ sử dụng điểm rủi ro có sẵn trong file (risk_probability, risk_level) kết hợp
công thức trọng số chuyên gia (heuristic) để đối chiếu mà không tính trùng lặp vô ích.
"""

import numpy as np
import pandas as pd


def map_risk_level_label(score_0_to_100: float, raw_level: str = "") -> str:
    """
    Ánh xạ mức độ rủi ro về 3 nhãn chuẩn tiếng Việt: 'Thấp', 'Trung bình', 'Cao'.
    Nếu cột risk_level trong CSV đã có ('An toàn', 'Nguy cơ trung bình', 'Nguy cơ cao'),
    ưu tiên chuẩn hóa từ nhãn gốc hoặc dựa trên ngưỡng điểm.

    Args:
        score_0_to_100: Điểm rủi ro trong thang [0, 100].
        raw_level: Giá trị cột risk_level có sẵn trong file (nếu có).

    Returns:
        Một trong 3 giá trị: 'Cao', 'Trung bình', 'Thấp'.
    """
    normalized = str(raw_level).strip().lower()
    if "cao" in normalized:
        return "Cao"
    if "trung bình" in normalized or "trung binh" in normalized:
        return "Trung bình"
    if "an toàn" in normalized or "an toan" in normalized or "thấp" in normalized:
        return "Thấp"

    if score_0_to_100 >= 70.0:
        return "Cao"
    if score_0_to_100 >= 40.0:
        return "Trung bình"
    return "Thấp"


def evaluate_student_risk(df: pd.DataFrame) -> pd.DataFrame:
    """
    Xử lý điểm rủi ro (0 - 100) và mức độ rủi ro cho từng sinh viên.

    CÔNG THỨC TRỌNG SỐ CHUYÊN GIA (Heuristic Risk Score 0 - 100):
    -------------------------------------------------------------
    Điểm rủi ro kỳ vọng được tổng hợp từ 5 yếu tố hành vi học tập:
    1. Rủi ro điểm số (Weight = 0.30):
       score_risk = 100 - (0.4 * avg_score + 0.6 * weighted_score)
    2. Rủi ro thiếu bài kiểm tra (Weight = 0.25):
       assessment_risk = (1 - min(total_assessments_submitted / 10, 1)) * 100
    3. Rủi ro thiếu ngày hoạt động VLE (Weight = 0.20):
       active_days_risk = (1 - min(active_days / 90, 1)) * 100
    4. Rủi ro tương tác thấp (Weight = 0.15):
       click_risk = (1 - min(log_total_clicks / 8.5, 1)) * 100
    5. Rủi ro lịch sử thi lại (Weight = 0.10):
       attempt_risk = min(num_of_prev_attempts * 35, 100)

    heuristic_risk_score = 0.30 * score_risk
                         + 0.25 * assessment_risk
                         + 0.20 * active_days_risk
                         + 0.15 * click_risk
                         + 0.10 * attempt_risk

    Quy tắc không tính trùng lặp:
    - Nếu file đã có sẵn cột `risk_probability` (từ mô hình ML trước đó), hệ thống quy đổi
      trực tiếp `risk_score = round(risk_probability * 100, 2)` làm điểm rủi ro chính thức,
      đồng thời lưu `heuristic_risk_score` để đối chiếu độ lệch giữa ML và quy tắc chuyên gia.
    - Nếu file không có `risk_probability`, dùng `heuristic_risk_score` làm `risk_score`.

    Args:
        df: DataFrame đã qua tiền xử lý và phân cụm.

    Returns:
        DataFrame có các cột `risk_score` (0-100), `heuristic_risk_score` (0-100),
        `risk_level_standard` ('Thấp'/'Trung bình'/'Cao') và giữ nguyên `risk_level` gốc.
    """
    result = df.copy()

    # 1. Tính các thành phần rủi ro theo công thức trọng số chuyên gia
    composite_score = 0.40 * result["avg_score"] + 0.60 * result["weighted_score"]
    score_risk = (100.0 - composite_score).clip(lower=0.0, upper=100.0)

    assessment_ratio = (result["total_assessments_submitted"] / 10.0).clip(
        lower=0.0, upper=1.0
    )
    assessment_risk = (1.0 - assessment_ratio) * 100.0

    active_days_ratio = (result["active_days"] / 90.0).clip(lower=0.0, upper=1.0)
    active_days_risk = (1.0 - active_days_ratio) * 100.0

    click_ratio = (result["log_total_clicks"] / 8.5).clip(lower=0.0, upper=1.0)
    click_risk = (1.0 - click_ratio) * 100.0

    attempt_risk = (result["num_of_prev_attempts"] * 35.0).clip(
        lower=0.0, upper=100.0
    )

    result["heuristic_risk_score"] = (
        0.30 * score_risk
        + 0.25 * assessment_risk
        + 0.20 * active_days_risk
        + 0.15 * click_risk
        + 0.10 * attempt_risk
    ).round(2)

    # 2. Sử dụng risk_probability có sẵn trong CSV nếu hợp lệ (tránh tính trùng lặp)
    if (
        "risk_probability" in result.columns
        and result["risk_probability"].notna().any()
    ):
        max_prob = float(result["risk_probability"].max())
        if max_prob <= 1.05:
            result["risk_score"] = (
                (result["risk_probability"] * 100.0)
                .clip(lower=0.0, upper=100.0)
                .round(2)
            )
        else:
            result["risk_score"] = (
                result["risk_probability"].clip(lower=0.0, upper=100.0).round(2)
            )
    else:
        result["risk_score"] = result["heuristic_risk_score"]

    # 3. Chuẩn hóa mức rủi ro về 3 mức: Cao / Trung bình / Thấp
    raw_levels = (
        result["risk_level"].tolist()
        if "risk_level" in result.columns
        else [""] * len(result)
    )
    scores = result["risk_score"].tolist()

    result["risk_level_standard"] = [
        map_risk_level_label(s, rl) for s, rl in zip(scores, raw_levels)
    ]

    return result
