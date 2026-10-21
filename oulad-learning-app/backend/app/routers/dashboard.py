"""
Router phục vụ trang Dashboard phân tích tổng quan:
- KPI tổng hợp (hỗ trợ lọc nhanh theo 4 tiêu chí)
- Phân bố cụm K-Means & tọa độ PCA 2D (hỗ trợ lọc nhanh theo 4 tiêu chí)
- Bảng Watchlist có bộ lọc đa chiều, sắp xếp, phân trang và xuất CSV.
"""

import io
import math
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
import pandas as pd

from app.schemas import (
    ClusterDistributionItem,
    ClustersResponse,
    KpiResponse,
    PcaScatterPoint,
    StudentPreviewRecord,
    WatchlistFilterOptions,
    WatchlistResponse,
)
from pathlib import Path
from app.config import settings
from app.services.clustering import run_clustering_pipeline
from app.services.preprocessing import (
    clean_data,
    engineer_features,
    normalize_column_names,
)
from app.services.risk import evaluate_student_risk
from app.services.store import SessionData, get_session, save_session

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard Phân tích"])


def require_valid_session(session_id: str) -> SessionData:
    """
    Kiểm tra và trả về SessionData theo session_id.
    Nếu máy chủ vừa khởi động lại làm trống RAM nhưng file mẫu tồn tại,
    tự động khôi phục phiên từ dữ liệu mẫu để trải nghiệm người dùng không bị gián đoạn.
    """
    session_data = get_session(session_id)
    if session_data is not None:
        return session_data

    sample_path = Path(settings.sample_data_path)
    if sample_path.exists():
        raw_df = pd.read_csv(sample_path, encoding="utf-8-sig")
        normalized_df = normalize_column_names(raw_df)
        cleaned_df = clean_data(normalized_df)
        featured_df = engineer_features(cleaned_df)
        clustered_df, cluster_summaries = run_clustering_pipeline(featured_df)
        final_df = evaluate_student_risk(clustered_df)
        return save_session(
            df=final_df,
            cluster_summaries=cluster_summaries,
            filename=sample_path.name,
            custom_session_id=session_id,
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=(
            "Phiên dữ liệu không tồn tại hoặc đã hết hạn. "
            "Vui lòng quay lại Trang chủ và nạp lại dữ liệu."
        ),
    )


def apply_common_filters(
    df: pd.DataFrame,
    module: Optional[int] = None,
    cluster: Optional[str] = None,
    risk_level: Optional[str] = None,
    prev_attempts: Optional[str] = None,
) -> pd.DataFrame:
    """
    Áp dụng 4 bộ lọc nhanh dùng chung cho toàn bộ Dashboard (KPI, Clusters, Watchlist):
    1. module: Độ dài học phần (module_presentation_length)
    2. cluster: Tên cụm K-Means (kmeans_cluster_name)
    3. risk_level: Mức độ rủi ro chuẩn (Cao / Trung bình / Thấp)
    4. prev_attempts: Lịch sử học lại ('0' = Học lần đầu, '1+' = Học lại từ 1 lần trở lên)
    """
    filtered = df.copy()

    if module is not None:
        filtered = filtered[filtered["module_presentation_length"] == module]

    if cluster and cluster != "ALL":
        filtered = filtered[filtered["kmeans_cluster_name"] == cluster]

    if risk_level and risk_level != "ALL":
        filtered = filtered[filtered["risk_level_standard"] == risk_level]

    if prev_attempts and prev_attempts != "ALL":
        if prev_attempts == "0":
            filtered = filtered[filtered["num_of_prev_attempts"] == 0]
        elif prev_attempts == "1+":
            filtered = filtered[filtered["num_of_prev_attempts"] >= 1]

    return filtered


