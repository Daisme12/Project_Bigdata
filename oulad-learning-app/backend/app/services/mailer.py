"""
Dịch vụ gửi email nhắc nhở học tập qua giao thức Gmail SMTP (cổng 587 + STARTTLS).
Đọc thông tin tài khoản và App Password hoàn toàn từ biến môi trường (.env),
có hỗ trợ chế độ xem trước (dry_run) không cần kết nối mạng.
"""

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
from typing import Dict

from app.config import settings


def send_reminder_email(
    recipient_email: str,
    subject: str,
    body: str,
    dry_run: bool = False,
) -> Dict[str, object]:
    """
    Gửi email nhắc nhở học tập tới sinh viên hoặc trả về bản xem trước nếu bật chế độ dry_run.

    Args:
        recipient_email: Địa chỉ email người nhận.
        subject: Tiêu đề email.
        body: Nội dung chi tiết của email.
        dry_run: Nếu True, chỉ kiểm tra và trả về nội dung xem trước mà không gửi thật qua SMTP.

    Returns:
        Dictionary chứa trạng thái gửi, thông báo tiếng Việt, tiêu đề và nội dung email.

    Raises:
        ValueError: Nếu chưa cấu hình SMTP_USER / SMTP_PASSWORD khi gửi thật.
        RuntimeError: Nếu kết nối SMTP hoặc quá trình xác thực gặp sự cố.
    """
    if dry_run:
        return {
            "success": True,
            "dry_run": True,
            "recipient_email": recipient_email,
            "subject": subject,
            "body": body,
            "message": "Chế độ xem trước (Dry Run): Đã tạo nội dung email thành công, chưa gửi qua SMTP.",
        }

    smtp_user = settings.smtp_user.strip()
    smtp_password = settings.smtp_password.strip()

    if (
        not smtp_user
        or not smtp_password
        or smtp_user == "your_email@gmail.com"
        or smtp_password == "your_16_char_app_password"
    ):
        raise ValueError(
            "Chưa cấu hình tài khoản Gmail (SMTP_USER) hoặc Mật khẩu ứng dụng (SMTP_PASSWORD) "
            "trong file backend/.env. Vui lòng cập nhật file .env hoặc sử dụng chế độ 'Xem trước (Dry Run)'."
        )

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.smtp_from_name} <{smtp_user}>"
    msg["To"] = recipient_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [recipient_email], msg.as_string())
    except smtplib.SMTPAuthenticationError as exc:
        raise RuntimeError(
            "Xác thực Gmail SMTP thất bại. Hãy đảm bảo bạn đang dùng App Password 16 ký tự của Google "
            "thay vì mật khẩu đăng nhập thông thường."
        ) from exc
    except Exception as exc:
        raise RuntimeError(
            f"Không thể gửi email qua máy chủ SMTP ({settings.smtp_host}:{settings.smtp_port}): {exc}"
        ) from exc

    return {
        "success": True,
        "dry_run": False,
        "recipient_email": recipient_email,
        "subject": subject,
        "body": body,
        "message": f"Đã gửi email nhắc nhở học tập thành công tới địa chỉ {recipient_email}.",
    }
