-- NETRA UNNAYAN — Premium Optical & Eye Care E-commerce + Optical Shop Management System
-- Complete Production Database Schema

CREATE DATABASE IF NOT EXISTS `netra_unnayan_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `netra_unnayan_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. SETTINGS
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
    `setting_key` VARCHAR(100) PRIMARY KEY,
    `setting_value` TEXT NULL,
    `group_name` VARCHAR(50) DEFAULT 'general',
    `description` VARCHAR(255) NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. ADMIN ROLES
DROP TABLE IF EXISTS `admin_roles`;
CREATE TABLE `admin_roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(50) UNIQUE NOT NULL,
    `description` VARCHAR(255) NULL,
    `permissions` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. ADMINS
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT NOT NULL,
    `username` VARCHAR(80) UNIQUE NOT NULL,
    `email` VARCHAR(150) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `last_login_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`role_id`) REFERENCES `admin_roles`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. CUSTOMERS
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(150) UNIQUE NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_cust_phone` (`phone`),
    INDEX `idx_cust_email` (`email`)
) ENGINE=InnoDB;

-- 5. CUSTOMER ADDRESSES
DROP TABLE IF EXISTS `customer_addresses`;
CREATE TABLE `customer_addresses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `recipient_name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `address_line1` VARCHAR(255) NOT NULL,
    `address_line2` VARCHAR(255) NULL,
    `landmark` VARCHAR(150) NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `pincode` VARCHAR(10) NOT NULL,
    `address_type` ENUM('HOME', 'WORK', 'OTHER') DEFAULT 'HOME',
    `is_default` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. CUSTOMER PRESCRIPTIONS (Vault)
DROP TABLE IF EXISTS `customer_prescriptions`;
CREATE TABLE `customer_prescriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `label` VARCHAR(100) NOT NULL DEFAULT 'My Prescription',
    `doctor_name` VARCHAR(120) NULL,
    `clinic_name` VARCHAR(150) NULL,
    `prescription_date` DATE NULL,
    -- Right Eye (OD)
    `right_sph` DECIMAL(4,2) NULL,
    `right_cyl` DECIMAL(4,2) NULL,
    `right_axis` INT NULL,
    `right_add` DECIMAL(4,2) NULL,
    `right_pd` DECIMAL(4,1) NULL,
    -- Left Eye (OS)
    `left_sph` DECIMAL(4,2) NULL,
    `left_cyl` DECIMAL(4,2) NULL,
    `left_axis` INT NULL,
    `left_add` DECIMAL(4,2) NULL,
    `left_pd` DECIMAL(4,1) NULL,
    `single_pd` DECIMAL(4,1) NULL,
    `prescription_file_url` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. CATEGORIES
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) UNIQUE NOT NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(500) NULL,
    `banner_url` VARCHAR(500) NULL,
    `display_order` INT DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    `seo_title` VARCHAR(200) NULL,
    `seo_description` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 8. BRANDS
