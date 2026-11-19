-- W7: buyer REQUESTs (nhu cầu tìm mua) tied to an authenticated account.
-- Additive; apply after 20261113_week9_12_finance_notices_matching.sql.
-- Replaces the prototype's browser-only localStorage requests.

INSERT IGNORE INTO `permissions` (`permission_key`, `name`) VALUES
    ('marketplace.request.manage_own', 'Đăng và quản lý nhu cầu tìm mua của chính mình');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key = 'marketplace.request.manage_own'
WHERE r.role_key IN ('student', 'admin');

CREATE TABLE IF NOT EXISTS `marketplace_buyer_requests` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `description` VARCHAR(1000) NOT NULL,
    `category_id` INT UNSIGNED DEFAULT NULL,
    `budget_max` INT UNSIGNED DEFAULT NULL,
    `min_condition` ENUM('new', 'like_new', 'used', 'worn') DEFAULT NULL,
    -- Residence context: preferred dormitory building (verified by allocations).
    `building_id` INT UNSIGNED DEFAULT NULL,
    `allow_exchange` TINYINT(1) NOT NULL DEFAULT 0,
    -- {"category":"hard","budget":"soft",...}; a set constraint without a flag is "hard".
    `requirement_flags` JSON NOT NULL,
    `image_mime` VARCHAR(40) DEFAULT NULL,
    `image_data` MEDIUMBLOB DEFAULT NULL,
    `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    `expires_at` DATETIME NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_buyer_requests_user_status` (`user_id`, `status`),
    KEY `idx_buyer_requests_open` (`status`, `expires_at`),
    CONSTRAINT `fk_buyer_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_buyer_requests_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_buyer_requests_building` FOREIGN KEY (`building_id`) REFERENCES `residence_buildings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
