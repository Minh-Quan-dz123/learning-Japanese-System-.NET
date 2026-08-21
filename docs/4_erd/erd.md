# Thiết kế Database — Hệ thống luyện tập tiếng Nhật

> File này giải thích database theo hướng đơn giản, có so sánh với các khái niệm lập trình quen thuộc (C/C++/Java) để dễ hình dung, dành cho người mới bắt đầu với PostgreSQL/.NET.

---

## 1. Vài khái niệm cơ bản trước khi đọc

| Khái niệm DB | Giải thích đơn giản | Tương đương trong lập trình mày đã biết |
|---|---|---|
| **Bảng (table)** | Một danh sách các "bản ghi" cùng loại | Giống 1 `class`, mỗi dòng trong bảng là 1 object của class đó |
| **Cột (column)** | Một thuộc tính của bản ghi | Giống 1 field/property trong class |
| **Khóa chính (Primary Key - PK)** | Cột định danh duy nhất 1 dòng, không trùng | Giống địa chỉ con trỏ định danh 1 object trong C++, nhưng lưu bền trong DB |
| **Khóa ngoại (Foreign Key - FK)** | Một cột trong bảng A "trỏ" tới PK của bảng B | Giống 1 object Java giữ tham chiếu (reference) tới object khác — nhưng DB tự kiểm tra tham chiếu đó có tồn tại thật hay không |
| **Quan hệ 1-nhiều (`1--n`)** | 1 dòng bảng A liên kết với nhiều dòng bảng B | Giống 1 object cha giữ `List<Con>` |
| **Ràng buộc (constraint)** | Quy tắc DB tự kiểm tra khi ghi dữ liệu, không cho lưu nếu sai | Giống `assert` trong code, nhưng chạy tự động ở tầng database, không phụ thuộc code có gọi hay không |
| **Index** | Cấu trúc DB tạo thêm để tìm dữ liệu nhanh hơn theo 1 cột | Giống việc build sẵn 1 `HashMap<key, vị trí dòng>` để khỏi phải duyệt tuần tự (`O(n)`) mỗi lần tìm |

---

## 2. Danh sách 7 bảng và vai trò

| Bảng | Vai trò | Thuộc module |
|---|---|---|
| `users` | Tài khoản đăng nhập | Chung (Auth) |
| `refresh_tokens` | Vé "làm mới" JWT khi hết hạn | Chung (Auth) |
| `characters` | Bảng chữ cái hiragana/katakana | Module 1 |
| `practice_sessions` | Kết quả tổng của 1 lượt luyện tập | Module 1 |
| `practice_answers` | Chi tiết từng câu trả lời trong 1 lượt | Module 1 |
| `topics` | Chủ đề từ vựng (do từng user tự tạo) | Module 3 |
| `vocabularies` | Từ vựng nằm trong 1 chủ đề | Module 3 |

*(Module 2 — luyện chính tả — không cần lưu bảng riêng, vì API `/api/writing/recognize` chỉ nhận diện và trả kết quả ngay, không lưu lại kết quả luyện tập.)*

---

## 3. Chi tiết từng bảng

### 3.1. `users` — tài khoản

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid (PK) | |
| `username` | string | duy nhất, dùng để đăng nhập |
| `password_hash` | string | **không bao giờ** lưu mật khẩu gốc, chỉ lưu bản mã hóa 1 chiều |
| `role` | string | `Admin` hoặc `User` |
| `created_at` | timestamp | |

Không tách bảng `roles` riêng vì hệ thống chỉ có đúng 2 quyền cố định — tách ra sẽ chỉ làm phức tạp thêm không cần thiết (giống việc không cần tạo cả 1 `enum class` riêng cho thứ chỉ có 2 giá trị cố định).

### 3.2. `refresh_tokens` — vé làm mới đăng nhập

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → `users.id`) | token này thuộc về ai |
| `token_hash` | string | mã hóa, không lưu token gốc |
| `expires_at` | timestamp | hết hạn khi nào |
| `revoked_at` | timestamp (nullable) | nếu có giá trị → token đã bị thu hồi (VD: user đăng xuất) |