@router.get(
    "/{session_id}/kpi",
    response_model=KpiResponse,
    summary="Lấy các chỉ số KPI tổng quan của tập sinh viên (hỗ trợ bộ lọc nhanh)",
)
async def get_dashboard_kpi(
    session_id: str,
    module: Optional[int] = Query(default=None),
    cluster: Optional[str] = Query(default=None),
    risk_level: Optional[str] = Query(default=None),
    prev_attempts: Optional[str] = Query(default=None),
) -> KpiResponse:
    """
    Tính toán tổng số sinh viên, số lượng sinh viên theo từng tầng rủi ro (Cao/Trung bình/Thấp),
    điểm rủi ro trung bình và tỷ lệ đồng thuận giữa K-Means với nhãn cụm gốc.
    """
    session_data = require_valid_session(session_id)
    df = apply_common_filters(
        session_data.dataframe,
        module=module,
        cluster=cluster,
        risk_level=risk_level,
        prev_attempts=prev_attempts,
    )
    total = len(df)

    if total == 0:
        return KpiResponse(
            session_id=session_id,
            total_students=0,
            high_risk_count=0,
            medium_risk_count=0,
            low_risk_count=0,
            high_risk_percentage=0.0,
            avg_risk_score=0.0,
            avg_heuristic_risk_score=0.0,
            avg_score=0.0,
            avg_active_days=0.0,
            kmeans_agreement_rate=0.0,
        )

    high_count = int((df["risk_level_standard"] == "Cao").sum())
    medium_count = int((df["risk_level_standard"] == "Trung bình").sum())
    low_count = int((df["risk_level_standard"] == "Thấp").sum())

    high_pct = round((high_count / total) * 100.0, 2)
    avg_risk = round(float(df["risk_score"].mean()), 2)
    avg_heuristic = round(float(df["heuristic_risk_score"].mean()), 2)
    avg_score = round(float(df["avg_score"].mean()), 2)
    avg_active_days = round(float(df["active_days"].mean()), 1)
    agreement_rate = round(float(df["cluster_match"].mean() * 100.0), 2)

    return KpiResponse(
        session_id=session_id,
        total_students=total,
        high_risk_count=high_count,
        medium_risk_count=medium_count,
        low_risk_count=low_count,
        high_risk_percentage=high_pct,
        avg_risk_score=avg_risk,
        avg_heuristic_risk_score=avg_heuristic,
        avg_score=avg_score,
        avg_active_days=avg_active_days,
        kmeans_agreement_rate=agreement_rate,
    )


@router.get(
    "/{session_id}/clusters",
    response_model=ClustersResponse,
    summary="Lấy phân bố cụm K-Means và tọa độ PCA 2D (hỗ trợ bộ lọc nhanh)",
)
async def get_dashboard_clusters(
    session_id: str,
    module: Optional[int] = Query(default=None),
    cluster: Optional[str] = Query(default=None),
    risk_level: Optional[str] = Query(default=None),
    prev_attempts: Optional[str] = Query(default=None),
    max_points: int = Query(
        default=1200,
        ge=100,
        le=6000,
        description="Số điểm tối đa trả về cho biểu đồ Scatter để tối ưu hiệu năng hiển thị",
    ),
) -> ClustersResponse:
    """
    Trả về thống kê số lượng, tỷ lệ, điểm trung bình của 4 cụm K-Means
    kèm tập điểm tọa độ PCA 2D đại diện theo bộ lọc hiện tại.
    """
    session_data = require_valid_session(session_id)
    df = apply_common_filters(
        session_data.dataframe,
        module=module,
        cluster=cluster,
        risk_level=risk_level,
        prev_attempts=prev_attempts,
    )

    if df.empty:
        return ClustersResponse(
            session_id=session_id,
            clusters=[],
            scatter_points=[],
        )

    if len(df) > max_points:
        sampled_parts = []
        for _, group_df in df.groupby("kmeans_cluster_id"):
            n_take = max(1, int(round(max_points * len(group_df) / len(df))))
            sampled_parts.append(
                group_df.sample(n=min(len(group_df), n_take), random_state=42)
            )
        sample_df = pd.concat(sampled_parts, ignore_index=True)
    else:
        sample_df = df

    scatter_cols = [
        "id_student",
        "pca_x",
        "pca_y",
        "kmeans_cluster_id",
        "kmeans_cluster_name",
        "original_cluster_name",
        "risk_score",
        "risk_level_standard",
        "avg_score",
        "total_clicks",
    ]
    scatter_points = [
        PcaScatterPoint(**row)
        for row in sample_df[scatter_cols].to_dict(orient="records")
    ]

    # Tính toán lại thống kê 4 cụm theo tập dữ liệu đã lọc
    total_rows = max(len(df), 1)
    cluster_items = []
    for base_cluster in session_data.cluster_summaries:
        cid = base_cluster["cluster_id"]
        cname = base_cluster["cluster_name"]
        sub = df[df["kmeans_cluster_id"] == cid]
        count = len(sub)
        cluster_items.append(
            ClusterDistributionItem(
                cluster_id=int(cid),
                cluster_name=cname,
                student_count=int(count),
                percentage=round((count / total_rows) * 100.0, 2),
                avg_score=round(float(sub["avg_score"].mean()), 2)
                if count > 0
                else 0.0,
                avg_weighted_score=round(
                    float(sub["weighted_score"].mean()), 2
                )
                if count > 0
                else 0.0,
                avg_clicks=round(float(sub["total_clicks"].mean()), 1)
                if count > 0
                else 0.0,
                avg_active_days=round(float(sub["active_days"].mean()), 1)
                if count > 0
                else 0.0,
                avg_assessments=round(
                    float(sub["total_assessments_submitted"].mean()), 2
                )
                if count > 0
                else 0.0,
                agreement_with_original_pct=round(
                    float(sub["cluster_match"].mean() * 100.0), 2
                )
                if count > 0
                else 0.0,
            )
        )

    return ClustersResponse(
        session_id=session_id,
        clusters=cluster_items,
        scatter_points=scatter_points,
    )


