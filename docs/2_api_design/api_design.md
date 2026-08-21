# Thiết kế API — Hệ thống học tiếng Nhật

> Nguyên tắc chung:
> - `{id}` trong URL luôn là id của **chính resource đang thao tác**, không dùng để chỉ "user gọi API là ai" — thông tin đó luôn lấy từ JWT token.
> - Route có hậu tố `/me` = luôn thao tác trên dữ liệu của **chính user đang đăng nhập** (an toàn hơn truyền `userId` qua query, tránh lỗ hổng IDOR).
> - Mọi endpoint (trừ Auth) yêu cầu header `Authorization: Bearer <accessToken>`.
> - Với resource thuộc sở hữu riêng của user (VD: `topics`, `vocabularies` ở Module 3), mọi thao tác qua `{id}` (PUT/DELETE/...) **bắt buộc** backend phải kiểm tra resource đó có `user_id` khớp với user trong JWT hay không trước khi cho phép, dù URL không thể hiện điều này. Nếu không check, user A có thể sửa/xóa dữ liệu của user B chỉ bằng cách đổi `{id}` trong URL (lỗi IDOR).

---

## 1. Auth API

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| POST | `/api/auth/register` | Đăng ký tài khoản mới | Public |
| POST | `/api/auth/login` | Đăng nhập, trả về JWT token | Public |
| POST | `/api/auth/refresh` | Cấp lại token khi hết hạn | Public |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại (từ token) | Auth |

**Ví dụ `POST /api/auth/login`:**
```json
// Request
{ "username": "hoang", "password": "123456" }

// Response 200
{
  "accessToken": "eyJhbGciOi...",
  "user": { "id": 1, "username": "hoang", "role": "User" }
}
```

---

## 2. Module 1 — Bảng chữ cái (Alphabet)

> **Ai chấm điểm?** Backend. FE chỉ gửi lựa chọn thô của user (`selectedCharacterId`) lên, không tự so sánh đúng/sai rồi mới gửi kết quả — tránh trường hợp user sửa response trước khi gửi để gian lận điểm số/thống kê.

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/characters?type=hiragana` | Lấy toàn bộ bảng chữ cái theo loại (kèm biến âm) | User/Admin |
| POST | `/api/characters` | Thêm 1 chữ cái mới | Admin |
| PUT | `/api/characters/{id}` | Sửa 1 chữ cái | Admin |
| DELETE | `/api/characters/{id}` | Xóa 1 chữ cái | Admin |
| POST | `/api/practice-sessions` | Gửi các câu đã trả lời (FE **không** tự chấm), backend so sánh với đáp án đúng trong `characters` để tính điểm rồi lưu | User/Admin |
| GET | `/api/practice-sessions/me` | Danh sách tất cả lượt chơi của user đang đăng nhập (lịch sử) | User/Admin |
| GET | `/api/practice-sessions/{id}` | Chi tiết 1 lượt cụ thể để "review bài làm" | User/Admin (chủ sở hữu) |
| GET | `/api/characters/stats/me` | Thống kê tỉ lệ sai theo từng chữ cái của chính user đang đăng nhập | User/Admin |
| GET | `/api/characters/stats/{userId}` | Thống kê tỉ lệ sai của 1 user cụ thể | Admin |

**Ví dụ `GET /api/characters?type=hiragana`:**
```json
[
  { "id": 1, "char": "あ", "romaji": "a", "type": "Hiragana", "variantGroup": "Base" },
  { "id": 15, "char": "が", "romaji": "ga", "type": "Hiragana", "variantGroup": "Dakuten" }
]
```
`variantGroup`: `Base` | `Dakuten` | `Handakuten` | `Youon` | `Sokuon`

**Ví dụ `POST /api/practice-sessions`:**
```json
// Request — FE chỉ gửi câu hỏi + lựa chọn của user, KHÔNG gửi đúng/sai
{
  "moduleType": "AlphabetQuiz",
  "direction": "HiraganaToRomaji",
  "timePerQuestionSec": 30,
  "maxMistakes": 1,
  "answers": [
    { "characterId": 1, "selectedCharacterId": 1 },
    { "characterId": 15, "selectedCharacterId": 20 }
  ]
}
```
- `characterId`: chữ cái được hỏi trong câu đó.
- `selectedCharacterId`: chữ cái tương ứng với đáp án mà user đã chọn trên bảng đáp án (vì mỗi lựa chọn hiển thị đều gắn với 1 `characterId` có sẵn, không cần gửi text romaji).

Backend so sánh `characterId` với `selectedCharacterId` của từng câu (bằng nhau → đúng), tính `score`, lưu toàn bộ vào `practice_sessions` + `practice_answers`, rồi trả lại kết quả đã chấm để FE hiển thị ngay:
```json
// Response 201
{
  "id": 42,
  "score": 8,
  "totalQuestions": 10,
  "createdAt": "2026-08-21T10:00:00Z",
  "results": [
    { "characterId": 1, "selectedCharacterId": 1, "isCorrect": true },
    { "characterId": 15, "selectedCharacterId": 20, "isCorrect": false }
  ]
}
```

---

## 3. Module 2 — Luyện tập chính tả (Writing)

> **Ai chấm điểm?** Không ai cả — module này không có khái niệm đúng/sai. Backend/AI service chỉ trả về "AI nghĩ đây là chữ gì" (kèm % tin cậy), user tự nhìn kết quả và tự đối chiếu với chữ mình định viết. Không lưu lại lịch sử luyện tập cho module này.

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| POST | `/api/writing/recognize` | Gửi tọa độ nét vẽ, backend forward sang AI service, trả tối đa 2 kết quả gần nhất | User |

**Request/Response:**
```json
// Request
{
  "characterSet": "Hiragana",
  "strokes": [
    [ { "x": 12, "y": 5, "t": 0 }, { "x": 15, "y": 20, "t": 15 }, { "x": 18, "y": 40, "t": 30 } ],
    [ { "x": 30, "y": 10, "t": 50 }, { "x": 32, "y": 45, "t": 70 } ]
  ]
}