DROP TABLE IF EXISTS `brands`;
CREATE TABLE `brands` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) UNIQUE NOT NULL,
    `logo_url` VARCHAR(500) NULL,
    `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

-- 9. PRODUCTS
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT NOT NULL,
    `brand_id` INT NULL,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(220) UNIQUE NOT NULL,
    `sku` VARCHAR(60) UNIQUE NOT NULL,
    `barcode` VARCHAR(60) UNIQUE NOT NULL,
    `description` LONGTEXT NULL,
    `specifications` JSON NULL,
    `price` DECIMAL(10,2) NOT NULL,
    `discount_price` DECIMAL(10,2) NULL,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `low_stock_threshold` INT NOT NULL DEFAULT 5,
    -- Optical Sizing & Measurements
    `lens_width` INT NULL,        -- e.g. 52
    `bridge_width` INT NULL,      -- e.g. 18
    `temple_length` INT NULL,     -- e.g. 140
    `total_frame_width` INT NULL, -- e.g. 138
    `frame_size` ENUM('Small', 'Medium', 'Large', 'Extra Large') DEFAULT 'Medium',
    `frame_shape` VARCHAR(50) NULL, -- Aviator, Rectangle, Round, Wayfarer, Cat-Eye, Geometric, Square
    `frame_material` VARCHAR(80) NULL, -- Titanium, Acetate, Ultem, Stainless Steel, TR90, Metal
    `frame_color` VARCHAR(50) NULL,
    `gender` ENUM('Men', 'Women', 'Unisex', 'Kids') DEFAULT 'Unisex',
    `age_group` VARCHAR(30) DEFAULT 'Adult',
    -- Features & Flags
    `is_prescription_compatible` TINYINT(1) DEFAULT 1,
    `is_tryon_enabled` TINYINT(1) DEFAULT 0,
    `is_cod_allowed` TINYINT(1) DEFAULT 1,
    `is_online_payment_allowed` TINYINT(1) DEFAULT 1,
    `is_featured` TINYINT(1) DEFAULT 0,
    `is_new_arrival` TINYINT(1) DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    `seo_title` VARCHAR(255) NULL,
    `seo_description` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE SET NULL,
    INDEX `idx_prod_sku` (`sku`),
    INDEX `idx_prod_barcode` (`barcode`),
    INDEX `idx_prod_category` (`category_id`),
    INDEX `idx_prod_active` (`is_active`)
) ENGINE=InnoDB;

-- 10. PRODUCT IMAGES
DROP TABLE IF EXISTS `product_images`;
CREATE TABLE `product_images` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `view_type` ENUM('front', 'side', 'angled', 'lifestyle', 'detail') DEFAULT 'front',
    `display_order` INT DEFAULT 0,
    `is_primary` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. INVENTORY & TRANSACTIONS (Double-entry Ledger)
DROP TABLE IF EXISTS `inventory_transactions`;
CREATE TABLE `inventory_transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `transaction_type` ENUM('PURCHASE', 'MANUAL_ADD', 'MANUAL_REMOVE', 'ONLINE_SALE', 'OFFLINE_SALE', 'RETURN', 'EXCHANGE', 'DAMAGE', 'ADJUSTMENT') NOT NULL,
    `quantity` INT NOT NULL, -- Positive or negative
    `previous_quantity` INT NOT NULL,
    `new_quantity` INT NOT NULL,
    `reference_type` VARCHAR(50) NULL, -- 'ORDER', 'INVOICE', 'RETURN_REQ', 'MANUAL'
    `reference_id` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `created_by_admin_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL,
    INDEX `idx_inv_product` (`product_id`),
    INDEX `idx_inv_created` (`created_at`)
) ENGINE=InnoDB;

-- 12. ORDERS
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_number` VARCHAR(50) UNIQUE NOT NULL, -- NU-ORD-XXXXX
    `customer_id` INT NULL,
    `order_type` ENUM('ONLINE', 'POS_OFFLINE') DEFAULT 'ONLINE',
    `customer_name` VARCHAR(120) NOT NULL,
    `customer_email` VARCHAR(150) NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    -- Shipping Details
    `shipping_address_line1` VARCHAR(255) NULL,
    `shipping_address_line2` VARCHAR(255) NULL,
    `shipping_landmark` VARCHAR(150) NULL,
    `shipping_city` VARCHAR(100) NULL,
    `shipping_state` VARCHAR(100) NULL,
    `shipping_pincode` VARCHAR(10) NULL,
    -- Financials
    `subtotal` DECIMAL(10,2) NOT NULL,
    `discount_amount` DECIMAL(10,2) DEFAULT 0.00,
    `shipping_fee` DECIMAL(10,2) DEFAULT 0.00,
    `tax_amount` DECIMAL(10,2) DEFAULT 0.00,
    `total_amount` DECIMAL(10,2) NOT NULL,
    -- Payment
    `payment_mode` ENUM('COD', 'UPI', 'CARD', 'CASH') NOT NULL DEFAULT 'COD',
    `payment_status` ENUM('Pending', 'Payment Pending', 'Under Verification', 'Paid', 'Failed', 'Refund Initiated', 'Refunded') DEFAULT 'Pending',
    -- Order Status Timeline
    `order_status` ENUM(
        'Pending', 'Payment Pending', 'Payment Confirmed', 'Order Confirmed',
        'Prescription Review', 'Prescription Approved', 'Production',
        'Lens Cutting', 'Fitting', 'Quality Check',
        'Packed', 'Shipped', 'Out for Delivery', 'Delivered',
        'Cancelled', 'Return Requested', 'Return Approved', 'Replacement', 'Refund Pending', 'Refunded'
    ) DEFAULT 'Pending',
    `prescription_status` ENUM('Not Required', 'Pending Review', 'Verified', 'Needs Clarification', 'Approved', 'Production Started', 'Completed') DEFAULT 'Not Required',
    `can_cancel_until` DATETIME NULL,
    `cancelled_at` DATETIME NULL,
    `cancel_reason` TEXT NULL,
    `is_offline_bill` TINYINT(1) DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
    INDEX `idx_order_number` (`order_number`),
    INDEX `idx_order_status` (`order_status`),
    INDEX `idx_order_customer` (`customer_id`)
) ENGINE=InnoDB;

