# Hệ thống luyện tập tiếng Nhật
Hệ thống có hiện tại có 4 module lần lượt là
- học bảng chữ cái hiragana, katakana
- luyện tập chính tả
- module quản lý từ vựng theo chủ đề
- luyện tập ngữ pháp

- có 2 tài khoản là admin và user thường (dùng cùng 1 giao diện web cho dễ lập trình)
---
## Module 1 là học bảng chữ cái hiragana, katakana
Module này không có gì đặc biệt. Mục đích là để user học thuộc bảng chữ cái và phản xạ nhanh

### Nghiệp vụ 
Giao diện sẽ cho phép user chọn các lựa chọn như: 
- hiragana -> romaji (và ngược lại), katakana -> romaji
- Lưu ý là hiragana thì còn có cả các biến âm, âm ngắt hay trường âm (được admin quản lý)
- trong mỗi trường hợp thì lại có các lựa chọn như chọn tất cả các từ trong bảng chữ cái, hoặc là tự user chỉ định các từ muốn luyện tập bằng cách tick vào các từ trên giao diện
- sau đó có lựa chọn về thời gian 1 câu (tự user điền - mặc định là 30 giây, nếu user đặt về 0 thì là vô hạn thời gian đợi). nhưng do bảng chữ cái có cả chữ thường và biến âm, trường âm .v.vv nên cũng hỗ trợ các lựa chọn nhanh như luyện tập bảng chữ cái thường, luyện tập bảng biến âm,.. (ô vuông nhé, để có thể mix), khi tích vào 2 ô vuông thì các chữ được tích sẽ hiện màu xanh và người dùng vẫn có thể tích vào các chữ cái để bỏ chữ đó ra. 
- Tiếp theo là lựa chọn cho phép sai tối đa bao nhiêu lần (tự user điền, mặc định là 1)
- luyện tập theo hình thức chắc nghiệm, 1 từ hiện lên và ở dưới là nguyên 1 bảng đáp án
    - TH1: user chọn hiragana -> romaji: nghĩa là câu hỏi là hiện từ hiragana, ở dưới là bảng romaji, user cần chọn đúng từ romaji nào ứng với hiragana đó
    - TH2: tương tự với katakana và 2 trường hợp romaji->hiragana và romaji->kaytakana
- bài kiểm tra kết thúc sẽ hiển thị điểm số, các thông tin phụ khác
- có chắc tính năng phụ như review lại bài làm để xem các câu đúng câu sai
- giao diện có nút chơi lại ván mới và chơi lại chính ván vừa rồi
- đang chơi cũng có thể thoát hoặc kết thúc luôn
- hệ thống cũng có thêm hoạt động là thu thập dữ liệu câu đúng sai của user để thống kê xem những chữ cái nào khiến đa số các users nói chung và user này nói riêng quên nhiều nhất. 
- do đó giao diện cũng có bảng thống kê tỉ lệ sai của 1 chữ cái của mỗi user
### luồng
- Khi user vào module này thì web sẽ gọi api tới backend để lấy bảng chữ cái trên cơ sở dữ liệu
- đối với admin sẽ có quyền chỉnh sửa, thêm, xóa bảng chữ cái hiragana, katakana 
- còn lại các thao tác thực hiện hoàn toàn trên browser
---

## Module 2 là luyện tập chính tả
- module này có 2 chế độ luyện tập
### chế độ 1
- là đơn giản chỉ hiện ra cái bảng (giống canvas) để user viết vào, bấm nút gửi để hệ thống nhận diện xem user vừa viết chữ gì, sau đó gửi chữ đó tới user
- có hỗ trợ phóng to thu nhỏ bảng viết, chỗ trợ xóa chữ vừa viết
- hiện tại chỉ nhận diện chữ trong bảng chữ cái thôi chưa phải nhận diện các chữ cái dài như kanji (cũng phụ thuộc vào cơ sở dữ liệu ngày 1 nâng cấp)

### chế độ 2
- là chế độ luyện tập nhớ chữ trong bảng chữ cái, user đầu tiên sẽ chọn hiragana hoặc katagara để luyện tập bảng chữ cái đó 
- sau đó có lựa chọn là như ở module 1 đó là chọn luyện tập tất cả các từ trong bảng chữ cái, hoặc là 1 phần, có thể tích vào các chữ,..... <=> tự user chỉ định các từ muốn luyện tập bằng cách tick vào các từ trên giao diện

- sau đó sẽ bấm chơi, giao diện hiện chữ romaji của chữ đó, rồi user sẽ viết chữ hiragana hoặc katagara (theo lựa chọn trước đó) rồi bấm xác nhận (cũng có hỗ trợ xóa chữ nhé), rồi gửi cho server nhận diện, server ai nhận diện xong gửi đáp án cho client, client so sánh
- khác với trò chơi ở module 1 thì trò chơi này có thể nhảy cóc từ câu n tới câu m bất kì nếu câu n hiện tại họ chưa nhớ ra cách viết, cũng cho phép là lựa chọn cho phép viết sai mấy này (tự user nhập số - mặc định là 1), và thời gian vô hạn cho mỗi từ nha. 
- họ cũng có thể thoát, kết thúc nửa chừng, kết thúc xong có thể chơi ván khác hoặc chơi lại đúng bài vừa rồi

