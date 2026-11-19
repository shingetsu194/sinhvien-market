-- Sample dormitory rules for demos and the rules assistant (/residence/assistant).
-- Generic content written for this project, not copied from any real institution.
-- Idempotent: each rule is inserted only if no rule with the same title exists.
-- Author = the first admin account.
--   mysql -u root sinhvien_market < database/demo/dorm-rules.sql

SET NAMES utf8mb4;

INSERT INTO residence_notices (notice_type, title, body, audience, status, created_by)
SELECT 'rule', r.title, r.body, 'all', 'published', (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
FROM (
    SELECT 'Giờ mở cổng và giờ giới nghiêm' AS title,
           'Cổng KTX mở từ 5:00 đến 23:00 hằng ngày. Sau 23:00 sinh viên về muộn phải quẹt thẻ cư trú tại cổng bảo vệ và ghi sổ, nêu lý do. Về muộn quá 3 lần trong tháng sẽ bị nhắc nhở bằng văn bản.' AS body
    UNION ALL SELECT 'Giờ yên tĩnh',
           'Giữ yên tĩnh từ 22:00 đến 6:00 và từ 12:00 đến 13:30. Không mở loa, hát karaoke, chơi nhạc cụ hoặc gây ồn trong các khung giờ này. Dùng tai nghe khi xem phim, chơi game.'
    UNION ALL SELECT 'Khách đến thăm',
           'Khách đến thăm phải đăng ký tại phòng bảo vệ, để lại giấy tờ tùy thân và chỉ được ở trong KTX từ 7:00 đến 21:00. Không cho khách ngủ lại qua đêm dưới mọi hình thức. Khách khác giới chỉ được tiếp ở khu sinh hoạt chung tầng trệt.'
    UNION ALL SELECT 'Nấu ăn và sử dụng thiết bị điện',
           'Chỉ nấu ăn tại bếp chung của mỗi tầng. Trong phòng ở chỉ được dùng nồi cơm điện, ấm siêu tốc dưới 1.000W. Cấm bếp gas mini, bếp điện từ, lò nướng, bàn ủi công suất lớn trong phòng. Rút phích cắm các thiết bị khi ra khỏi phòng.'
    UNION ALL SELECT 'Tiền điện, nước và wifi',
           'Mỗi phòng được miễn phí 4 khối nước và 60 số điện mỗi tháng; phần vượt tính theo đồng hồ riêng của phòng và chia đều cho các thành viên. Wifi miễn phí, mỗi sinh viên đăng nhập bằng mã số sinh viên, tối đa 2 thiết bị. Hóa đơn được gửi trên ứng dụng trước ngày 5 hằng tháng.'
    UNION ALL SELECT 'Đóng phí lưu trú',
           'Phí lưu trú đóng theo học kỳ, hạn chót là ngày 15 của tháng đầu học kỳ, qua chuyển khoản hoặc tại văn phòng Ban quản lý. Trễ hạn quá 15 ngày sẽ bị tạm khóa thẻ ra vào cho đến khi hoàn tất. Sinh viên có hoàn cảnh khó khăn có thể làm đơn xin gia hạn.'
    UNION ALL SELECT 'Vệ sinh phòng ở và khu chung',
           'Các thành viên trong phòng tự phân công trực nhật hằng ngày. Rác phải phân loại và bỏ đúng nơi quy định trước 20:00. Không phơi quần áo ở hành lang hay cửa sổ mặt tiền, chỉ phơi tại sân phơi. Ban quản lý kiểm tra vệ sinh vào thứ Bảy đầu tiên của mỗi tháng.'
    UNION ALL SELECT 'Phòng cháy chữa cháy và an toàn',
           'Cấm hút thuốc lá, thuốc lá điện tử và đốt nến, nhang trong toàn bộ KTX. Không câu, nối điện tùy tiện hoặc dùng ổ cắm kém chất lượng. Không để xe, đồ đạc chắn lối thoát hiểm. Khi nghe chuông báo cháy, di chuyển theo biển chỉ dẫn xuống sân tập trung.'
    UNION ALL SELECT 'Báo hỏng và sửa chữa tài sản',
           'Khi thiết bị trong phòng bị hỏng (đèn, quạt, vòi nước, khóa cửa…), tạo yêu cầu sửa chữa trên ứng dụng ở mục Dịch vụ. Hư hỏng thông thường được xử lý trong 48 giờ. Tài sản bị làm hỏng do sử dụng sai cách thì người gây ra phải bồi thường theo giá thị trường.'
    UNION ALL SELECT 'Gửi xe',
           'Sinh viên nội trú được gửi một xe máy hoặc xe đạp tại bãi xe KTX bằng thẻ cư trú, phí gửi tính theo tháng. Xe phải dựng đúng khu vực, không đậu ở sảnh hay hành lang. Ban quản lý không chịu trách nhiệm với đồ để trong cốp hoặc treo trên xe.'
    UNION ALL SELECT 'Nuôi thú cưng và rượu bia',
           'Không nuôi chó, mèo hay bất kỳ thú cưng nào trong KTX. Cấm mang rượu bia, chất kích thích, vũ khí và vật dụng dễ cháy nổ vào khu lưu trú. Vi phạm có thể bị chấm dứt hợp đồng lưu trú.'
    UNION ALL SELECT 'Chuyển phòng và trả phòng',
           'Muốn chuyển hoặc đổi phòng, sinh viên gửi đơn trên ứng dụng ít nhất 7 ngày trước và chỉ được chuyển khi phòng mới còn chỗ. Khi trả phòng phải dọn sạch giường tủ, bàn giao chìa khóa và thẻ cư trú; Ban quản lý kiểm tra tài sản trước khi hoàn tiền đặt cọc trong 10 ngày làm việc.'
) AS r
WHERE NOT EXISTS (
    SELECT 1 FROM residence_notices n WHERE n.notice_type = 'rule' AND n.title = r.title
);

SELECT COUNT(*) AS published_rules FROM residence_notices WHERE notice_type = 'rule' AND status = 'published';
