# Hệ thống Phân tích Học tập và Cá nhân hóa Lộ trình Sinh viên (OULAD)

Đồ án tốt nghiệp xây dựng hệ thống **Learning Analytics & Personalized Learning Pathway** trên bộ dữ liệu **OULAD (`student_risk_looker_studio.csv`)**. Hệ thống được thiết kế tách biệt gồm 2 phần:
- **Backend (Python FastAPI)**: Kiểm tra schema, làm sạch dữ liệu, trích xuất đặc trưng hành vi, phân cụm K-Means (`k=4`) kết hợp giảm chiều PCA 2D, đánh giá và đối chiếu điểm rủi ro (0–100), sinh lộ trình học tập cá nhân hóa và gửi email nhắc nhở qua Gmail SMTP.
- **Frontend (Next.js 14 App Router + TypeScript)**: Giao diện tiếng Việt đa trang (Trang chủ, Dashboard Phân tích, Cá nhân hóa Lộ trình), hỗ trợ chế độ Sáng/Tối (Dark Mode), biểu đồ Recharts, bảng lọc đa chiều TanStack Table và lưu trữ trạng thái phiên bằng Zustand.

---

## 1. Yêu cầu Hệ thống

- **Python**: `3.10+`
- **Node.js**: `18.17+` (khuyến nghị Node 20 LTS)
- Bộ dữ liệu mặc định: đặt tại `backend/data/student_risk_looker_studio.csv`

---

## 2. Hướng dẫn Cài đặt và Chạy Backend (FastAPI)

```bash
# Bước 1: Di chuyển vào thư mục backend
cd oulad-learning-app/backend

# Bước 2: Tạo và kích hoạt môi trường ảo (khuyến nghị)
python3 -m venv .venv
source .venv/bin/activate   # Trên macOS/Linux
# .venv\Scripts\activate    # Trên Windows

# Bước 3: Cài đặt các thư viện phụ thuộc
pip install -r requirements.txt

# Bước 4: Sao chép file cấu hình môi trường
cp .env.example .env

# Bước 5: Khởi chạy máy chủ FastAPI ở cổng 8000
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Sau khi chạy, truy cập tài liệu Swagger UI tương tác tại: `http://localhost:8000/docs`

---

## 3. Hướng dẫn Cài đặt và Chạy Frontend (Next.js)

Mở một cửa sổ terminal mới:

```bash
# Bước 1: Di chuyển vào thư mục frontend
cd oulad-learning-app/frontend

# Bước 2: Sao chép biến môi trường
cp .env.local.example .env.local

# Bước 3: Cài đặt gói thư viện npm
npm install

# Bước 4: Chạy máy chủ phát triển Next.js ở cổng 3000
npm run dev
```

Truy cập ứng dụng web tại: `http://localhost:3000`

---

## 4. Cấu hình Biến Môi trường (`.env`)

### Backend (`backend/.env`)
```env
APP_NAME="OULAD Learning Analytics & Personalization API"
FRONTEND_ORIGIN="http://localhost:3000"
SESSION_TTL_SECONDS=7200

SAMPLE_DATA_PATH="data/student_risk_looker_studio.csv"
MODEL_PATH="app/models/kmeans_model.pkl"

# Cấu hình Gmail SMTP để gửi email thật (Nếu chỉ dùng chế độ Xem trước Dry Run thì không bắt buộc)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASSWORD="your_16_char_app_password"
SMTP_FROM_NAME="Hệ thống Cố vấn Học tập OULAD"
```

> **Lưu ý tạo Gmail App Password**: Truy cập Tài khoản Google -> Bảo mật -> Bật Xác minh 2 bước -> Tìm mục **Mật khẩu ứng dụng (App Passwords)** -> Tạo mật khẩu 16 ký tự và dán vào `SMTP_PASSWORD`.

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 5. Danh mục REST API

| Phương thức | Endpoint | Mô tả chức năng |
| :--- | :--- | :--- |
| `POST` | `/api/data/upload` | Nhận file `.csv` / `.xlsx`, kiểm tra 20 cột bắt buộc, chạy K-Means + tính rủi ro, trả về `session_id` và `preview`. |
| `POST` | `/api/data/sample` | Nạp trực tiếp file mẫu `backend/data/student_risk_looker_studio.csv`. |
| `GET` | `/api/dashboard/{session_id}/kpi` | Trả về tổng số SV, số ca nguy cơ cao/trung bình/thấp, điểm rủi ro trung bình, tỷ lệ đồng thuận cụm. |
| `GET` | `/api/dashboard/{session_id}/clusters` | Trả về thống kê 4 cụm K-Means và tọa độ PCA 2D cho biểu đồ Scatter. |
| `GET` | `/api/dashboard/{session_id}/watchlist` | Danh sách theo dõi ưu tiên có lọc (`module`, `cluster`, `risk_level`, `min_risk`, `search`), phân trang, sắp xếp và xuất CSV (`export_csv=true`). |
| `GET` | `/api/students/{session_id}` | Tìm kiếm nhanh danh sách mã sinh viên cho ô chọn Combobox. |
| `GET` | `/api/personalize/{session_id}/{id_student}` | Hồ sơ chi tiết, đối chiếu cụm K-Means với cụm gốc và lộ trình học tập cá nhân hóa. |
| `POST` | `/api/personalize/send-reminder` | Xem trước (`dry_run: true`) hoặc gửi thật (`dry_run: false`) email nhắc nhở qua Gmail SMTP. |

---

## 6. Xử lý các Lỗi Thường gặp

1. **Lỗi thiếu cột khi tải file CSV lên (`HTTP 400`)**:
   - Đảm bảo file CSV/XLSX có đủ 20 cột chuẩn của `student_risk_looker_studio.csv`. Hệ thống đã tự động xử lý ký tự BOM (`UTF-8-SIG`) ở đầu file.
2. **Lỗi `Phiên dữ liệu không tồn tại hoặc đã hết hạn` (`HTTP 404`)**:
   - Do Backend lưu phiên trong RAM nên khi khởi động lại Uvicorn, session cũ sẽ bị xóa. Hãy nhấn **"Xóa phiên dữ liệu hiện tại"** ở thanh bên trái hoặc quay về **Trang chủ** nhấn **"Sử dụng dữ liệu mẫu OULAD"**.
3. **Lỗi xác thực Gmail SMTP (`HTTP 502`)**:
   - Không dùng mật khẩu Gmail thông thường. Hãy sử dụng **App Password 16 ký tự** của Google hoặc nhấn nút **"Kiểm tra xem trước (Dry Run)"** để demo không cần kết nối SMTP.
