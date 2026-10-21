"""
Điểm khởi chạy chính của ứng dụng Backend FastAPI:
Cấu hình CORS cho http://localhost:3000 và đăng ký các router phân tích học tập OULAD.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import dashboard, data, personalize

app = FastAPI(
    title=settings.app_name,
    description=(
        "Hệ thống Backend Phân tích học tập (Learning Analytics) và Cá nhân hóa lộ trình "
        "học tập sinh viên trên bộ dữ liệu OULAD."
    ),
    version="1.0.0",
)

# Cấu hình CORS cho phép Frontend Next.js (http://localhost:3000) gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router)
app.include_router(dashboard.router)
app.include_router(personalize.router)


@app.get("/api/health", tags=["Hệ thống"])
async def health_check() -> dict:
    """Endpoint kiểm tra trạng thái hoạt động của máy chủ Backend."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "message": "Máy chủ phân tích học tập OULAD đang hoạt động bình thường.",
    }
