# 日 Japanese Learning System

Hệ thống hỗ trợ luyện tập tiếng Nhật cá nhân — luyện bảng chữ cái, luyện viết tay (AI nhận diện chữ), và quản lý kho từ vựng riêng theo chủ đề.

---

## 📖 Giới thiệu & Tính năng

### 1. Luyện bảng chữ cái (Hiragana / Katakana)

- Luyện theo 4 chiều: Hiragana ↔ Romaji, Katakana ↔ Romaji.
- Chọn phạm vi luyện tập linh hoạt: tick nhanh theo nhóm (**Bảng thường / Biến âm / Bán biến âm / Âm ghép / Âm ngắt** — có thể mix nhiều nhóm cùng lúc), hoặc tự tick từng chữ riêng lẻ.
- Tùy chỉnh thời gian mỗi câu (mặc định 30s, `0` = vô hạn) và số lần cho phép sai mỗi câu (mặc định 1 lần).
- Chấm điểm do **Backend** tự tính (chống gian lận), có màn hình kết quả, review lại từng câu đúng/sai, chơi lại đúng ván hoặc ván mới.
- Thống kê tỉ lệ sai theo từng chữ cái, giúp biết chữ nào cần ôn lại nhiều nhất.

### 2. Luyện viết tay (AI nhận diện chữ)

- **Chế độ 1:** viết tự do lên canvas, AI trả về tối đa 2 chữ gần giống nhất để tự đối chiếu.
- **Chế độ 2:** luyện nhớ mặt chữ — hệ thống hiện romaji, người học viết hiragana/katakana tương ứng, AI nhận diện và so sánh. Cho phép nhảy cóc câu, thời gian vô hạn.
- Hiện chỉ nhận diện hiragana/katakana, chưa hỗ trợ kanji. Không tính điểm, không lưu lịch sử.

### 3. Quản lý từ vựng theo chủ đề

- Mỗi tài khoản có kho từ vựng và chủ đề **riêng**, không chia sẻ giữa các user.
- Thêm từ mới: **bắt buộc** điền `Romaji` và `Ý nghĩa` (Hiragana/Katakana/Kanji tùy chọn). Ý nghĩa cho phép nhập nhiều nghĩa cách nhau bởi `;` hoặc `/`.
- Tự động phát hiện từ trùng (romaji giống + có ít nhất 1 nghĩa chung) khi thêm tay hoặc import, cho chọn **đè lên từ cũ** hoặc **giữ từ cũ**.
- Di chuyển nhiều từ cùng lúc sang chủ đề khác, tìm kiếm trong 1 chủ đề hoặc toàn bộ kho từ, phát âm (Web Speech API), Import/Export Excel.
- **Luyện tập điền đáp án:** chọn 1 trong 5 trường làm câu hỏi, 1 trường khác làm câu trả lời, tự chấm điểm ngay trên trình duyệt, không lưu lịch sử.

### 4. Ngữ pháp

- Đang trong giai đoạn lên kế hoạch nghiệp vụ, chưa có tính năng.

### Phân quyền

Hệ thống có 2 vai trò dùng chung 1 giao diện:
- **User** — luyện tập, quản lý từ vựng của riêng mình.
- **Admin** — có thêm quyền quản lý bảng chữ cái dùng chung cho toàn hệ thống (thêm/sửa/xóa chữ cái, xem thống kê của từng user cụ thể).

---

## 🛠 Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Backend | ASP.NET 8 Web API (Clean Architecture: Domain → Application → Infrastructure → Api) |
| Database | PostgreSQL |
| ORM | Entity Framework Core 8 |
| Xác thực | JWT (access token qua header, refresh token qua cookie `httpOnly`) |
| AI Service | Python/FastAPI (dự kiến, chưa code) |

> Ghi chú cho người mới .NET: Backend tổ chức theo **Clean Architecture** — chia code thành 4 tầng, giống việc mày tách 1 chương trình C++ thành các thư viện riêng biệt (`domain.lib`, `application.lib`...), tầng trong không được `#include`/biết gì về tầng ngoài. Xem chi tiết ở `ARCHITECTURE.md`.

---

## 📁 Cấu trúc thư mục

```text
japanese-learning/
├── docker-compose.yml # Hiện tại chỉ khởi động PostgreSQL — xem ghi chú bên dưới
├── frontend/ # Next.js
├── backend/
│ ├── Dockerfile # Dùng để build image production (VD deploy Render), KHÔNG dùng cho dev local thường ngày
│ ├── JapaneseLearning.Api/
│ ├── JapaneseLearning.Application/
│ ├── JapaneseLearning.Domain/
│ └── JapaneseLearning.Infrastructure/
├── ai_service/ # Python/FastAPI (chưa code)
├── README.md
├── api_design.md # Chi tiết từng API endpoint
├── erd.md # Thiết kế database
└── ARCHITECTURE.md # Kiến trúc hệ thống, lý do thiết kế
```

---

