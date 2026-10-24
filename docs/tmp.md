
## 9. ĐẶC TẢ CHI TIẾT 8 MÀN HÌNH ỨNG DỤNG

### Màn hình 1: Đăng nhập & Chọn Vai trò Trải nghiệm (Demo Switcher)
* **Route:** `/login`
* **Mục tiêu:** Cung cấp cổng đăng nhập chuẩn xác cho 3 nhóm người dùng và thanh truy cập nhanh Demo 1-Click để kiểm thử ngay lập tức mà không cần gõ tài khoản.
* **Thành phần giao diện:**
  * Logo mầm cây, tên app *"Mầm Học AI - StuGuide"*, khẩu hiệu *"AI hỗ trợ người lớn – Trẻ học qua trải nghiệm thật"*.
  * Tab 1: Giáo viên & BGH (Đăng nhập Email / Mật khẩu).
  * Tab 2: Phụ huynh (Nhập Số điện thoại nhận mã xác thực OTP).
  * Vùng chuyển đổi chạy thử (Demo Mode Bar): 3 nút bấm kích thước lớn: `[👩‍🏫 Trải nghiệm vai Giáo viên]`, `[👨‍💼 Trải nghiệm vai Ban Giám hiệu]`, `[👨‍👩‍👧 Trải nghiệm vai Phụ huynh (Mobile)]`.

### Màn hình 2: Bảng Điều khiển Giáo viên (Teacher Dashboard)
* **Route:** `/teacher`
* **Mục tiêu:** Trung tâm tác vụ hằng ngày của cô giáo.
* **Thành phần giao diện:**
  * Header: Tên cô giáo (`Cô Nguyễn Thị Lan`), tên lớp (`Lớp MG nhỡ B1 - 4–5 tuổi`), nút chọn đổi lớp phụ trách.
  * 3 Thẻ hành động nhanh (Action Cards):
    1. `➕ Tạo Kế hoạch & Trò chơi mới`
    2. `📋 Ghi nhận Quan sát (30 giây)`
    3. `👨‍👩‍👧 Soạn Thẻ Hoạt động Phụ huynh`
  * Bảng Danh sách bài học gần đây kèm Badge trạng thái màu sắc: `🔘 Bản nháp AI`, `🟡 Cần rà soát`, `🟢 Đã duyệt`, `🔵 Đã chia sẻ`.
  * Hộp Thông báo nhanh: Widget hiển thị tỷ lệ % phụ huynh đã phản hồi bài học hôm qua và Thẻ cảnh báo sớm cần lưu tâm (Bé Gia Huy).

### Màn hình 3: Form Thiết lập Bối cảnh Bài học (Zero-Prompt UI)
* **Route:** `/teacher/create`
* **Mục tiêu:** Thu thập tham số lớp học nhanh chóng mà giáo viên không cần học cách gõ câu lệnh prompt.
* **Thành phần nhập liệu:**
  1. *Độ tuổi:* Dropdown chọn `24-36 tháng`, `3-4 tuổi (MG bé)`, `4-5 tuổi (MG nhỡ)`, `5-6 tuổi (MG lớn)`.
  2. *Mảng phát triển GDMN:* 5 nút chọn độc quyền (`Thể chất`, `Nhận thức`, `Ngôn ngữ`, `Tình cảm & KNXH`, `Thẩm mỹ`).
  3. *Tùy chọn nâng cao:* Nút gạt bật/tắt `Ưu tiên định hướng STEM` và `Tích hợp Trò chơi dân gian`.
  4. *Chủ đề bài dạy:* Ô nhập text kèm Tag chọn nhanh: `Bản thân & Tình bạn`, `Gia đình`, `Thế giới thực vật`, `Giao thông`.
  5. *Thời lượng & Địa điểm:* 15/20/25/30 phút & Trong lớp / Ngoài sân.
  6. *Học liệu có sẵn:* Tag chọn nhanh: `Vỏ hộp sữa tái chế`, `Rổ nhựa`, `Bóng nhựa nhỏ`, `Lá cây khô`, `Giấy màu`, `Vòng nhựa`.
  7. *Nút hành động chính:* `[✨ Tạo bản nháp bằng AI]` (Hiển thị thanh tiến trình 3 bước trong 2 giây: Tra cứu VBHN 01 -> Kiểm tra TT 45 -> Sinh kịch bản & Flashcard).

### Màn hình 4: Chi tiết Giáo án, Học liệu & Phê duyệt (Streaming Rendering)
* **Route:** `/teacher/plan/[id]`
* **Mục tiêu:** Hiển thị toàn diện giáo án theo thời gian thực (streaming từng phần), cho phép chỉnh sửa trực tiếp (Human-in-the-Loop) và bấm duyệt.
* **Các khối nội dung:**
  * **Hộp Căn cứ Pháp lý (Nền xanh nhạt):** Trích dẫn rõ ràng từ VBHN 01/VBHN-BGDĐT kèm nút `[Xem điều khoản gốc]`.
  * **Hộp Cảnh báo An toàn Vật lý (Nền vàng cam nổi bật):** Cảnh báo sắc nhọn, khoảng cách vận động an toàn 1.5m theo Thông tư 45.
  * **Giáo án Chuẩn 3 Phần & Kịch bản Trò chơi:**
    * *Tên trò chơi:* Sáng tạo, giàu hình ảnh (VD: "Chuyến xe tình bạn - Thu gom hộp sữa").
    * *Phần 1: Mục tiêu bài học* (Kiến thức, Kỹ năng, Thái độ).
    * *Phần 2: Chuẩn bị đồ dùng* (100% Screen-Free).
    * *Phần 3: Cách chơi & Luật chơi thực tế* (Khởi động, Chia đội, Quá trình chơi, Xử lý tình huống).
    * *Phần phụ: Lời dẫn mẫu truyền cảm* của cô giáo để tạo hứng thú cho trẻ.
    * *(Mỗi phần đều có nút `[✏️ Sửa]` và `[🔄 AI viết lại phần này]`)*.
  * **Bộ Học liệu Trực quan AI:** Minh họa Flashcard và tranh vẽ nét để in ra giấy A4 tô màu kèm nút `[🖨️ In học liệu PDF]`.
  * **Thanh tác vụ cuối:** `[💾 Lưu nháp]`, `[📤 Gửi BGH duyệt]`, `[✅ Phê duyệt & Tạo Checklist]`.