// Response
{
  "candidates": [
    { "char": "あ", "confidence": 0.93 },
    { "char": "お", "confidence": 0.71 }
  ]
}
```
Mỗi phần tử trong `strokes` là 1 nét (1 lần nhấn tới khi nhấc bút); mỗi điểm gồm toạ độ `x, y` và mốc thời gian tương đối `t` (ms). Canvas ở FE vừa vẽ hiển thị cho user, vừa ghi lại mảng `strokes` này song song để gửi lên server.

Endpoint này dùng chung cho cả 2 chế độ luyện tập của Module 2 — khác biệt về cách hiển thị/so sánh kết quả xử lý hoàn toàn ở phía FE, không cần thêm API.

---

## 4. Module 3 — Quản lý từ vựng theo chủ đề

### 4.1. Topics

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/topics` | Danh sách chủ đề (kèm số từ, thời gian sửa gần nhất) | User |
| POST | `/api/topics` | Tạo chủ đề mới | User |
| PUT | `/api/topics/{id}` | Sửa tên chủ đề | User |
| DELETE | `/api/topics/{id}` | Xóa chủ đề | User |
| GET | `/api/topics/{id}/vocabularies?search=...` | Danh sách từ trong 1 chủ đề, tìm kiếm trong phạm vi chủ đề đó | User |

### 4.2. Vocabularies

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| POST | `/api/vocabularies/check-duplicate` | Kiểm tra 1 từ đã tồn tại chưa (quét toàn bộ chủ đề **của user đang đăng nhập**, không phải toàn hệ thống) | User |
| POST | `/api/vocabularies` | Thêm từ mới (topicId trong body) | User |
| PUT | `/api/vocabularies/{id}` | Sửa từ, hoặc dùng để "ghi đè" khi user chọn xóa từ cũ khi bị trùng | User |
| DELETE | `/api/vocabularies/{id}` | Xóa từ | User |
| PATCH | `/api/vocabularies/move` | Di chuyển 1 hoặc nhiều từ (mảng id) sang chủ đề khác | User |
| GET | `/api/vocabularies/search?q=...` | Tìm kiếm từ trên toàn bộ chủ đề **của user đang đăng nhập** | User |

**Luồng check trùng (dùng chung cho cả thêm tay lẫn import Excel):**
```
1. FE gọi POST /api/vocabularies/check-duplicate  { hiragana, katakana, kanji, romaji }
2. Không trùng → FE gọi POST /api/vocabularies để tạo mới
3. Có trùng    → server trả { exists: true, existing: { id, topicId, ... } }
                 → FE hỏi user:
                     "Đè lên từ cũ" → PUT /api/vocabularies/{existingId}
                     "Giữ từ cũ"    → không gọi API, hủy thao tác
```
Import Excel (đọc file bằng thư viện JS phía FE) và Export Excel (tạo file từ dữ liệu có sẵn trên trình duyệt) đều xử lý ở Frontend, tái sử dụng đúng 3 API trên — không có endpoint import/export riêng ở Backend.

---

## 5. Module 4 — Ngữ pháp

Chưa thiết kế — nghiệp vụ chưa hoàn thiện (theo README). Sẽ bổ sung khi có yêu cầu chi tiết.