## ⚠️ Lưu ý quan trọng: 2 file cấu hình KHÔNG có trên GitHub

Repo này **cố tình không đẩy lên** 2 file sau (đã thêm vào `.gitignore`):
```text
appsettings.Development.json
appsettings.json
```


Lý do: 2 file này chứa connection string DB và `Jwt:Secret` — thông tin nhạy cảm, không nên public lên Git (giống việc không commit file `.env` chứa password thật). Vì vậy, **sau khi clone repo về, mày phải tự tạo lại 2 file này tay** theo hướng dẫn ở Bước 3 bên dưới, nếu không Backend sẽ báo lỗi ngay khi chạy (không tìm thấy connection string).

---

## ✅ Yêu cầu trước khi chạy (Prerequisites)

- **Node.js** ≥ 18 (kèm `npm`) — cho Frontend
- **.NET 8 SDK** (bản chính xác, **không phải bản mới hơn** như .NET 9/10) — cho Backend
  - Kiểm tra: `dotnet --list-sdks` → phải thấy dòng bắt đầu bằng `8.0.x`
- **Docker Desktop** — nếu chọn Cách A/B chạy DB bằng Docker
- Hoặc **tài khoản Supabase** (miễn phí) — nếu chọn Cách C (không cần Docker)

---

## 🚀 Hướng dẫn chạy Local

### Bước 1 — Clone project

```bash
git clone <your-repo-url>
cd japanese-learning
```

### Bước 2 — Chuẩn bị Database (chọn 1 trong 3 cách)

#### 🅰️ Cách A (khuyên dùng): Docker Compose có sẵn trong repo

Repo đã có sẵn `docker-compose.yml` ở thư mục gốc — hiện tại chỉ bật service `postgres` (phần `backend`/`frontend`/`ai_service` đang comment sẵn, chưa dùng vì các Dockerfile tương ứng chưa hoàn thiện cho môi trường dev).

```bash
docker compose up -d postgres
```

Kiểm tra đã chạy đúng: `docker compose ps` → thấy `jls_postgres` trạng thái `healthy`.

Thông tin kết nối (khớp với biến môi trường khai trong `docker-compose.yml`):

Host=localhost
Port=5432
Database=japanese_learning
Username=jls_user
Password=jls_password


Dừng lại khi không dùng nữa: `docker compose down` (thêm `-v` nếu muốn xóa luôn dữ liệu đã lưu: `docker compose down -v`).

#### 🅱️ Cách B: Docker chạy tay (không cần file compose)

Dùng khi mày không muốn đụng tới file `docker-compose.yml` có sẵn:

```bash
docker run --name jls_postgres \
  -e POSTGRES_USER=jls_user \
  -e POSTGRES_PASSWORD=jls_password \
  -e POSTGRES_DB=japanese_learning \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Thông tin kết nối giống hệt Cách A ở trên.

#### 🅲 Cách C: Supabase (không cần cài Docker)

1. Vào [supabase.com](https://supabase.com) → tạo project mới (miễn phí).
2. Vào **Project Settings → Database → Connection string** → chọn tab **Session pooler** (không phải "Direct connection" — pooler ổn định hơn cho app chạy dài hạn).
3. Copy connection string dạng:

postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-x-xx-xxxx-x.pooler.supabase.com:5432/postgres

4. Đổi format lại cho đúng chuẩn Npgsql (.NET dùng):

Host=aws-x-xx-xxxx-x.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.xxxxx;Password=YOUR-PASSWORD;SSL Mode=Require;Trust Server Certificate=true


---

### Bước 3 — Chạy Backend (ASP.NET 8)

```bash
cd backend
```

**3.1. Tự tạo lại 2 file cấu hình (bắt buộc — không có sẵn từ Git)**

Tạo file `JapaneseLearning.Api/appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

Tạo file `JapaneseLearning.Api/appsettings.Development.json` — **nếu dùng Cách A/B (Docker)**:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=japanese_learning;Username=jls_user;Password=jls_password"
  },
  "Jwt": {
    "Secret": "day-la-1-chuoi-bi-mat-it-nhat-32-ky-tu-tu-nghi-ra"
  },
  "Cors": {
    "AllowedOrigin": "http://localhost:3000"
  }
}
```

Nếu dùng **Cách C (Supabase)**, thay `ConnectionStrings:DefaultConnection` bằng chuỗi Supabase đã chuẩn hóa ở Bước 2.

> `Jwt:Secret` là chuỗi bí mật dùng để ký JWT — giống 1 "khóa" để mã hóa/xác thực token, tự nghĩ ra 1 chuỗi dài (≥32 ký tự) là được, không cần công thức đặc biệt. **Tuyệt đối không commit giá trị thật lên Git public** (đây cũng chính là lý do 2 file này nằm trong `.gitignore`).

**3.2. Cài tool migration (chỉ cần làm 1 lần)**

```bash
dotnet tool restore
```

Lệnh này đọc file `.config/dotnet-tools.json` đã có sẵn trong repo (file này CÓ trên Git, không nhạy cảm), tự cài đúng version `dotnet-ef` mà dự án cần — không dùng bản `dotnet-ef` global trên máy mày (tránh xung đột version).

**3.3. Chạy migration (tạo bảng trong DB)**

```bash
cd JapaneseLearning.Api
dotnet ef database update --project ../JapaneseLearning.Infrastructure
```

Lệnh này giống việc chạy 1 loạt file `.sql` để tạo bảng — nhưng thay vì viết SQL tay, EF Core tự sinh SQL dựa trên các file trong `Infrastructure/Migrations/`.

**3.4. Chạy Backend**

```bash
dotnet run
```

Backend chạy ở **`http://localhost:5099`** (theo cấu hình sẵn có ở `Properties/launchSettings.json`, profile `http`). Trình duyệt sẽ tự mở `http://localhost:5099/swagger` để xem/test API qua giao diện Swagger (chỉ hoạt động khi chạy môi trường `Development`).

