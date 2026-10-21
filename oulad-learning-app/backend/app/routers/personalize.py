"""
Router phục vụ trang Cá nhân hóa lộ trình học tập:
- Lấy danh sách mã sinh viên (tìm kiếm nhanh trên Combobox)
- Lấy hồ sơ chi tiết, đối chiếu cụm K-Means và lộ trình cá nhân hóa của 1 sinh viên
- Xem trước (dry_run) hoặc gửi thật email nhắc nhở qua Gmail SMTP.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.routers.dashboard import require_valid_session
from app.schemas import (
    PersonalizedPathway,
    SendReminderRequest,
    SendReminderResponse,
    StudentListResponse,
    StudentPersonalizeResponse,
    StudentPreviewRecord,
    StudentSearchItem,
)
from app.services.mailer import send_reminder_email
from app.services.recommender import build_personalized_pathway

router = APIRouter(prefix="/api", tags=["Cá nhân hóa & Nhắc nhở"])


@router.get(
    "/students/{session_id}",
    response_model=StudentListResponse,
    summary="Lấy danh sách mã sinh viên phục vụ ô tìm kiếm Combobox",
)
async def list_students(
    session_id: str,
    q: Optional[str] = Query(
        default=None, description="Từ khóa tìm theo mã sinh viên (id_student)"
    ),
    limit: int = Query(
        default=100, ge=10, le=1000, description="Số lượng kết quả tối đa trả về"
    ),
) -> StudentListResponse:
    """
    Trả về danh sách sinh viên (sắp xếp ưu tiên điểm rủi ro giảm dần)
    để người dùng chọn hoặc tìm nhanh trên trang Cá nhân hóa.
    """
    session_data = require_valid_session(session_id)
    df = session_data.dataframe

    filtered = df
    if q and q.strip():
        keyword = q.strip()
        filtered = df[
            df["id_student"].astype(str).str.contains(keyword, regex=False)
        ]

    sorted_df = filtered.sort_values(by="risk_score", ascending=False).head(limit)
    cols = [
        "id_student",
        "kmeans_cluster_name",
        "original_cluster_name",
        "risk_score",
        "risk_level_standard",
        "avg_score",
    ]
    students = [
        StudentSearchItem(**row)
        for row in sorted_df[cols].to_dict(orient="records")
    ]

    return StudentListResponse(
        session_id=session_id,
        total=len(filtered),
        students=students,
    )


@router.get(
    "/personalize/{session_id}/{id_student}",
    response_model=StudentPersonalizeResponse,
    summary="Lấy hồ sơ phân tích và lộ trình học tập cá nhân hóa của sinh viên",
)
async def get_student_personalization(
    session_id: str, id_student: int
) -> StudentPersonalizeResponse:
    """
    Truy xuất thông tin chi tiết của một sinh viên theo `id_student`,
    bao gồm kết quả phân cụm K-Means, đối chiếu nhãn gốc, điểm rủi ro
    và lộ trình học tập cá nhân hóa theo cụm.
    """
    session_data = require_valid_session(session_id)
    df = session_data.dataframe

    matched = df[df["id_student"] == id_student]
    if matched.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy sinh viên có mã '{id_student}' trong phiên dữ liệu hiện tại.",
        )

    student_dict = matched.iloc[0].to_dict()
    profile = StudentPreviewRecord(**student_dict)
    pathway_dict = build_personalized_pathway(student_dict)
    pathway = PersonalizedPathway(**pathway_dict)

    return StudentPersonalizeResponse(
        session_id=session_id,
        profile=profile,
        pathway=pathway,
    )


@router.post(
    "/personalize/send-reminder",
    response_model=SendReminderResponse,
    summary="Xem trước hoặc gửi email nhắc nhở học tập qua Gmail SMTP",
)
async def send_student_reminder(
    payload: SendReminderRequest,
) -> SendReminderResponse:
    """
    Gửi email nhắc nhở học tập cho sinh viên.
    Hỗ trợ chế độ `dry_run=True` để kiểm tra/xem trước nội dung email mà không cần cấu hình SMTP.
    """
    session_data = require_valid_session(payload.session_id)
    df = session_data.dataframe

    matched = df[df["id_student"] == payload.id_student]
    if matched.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy sinh viên có mã '{payload.id_student}'.",
        )

    student_dict = matched.iloc[0].to_dict()
    pathway_dict = build_personalized_pathway(student_dict)

    subject = (
        payload.subject.strip()
        if payload.subject and payload.subject.strip()
        else pathway_dict["email_subject"]
    )
    body = (
        payload.body.strip()
        if payload.body and payload.body.strip()
        else pathway_dict["email_body"]
    )

    try:
        result = send_reminder_email(
            recipient_email=payload.recipient_email,
            subject=subject,
            body=body,
            dry_run=payload.dry_run,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return SendReminderResponse(**result)
