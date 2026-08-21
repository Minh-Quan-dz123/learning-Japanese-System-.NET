# Hướng dẫn sử dụng — Hệ thống luyện tập tiếng Nhật

Chào mừng bạn đến với hệ thống luyện tập tiếng Nhật trực tuyến! Tài liệu này hướng dẫn cách sử dụng từng tính năng của web.

---

## 1. Giới thiệu

Hệ thống giúp bạn luyện tập tiếng Nhật qua 3 hoạt động chính:

- 📚 **Học & luyện bảng chữ cái** Hiragana, Katakana (kể cả biến âm, âm ngắt, trường âm)
- ✍️ **Luyện viết tay** — hệ thống AI nhận diện chữ bạn viết
- 📖 **Quản lý kho từ vựng** của riêng bạn, chia theo chủ đề

Truy cập hệ thống tại: `https://<địa-chỉ-web-của-bạn>` *(cập nhật link thật khi deploy xong)*

---

## 2. Đăng ký & Đăng nhập

1. Vào trang chủ, chọn **Đăng ký** nếu chưa có tài khoản (chỉ cần username + mật khẩu).
2. Sau khi có tài khoản, vào **Đăng nhập** để bắt đầu sử dụng.
3. Hệ thống có 2 loại tài khoản dùng chung 1 giao diện:
   - **User** — luyện tập, quản lý từ vựng của riêng mình.
   - **Admin** — có thêm quyền quản lý bảng chữ cái dùng chung cho toàn hệ thống.

> Phiên đăng nhập sẽ tự động gia hạn khi bạn đang sử dụng web; nếu để web không hoạt động quá lâu, hệ thống có thể yêu cầu bạn đăng nhập lại.

---

## 3. Module 1 — Luyện bảng chữ cái (Hiragana/Katakana)

### Cách chơi

1. Vào mục **Bảng chữ cái**.
2. Chọn **chiều luyện tập**: Hiragana → Romaji, Romaji → Hiragana, Katakana → Romaji, hoặc Romaji → Katakana.
3. Chọn **phạm vi chữ cái** muốn luyện:
   - Tick nhanh theo nhóm: *Bảng thường*, *Biến âm*, *Âm ngắt*, *Trường âm* — có thể tick nhiều nhóm cùng lúc (mix).
   - Hoặc tự chọn từng chữ bằng cách tick trực tiếp trên bảng (chữ đã chọn sẽ hiện màu xanh).
4. Thiết lập tuỳ chọn:
   - **Thời gian mỗi câu** (giây) — mặc định 30s, đặt `0` = không giới hạn thời gian.
   - **Số lần sai tối đa cho phép** — mặc định 1 lần.
5. Bấm **Bắt đầu**. Mỗi câu hỏi hiện 1 chữ, bên dưới là bảng đáp án — bạn chọn đáp án đúng.
6. Khi kết thúc bài, hệ thống hiện **điểm số** và các thông tin khác.

### Sau khi chơi xong

- **Xem lại bài làm (Review)** — xem chi tiết từng câu đúng/sai, và bạn đã chọn nhầm đáp án nào.
- **Chơi lại bài vừa rồi** — luyện tập lại chính xác bộ câu hỏi cũ.
- **Chơi ván mới** — bắt đầu 1 lượt luyện tập khác.
- Bạn có thể **thoát hoặc kết thúc** giữa chừng bất cứ lúc nào.

### Thống kê

Vào mục **Thống kê** để xem tỉ lệ sai của từng chữ cái — giúp bạn biết mình hay quên chữ nào nhất để tập trung ôn lại.

---

## 4. Module 2 — Luyện chính tả (viết tay)

Có 2 chế độ luyện tập, chọn ở đầu module.

### Chế độ 1 — Viết tự do, AI đoán chữ

1. Viết chữ bất kỳ lên khung canvas.
2. Có thể **phóng to/thu nhỏ** khung viết, hoặc **xóa** để viết lại.
3. Bấm **Gửi**, hệ thống sẽ trả về kết quả AI nhận diện được (tối đa 2 chữ gần đúng nhất) để bạn tự đối chiếu với chữ mình định viết.

> Lưu ý: hiện tại chỉ nhận diện được chữ trong bảng chữ cái (hiragana/katakana), chưa hỗ trợ kanji.

### Chế độ 2 — Luyện nhớ mặt chữ

1. Chọn luyện Hiragana hoặc Katakana.
2. Chọn phạm vi chữ muốn luyện (giống Module 1 — tick nhóm hoặc tick từng chữ).
3. Thiết lập **số lần sai cho phép** (mặc định 1). Thời gian mỗi từ là **vô hạn**.
4. Màn hình hiện chữ **romaji**, bạn viết chữ hiragana/katakana tương ứng rồi bấm **Xác nhận** (có thể xóa để viết lại trước khi gửi).
5. Hệ thống AI nhận diện và trả kết quả để bạn so sánh với chữ đúng.
6. Nếu câu hiện tại chưa nhớ ra cách viết, bạn có thể **bỏ qua, nhảy sang câu khác** rồi quay lại sau — không bắt buộc làm tuần tự.
7. Kết thúc có thể **thoát giữa chừng**, **chơi lại đúng bài vừa rồi**, hoặc **chơi ván mới**.

> Chế độ này không tính điểm, không lưu lại lịch sử luyện tập.

---

## 5. Module 3 — Quản lý từ vựng theo chủ đề