> Nếu muốn chạy bản HTTPS thay vì HTTP, dùng `dotnet run --launch-profile https` — khi đó Backend chạy ở `https://localhost:7087` (kèm `http://localhost:5099` dự phòng). Với dev local, dùng bản `http` là đủ, không cần lo self-signed certificate.

> **Cách khác (nâng cao, không bắt buộc):** nếu mày muốn build và chạy Backend bằng đúng `Dockerfile` dùng để deploy (thay vì `dotnet run` trực tiếp), có thể dùng:
> ```bash
> docker build -t jls-backend .
> docker run -p 5000:10000 \
>   -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;Port=5432;Database=japanese_learning;Username=jls_user;Password=jls_password" \
>   -e Jwt__Secret="chuoi-bi-mat-cua-may" \
>   jls-backend
> ```
> Lưu ý dùng `host.docker.internal` thay cho `localhost` vì container Backend cần trỏ ra ngoài chính nó để tới được container Postgres. Cách này ít dùng trong dev thường ngày (chạy `dotnet run` tiện hơn nhiều vì có hot-reload), chỉ hữu ích khi muốn test thử y hệt môi trường production.

---

### Bước 4 — Chạy Frontend (Next.js)

Mở terminal mới:

```bash
cd frontend
npm install
```

Tạo file `.env.local` tại `frontend/`:

NEXT_PUBLIC_API_URL=http://localhost:5099


Chạy Frontend:

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:3000**

---

### Bước 5 — Kiểm tra đã chạy đúng chưa

1. Vào `http://localhost:3000/register` → tạo 1 tài khoản mới.
2. Đăng nhập → thấy trang chủ với 4 module.
3. Vào Module 1 (Bảng chữ cái) — nếu danh sách chữ cái rỗng, cần thêm dữ liệu tay qua Swagger (`POST /api/characters`, cần role Admin) hoặc qua trang `/admin/characters`.

---

## 📝 Ghi chú thêm

- **Tạo tài khoản Admin:** hệ thống hiện chưa có UI để "nâng cấp" User → Admin — cách nhanh nhất khi setup local là sửa trực tiếp cột `role` trong bảng `users` (qua DBeaver/pgAdmin/`psql`, hoặc Supabase Table Editor nếu dùng Cách C) từ `"User"` thành `"Admin"`.
- **CORS:** giá trị `Cors:AllowedOrigin` trong `appsettings.Development.json` phải khớp đúng địa chỉ Frontend đang chạy (`http://localhost:3000` mặc định).
- **Refresh token / cookie:** hoạt động đúng khi cả 2 chạy trên `localhost` (dù khác cổng). Không cần HTTPS ở local.
- **Đổi giữa các Cách A/B/C:** chỉ cần đổi lại `ConnectionStrings:DefaultConnection` trong `appsettings.Development.json`, không cần sửa code.
- **`docker-compose.yml` hiện tại chưa "full-stack":** phần `backend`/`frontend`/`ai_service` đang bị comment vì Dockerfile riêng cho dev (khác Dockerfile deploy) và cấu hình mạng nội bộ giữa các container chưa được làm — hiện tại 3 service này vẫn cần chạy tay (`dotnet run`/`npm run dev`) như hướng dẫn ở Bước 3-4.

---

## 📚 Tài liệu chi tiết hơn

- [`api_design.md`](./api_design.md) — chi tiết từng API endpoint
- [`erd.md`](./erd.md) — thiết kế database, giải thích khái niệm cơ bản cho người mới học DB
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — kiến trúc hệ thống, lý do các quyết định lớn
- [`DECISIONS_LOG.md`](./DECISIONS_LOG.md) — nhật ký quyết định thiết kế kèm lý do
- [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — tình trạng dự án hiện tại
- Hướng dẫn sử dụng chi tiết cho end-user (đăng ký, cách chơi từng module, FAQ) — xem file hướng dẫn sử dụng riêng.