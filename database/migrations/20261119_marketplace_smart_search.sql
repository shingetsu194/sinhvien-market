-- W7: smart (semantic) product search. Additive; apply after
-- 20261119_marketplace_buyer_requests.sql.
-- Fixed-window request counters so one client cannot exhaust the Gemini
-- quota through the public search endpoint.

CREATE TABLE IF NOT EXISTS `api_rate_limits` (
    `bucket` VARCHAR(40) NOT NULL,
    `client_key` CHAR(64) NOT NULL,
    `window_start` INT UNSIGNED NOT NULL,
    `hits` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`bucket`, `client_key`, `window_start`),
    KEY `idx_api_rate_limits_window` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