Bảng này không có trong ví dụ JSON của `api_design.md`, nhưng bắt buộc phải có vì hệ thống có endpoint `/api/auth/refresh` — muốn "làm mới" token thì phải có nơi lưu và kiểm tra token cũ còn hợp lệ hay không.

### 3.3. `characters` — bảng chữ cái

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid (PK) | |
| `char` | string | chữ thật, VD `あ` |
| `romaji` | string | VD `a` |
| `type` | string | `Hiragana` / `Katakana` |
| `variant_group` | string | `Base` / `Dakuten` / `Handakuten` / `Youon` / `Sokuon` |

Chỉ Admin được thêm/sửa/xóa bảng này (theo `api_design.md`), User chỉ đọc.

### 3.4. `practice_sessions` — kết quả tổng 1 lượt chơi

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → `users.id`) | ai chơi |
| `module_type` | string | hiện tại chỉ có `AlphabetQuiz`, để dạng string cho dễ mở rộng sau |
| `direction` | string | `HiraganaToRomaji`, `RomajiToHiragana`, ... |
| `time_per_question_sec` | int | 0 = vô hạn thời gian |
| `max_mistakes` | int | cho phép sai tối đa bao nhiêu lần |
| `score` | int | số câu đúng |
| `total_questions` | int | tổng số câu |
| `created_at` | timestamp | |

### 3.5. `practice_answers` — chi tiết từng câu trong 1 lượt chơi

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid (PK) | |
| `session_id` | uuid (FK → `practice_sessions.id`) | thuộc lượt chơi nào |
| `character_id` | uuid (FK → `characters.id`) | câu hỏi về chữ nào (đáp án đúng) |
| `selected_character_id` | uuid (FK → `characters.id`) | chữ mà user đã **chọn** làm đáp án — dùng để review hiển thị "bạn đã chọn nhầm chữ nào", không chỉ biết là sai |
| `is_correct` | bool | đúng/sai — do **backend tự tính** bằng cách so sánh `character_id` với `selected_character_id`, không nhận trực tiếp từ FE |
| `answer_order` | int | thứ tự câu hỏi, để "review lại bài làm" đúng thứ tự |

`selected_character_id` trỏ tới cùng bảng `characters` như `character_id` — 2 cột FK khác nhau cùng trỏ về 1 bảng là bình thường (giống 1 class Java có 2 field cùng kiểu tham chiếu tới 2 object khác nhau của cùng 1 class, ví dụ `Employee manager` và `Employee reviewer` đều là kiểu `Employee`).

**Vì sao tách riêng bảng này thay vì nhét mảng câu trả lời vào 1 cột JSON trong `practice_sessions`?**
Vì hệ thống cần 2 tính năng:
1. Xem lại chi tiết từng câu đúng/sai (review) → cần truy vấn được từng câu riêng lẻ.
2. Thống kê chữ cái nào hay bị sai nhất → cần gộp nhóm (`GROUP BY character_id`) trên nhiều lượt chơi, nhiều user cùng lúc.

Nếu để dạng JSON, mỗi lần thống kê DB phải đọc và "bóc" JSON của toàn bộ session — rất chậm khi dữ liệu lớn. Tách bảng thì DB tính tổng hợp trực tiếp bằng SQL, nhanh hơn nhiều — giống việc dùng `HashMap` để đếm thay vì duyệt lại `List` gốc mỗi lần cần con số.

### 3.6. `topics` — chủ đề từ vựng

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → `users.id`) | chủ đề này của user nào (mỗi user có kho riêng) |
| `name` | string | tên chủ đề |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

`user_id` là điểm quan trọng: nó quyết định ai được xem/sửa/xóa chủ đề nào. Mọi API thao tác `{id}` trên bảng này (`PUT`, `DELETE`) bắt buộc backend phải kiểm tra `user_id` của chủ đề có khớp với user đang đăng nhập (lấy từ JWT) hay không — nếu không kiểm tra, user A có thể sửa/xóa được dữ liệu của user B chỉ bằng cách đổi `id` trong URL.