### Màn hình 5: Đánh giá Quan sát Cuối ngày (Checklist 30s)
* **Route:** `/teacher/assess/[id]`
* **Mục tiêu:** Hoàn thành toàn bộ đánh giá cả lớp chỉ trong 30 giây thực tế.
* **Thành phần giao diện:**
  * Tiêu chí quan sát: 3–5 tiêu chí tự động sinh từ bài học.
  * Nút thao tác thần tốc: `[⚡ Đánh dấu tất cả "Đã đạt"]` (Cô chỉ cần bấm 1 phát, sau đó đổi trạng thái cho 1-2 bé nổi trội hoặc cần kèm thêm).
  * Danh sách học sinh: Mỗi hàng gồm Tên bé + 3 nút chọn (`🌟 Tốt`, `✅ Đã đạt`, `🌱 Cần rèn thêm`) + Ô ghi chú khách quan.
  * Khung AI Behavioral Analytics: Hiển thị thông báo nhẹ nhàng khi phát hiện trẻ có chuỗi 3 tuần liên tiếp cần rèn thêm kèm nút `[🎮 Xem kịch bản hỗ trợ riêng]`.
  * Nút điều hướng: `[💾 Lưu hồ sơ]` -> `[➡️ Tạo Thẻ nhiệm vụ 5 phút gửi Phụ huynh]`.

### Màn hình 6: Quản lý Thẻ Nhiệm vụ & Đồng bộ Phản hồi Phụ huynh
* **Route:** `/teacher/parent-cards`
* **Mục tiêu:** Giúp giáo viên quản lý nội dung gửi gia đình và theo dõi tương tác real-time.
* **Thành phần giao diện:**
  * Khung soạn thẻ do AI tóm tắt: Lời chào thân thiện, tóm tắt trò chơi trên lớp, 2-3 câu hỏi gợi mở EQ buổi tối, thời lượng 5 phút.
  * Nút `[✅ Duyệt & Gửi Zalo/Web]` và nút `[📋 Sao chép nội dung & Link nhóm lớp]`.
  * Biểu đồ tỷ lệ phản hồi trực tiếp: Vòng tròn % phụ huynh đã hoàn thành bài tập cùng con (cập nhật nhảy số thời gian thực khi có phụ huynh bấm nút).
  * Danh sách lọc: Học sinh đã hoàn thành / Học sinh cần hỗ trợ thêm để cô lưu ý vào sáng mai.

### Màn hình 7: Giao diện Phụ huynh (Mobile Web - Không Cài App)
* **Route:** `/parent/[token]`
* **Mục tiêu:** Mở từ đường link Zalo, giao diện dạng mobile dọc thân thiện, dễ đọc trong 30 giây.
* **Thành phần giao diện:**
  * Nhãn đầu trang: *"🌱 Mầm Học AI – Không cần cài đặt ứng dụng"*.
  * Thông tin bé: Tên bé, lớp, tên cô giáo phụ trách.
  * Khối *"Hôm nay ở lớp con làm gì?"*: Đoạn tóm tắt tích cực, ấm áp về hoạt động của con.
  * Khối *"Nhiệm vụ 5 phút tối nay cùng con"*: 2 câu hỏi EQ tâm sự trước giờ ngủ (Bố mẹ chỉ cần lắng nghe, không phán xét).
  * Khối Phản hồi 1-Chạm: 2 nút bấm siêu to: `[✅ Bé đã hoàn thành]` và `[🌱 Bé cần rèn thêm]` kèm ô nhắn gửi cô giáo (tùy chọn) -> Bấm xong hiện thông báo cảm ơn và đồng bộ ngay về máy cô.
  * Khối kiểm thử bảo mật Demo: Nút `[🔒 Thử xem hồ sơ bé khác]` -> Hệ thống lập tức kích hoạt trang từ chối truy cập và ghi lại nhật ký bảo mật.

### Màn hình 8: Bảng Điều khiển Ban Giám Hiệu Toàn trường
* **Route:** `/principal`
* **Mục tiêu:** Quản trị chuyên môn, duyệt giáo án và xuất báo cáo kiểm định chất lượng giáo dục.
* **Thành phần giao diện:**
  * 4 Thẻ KPI vĩ mô: Số giáo án đã duyệt trong tháng, Số giờ tiết kiệm trung bình của giáo viên, Tỷ lệ bài đạt chuẩn pháp lý (100%), Tỷ lệ phụ huynh tương tác toàn trường.
  * Biểu đồ Radar/Cột tiến độ: Thể hiện độ bao phủ 5 mảng phát triển của toàn trường.
  * Hàng đợi duyệt giáo án: Danh sách bài giáo viên gửi lên kèm nút `[👁️ Xem nhanh]`, `[✅ Phê duyệt]`, `[❌ Yêu cầu sửa lại]`.
  * Khu vực Kiểm định: Nút lớn `[📊 Xuất Báo cáo Kiểm định Chất lượng Giáo dục]` (tự động render bảng biểu chuẩn PDF tải về).
  * Bảng Nhật ký An ninh & Thao tác (Audit Log).

---