# Kiến trúc hệ thống — Japanese Learning System

> Tài liệu này dành cho lập trình viên / kiến trúc đọc để hiểu **hệ thống được tổ chức thế nào và tại sao** — không phải danh sách API (xem `api_design.md`) hay danh sách bảng (xem `erd.md`).

---

## 1. Tổng quan

Hệ thống hỗ trợ luyện tập tiếng Nhật, gồm 4 module nghiệp vụ:

| Module | Chức năng | Trạng thái |
|---|---|---|
| 1. Bảng chữ cái | Quiz trắc nghiệm hiragana/katakana ↔ romaji, có thống kê tỉ lệ sai | Đã thiết kế |
| 2. Luyện chính tả | Viết tay trên canvas, AI nhận diện chữ | Đã thiết kế |
| 3. Quản lý từ vựng | Chủ đề + từ vựng riêng theo từng user, import/export Excel | Đã thiết kế |
| 4. Ngữ pháp | — | Chưa thiết kế |

Có 2 role dùng chung 1 giao diện web: `Admin` (quản trị bảng chữ cái) và `User` (luyện tập).

---

## 2. Kiến trúc tổng thể

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│  Frontend        │  HTTP   │  Backend               │  SQL    │  PostgreSQL      │
│  Next.js         │────────▶│  ASP.NET 8 Web API     │────────▶│  Database        │
│  (Browser)        │◀────────│  Clean Architecture    │◀────────│                  │
└─────────────────┘  JWT    └──────────┬────────────┘         └─────────────────┘
                                        │ HTTP (internal)
                                        ▼
                              ┌──────────────────────┐
                              │  AI Service            │
                              │  Python / FastAPI      │
                              │  (nhận diện chữ viết)  │
                              └──────────────────────┘
```

**Nguyên tắc quan trọng nhất xuyên suốt hệ thống:** Frontend không bao giờ là nơi quyết định logic nghiệp vụ nhạy cảm (chấm điểm, kiểm tra quyền sở hữu dữ liệu, check trùng dữ liệu). Nó chỉ thu thập input thô của user và gửi lên; Backend luôn là nơi tính toán/quyết định cuối cùng trước khi chạm vào Database. Đây gọi là nguyên tắc **"never trust the client"** — vì FE chạy trên máy user, user có thể sửa request bằng DevTools/Postman trước khi gửi.

Repo tổ chức dạng **monorepo** (1 repo Git chứa cả 3 service), có `docker-compose.yml` để chạy đồng thời frontend + backend + ai_service + PostgreSQL, và CI/CD riêng cho từng service qua GitHub Actions.

---

## 3. Backend — Clean Architecture

Backend dùng ASP.NET 8 Web API, tổ chức theo Clean Architecture — tức là chia code thành các lớp (layer) tách biệt theo **trách nhiệm**, lớp trong không được biết gì về lớp ngoài. Nếu mày quen kiểu code 1 file Controller làm hết mọi thứ (đọc DB, tính toán, trả JSON) thì đây là hướng ngược lại: tách nhỏ ra để dễ test và dễ thay đổi 1 phần mà không đụng phần khác.

Ý tưởng cơ bản (không đi sâu từng project cụ thể ở đây vì code chưa viết, chỉ nói nguyên tắc):

- **Domain** — chứa các "khái niệm nghiệp vụ" thuần túy (VD: entity `PracticeSession`, `Vocabulary`), không phụ thuộc framework hay database. Giống việc mày viết 1 `class` C++ thuần logic, không `#include` thư viện DB nào cả.
- **Application** — chứa logic nghiệp vụ (use case): "chấm điểm 1 lượt quiz", "kiểm tra từ vựng có trùng không". Lớp này gọi xuống Domain, nhưng không biết PostgreSQL hay ASP.NET là gì.
- **Infrastructure** — nơi thật sự "nói chuyện" với PostgreSQL (qua Entity Framework Core), gọi HTTP sang AI Service, sinh/verify JWT.
- **API (Presentation)** — các Controller nhận HTTP request, gọi xuống Application, trả JSON. Đây là lớp duy nhất "biết" HTTP là gì.

Lợi ích thực tế: nếu sau này đổi PostgreSQL sang DB khác, hoặc đổi AI Service, chỉ sửa ở Infrastructure — Application/Domain không cần đụng vào, giống như đổi implementation của 1 interface trong Java mà không sửa code gọi interface đó.

---

## 4. Bảo mật — 2 cơ chế cốt lõi

### 4.1. JWT — ai đang gọi API?

Mọi endpoint (trừ `/api/auth/*`) yêu cầu header `Authorization: Bearer <accessToken>`. Backend **luôn** lấy `userId` từ token đã giải mã, không bao giờ tin `userId` nếu FE gửi qua query/body. Route dạng `/me` (VD: `GET /api/practice-sessions/me`) nghĩa là "lấy theo user trong token", không truyền `userId` qua URL — tránh việc user A sửa URL để xem dữ liệu của user B.

