-- Netra Unnayan - Seasonal Theme Engine Database Schema
-- Supports 10 built-in themes, custom admin themes, scheduling, multilingual text, and safe mode

CREATE TABLE IF NOT EXISTS `themes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `slug` VARCHAR(60) NOT NULL UNIQUE,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `type` ENUM('default', 'festival', 'seasonal', 'custom') DEFAULT 'seasonal',
    `status` ENUM('DRAFT', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED') DEFAULT 'DRAFT',
    `is_system` TINYINT(1) DEFAULT 0,
    `priority` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_theme_status` (`status`),
    INDEX `idx_theme_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `theme_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `theme_id` INT NOT NULL,
    `primary_color` VARCHAR(20) NOT NULL DEFAULT '#00B4D8',
    `secondary_color` VARCHAR(20) NOT NULL DEFAULT '#0A2540',
    `accent_color` VARCHAR(20) NOT NULL DEFAULT '#00F5D4',
    `bg_gradient_start` VARCHAR(20) NOT NULL DEFAULT '#F8FAFC',
    `bg_gradient_end` VARCHAR(20) NOT NULL DEFAULT '#F1F5F9',
    `surface_color` VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    `text_primary` VARCHAR(20) NOT NULL DEFAULT '#0F172A',
    `text_secondary` VARCHAR(20) NOT NULL DEFAULT '#475569',
    `text_muted` VARCHAR(20) NOT NULL DEFAULT '#94A3B8',
    `heading_color` VARCHAR(20) NOT NULL DEFAULT '#0F172A',
    `border_color` VARCHAR(20) NOT NULL DEFAULT '#E2E8F0',
    `button_bg` VARCHAR(20) NOT NULL DEFAULT '#00B4D8',
    `button_text` VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    `button_hover_bg` VARCHAR(20) NOT NULL DEFAULT '#0284C7',
    `particles_enabled` TINYINT(1) DEFAULT 1,
    `decorations_enabled` TINYINT(1) DEFAULT 1,
    `kash_flowers_enabled` TINYINT(1) DEFAULT 0,
    `diyas_enabled` TINYINT(1) DEFAULT 0,
    `snow_enabled` TINYINT(1) DEFAULT 0,
    `petals_enabled` TINYINT(1) DEFAULT 0,
    `rain_enabled` TINYINT(1) DEFAULT 0,
    `santa_enabled` TINYINT(1) DEFAULT 0,
    `chakra_enabled` TINYINT(1) DEFAULT 0,
    `animation_intensity` ENUM('subtle', 'balanced', 'vibrant') DEFAULT 'balanced',
    `animation_speed` FLOAT DEFAULT 1.0,
    `loading_duration_ms` INT DEFAULT 2000,
    FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `theme_content` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `theme_id` INT NOT NULL,
    `lang` VARCHAR(10) NOT NULL DEFAULT 'en',
    `announcement_badge` VARCHAR(80) NULL,
    `announcement_text` VARCHAR(255) NULL,
    `festival_greeting` VARCHAR(255) NULL,
    `hero_title` VARCHAR(200) NULL,
    `hero_subtitle` TEXT NULL,
    `hero_cta_text` VARCHAR(80) NULL,
    `hero_cta_link` VARCHAR(200) DEFAULT '/catalog',
    `product_badge` VARCHAR(60) NULL,
    `loading_greeting` VARCHAR(150) NULL,
    `loading_tagline` VARCHAR(200) NULL,
    `footer_message` VARCHAR(255) NULL,
    UNIQUE KEY `uk_theme_lang` (`theme_id`, `lang`),
    FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `theme_schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `theme_id` INT NOT NULL,
    `start_date` DATETIME NOT NULL,
    `end_date` DATETIME NOT NULL,
    `auto_activate` TINYINT(1) DEFAULT 1,
    `is_recurring_yearly` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_schedule_window` (`start_date`, `end_date`),
    FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