-- 13. ORDER ITEMS
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `product_name` VARCHAR(200) NOT NULL,
    `product_sku` VARCHAR(60) NOT NULL,
    `unit_price` DECIMAL(10,2) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `lens_type` VARCHAR(100) NULL,
    `lens_price` DECIMAL(10,2) DEFAULT 0.00,
    `total_price` DECIMAL(10,2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 14. ORDER PRESCRIPTIONS
DROP TABLE IF EXISTS `order_prescriptions`;
CREATE TABLE `order_prescriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `order_item_id` INT NULL,
    `submission_method` ENUM('FORM', 'IMAGE_UPLOAD', 'WHATSAPP', 'SAVED_PROFILE') DEFAULT 'FORM',
    -- Right Eye
    `right_sph` DECIMAL(4,2) NULL,
    `right_cyl` DECIMAL(4,2) NULL,
    `right_axis` INT NULL,
    `right_add` DECIMAL(4,2) NULL,
    `right_pd` DECIMAL(4,1) NULL,
    -- Left Eye
    `left_sph` DECIMAL(4,2) NULL,
    `left_cyl` DECIMAL(4,2) NULL,
    `left_axis` INT NULL,
    `left_add` DECIMAL(4,2) NULL,
    `left_pd` DECIMAL(4,1) NULL,
    `single_pd` DECIMAL(4,1) NULL,
    `rx_image_url` VARCHAR(500) NULL,
    `status` ENUM('Pending Review', 'Verified', 'Needs Clarification', 'Approved', 'Production Started', 'Completed') DEFAULT 'Pending Review',
    `admin_notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 15. ORDER STATUS HISTORY
DROP TABLE IF EXISTS `order_status_history`;
CREATE TABLE `order_status_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `old_status` VARCHAR(50) NOT NULL,
    `new_status` VARCHAR(50) NOT NULL,
    `note` TEXT NULL,
    `updated_by_admin_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 16. PAYMENTS
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `payment_number` VARCHAR(60) UNIQUE NOT NULL, -- NU-PAY-XXXXX
    `amount` DECIMAL(10,2) NOT NULL,
    `payment_mode` ENUM('UPI', 'COD', 'CASH', 'CARD') NOT NULL,
    `payment_provider` VARCHAR(50) DEFAULT 'MANUAL_UPI',
    `gateway_transaction_id` VARCHAR(150) NULL,
    `upi_utr` VARCHAR(100) NULL,
    `payment_proof_url` VARCHAR(500) NULL,
    `status` ENUM('Pending', 'Under Verification', 'Paid', 'Failed', 'Refund Initiated', 'Refunded') DEFAULT 'Pending',
    `verified_by_admin_id` INT NULL,
    `verified_at` DATETIME NULL,
    `failure_reason` VARCHAR(255) NULL,
    `payload` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`verified_by_admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL,
    INDEX `idx_pay_utr` (`upi_utr`)
) ENGINE=InnoDB;

-- 17. REFUNDS
DROP TABLE IF EXISTS `refunds`;
CREATE TABLE `refunds` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `payment_id` INT NULL,
    `refund_number` VARCHAR(60) UNIQUE NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('Pending', 'Approved', 'Processing', 'Completed', 'Failed') DEFAULT 'Pending',
    `approved_by_admin_id` INT NULL,
    `transaction_reference` VARCHAR(150) NULL,
    `processed_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`approved_by_admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 18. INVOICES
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `invoice_number` VARCHAR(60) UNIQUE NOT NULL, -- NU-INV-XXXXX
    `order_id` INT NOT NULL,
    `invoice_type` ENUM('OFFLINE_POS', 'ONLINE_STORE') NOT NULL,
    `invoice_date` DATE NOT NULL,
    `customer_name` VARCHAR(120) NOT NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    `customer_address` TEXT NULL,
    `subtotal` DECIMAL(10,2) NOT NULL,
    `tax_amount` DECIMAL(10,2) DEFAULT 0.00,
    `discount_amount` DECIMAL(10,2) DEFAULT 0.00,
    `total_amount` DECIMAL(10,2) NOT NULL,
    `payment_mode` VARCHAR(50) NOT NULL,
    `payment_status` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 19. DOCTORS
DROP TABLE IF EXISTS `doctors`;
CREATE TABLE `doctors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `qualification` VARCHAR(150) NOT NULL, -- e.g. MBBS, MS (Ophthalmology), DO
    `specialization` VARCHAR(150) NOT NULL, -- Pediatric Optometry, Retina, Cornea & Refractive
    `experience_years` INT NOT NULL DEFAULT 5,
    `reg_number` VARCHAR(80) NULL,
    `photo_url` VARCHAR(500) NULL,
    `bio` TEXT NULL,
    `consultation_fee` DECIMAL(10,2) NOT NULL DEFAULT 400.00,
    `available_days` VARCHAR(150) DEFAULT 'Monday, Wednesday, Friday, Saturday',
    `available_time_start` TIME DEFAULT '10:00:00',
    `available_time_end` TIME DEFAULT '18:00:00',
    `slot_duration_minutes` INT DEFAULT 20,
    `max_daily_patients` INT DEFAULT 25,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 20. DOCTOR APPOINTMENTS
DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `appointment_number` VARCHAR(50) UNIQUE NOT NULL, -- NU-APT-XXXXX
    `doctor_id` INT NOT NULL,
    `customer_id` INT NULL,
    `patient_name` VARCHAR(120) NOT NULL,
    `patient_phone` VARCHAR(20) NOT NULL,
    `patient_email` VARCHAR(150) NULL,
    `appointment_date` DATE NOT NULL,
    `appointment_time` TIME NOT NULL,
    `consultation_fee` DECIMAL(10,2) NOT NULL,
    `payment_status` ENUM('Pending', 'Paid', 'Pay at Clinic') DEFAULT 'Pay at Clinic',
    `status` ENUM('Requested', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled', 'No Show') DEFAULT 'Requested',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `uk_doc_slot` (`doctor_id`, `appointment_date`, `appointment_time`),
    INDEX `idx_apt_date` (`appointment_date`)
) ENGINE=InnoDB;

-- 21. HOME EYE SERVICES & BOOKINGS
DROP TABLE IF EXISTS `home_eye_services`;
CREATE TABLE `home_eye_services` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `service_name` VARCHAR(150) NOT NULL DEFAULT 'Comprehensive Home Eye Checkup',
    `base_fee` DECIMAL(10,2) NOT NULL DEFAULT 299.00,
    `service_pincodes` JSON NULL,
    `max_daily_slots` INT DEFAULT 8,
    `slot_duration_minutes` INT DEFAULT 45,
    `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `home_eye_appointments`;
CREATE TABLE `home_eye_appointments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_number` VARCHAR(50) UNIQUE NOT NULL, -- NU-HET-XXXXX
    `customer_id` INT NULL,
    `customer_name` VARCHAR(120) NOT NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    `customer_email` VARCHAR(150) NULL,
    `address_line1` VARCHAR(255) NOT NULL,
    `address_line2` VARCHAR(255) NULL,
    `landmark` VARCHAR(150) NULL,
    `pincode` VARCHAR(10) NOT NULL,
    `service_date` DATE NOT NULL,
    `service_slot` VARCHAR(50) NOT NULL, -- e.g. "10:00 AM - 12:00 PM"
    `service_fee` DECIMAL(10,2) NOT NULL DEFAULT 299.00,
    `payment_status` ENUM('Pending', 'Paid', 'Pay on Visit') DEFAULT 'Pay on Visit',
    `status` ENUM('Requested', 'Confirmed', 'Assigned', 'On The Way', 'Completed', 'Cancelled', 'Rescheduled', 'Refund Pending', 'Refunded') DEFAULT 'Requested',
    `assigned_optometrist` VARCHAR(120) NULL,
    `notes` TEXT NULL,
    `can_cancel_until` DATETIME NULL,
    `cancelled_at` DATETIME NULL,
    `cancel_reason` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
    INDEX `idx_het_date` (`service_date`)
) ENGINE=InnoDB;

-- 22. DOCTOR POSTERS
DROP TABLE IF EXISTS `doctor_posters`;
CREATE TABLE `doctor_posters` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `doctor_id` INT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `tagline` VARCHAR(255) DEFAULT 'Advanced Eye Examination & Care',
    `template_style` VARCHAR(50) DEFAULT 'luxury_navy_cyan',
    `headline` VARCHAR(255) NOT NULL,
    `dates_text` VARCHAR(255) NOT NULL,
    `venue_text` VARCHAR(255) DEFAULT 'Netra Unnayan, Digha Bypass Rd, Jatimati, Digha',
    `contact_phone` VARCHAR(50) DEFAULT '9382293614',
    `is_published` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 23. RETURNS & EXCHANGES
DROP TABLE IF EXISTS `returns`;
CREATE TABLE `returns` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `return_number` VARCHAR(60) UNIQUE NOT NULL,
    `order_id` INT NOT NULL,
    `customer_id` INT NOT NULL,
    `return_type` ENUM('FRAME_EXCHANGE', 'DEFECT_REPLACEMENT') NOT NULL,
    `reason` TEXT NOT NULL,
    `photos` JSON NULL,
    `status` ENUM('Requested', 'Approved', 'Rejected', 'Item Received', 'Completed') DEFAULT 'Requested',
    `admin_notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 24. COUPONS
DROP TABLE IF EXISTS `coupons`;
CREATE TABLE `coupons` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) UNIQUE NOT NULL,
    `discount_type` ENUM('PERCENTAGE', 'FIXED') NOT NULL,
    `discount_value` DECIMAL(10,2) NOT NULL,
    `min_order_amount` DECIMAL(10,2) DEFAULT 0.00,
    `max_discount` DECIMAL(10,2) NULL,
    `valid_from` DATE NOT NULL,
    `valid_until` DATE NOT NULL,
    `usage_limit` INT DEFAULT 100,
    `times_used` INT DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 25. AUDIT LOGS
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `admin_id` INT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(100) NOT NULL,
    `details` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL,
    INDEX `idx_audit_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB;

-- 26. PASSWORD RESETS
DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE `password_resets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(150) NOT NULL,
    `otp` VARCHAR(10) NOT NULL,
    `token` VARCHAR(100) NULL,
    `expires_at` DATETIME NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_reset_email` (`email`),
    INDEX `idx_reset_otp` (`otp`),
    INDEX `idx_reset_token` (`token`)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