Số từ và ngày sửa gần nhất hiển thị ở danh sách chủ đề **không lưu sẵn** trong bảng này, mà tính động bằng cách đếm/lấy giá trị lớn nhất từ bảng `vocabularies` — tránh tình trạng dữ liệu bị lệch (VD: sửa 1 từ nhưng quên cập nhật ngày ở bảng `topics`).

### 3.7. `vocabularies` — từ vựng

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid (PK) | |
| `topic_id` | uuid (FK → `topics.id`) | thuộc chủ đề nào |
| `hiragana` | string (nullable) | |
| `katakana` | string (nullable) | |
| `kanji` | string (nullable) | |
| `romaji` | string (nullable) | |
| `meaning` | string | **bắt buộc** |
| `note` | string (nullable) | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

Ràng buộc nghiệp vụ: phải có `meaning` **và** ít nhất 1 trong 4 trường chữ (hiragana/katakana/kanji/romaji). Ràng buộc này sẽ được khai báo thẳng ở tầng database bằng `CHECK constraint` (Postgres hỗ trợ) — không chỉ kiểm tra ở code C#, để tránh dữ liệu bẩn nếu sau này có thao tác nào chèn thẳng vào DB mà bỏ qua tầng code.

---

## 4. Sơ đồ quan hệ (dạng chữ)

```
users 1───n refresh_tokens
users 1───n practice_sessions
users 1───n topics

practice_sessions 1───n practice_answers
characters        1───n practice_answers   (qua character_id — chữ được hỏi)
characters        1───n practice_answers   (qua selected_character_id — chữ user chọn)

topics 1───n vocabularies
```

Đọc là: "1 user có nhiều refresh_tokens", "1 session có nhiều answers", v.v. — không có quan hệ nhiều-nhiều (n-n) nào trong thiết kế này, nên không cần bảng trung gian (join table). `characters` có tới 2 quan hệ riêng biệt với `practice_answers` vì có 2 cột FK khác nhau cùng trỏ về nó.

---

## 5. Các quyết định thiết kế đáng chú ý

1. **Tách `practice_sessions` và `practice_answers` thành 2 bảng** — phục vụ review + thống kê, đã giải thích ở mục 3.5.
2. **Backend tự chấm điểm, không nhận `isCorrect` từ FE** — cột `is_correct` do backend tính ra bằng cách so sánh `character_id` với `selected_character_id`, tránh user gian lận điểm bằng cách sửa response trước khi gửi lên.
3. **`topics.user_id`** — mỗi user có kho từ vựng riêng, không chia sẻ giữa các user (theo quyết định nghiệp vụ đã chốt).
4. **Không lưu số liệu tổng hợp sẵn** (số từ, ngày sửa gần nhất của chủ đề) — tính động qua query để tránh lệch dữ liệu.
5. **Dùng `CHECK constraint` ở DB** cho ràng buộc "phải có ý nghĩa + ít nhất 1 trường chữ" — chặn dữ liệu bẩn ngay từ tầng thấp nhất.
6. **`refresh_tokens` lưu `token_hash`, không lưu token gốc** — cùng nguyên tắc bảo mật như `password_hash`.

---

## 6. Vấn đề còn cần xác nhận thêm

- **Tên chủ đề có được trùng nhau trong cùng 1 user không?** Nếu không, cần thêm ràng buộc `UNIQUE (user_id, name)` ở bảng `topics`.
- **Logic check trùng từ vựng** (`check-duplicate`) hiện chỉ mới xác định *phạm vi* (trong các chủ đề của user đó) — chưa xác định *cách so khớp* cụ thể: trùng khi giống hệt 1 trong 4 trường chữ, hay phải giống toàn bộ tổ hợp hiragana+katakana+kanji+romaji? Cần làm rõ trước khi viết logic backend cho endpoint này.
