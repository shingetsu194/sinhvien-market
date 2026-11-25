-- ============================================================
--  SinhVienMarket — Schema Cơ Sở Dữ Liệu (FULL — v4)
--  Tích hợp: schema gốc + migration_features + alter_login_security
--             + migrate_ai (AI review) + migrate_vietqr (bank_accounts)
--  Môi trường: MySQL 5.7+ / MariaDB 10.3+ (Laragon)
--  Charset: utf8mb4 (hỗ trợ emoji & tiếng Việt đầy đủ)
--  ⚠️  CẢNH BÁO: File này DROP và TẠO LẠI toàn bộ bảng.
--      Chỉ dùng khi cài đặt mới hoặc reset hoàn toàn DB.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- LƯU Ý: File này KHÔNG tự tạo/chuyển database (không CREATE DATABASE / USE)
-- để có thể import vào BẤT KỲ database nào đang được chọn
-- (vd: `sinhvien_market` khi cài thủ công, `test_sinhvien_market` trong CI).
-- Hãy tạo & chọn database trước khi import, ví dụ:
--   CREATE DATABASE sinhvien_market CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   mysql -u root sinhvien_market < database/schema.sql

-- ============================================================
--  1. USERS - Tài khoản sinh viên & admin
-- ============================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100) NOT NULL COMMENT 'Họ tên đầy đủ',
    `email`      VARCHAR(150) NOT NULL COMMENT 'Email đăng ký (duy nhất)',
    `password`   VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
    `phone`      VARCHAR(20)  DEFAULT NULL COMMENT 'Số điện thoại liên hệ',
    `avatar`     VARCHAR(255) DEFAULT NULL COMMENT 'Đường dẫn ảnh đại diện',
    `role`       ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    `is_locked`  TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = bị khóa bởi Admin',
    `lock_reason` VARCHAR(255) DEFAULT NULL,
    `locked_at`   TIMESTAMP NULL DEFAULT NULL,
    `locked_until` TIMESTAMP NULL DEFAULT NULL,
    -- Google OAuth
    `google_id`   VARCHAR(100) NULL UNIQUE COMMENT 'ID từ Google',
    `avatar_url`  VARCHAR(255) NULL COMMENT 'Ảnh đại diện từ Google',
    -- OTP & Security
    `security_question` VARCHAR(255) DEFAULT NULL,
    `security_answer`   VARCHAR(255) DEFAULT NULL,
    `otp_code`          VARCHAR(255) DEFAULT NULL,
    `otp_expires_at`    TIMESTAMP NULL DEFAULT NULL,
    `is_verified`       TINYINT(1) DEFAULT 0,
    `last_verified_at`  TIMESTAMP NULL DEFAULT NULL,
    -- Profile
    `university`        VARCHAR(200) DEFAULT NULL COMMENT 'Trường / Khoa',
    `student_id`        VARCHAR(30)  DEFAULT NULL COMMENT 'MSSV (tùy chọn)',
    `dormitory_address` VARCHAR(255) DEFAULT NULL COMMENT 'Ký túc xá / Địa chỉ giao nhận',
    `social_contact`    VARCHAR(255) DEFAULT NULL COMMENT 'Zalo / Facebook liên hệ',
    `bio`               TEXT         DEFAULT NULL COMMENT 'Tiểu sử ngắn',
    `available_time`    VARCHAR(100) DEFAULT NULL COMMENT 'Thời gian online',
    -- Feature: Huy hiệu Sinh Viên Đã Xác Thực
    `is_student_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = đã xác thực là sinh viên (email edu/ac.vn)',
    -- Feature 3C: Bảo mật 2FA
    `twofa_enabled`     TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = bật xác minh 2 bước khi đăng nhập',
    `session_token`     VARCHAR(64) NULL COMMENT 'Token phiên hiện hành — 1 tài khoản chỉ 1 phiên',
    -- Feature: Hệ thống Xu & Đẩy Tin
    `coins`         INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số xu hiện có',
    `checkin_streak` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Chuỗi điểm danh liên tiếp',
    `last_checkin`  DATE          DEFAULT NULL COMMENT 'Ngày check-in gần nhất',
    -- Feature: Hệ thống Strike
    `strike_count`  TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số gậy cảnh cáo vi phạm',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_email` (`email`),
    KEY `idx_role` (`role`),
    KEY `idx_is_locked` (`is_locked`),
    KEY `idx_student_verified` (`is_student_verified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tài khoản người dùng hệ thống';

-- ============================================================
--  2. CATEGORIES - Danh mục sản phẩm
-- ============================================================
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
    `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100) NOT NULL COMMENT 'Tên danh mục',
    `slug`       VARCHAR(120) NOT NULL COMMENT 'URL-friendly name',
    `icon`       VARCHAR(60)  DEFAULT NULL COMMENT 'Bootstrap Icon class, VD: bi-book',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục sản phẩm (giáo trình, đồ dùng, thiết bị...)';

