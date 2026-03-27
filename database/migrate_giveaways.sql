-- Migration: Tạo bảng giveaways và giveaway_participants
USE `sinhvien_market`;

CREATE TABLE IF NOT EXISTS `giveaways` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title`       VARCHAR(200) NOT NULL COMMENT 'Tên sự kiện',
    `description` TEXT DEFAULT NULL COMMENT 'Mô tả sự kiện',
    `image`       VARCHAR(255) DEFAULT NULL COMMENT 'Ảnh banner sự kiện',
    `end_time`    TIMESTAMP NOT NULL COMMENT 'Thời điểm kết thúc',
    `status`      ENUM('active', 'ended') NOT NULL DEFAULT 'active',
    `winner_id`   INT UNSIGNED DEFAULT NULL COMMENT 'ID người thắng (sau khi quay)',
    `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_giveaway_status`    (`status`),
    KEY `idx_giveaway_end_time`  (`end_time`),
    KEY `idx_giveaway_winner_id` (`winner_id`),
    CONSTRAINT `fk_giveaway_winner` FOREIGN KEY (`winner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Sự kiện quay số tặng thưởng';

CREATE TABLE IF NOT EXISTS `giveaway_participants` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `giveaway_id` INT UNSIGNED NOT NULL,
    `user_id`     INT UNSIGNED NOT NULL,
    `joined_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_giveaway_user` (`giveaway_id`, `user_id`),
    KEY `idx_gp_user_id` (`user_id`),
    CONSTRAINT `fk_gp_giveaway` FOREIGN KEY (`giveaway_id`) REFERENCES `giveaways`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_gp_user`     FOREIGN KEY (`user_id`)     REFERENCES `users`(`id`)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Người tham gia sự kiện giveaway';