Mỗi tài khoản có 1 kho từ vựng và chủ đề **riêng**, không chia sẻ với người khác.

### 5.1. Danh sách chủ đề

Vào mục **Từ vựng**, bạn sẽ thấy danh sách các chủ đề đã tạo, kèm theo:
- Số lượng từ trong chủ đề
- Thời gian sửa gần nhất

Bạn có thể **Tạo chủ đề mới**, **Sửa tên**, hoặc **Xóa** chủ đề trực tiếp từ danh sách này.

### 5.2. Trong 1 chủ đề

Bấm vào 1 chủ đề để xem danh sách từ vựng. Mỗi dòng hiển thị: Hiragana, Romaji, Ý nghĩa, Ghi chú (để trống nếu chữ đó không có).

- Bấm vào 1 dòng để xem **chi tiết đầy đủ** (Hiragana, Katakana, Kanji, Romaji, Ý nghĩa, Ghi chú) và chỉnh sửa.
- Có nút **🔊 Phát âm** để nghe cách đọc từ đó.
- **Xóa từ** — hệ thống sẽ hỏi xác nhận lại 1 lần để tránh xóa nhầm.
- **Di chuyển từ sang chủ đề khác** — có thể chọn nhiều từ cùng lúc bằng ô tick.
- **Tìm kiếm trong chủ đề** — tìm theo hiragana/katakana/kanji/romaji/ý nghĩa, chỉ trong phạm vi chủ đề đang mở.

### 5.3. Thêm từ mới

Khi thêm 1 từ, bắt buộc phải điền:
- **Ý nghĩa** (bắt buộc), và
- **Ít nhất 1 trong 4 trường**: Hiragana, Katakana, Kanji, hoặc Romaji.

Nếu từ bạn nhập **đã tồn tại** (kiểm tra trên **toàn bộ** chủ đề của bạn, không chỉ chủ đề đang mở), hệ thống sẽ hỏi:
- **Đè lên từ cũ** — cập nhật dữ liệu mới vào từ đã có.
- **Giữ từ cũ** — hủy thao tác thêm, không có gì thay đổi.

### 5.4. Tìm kiếm toàn bộ

Ở màn hình danh sách chủ đề (không mở chủ đề nào), có thanh tìm kiếm riêng để tìm từ vựng trên **tất cả** chủ đề của bạn cùng lúc, kết quả hiển thị dạng danh sách nhiều dòng.

### 5.5. Import / Export Excel

**Export:**
Trong 1 chủ đề, bấm **Export Excel** → hệ thống tải về file Excel chứa toàn bộ từ vựng của chủ đề đó (tên file = tên chủ đề).

**Import:**
1. Bấm **Import Excel**, hộp thoại hiện ra với 2 cách nhập:
   - **Nhập tay theo dòng**, mỗi dòng theo định dạng:
     ```
     <hiragana>|<katakana>|<kanji>|<romaji>|<ý nghĩa>|<ghi chú>
     ```
     (để trống phần nào không có, giữ đúng dấu `|` phân cách)
   - **Chọn file Excel** có cùng định dạng cột trên, hệ thống tự đọc và thêm hàng loạt.
2. Với mỗi từ trong file, nếu phát hiện **trùng** với từ đã có, hệ thống sẽ hỏi bạn từng trường hợp: **đè lên từ cũ** hay **bỏ qua giữ từ cũ** — giống hệt lúc thêm tay.
3. Sau khi xử lý xong từng dòng, danh sách từ vựng sẽ được cập nhật ngay trên màn hình.

---

## 6. Module 4 — Ngữ pháp

*Đang được phát triển, sẽ cập nhật hướng dẫn khi hoàn thiện.*

---

## 7. Dành cho Admin

Nếu tài khoản của bạn có quyền **Admin**, bạn có thêm khu vực **Quản trị bảng chữ cái** để:
- Thêm 1 chữ cái mới
- Sửa thông tin 1 chữ cái (chữ, romaji, loại, nhóm biến âm)
- Xóa 1 chữ cái
- Xem thống kê tỉ lệ sai của **từng user cụ thể** (không chỉ của chính mình)

> Thay đổi ở đây ảnh hưởng đến toàn bộ người dùng hệ thống, vì bảng chữ cái dùng chung cho mọi tài khoản.

---

## 8. Câu hỏi thường gặp

**Dữ liệu của tôi có bị người khác xem/sửa được không?**
Không. Chủ đề và từ vựng thuộc về riêng tài khoản của bạn, hệ thống không cho tài khoản khác truy cập.

**Tôi làm sai bài quiz thì điểm có bị lộ hay sửa được không?**
Điểm số do hệ thống tự chấm dựa trên câu trả lời bạn gửi lên, không thể can thiệp chỉnh sửa.

**Luyện viết tay không nhận diện đúng chữ tôi viết thì sao?**
Đây là gợi ý từ AI, không phải chấm điểm đúng/sai tuyệt đối — độ chính xác sẽ được cải thiện dần khi hệ thống cập nhật model. Bạn tự đối chiếu kết quả AI trả về với chữ mình định viết.

**Import Excel bị lỗi định dạng thì sao?**
Kiểm tra lại đúng thứ tự cột và dấu `|` phân cách: `hiragana|katakana|kanji|romaji|ý nghĩa|ghi chú`. Nếu 1 trường không có, vẫn giữ dấu `|` ở đúng vị trí, chỉ để trống nội dung.
