"""
Dịch vụ lưu trữ phiên làm việc (In-Memory Session Store) theo session_id.

LƯU Ý KIẾN TRÚC:
Giải pháp lưu DataFrame trong bộ nhớ RAM (Python Dict kèm thời gian hết hạn TTL) dưới đây
được thiết kế gọn nhẹ để phục vụ mục đích chạy Demo đồ án tốt nghiệp (Zero-Config).
Trong môi trường Production thực tế với nhiều worker Uvicorn/Gunicorn, cần thay thế
module này bằng Redis Cache kết hợp cơ sở dữ liệu PostgreSQL / Parquet Object Storage.
"""

from dataclasses import dataclass
import time
from typing import Dict, List, Optional
import uuid
import pandas as pd

from app.config import settings


@dataclass
class SessionData:
    """Cấu trúc dữ liệu lưu trữ cho mỗi phiên phân tích (session_id)."""

    session_id: str
    filename: str
    created_at: float
    expires_at: float
    dataframe: pd.DataFrame
    cluster_summaries: List[dict]


# Bộ nhớ lưu trữ tạm thời trong RAM theo session_id
_SESSION_STORE: Dict[str, SessionData] = {}


def cleanup_expired_sessions() -> None:
    """Xóa các phiên làm việc đã quá thời hạn TTL để giải phóng bộ nhớ RAM."""
    now = time.time()
    expired_keys = [
        sid for sid, data in _SESSION_STORE.items() if data.expires_at < now
    ]
    for sid in expired_keys:
        _SESSION_STORE.pop(sid, None)


def save_session(
    df: pd.DataFrame,
    cluster_summaries: List[dict],
    filename: str,
    custom_session_id: Optional[str] = None,
) -> SessionData:
    """
    Tạo session_id mới (hoặc khôi phục session_id sẵn có) và lưu DataFrame đã xử lý
    cùng thống kê cụm vào bộ nhớ.

    Args:
        df: DataFrame đã hoàn tất pipeline phân tích.
        cluster_summaries: Thống kê chi tiết các cụm.
        filename: Tên file nguồn dữ liệu.
        custom_session_id: Mã phiên cần khôi phục (nếu có).

    Returns:
        Đối tượng SessionData vừa khởi tạo.
    """
    cleanup_expired_sessions()

    session_id = custom_session_id or str(uuid.uuid4())
    now = time.time()
    session_data = SessionData(
        session_id=session_id,
        filename=filename,
        created_at=now,
        expires_at=now + settings.session_ttl_seconds,
        dataframe=df,
        cluster_summaries=cluster_summaries,
    )
    _SESSION_STORE[session_id] = session_data
    return session_data


def get_session(session_id: str) -> Optional[SessionData]:
    """
    Truy xuất dữ liệu phiên làm việc theo session_id và tự động gia hạn TTL nếu còn hiệu lực.

    Args:
        session_id: Mã định danh phiên làm việc.

    Returns:
        SessionData nếu tồn tại và chưa hết hạn, ngược lại trả về None.
    """
    cleanup_expired_sessions()

    session_data = _SESSION_STORE.get(session_id)
    if session_data is None:
        return None

    # Gia hạn thời gian sống khi người dùng đang tương tác
    session_data.expires_at = time.time() + settings.session_ttl_seconds
    return session_data