-- ============================================================
--  3. PRODUCTS - Bài đăng sản phẩm
-- ============================================================
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`     INT UNSIGNED NOT NULL COMMENT 'Người đăng bán',
    `category_id` INT UNSIGNED NOT NULL COMMENT 'Danh mục',
    `title`       VARCHAR(200) NOT NULL COMMENT 'Tiêu đề bài đăng',
    `description` TEXT         NOT NULL COMMENT 'Mô tả chi tiết sản phẩm',
    `image`       VARCHAR(255) DEFAULT NULL COMMENT 'Tên file ảnh trong /public/uploads/',
    `type`        ENUM('sale', 'exchange', 'auction') NOT NULL DEFAULT 'sale'
                  COMMENT 'Loại: bán thường / trao đổi / đấu giá ngược',
    `status`      ENUM('pending', 'active', 'sold', 'cancelled') NOT NULL DEFAULT 'pending'
                  COMMENT 'pending=chờ duyệt, active=đang bán, sold=đã bán, cancelled=bị từ chối',
    `price`       DECIMAL(12, 0) DEFAULT NULL COMMENT 'Giá cố định (chỉ dùng với type=sale)',
    -- Feature: Bộ Lọc Nâng Cao — Tình trạng sản phẩm
    `condition`   ENUM('new','like_new','used','worn') NOT NULL DEFAULT 'used'
                  COMMENT 'Tình trạng: new=Mới 100%, like_new=Như mới, used=Đã dùng, worn=Cũ',
    -- Feature: Đẩy Tin
    `bumped_at`   TIMESTAMP NULL DEFAULT NULL COMMENT 'Thời điểm đẩy tin gần nhất (NULL = chưa đẩy)',
    -- Feature: AI Kiểm Duyệt
    `ai_review_status` ENUM('pending','safe','suspicious','violation') DEFAULT 'pending'
                       COMMENT 'Kết quả kiểm duyệt của AI',
    `ai_review_note`   TEXT DEFAULT NULL
                       COMMENT 'Lý do AI đưa ra (Việt hoá cho Admin đọc)',
    `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id`       (`user_id`),
    KEY `idx_category_id`   (`category_id`),
    KEY `idx_type`          (`type`),
    KEY `idx_status`        (`status`),
    KEY `idx_condition`     (`condition`),
    KEY `idx_bumped_at`     (`bumped_at`),
    KEY `idx_created_at`    (`created_at`),
    KEY `idx_status_created` (`status`, `created_at`),
    FULLTEXT KEY `ft_search` (`title`, `description`),
    CONSTRAINT `fk_products_user`     FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`)       ON DELETE CASCADE,
    CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bài đăng sản phẩm của sinh viên';