### 4.2. IDOR check — quyền sở hữu resource

Với resource riêng của từng user (`topics`, `vocabularies`), URL dạng `/api/topics/{id}` **không tự chứng minh** người gọi có quyền với resource đó — id chỉ là số/uuid, ai cũng đổi được. Nên mọi thao tác `PUT`/`DELETE`/... qua `{id}` bắt buộc Backend phải:

```
1. Lấy resource theo {id} từ DB
2. So sánh resource.user_id với userId lấy từ JWT
3. Khác nhau -> trả 403, KHÔNG cho thao tác
```

Đây là lỗ hổng **IDOR (Insecure Direct Object Reference)** — 1 trong những lỗi bảo mật phổ biến nhất của API, và là lý do bắt buộc phải có bước check này ở mọi API thao tác resource riêng tư, dù URL "trông có vẻ" đã đúng.

### 4.3. Backend tự chấm điểm

Module 1 (quiz) và Module 2 (viết tay) đều có khái niệm "đúng/sai", nhưng FE **không bao giờ** tự tính rồi gửi kết quả `isCorrect` lên. FE chỉ gửi lựa chọn thô của user; Backend tự so sánh với đáp án đúng lưu trong DB rồi mới tính điểm. Nếu để FE tự chấm, user có thể sửa request trước khi gửi để gian lận điểm số/thống kê.

---

## 5. Vì sao tách `practice_sessions` và `practice_answers` thành 2 bảng

Đây là quyết định thiết kế đáng chú ý nhất trong ERD, nên nói rõ ở đây thay vì chỉ trong `erd.md`:

Hệ thống cần 2 việc khác bản chất nhau:
1. **Review lại 1 lượt chơi cụ thể** → cần đọc từng câu trả lời riêng lẻ, theo đúng thứ tự (`answer_order`).
2. **Thống kê chữ nào hay bị sai nhất** (trên toàn hệ thống, nhiều user, nhiều lượt chơi) → cần `GROUP BY character_id` gộp trên hàng triệu dòng.

Nếu nhét toàn bộ câu trả lời vào 1 cột JSON trong `practice_sessions`, việc (2) sẽ cực chậm vì DB phải đọc và "bóc" JSON của từng session một, không tận dụng được index. Tách bảng riêng cho phép DB tính tổng hợp trực tiếp bằng SQL — tương tự việc build sẵn 1 cấu trúc đếm (như `HashMap<key, count>`) thay vì duyệt lại toàn bộ list mỗi lần cần con số thống kê.

---

## 6. Module 2 — vì sao Backend là "gateway" tới AI Service

FE không gọi thẳng AI Service (Python/FastAPI) mà luôn đi qua Backend (ASP.NET) trước, dù về mặt kỹ thuật FE có thể gọi thẳng. Lý do:

- **Che giấu địa chỉ nội bộ** — AI Service không cần expose ra internet, chỉ Backend trong cùng docker network mới gọi được, giảm bề mặt tấn công.
- **Một chỗ để áp policy chung** — auth (JWT), rate limit, log... đều xử lý tập trung ở Backend thay vì lặp lại ở từng service.
- **Dễ đổi AI Service sau này** — nếu đổi provider/model AI, chỉ sửa tầng Infrastructure của Backend, FE và hợp đồng API (`/api/writing/recognize`) không đổi.

Tương tự việc 1 class `Controller` gọi xuống 1 class `Service` khác thay vì để bên ngoài gọi thẳng vào implementation chi tiết.

---

## 7. Những điểm chưa chốt — cần xác nhận trước khi code

Lấy từ mục "Vấn đề còn cần xác nhận thêm" trong `erd.md`, liệt kê lại ở đây vì đây là tài liệu kiến trúc, dev đọc vào cần thấy ngay rủi ro chưa rõ:

1. Tên chủ đề (`topics.name`) có được trùng nhau trong cùng 1 user không? Nếu không → cần `UNIQUE (user_id, name)`.
2. Logic "check trùng từ vựng" — trùng khi giống **1 trong 4** trường chữ, hay phải giống **toàn bộ tổ hợp** hiragana+katakana+kanji+romaji? Ảnh hưởng trực tiếp tới câu query và trải nghiệm import Excel hàng loạt.
3. Module 4 (Ngữ pháp) hoàn toàn chưa có thiết kế nghiệp vụ.

---

## 8. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js |
| Backend | ASP.NET 8 Web API (Clean Architecture) |
| Database | PostgreSQL |
| AI Service | Python / FastAPI |
| Auth | JWT (access token + refresh token) |
| Hạ tầng dev | Docker Compose (chạy đồng thời 3 service + DB) |
| CI/CD | GitHub Actions, pipeline riêng cho từng service |