### Luồng
- khi user gửi đi cái thông tin chữ viết tay trên màn hình thì sẽ gửi tới server (có thể có nhiều server tùy thiết kế)
- server AI sẽ trả về tối đa 2 chữ có tỉ lệ giống gần nhất cho client (browser), browser nhận được rồi sẽ hiển thị 2 đáp án đó (trò chơi này ko cần tính điểm)
- hiện tại client chỉ hiển thị kết quả trả về từ server, sau này có thể thay đổi sau

## Module 3 là module quản lý từ vựng theo chủ đề
- giao diện của module này đầu tiên thiết kế để hiển thị danh sách các chủ đề hiện tại, hiển thị các thông số như số từ, phút, giờ, ngày tháng sửa gần nhất của các chủ đề, cho phép user tạo sửa hóa chủ đề (cho phép sửa tên chủ đề luôn).
- sau đó họ sẽ mở 1 chủ đề cụ thể ra trong mỗi chủ đề họ sẽ quản lý nhiều từ vựng của chủ đề đó, mỗi từ sẽ có hiragana, katagara, kanji, romaji , ý nghĩa, ghi chú, thời gian được tạo, sửa. 
    - khi thêm 1 từ thì phải có ít nhất 2 trường dữ liệu là. 1 là ý nghĩa và  2 là một trong bốn cái hiragana, katagara, kanji, romaji
    - sau đó họ lưu thì sau này có thể chỉnh sửa
    - còn có thể di chuyển từ vựng này sang chủ đề khác
    - có thêm tính năng phát loa để trình duyệt phát âm từ này
    - thời gian tạo, sửa sẽ được hệ thống tự động 
- giao diện 1 chủ đề sẽ có hiển thị danh sách từ vựng theo dạng dòng. mỗi dòng hiển thị hiragana (để rỗng nếu ko có), romaji, ý nghĩa, ghi chú. khi bấm vào dòng đó thì thông tin chi tiết của chữ đó mới hiện ra hết và có thể sửa, xóa từ này (nếu xóa thì cần hiển thị xác nhận 1 lần nữa nếu lỡ họ là bấm nhầm), di chuyển từ này tới chủ đề khác
- giao diện có phóng to thu bé, cuộn lên xuống, có export file excel (tên file là tên chủ đề)
- có hỗ trợ import file excel. cụ thể khi bấm import file excel từ sẽ mở ra hộp thoại, hộp thoại này có phần input và có placeholder là hướng dẫn user nhập các từ dạng <hiragana>|<katagana>|<kanji>|<romaji>|<ý nghĩa>|<ghi chú>, (nhập theo dòng nhé) thuật toán hệ thống tự động phát hiện từ mà user nhập (được thực hiện ở frontend)
- dữ liệu các chủ đề, từ vựng thì sẽ được lưu ở database
- chưa hết, hộp thoại của import đó còn có nút import, khi bấm vào import thì mở ra file explore để user chọn file excel có dạng <hiragana>|<katagana>|<kanji>|<romaji>|<ý nghĩa>|<ghi chú> để hệ thống tự động thêm các từ. Bên cạnh đó thiết kế để sau này có thể nhận diện và import nhiều dạng bảng trong file excel nữa

- khi thêm 1 từ mới hệ thống tự nhận diện xem từ này đã tồn tại hay chưa, nếu tồn tại rồi thì để user lựa chọn là xóa từ cũ, thêm từ mới hoặc hủy thao tác thêm từ mới này để giữ từ cũ (việc kiểm tra từ này đã tồn tại chưa sẽ là kiểm tra trên tất cả chủ đề, không chủ riêng chủ đề này)
- trong giao diện 1 chủ đề cũng có tìm kiếm từ theo hira, kata, kanji, romaji, ý nghĩa (trong chủ đề đó thôi nhé)
- ở giao diện chính của module này (giao diện hiển thị danh sách chủ đề) có thanh tìm kiếm từ vựng, lúc này mới là tìm tất cả các từ ở các chủ đề, hiển thị kết quả dưới dạng nhiều dòng
- lưu ý khi import file excel vẫn phải check tồn tại hay chưa (cả FE vẫn BE)

### Luồng
- khi thêm sửa xóa từ mới, chủ đề thì sẽ đều gọi api tới server
- khi import file mới FE sẽ kiểm tra hợp lệ, duyệt từng dòng, dòng nào có từ lặp thì hiện lựa chọn cho user là lấy từ mới đè lên từ cũ, hoặc bỏ qua để giữ từ cũ, sau đó lại duyệt tiếp và hiện chữ lần lượt ở dưới bảng từ vựng hiện tại
- mỗi từ được import từ file được gọi api để lưu
- chuyển 1 từ hay nhiều từ (có ô vuông để tick cho nhanh) thì cũng gọi api để cập nhật nha

## Module 4 là luyện tập ngữ pháp
- tạm thời chưa hoàn thành

## Công nghệ
Next.js, ASP.NET 8 , PostgreSQL, AI Recognition, JWT, Git + GitHub/GitLab

# tổ chức dự án
- Monorepo (1 repo Git duy nhất)
- frontend: Next.js
- backend: ASP.NET 8 Web API (Clean Architecture)
- ai_service: python/FastAPI + model nhận diện chữ viết tay
- docker-compose.yml: chạy cả 3 service + PostgreSQL cùng lúc
- .github/workflows: CI/CD từng service