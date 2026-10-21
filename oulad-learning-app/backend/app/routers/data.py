"""
Router xử lý nạp dữ liệu: tải file CSV/XLSX từ người dùng hoặc nạp dữ liệu mẫu OULAD
(student_risk_looker_studio.csv), kiểm tra schema, chạy pipeline phân tích và trả về preview.
"""

import io
from pathlib import Path
from typing import List
from fastapi import APIRouter, File, HTTPException, UploadFile, status
import pandas as pd

from app.config import REQUIRED_COLUMNS, settings
from app.schemas import DataLoadResponse, StudentPreviewRecord
from app.services.clustering import run_clustering_pipeline
from app.services.preprocessing import (
    clean_data,
    engineer_features,
    normalize_column_names,
    validate_schema,
)
from app.services.risk import evaluate_student_risk
from app.services.store import save_session

router = APIRouter(prefix="/api/data", tags=["Quản lý Dữ liệu"])


def execute_full_pipeline(
    raw_df: pd.DataFrame, filename: str
) -> DataLoadResponse:
    """
    Thực thi toàn bộ luồng xử lý dữ liệu:
    Chuẩn hóa tên cột -> Validate schema -> Làm sạch -> Trích xuất đặc trưng ->
    Phân cụm K-Means (k=4) + PCA -> Tính điểm rủi ro -> Lưu session.

    Args:
        raw_df: DataFrame đọc từ file.
        filename: Tên file nguồn.

    Returns:
        DataLoadResponse chứa session_id và 20 dòng preview đầu tiên.
    """
    normalized_df = normalize_column_names(raw_df)
    try:
        validate_schema(normalized_df)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    cleaned_df = clean_data(normalized_df)
    if cleaned_df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dữ liệu sau khi làm sạch không còn bản ghi hợp lệ nào.",
        )

    featured_df = engineer_features(cleaned_df)
    clustered_df, cluster_summaries = run_clustering_pipeline(featured_df)
    final_df = evaluate_student_risk(clustered_df)

    session_data = save_session(
        df=final_df,
        cluster_summaries=cluster_summaries,
        filename=filename,
    )

    preview_rows: List[StudentPreviewRecord] = [
        StudentPreviewRecord(**row)
        for row in final_df.head(25).to_dict(orient="records")
    ]

    return DataLoadResponse(
        session_id=session_data.session_id,
        filename=filename,
        total_rows=len(final_df),
        columns=REQUIRED_COLUMNS,
        preview=preview_rows,
        message=(
            f"Đã nạp và phân tích thành công {len(final_df)} sinh viên từ file '{filename}'."
        ),
    )


@router.post(
    "/upload",
    response_model=DataLoadResponse,
    summary="Tải lên file dữ liệu CSV hoặc XLSX",
)
async def upload_dataset(file: UploadFile = File(...)) -> DataLoadResponse:
    """
    Nhận file .csv hoặc .xlsx từ người dùng, kiểm tra định dạng và cột bắt buộc,
    chạy pipeline phân tích K-Means và trả về session_id cùng dữ liệu xem trước.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng chọn một file hợp lệ để tải lên.",
        )

    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".csv") or filename_lower.endswith(".xlsx")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng file không được hỗ trợ. Vui lòng tải lên file .csv hoặc .xlsx.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File tải lên bị rỗng (0 byte).",
        )

    try:
        if filename_lower.endswith(".csv"):
            raw_df = pd.read_csv(io.BytesIO(content), encoding="utf-8-sig")
        else:
            raw_df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể đọc nội dung file '{file.filename}'. Chi tiết lỗi: {exc}",
        ) from exc

    return execute_full_pipeline(raw_df, file.filename)


@router.post(
    "/sample",
    response_model=DataLoadResponse,
    summary="Nạp dữ liệu mẫu OULAD (student_risk_looker_studio.csv)",
)
async def load_sample_dataset() -> DataLoadResponse:
    """
    Nạp trực tiếp file dữ liệu mẫu `backend/data/student_risk_looker_studio.csv`
    và chạy toàn bộ pipeline phân tích.
    """
    sample_path = Path(settings.sample_data_path)
    if not sample_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Không tìm thấy file dữ liệu mẫu tại đường dẫn '{sample_path}'. "
                "Vui lòng đặt file 'student_risk_looker_studio.csv' vào thư mục backend/data/."
            ),
        )

    try:
        raw_df = pd.read_csv(sample_path, encoding="utf-8-sig")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi đọc file dữ liệu mẫu: {exc}",
        ) from exc

    return execute_full_pipeline(raw_df, sample_path.name)