-- ============================================================
--  4. AUCTIONS - Cấu hình đấu giá ngược
-- ============================================================
DROP TABLE IF EXISTS `auctions`;
CREATE TABLE `auctions` (
    `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id`      INT UNSIGNED NOT NULL COMMENT 'Sản phẩm đấu giá',
    `start_price`     DECIMAL(12, 0) NOT NULL COMMENT 'Giá khởi điểm (VND)',
    `floor_price`     DECIMAL(12, 0) NOT NULL COMMENT 'Giá sàn tối thiểu (VND)',
    `decrease_amount` DECIMAL(12, 0) NOT NULL COMMENT 'Mức giảm mỗi bước (VND)',
    `step_minutes`    SMALLINT UNSIGNED NOT NULL DEFAULT 5 COMMENT 'Chu kỳ giảm giá (phút)',
    `started_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `ended_at`        TIMESTAMP NULL DEFAULT NULL,
    `winner_id`       INT UNSIGNED DEFAULT NULL,
    `final_price`     DECIMAL(12, 0) DEFAULT NULL,
    `status`          ENUM('active', 'sold', 'cancelled') NOT NULL DEFAULT 'active',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_product_id` (`product_id`),
    KEY `idx_status`    (`status`),
    KEY `idx_winner_id` (`winner_id`),
    CONSTRAINT `fk_auctions_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_auctions_winner`  FOREIGN KEY (`winner_id`)  REFERENCES `users`(`id`)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cấu hình và trạng thái đấu giá ngược';

-- ============================================================
--  5. TRANSACTIONS - Lịch sử giao dịch
-- ============================================================
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
    `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` INT UNSIGNED NOT NULL,
    `buyer_id`   INT UNSIGNED NOT NULL,
    `seller_id`  INT UNSIGNED NOT NULL,
    `amount`     DECIMAL(12, 0) NOT NULL,
    `type`       ENUM('auction', 'direct') NOT NULL DEFAULT 'direct',
    `order_status` ENUM('pending', 'shipping', 'delivered', 'received', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `payment_method`  ENUM('cod', 'banking', 'zalopay', 'momo') NOT NULL DEFAULT 'cod'
                      COMMENT 'vnpay đã được thay thế bởi banking/VietQR',
    `shipping_address` TEXT DEFAULT NULL,
    `payment_status`  ENUM('pending', 'paid', 'refunded') NOT NULL DEFAULT 'pending',
    -- Feature: VietQR banking confirmation
    `payment_proof`        VARCHAR(255) DEFAULT NULL COMMENT 'Ảnh chụp màn hình UNC chuyển khoản',
    `payment_confirmed_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Thời điểm người bán xác nhận đã nhận tiền',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_buyer_id`   (`buyer_id`),
    KEY `idx_seller_id`  (`seller_id`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `fk_transactions_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_transactions_buyer`   FOREIGN KEY (`buyer_id`)   REFERENCES `users`(`id`)    ON DELETE RESTRICT,
    CONSTRAINT `fk_transactions_seller`  FOREIGN KEY (`seller_id`)  REFERENCES `users`(`id`)    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lịch sử giao dịch mua bán';

-- ============================================================
--  6. LOGIN_ATTEMPTS - Rate limiting đăng nhập
-- ============================================================
DROP TABLE IF EXISTS `login_attempts`;
CREATE TABLE `login_attempts` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ip`           VARCHAR(45)  NOT NULL,
    `attempts`     TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `last_attempt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ip` (`ip`),
    KEY `idx_last_attempt` (`last_attempt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Theo dõi số lần đăng nhập thất bại theo IP';

-- ============================================================
--  7. AUDIT_LOGS - Lịch sử hành động Admin
-- ============================================================
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `admin_id`    INT UNSIGNED NOT NULL,
    `action`      VARCHAR(100) NOT NULL,
    `target_type` VARCHAR(50)  NOT NULL,
    `target_id`   INT UNSIGNED NOT NULL,
    `note`        TEXT DEFAULT NULL,
    `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_admin_id`   (`admin_id`),
    KEY `idx_action`     (`action`),
    KEY `idx_created_at` (`created_at`),
    CONSTRAINT `fk_audit_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhật ký hành động của Admin';

-- ============================================================
--  7.5. VIOLATION_LOGS - Lịch sử gậy cảnh cáo
-- ============================================================
DROP TABLE IF EXISTS `violation_logs`;
CREATE TABLE `violation_logs` (
    `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`        INT UNSIGNED NOT NULL,
    `admin_id`       INT UNSIGNED NOT NULL,
    `reason`         VARCHAR(255) NOT NULL,
    `evidence_url`   VARCHAR(255) DEFAULT NULL,
    `strike_number`  TINYINT UNSIGNED NOT NULL,
    `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    CONSTRAINT `fk_vl_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_vl_admin` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lịch sử vi phạm (gậy cảnh cáo) của user';

-- ============================================================
--  8. CONVERSATIONS — Cuộc hội thoại
-- ============================================================
DROP TABLE IF EXISTS `conversations`;
CREATE TABLE `conversations` (
    `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` INT UNSIGNED NOT NULL,
    `buyer_id`   INT UNSIGNED NOT NULL,
    `seller_id`  INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_conv` (`product_id`, `buyer_id`, `seller_id`),
    KEY `idx_buyer_id`  (`buyer_id`),
    KEY `idx_seller_id` (`seller_id`),
    CONSTRAINT `fk_conv_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_conv_buyer`   FOREIGN KEY (`buyer_id`)   REFERENCES `users`(`id`)    ON DELETE CASCADE,
    CONSTRAINT `fk_conv_seller`  FOREIGN KEY (`seller_id`)  REFERENCES `users`(`id`)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cuộc hội thoại giữa người mua và người bán';

-- ============================================================
--  9. MESSAGES — Tin nhắn
-- ============================================================
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
    `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `conversation_id` INT UNSIGNED NOT NULL,
    `sender_id`       INT UNSIGNED NOT NULL,
    `msg_type`        ENUM('text', 'offer') NOT NULL DEFAULT 'text',
    `offer_status`    ENUM('pending', 'accepted', 'rejected') NULL DEFAULT NULL,
    `offer_price`     INT UNSIGNED NULL DEFAULT NULL,
    `body`            TEXT NOT NULL,
    `is_read`         TINYINT(1) NOT NULL DEFAULT 0,
    `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_conv_id`     (`conversation_id`),
    KEY `idx_sender_id`   (`sender_id`),
    KEY `idx_is_read`     (`is_read`),
    KEY `idx_conv_created` (`conversation_id`, `created_at`),
    CONSTRAINT `fk_msg_conv`   FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`)       REFERENCES `users`(`id`)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tin nhắn trong cuộc hội thoại';

-- ============================================================
--  10. NOTIFICATIONS — Thông báo in-app
-- ============================================================
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
    `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`    INT UNSIGNED NOT NULL,
    `type`       VARCHAR(50)  NOT NULL,
    `title`      VARCHAR(200) NOT NULL,
    `body`       TEXT DEFAULT NULL,
    `link`       VARCHAR(255) DEFAULT NULL,
    `is_read`    TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_notif_user_id` (`user_id`),
    KEY `idx_notif_is_read` (`is_read`),
    KEY `idx_notif_created` (`created_at`),
    CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Thông báo in-app cho từng người dùng';

-- ============================================================
--  11. WISHLISTS — Danh sách yêu thích
-- ============================================================
DROP TABLE IF EXISTS `wishlists`;
CREATE TABLE `wishlists` (
    `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`       INT UNSIGNED NOT NULL,
    `product_id`    INT UNSIGNED NOT NULL,
    `price_at_save` DECIMAL(12, 0) DEFAULT NULL,
    `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_wishlist` (`user_id`, `product_id`),
    KEY `idx_wish_product` (`product_id`),
    CONSTRAINT `fk_wish_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)    ON DELETE CASCADE,
    CONSTRAINT `fk_wish_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh sách sản phẩm yêu thích';

-- ============================================================
--  12. RATINGS — Đánh giá uy tín người bán
-- ============================================================
DROP TABLE IF EXISTS `ratings`;
CREATE TABLE `ratings` (
    `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `transaction_id` INT UNSIGNED NOT NULL,
    `rater_id`       INT UNSIGNED NOT NULL,
    `ratee_id`       INT UNSIGNED NOT NULL,
    `product_id`     INT UNSIGNED NOT NULL,
    `stars`          TINYINT UNSIGNED NOT NULL,
    `comment`        TEXT DEFAULT NULL,
    `status`         ENUM('visible', 'hidden') NOT NULL DEFAULT 'visible' COMMENT 'Trạng thái hiển thị (Admin kiểm duyệt)',
    `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_rating_tx` (`transaction_id`),
    KEY `idx_ratee_id`       (`ratee_id`),
    KEY `idx_rater_id`       (`rater_id`),
    KEY `idx_rating_product` (`product_id`),
    CONSTRAINT `fk_rating_tx`      FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rating_rater`   FOREIGN KEY (`rater_id`)       REFERENCES `users`(`id`)        ON DELETE CASCADE,
    CONSTRAINT `fk_rating_ratee`   FOREIGN KEY (`ratee_id`)       REFERENCES `users`(`id`)        ON DELETE CASCADE,
    CONSTRAINT `fk_rating_product` FOREIGN KEY (`product_id`)     REFERENCES `products`(`id`)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Đánh giá uy tín người bán sau giao dịch';

-- ============================================================
--  12.5. BANNERS - Quản lý nội dung trang chủ
-- ============================================================
DROP TABLE IF EXISTS `banners`;
CREATE TABLE `banners` (
    `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title`          VARCHAR(200) NOT NULL COMMENT 'Tiêu đề nội bộ để nhận diện',
    `image`          VARCHAR(255) NOT NULL COMMENT 'Đường dẫn ảnh banner',
    `link`           VARCHAR(255) DEFAULT NULL COMMENT 'Link khi click vào banner',
    `is_active`      TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Hiển thị, 0 = Ẩn',
    `display_order`  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Thứ tự hiển thị (nhỏ hơn xếp trước)',
    `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_active_order` (`is_active`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Banner quản lý trên trang chủ';

-- ============================================================
--  13. REPORTS - Hệ thống Tố cáo
-- ============================================================
DROP TABLE IF EXISTS `reports`;
CREATE TABLE `reports` (
    `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `reporter_id`    INT UNSIGNED NOT NULL,
    `target_user_id` INT UNSIGNED DEFAULT NULL,
    `product_id`     INT UNSIGNED DEFAULT NULL,
    `reason`         VARCHAR(255) NOT NULL,
    `description`    TEXT NOT NULL,
    `status`         ENUM('pending', 'resolved', 'ignored') NOT NULL DEFAULT 'pending',
    `admin_note`     TEXT DEFAULT NULL,
    `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Báo cáo vi phạm gửi cho Admin';

-- ============================================================
--  14. GIVEAWAYS - Sự kiện quay số may mắn
-- ============================================================
DROP TABLE IF EXISTS `giveaway_participants`;
DROP TABLE IF EXISTS `giveaways`;
CREATE TABLE `giveaways` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title`       VARCHAR(255) NOT NULL,
    `description` TEXT,
    `image`       VARCHAR(255) DEFAULT NULL,
    `end_time`    DATETIME     NOT NULL,
    `status`      ENUM('active','ended') DEFAULT 'active',
    `winner_id`   INT UNSIGNED DEFAULT NULL,
    `created_at`  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_winner_id` (`winner_id`),
    CONSTRAINT `fk_giveaways_winner` FOREIGN KEY (`winner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Sự kiện Giveaway / Vòng quay may mắn';

-- ============================================================
--  15. GIVEAWAY_PARTICIPANTS
-- ============================================================
CREATE TABLE `giveaway_participants` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `giveaway_id` INT UNSIGNED NOT NULL,
    `user_id`     INT UNSIGNED NOT NULL,
    `joined_at`   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_participation` (`giveaway_id`, `user_id`),
    KEY `idx_user_id` (`user_id`),
    CONSTRAINT `fk_gp_giveaway` FOREIGN KEY (`giveaway_id`) REFERENCES `giveaways`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_gp_user`     FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh sách người dùng đã tham gia Giveaway';

-- ============================================================
--  16. LOGIN_SESSIONS — Lịch sử đăng nhập & phát hiện thiết bị lạ
--  Feature 3A/3B: Ghi nhận mỗi lần đăng nhập thành công
-- ============================================================
DROP TABLE IF EXISTS `login_sessions`;
CREATE TABLE `login_sessions` (
    `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    `user_id`      INT UNSIGNED  NOT NULL,
    `ip_address`   VARCHAR(45)   NOT NULL,
    `user_agent`   TEXT          NOT NULL,
    `device_info`  VARCHAR(255)  NOT NULL DEFAULT '',
    `is_new_device` TINYINT(1)  NOT NULL DEFAULT 0 COMMENT '1 = IP này lần đầu đăng nhập với user này',
    `logged_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id`  (`user_id`),
    KEY `idx_logged_at` (`logged_at`),
    CONSTRAINT `fk_ls_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lịch sử đăng nhập — dùng cho bảo mật & cảnh báo thiết bị lạ';

-- ============================================================
--  17. BANK_ACCOUNTS — Tài khoản ngân hàng người dùng (VietQR)
-- ============================================================
DROP TABLE IF EXISTS `bank_accounts`;
CREATE TABLE `bank_accounts` (
    `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`      INT UNSIGNED NOT NULL,
    `bank_name`    VARCHAR(100) NOT NULL COMMENT 'Tên ngân hàng (VD: Vietcombank)',
    `bank_code`    VARCHAR(20)  NOT NULL COMMENT 'Mã ngân hàng BIN (dùng cho VietQR API)',
    `account_no`   VARCHAR(30)  NOT NULL COMMENT 'Số tài khoản',
    `account_name` VARCHAR(100) NOT NULL COMMENT 'Tên chủ tài khoản (IN HOA)',
    `is_verified`  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = Admin đã xác nhận',
    `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_bank` (`user_id`),
    CONSTRAINT `fk_bank_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tài khoản ngân hàng của người dùng — dùng cho thanh toán VietQR';

-- ============================================================
--  IMAGE BLOBS - Lưu ảnh trong DB (bền vững trên Railway ephemeral FS)
--  Tách bảng riêng để SELECT * trên products/banners không kéo theo blob.
-- ============================================================
DROP TABLE IF EXISTS `product_images`;
CREATE TABLE `product_images` (
    `product_id` INT UNSIGNED NOT NULL,
    `data`       LONGBLOB     NOT NULL,
    `mime`       VARCHAR(50)  NOT NULL,
    `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`product_id`),
    CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Ảnh sản phẩm lưu trong DB';

DROP TABLE IF EXISTS `banner_images`;
CREATE TABLE `banner_images` (
    `banner_id`  INT UNSIGNED NOT NULL,
    `data`       LONGBLOB     NOT NULL,
    `mime`       VARCHAR(50)  NOT NULL,
    `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`banner_id`),
    CONSTRAINT `fk_banner_images_banner` FOREIGN KEY (`banner_id`) REFERENCES `banners`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Ảnh banner lưu trong DB';

DROP TABLE IF EXISTS `user_avatars`;
CREATE TABLE `user_avatars` (
    `user_id`    INT UNSIGNED NOT NULL,
    `data`       LONGBLOB     NOT NULL,
    `mime`       VARCHAR(50)  NOT NULL,
    `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`),
    CONSTRAINT `fk_user_avatars_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Avatar người dùng lưu trong DB';

DROP TABLE IF EXISTS `giveaway_images`;
CREATE TABLE `giveaway_images` (
    `giveaway_id` INT UNSIGNED NOT NULL,
    `data`        LONGBLOB     NOT NULL,
    `mime`        VARCHAR(50)  NOT NULL,
    `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`giveaway_id`),
    CONSTRAINT `fk_giveaway_images_giveaway` FOREIGN KEY (`giveaway_id`) REFERENCES `giveaways`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ảnh giveaway lưu trong DB';

DROP TABLE IF EXISTS `transaction_proofs`;
CREATE TABLE `transaction_proofs` (
    `transaction_id` INT UNSIGNED NOT NULL,
    `data`           LONGBLOB     NOT NULL,
    `mime`           VARCHAR(50)  NOT NULL,
    `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`transaction_id`),
    CONSTRAINT `fk_transaction_proofs_tx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Biên lai thanh toán lưu trong DB';

DROP TABLE IF EXISTS `report_evidence`;
CREATE TABLE `report_evidence` (
    `report_id`  INT UNSIGNED NOT NULL,
    `data`       LONGBLOB     NOT NULL,
    `mime`       VARCHAR(50)  NOT NULL,
    `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`report_id`),
    CONSTRAINT `fk_report_evidence_report` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ảnh bằng chứng tố cáo lưu trong DB';

-- ============================================================
--  SEED DATA - Dữ liệu mẫu ban đầu
-- ============================================================

-- Tài khoản mẫu cho môi trường phát triển (mật khẩu chung: Admin@123).
-- Email thuộc tên miền dành riêng cho thử nghiệm (RFC 2606) nên không trùng
-- người thật. ĐỔI mật khẩu admin ngay sau khi cài; không dùng cho production.
INSERT INTO `users` (`name`, `email`, `password`, `role`, `is_verified`, `last_verified_at`) VALUES
('Quản Trị Viên', 'admin@sinhvienmarket.example',
 '$2y$12$SgUUG97QUauWA2EuHa/iXufwMcJ6JDRX0irQZ5252MTsc0u9yZEfe',
 'admin', 1, NOW()),
('Sinh viên Mẫu A', 'sinhvien.a@hutech.example.edu',
 '$2y$12$SgUUG97QUauWA2EuHa/iXufwMcJ6JDRX0irQZ5252MTsc0u9yZEfe',
 'student', 1, NOW()),
('Sinh viên Mẫu B', 'sinhvien.b@example.com',
 '$2y$12$SgUUG97QUauWA2EuHa/iXufwMcJ6JDRX0irQZ5252MTsc0u9yZEfe',
 'student', 1, NOW());

-- Danh mục sản phẩm
INSERT INTO `categories` (`name`, `slug`, `icon`) VALUES
('Giáo trình & Sách',    'giao-trinh',    'bi-book'),
('Điện tử & Máy tính',   'dien-tu',       'bi-laptop'),
('Đồ dùng học tập',      'do-dung',       'bi-pencil'),
('Quần áo & Phụ kiện',   'quan-ao',       'bi-bag'),
('Đồ gia dụng KTX',      'gia-dung',      'bi-house'),
('Thể thao & Giải trí',  'the-thao',      'bi-bicycle'),
('Khác',                 'khac',          'bi-grid');

-- Sản phẩm mẫu (sale)
INSERT INTO `products` (`user_id`, `category_id`, `title`, `description`, `type`, `status`, `price`) VALUES
(2, 1, 'Giáo trình Toán Cao Cấp A1 - Nguyễn Đình Trí',
 'Sách còn mới 90%, không ghi chú bên trong. Phù hợp sinh viên năm 1 khoa Kỹ thuật.',
 'sale', 'active', 35000),
(3, 2, 'Tai nghe JBL T110 còn BH',
 'Tai nghe JBL chính hãng, còn bảo hành 6 tháng. Âm thanh cực hay, dây không bị đứt.',
 'sale', 'active', 180000);

-- Sản phẩm mẫu (auction)
INSERT INTO `products` (`user_id`, `category_id`, `title`, `description`, `type`, `status`) VALUES
(2, 1, 'Bộ sách Vật Lý Đại Cương (tập 1+2) - Lương Duyên Bình',
 'Dùng 1 học kỳ, còn sạch. Cần bán gấp trước khi ra trường. Giá giảm dần theo thời gian!',
 'auction', 'active');

-- Cấu hình đấu giá ngược
INSERT INTO `auctions`
    (`product_id`, `start_price`, `floor_price`, `decrease_amount`, `step_minutes`, `started_at`)
VALUES
    (3, 80000, 30000, 5000, 10, NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  ✅ XONG! Schema v4 đã tích hợp đầy đủ:
--  Bảng gốc + is_student_verified + coins + condition + bumped_at
--  + twofa_enabled + login_sessions (Feature 3A/3B/3C)
--  + ai_review_status + ai_review_note (AI Kiểm Duyệt)
--  + bank_accounts (VietQR) + payment_proof + payment_confirmed_at
-- ============================================================