@router.get(
    "/{session_id}/watchlist",
    response_model=WatchlistResponse,
    summary="Danh sách ưu tiên theo dõi (Watchlist) có lọc, sắp xếp, phân trang và xuất CSV",
)
async def get_dashboard_watchlist(
    session_id: str,
    module: Optional[int] = Query(
        default=None,
        description="Lọc theo độ dài học phần (module_presentation_length)",
    ),
    cluster: Optional[str] = Query(
        default=None, description="Lọc theo tên cụm K-Means"
    ),
    risk_level: Optional[str] = Query(
        default=None, description="Lọc theo mức độ rủi ro (Cao / Trung bình / Thấp)"
    ),
    prev_attempts: Optional[str] = Query(
        default=None,
        description="Lọc theo lịch sử học lại ('ALL', '0', '1+')",
    ),
    min_risk: float = Query(
        default=0.0, ge=0.0, le=100.0, description="Điểm rủi ro tối thiểu (0-100)"
    ),
    max_risk: float = Query(
        default=100.0, ge=0.0, le=100.0, description="Điểm rủi ro tối đa (0-100)"
    ),
    search: Optional[str] = Query(
        default=None, description="Tìm nhanh theo mã sinh viên (id_student)"
    ),
    sort_by: str = Query(
        default="risk_score",
        description="Cột sắp xếp: risk_score, avg_score, weighted_score, total_clicks, active_days, id_student",
    ),
    sort_order: str = Query(
        default="desc", description="Thứ tự sắp xếp: asc hoặc desc"
    ),
    page: int = Query(default=1, ge=1, description="Số trang hiện tại"),
    page_size: int = Query(
        default=15, ge=5, le=200, description="Số dòng mỗi trang"
    ),
    export_csv: bool = Query(
        default=False,
        description="Nếu True, trả về trực tiếp file CSV của danh sách đã lọc",
    ),
):
    """
    Truy vấn danh sách sinh viên có nguy cơ học tập kèm bộ lọc đa tiêu chí.
    Nếu tham số `export_csv=true`, trả về StreamingResponse tải xuống file CSV.
    """
    session_data = require_valid_session(session_id)
    full_df = session_data.dataframe

    # Tập giá trị cho các ô Select trên giao diện
    filter_options = WatchlistFilterOptions(
        modules=sorted(
            full_df["module_presentation_length"]
            .dropna()
            .astype(int)
            .unique()
            .tolist()
        ),
        clusters=sorted(
            full_df["kmeans_cluster_name"].dropna().unique().tolist()
        ),
        risk_levels=["Cao", "Trung bình", "Thấp"],
    )

    filtered = apply_common_filters(
        full_df,
        module=module,
        cluster=cluster,
        risk_level=risk_level,
        prev_attempts=prev_attempts,
    )

    filtered = filtered[
        (filtered["risk_score"] >= min_risk)
        & (filtered["risk_score"] <= max_risk)
    ]

    if search and search.strip():
        query_str = search.strip()
        filtered = filtered[
            filtered["id_student"]
            .astype(str)
            .str.contains(query_str, regex=False)
        ]

    allowed_sort_cols = {
        "risk_score",
        "heuristic_risk_score",
        "avg_score",
        "weighted_score",
        "total_clicks",
        "active_days",
        "total_assessments_submitted",
        "id_student",
    }
    target_sort_col = sort_by if sort_by in allowed_sort_cols else "risk_score"
    ascending = sort_order.lower() == "asc"
    filtered = filtered.sort_values(by=target_sort_col, ascending=ascending)

    if export_csv:
        csv_buffer = io.StringIO()
        filtered.to_csv(csv_buffer, index=False, encoding="utf-8-sig")
        csv_bytes = csv_buffer.getvalue().encode("utf-8-sig")
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="watchlist_{session_id[:8]}.csv"'
            },
        )

    total_filtered = len(filtered)
    total_pages = max(1, math.ceil(total_filtered / page_size))
    safe_page = min(page, total_pages)
    start_idx = (safe_page - 1) * page_size
    end_idx = start_idx + page_size

    page_df = filtered.iloc[start_idx:end_idx]
    items = [
        StudentPreviewRecord(**row) for row in page_df.to_dict(orient="records")
    ]

    return WatchlistResponse(
        session_id=session_id,
        total_filtered=total_filtered,
        page=safe_page,
        page_size=page_size,
        total_pages=total_pages,
        filter_options=filter_options,
        items=items,
    )
