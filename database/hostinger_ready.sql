-- ========================================================
-- NETRA UNNAYAN — All-in-One Hostinger Production Database
-- Schema + Initial Seed Data + Latest Migrations
-- Import this single file in Hostinger phpMyAdmin
-- ========================================================

-- NETRA UNNAYAN — Premium Optical & Eye Care E-commerce + Optical Shop Management System
-- Complete Production Database Schema


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

SET FOREIGN_KEY_CHECKS = 1;


-- ========================================================
-- INITIAL SEED & DEMO DATA
-- ========================================================

-- NETRA UNNAYAN — Realistic Seed Data

-- 1. SETTINGS
INSERT INTO `settings` (`setting_key`, `setting_value`, `group_name`, `description`) VALUES
('business_name', 'Netra Unnayan', 'general', 'Business Brand Name'),
('tagline', 'Clarity You Can Trust', 'general', 'Official Tagline'),
('business_address', 'Digha Bypass Rd, Jatimati, Digha, West Bengal 721428', 'general', 'Physical Store & Clinic Address'),
('contact_phone', '9382293614', 'general', 'Official Phone & WhatsApp Number'),
('contact_email', 'netraunnayan7@gmail.com', 'general', 'Customer Care Email'),
('google_maps_url', 'https://maps.app.goo.gl/TBLLEac73RdPyqLq6?g_st=ac', 'general', 'Google Maps Location Link'),
('upi_id', '9382293614@upi', 'payment', 'Primary UPI Merchant VPA'),
('upi_merchant_name', 'NETRA UNNAYAN OPTICALS', 'payment', 'UPI Payee Display Name'),
('cod_enabled', '1', 'payment', 'Cash on Delivery Enabled'),
('online_payment_enabled', '1', 'payment', 'Online UPI & Gateway Enabled'),
('free_shipping_threshold', '999.00', 'shipping', 'Free Shipping Minimum Order Amount'),
('standard_shipping_fee', '70.00', 'shipping', 'Standard Shipping Charge'),
('home_eye_checkup_fee', '299.00', 'services', 'Standard Home Eye Checkup Fee'),
('cancellation_cutoff_hours', '12', 'policy', 'Max hours to cancel optical frame orders before production'),
('home_visit_cancellation_cutoff_hours', '2', 'policy', 'Cutoff hours before visit slot for customer cancellation'),
('return_window_days', '7', 'policy', 'Days allowed for frame exchange or manufacturing defect report'),
('low_stock_global_threshold', '5', 'inventory', 'Stock level triggering low inventory warning');

-- 2. ADMIN ROLES
INSERT INTO `admin_roles` (`id`, `name`, `slug`, `description`, `permissions`) VALUES
(1, 'Super Admin', 'super_admin', 'Full system control, financial logs, role management, settings', '["*"]'),
(2, 'Store Manager', 'manager', 'Catalog, inventory, orders, customer care, appointments', '["orders.*", "products.*", "inventory.*", "appointments.*", "pos.*"]'),
(3, 'Billing Staff', 'billing_staff', 'Offline POS counter billing, receipt printing, customer walk-in registration', '["pos.*", "invoices.read", "orders.read"]'),
(4, 'Inventory Staff', 'inventory_staff', 'Product stock intake, barcode printing, QR printing, stock audit', '["products.*", "inventory.*", "barcodes.*"]'),
(5, 'Appointment Desk', 'appointment_desk', 'Eye doctor clinic appointments and Home Eye Checkup dispatching', '["appointments.*", "home_visits.*", "doctors.*"]');

-- 3. ADMINS
-- Passwords:
-- admin / admin123 ($2y$10$4amYquQoEI0wMnPmadv9J.reAlDcuTvk6ovoMHVsRhKpECZCO9xrq)
-- billing / billing123
INSERT INTO `admins` (`id`, `role_id`, `username`, `email`, `password_hash`, `full_name`, `phone`, `is_active`) VALUES
(1, 1, 'admin', 'admin@netraunnayan.com', '$2y$10$4amYquQoEI0wMnPmadv9J.reAlDcuTvk6ovoMHVsRhKpECZCO9xrq', 'Dr. S. K. Mahapatra (Super Admin)', '9382293614', 1),
(2, 3, 'billing', 'billing@netraunnayan.com', '$2y$10$4amYquQoEI0wMnPmadv9J.reAlDcuTvk6ovoMHVsRhKpECZCO9xrq', 'Subrata Das (POS Desk)', '9382293615', 1),
(3, 5, 'desk', 'desk@netraunnayan.com', '$2y$10$4amYquQoEI0wMnPmadv9J.reAlDcuTvk6ovoMHVsRhKpECZCO9xrq', 'Ananya Roy (Appointment Coordinator)', '9382293616', 1);

-- 4. CUSTOMERS
-- Passwords: customer123 ($2y$10$70D2.XOZROXgFJLiCk66AutuI99sL0C2cpoFkpz4xd3PfpvfATjPu)
INSERT INTO `customers` (`id`, `full_name`, `email`, `phone`, `password_hash`, `is_active`) VALUES
(1, 'Rahul Sen', 'rahul.sen@example.com', '9830123456', '$2y$10$70D2.XOZROXgFJLiCk66AutuI99sL0C2cpoFkpz4xd3PfpvfATjPu', 1),
(2, 'Priya Das', 'priya.das@example.com', '9831987654', '$2y$10$70D2.XOZROXgFJLiCk66AutuI99sL0C2cpoFkpz4xd3PfpvfATjPu', 1),
(3, 'Amitava Ghosh', 'amitava.g@example.com', '9434112233', '$2y$10$70D2.XOZROXgFJLiCk66AutuI99sL0C2cpoFkpz4xd3PfpvfATjPu', 1);

-- 5. CUSTOMER ADDRESSES
INSERT INTO `customer_addresses` (`id`, `customer_id`, `recipient_name`, `phone`, `address_line1`, `address_line2`, `landmark`, `city`, `state`, `pincode`, `address_type`, `is_default`) VALUES
(1, 1, 'Rahul Sen', '9830123456', 'Flat 4B, Sagarika Enclave', 'New Digha Road', 'Near Sea Beach Market', 'Digha', 'West Bengal', '721463', 'HOME', 1),
(2, 2, 'Priya Das', '9831987654', 'Ho
-- 6. CUSTOMER PRESCRIPTIONS
INSERT INTO `customer_prescriptions` (`id`, `customer_id`, `label`, `doctor_name`, `clinic_name`, `prescription_date`, `right_sph`, `right_cyl`, `right_axis`, `right_add`, `right_pd`, `left_sph`, `left_cyl`, `left_axis`, `left_add`, `left_pd`, `single_pd`, `notes`) VALUES
(1, 1, 'Work & Screen Prescription', 'Dr. Arindam Banerjee', 'Netra Unnayan Eye Clinic', '2026-08-15', -1.50, -0.50, 90, 0.00, 31.5, -1.25, -0.75, 85, 0.00, 31.0, 62.5, 'Blue cut lenses recommended for daily computer use.'),
(2, 2, 'Bifocal Reading Power', 'Dr. Sneha Mukherjee', 'Digha Lions Eye Hospital', '2026-07-20', +1.00, 0.00, 0, +1.75, 30.5, +1.25, 0.00, 0, +1.75, 30.5, 61.0, 'Progressive or bifocal lens advised for reading and driving.');

-- 7. CATEGORIES
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `image_url`, `banner_url`, `display_order`, `is_active`, `seo_title`, `seo_description`) VALUES
(1, 'Eyeglasses', 'eyeglasses', 'Precision engineered prescription eyewear designed for comfort and crystal clarity.', 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=1600&auto=format&fit=crop&q=80', 1, 1, 'Eyeglasses & Prescription Frames | Netra Unnayan', 'Explore premium prescription frames and eyeglasses with customized German optical lenses at Netra Unnayan.'),
(2, 'Sunglasses', 'sunglasses', '100% UV400 and Polarized protection with handcrafted optical-grade frames.', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=1600&auto=format&fit=crop&q=80', 2, 1, 'Designer Polarized Sunglasses | Netra Unnayan', 'UV400 polarized luxury sunglasses crafted for optimal sun protection and coastal glare reduction.'),
(3, 'Computer Glasses', 'computer-glasses', 'Advanced blue-light filter lenses designed to eliminate eye fatigue from screens.', 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=1600&auto=format&fit=crop&q=80', 3, 1, 'Anti-Glare Computer Glasses | Netra Unnayan', 'Shield your eyes from digital blue light. Zero eye strain for developers, designers, and office pros.'),
(4, 'Blue Light Glasses', 'blue-light-glasses', 'High-index zero-power and prescription lenses blocking 98% harmful HEV spectrum.', 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80', NULL, 4, 1, 'Blue Light Shield Eyewear | Netra Unnayan', 'HEV blue light blocking eyewear engineered with anti-reflective hydrophobic coating.'),
(5, 'Reading Glasses', 'reading-glasses', 'Lightweight, ergonomic reading glasses available in +0.75 to +3.50 diopters.', 'https://images.unsplash.com/photo-1509695503492-412db9d28266?w=800&auto=format&fit=crop&q=80', NULL, 5, 1, 'Ergonomic Reading Glasses | Netra Unnayan', 'Effortless reading with distortion-free aspheric magnification lenses.'),
(6, 'Kids Eyewear', 'kids-glasses', 'Unbreakable TR90 flexible frames designed to withstand playful everyday activities.', 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&auto=format&fit=crop&q=80', NULL, 6, 1, 'Flexible Kids Eyeglasses | Netra Unnayan', 'Durable, shatterproof, pediatric-approved frames made with hypoallergenic materials.'),
(7, 'Premium Titanium', 'premium-frames', 'Aerospace-grade titanium frames weighing under 12 grams with zero corrosion.', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80', NULL, 7, 1, 'Pure Titanium Luxury Frames | Netra Unnayan', 'Ultra-featherweight titanium optical frames engineered for executive style and lifelong durability.');

-- 8. BRANDS
INSERT INTO `brands` (`id`, `name`, `slug`, `logo_url`, `is_active`) VALUES
(1, 'Netra Signature', 'netra-signature', '/public_assets/logo_symbol.png', 1),
(2, 'Lumina Optical Labs', 'lumina-optical-labs', NULL, 1),
(3, 'Titanium Pure', 'titanium-pure', NULL, 1),
(4, 'AeroVision Tech', 'aerovision-tech', NULL, 1);

-- 9. PRODUCTS (12 Diverse Products covering all categories, frame shapes, sizes)
INSERT INTO `products` (
    `id`, `category_id`, `brand_id`, `name`, `slug`, `sku`, `barcode`, `description`, `specifications`,
    `price`, `discount_price`, `stock_quantity`, `low_stock_threshold`,
    `lens_width`, `bridge_width`, `temple_length`, `total_frame_width`, `frame_size`, `frame_shape`, `frame_material`, `frame_color`, `gender`,
    `is_prescription_compatible`, `is_tryon_enabled`, `is_featured`, `is_new_arrival`, `is_active`
) VALUES
(
    1, 1, 1, 'Netra Apex Matte Navy Titanium', 'netra-apex-matte-navy-titanium', 'NU-FRM-00101', 'NU00101890',
    'Handcrafted from aerospace-grade Japanese beta-titanium, the Apex offers featherlight all-day comfort. Features spring flex hinges and a deep sapphire navy finish matching the Netra signature palette.',
    '{"Weight": "11.2g", "Hinges": "German OBE Spring Hinges", "Nosepads": "Hypoallergenic Medical Silicone", "Warranty": "2 Years", "Coating": "Anti-Corrosion Vacuum PVD"}',
    3499.00, 2799.00, 18, 4,
    52, 18, 140, 138, 'Medium', 'Rectangle', 'Titanium', 'Midnight Navy', 'Unisex',
    1, 1, 1, 1, 1
),
(
    2, 3, 1, 'Netra ClearPro Computer BlueShield', 'netra-clearpro-computer-blueshield', 'NU-FRM-00102', 'NU00102891',
    'Engineered for long desk hours, ClearPro eliminates digital eye strain and headache with 420nm blue-light filtration and crystal-clear high index AR coating.',
    '{"Lens Tech": "BluZero Anti-Glare + HEV Filter", "Weight": "14.5g", "Hinges": "Integrated Rivet Hinges", "Warranty": "1 Year", "Blue Block": "Up to 98% harmful spectrum"}',
    1999.00, 1499.00, 24, 5,
    50, 19, 142, 136, 'Medium', 'Round', 'Acetate', 'Crystal Frost & Rose Gold', 'Unisex',
    1, 1, 1, 0, 1
),
(
    3, 2, 1, 'Digha Coastline Aviator Polarized', 'digha-coastline-aviator-polarized', 'NU-FRM-00103', 'NU00103892',
    'Designed specifically for coastal glare reduction. Precision TAC 9-layer polarized lenses with hydrophobic sea-salt resistant coating and classic pilot geometry.',
    '{"Lens Protection": "UV400 Cat. 3 Polarized", "Frame Material": "Monel Metal + Acetate Tips", "Weight": "22g", "Water Repellent": "Yes (Hydrophobic Nano-layer)"}',
    2899.00, 2299.00, 12, 3,
    58, 14, 145, 142, 'Large', 'Aviator', 'Metal', 'Gunmetal with Emerald Green Tint', 'Men',
    0, 1, 1, 1, 1
),
(
    4, 1, 2, 'Lumina Sleek Geometric Hex', 'lumina-sleek-geometric-hex', 'NU-FRM-00104', 'NU00104893',
    'Modern polygonal rimless-look optical frame. Extremely lightweight with subtle geometric angles that accentuate cheekbones and provide expansive peripheral vision.',
    '{"Frame Style": "Octagonal / Hex Geometric", "Weight": "12.8g", "Nosepad": "Floating Air Cushioned", "Warranty": "1 Year"}',
    2499.00, 1899.00, 15, 4,
    51, 19, 140, 137, 'Medium', 'Geometric', 'Stainless Steel', 'Brushed Gold', 'Women',
    1, 1, 1, 0, 1
),
(
    5, 5, 2, 'Lumina FlexRead Ergonomic Reading', 'lumina-flexread-ergonomic-reading', 'NU-FRM-00105', 'NU00105894',
    'Compact folding reading glasses built with Swiss TR90 memory polymer. Fits into a slim protective sleeve for effortless travel and pocket carry.',
    '{"Power Range": "+1.00 to +3.50", "Weight": "9.8g", "Mechanism": "360-degree rotating temples", "Includes": "Aluminum Travel Case"}',
    1299.00, 999.00, 30, 8,
    48, 17, 138, 130, 'Small', 'Rectangle', 'TR90', 'Onyx Black', 'Unisex',
    1, 0, 0, 0, 1
),
(
    6, 6, 4, 'AeroVision Kids SafeFlex Explorer', 'aerovision-kids-safeflex-explorer', 'NU-FRM-00106', 'NU00106895',
    'Virtually indestructible pediatric optical frame. Zero metal screws, 100% medical grade elastic silicone with detachable sports strap for school and sports.',
    '{"Safety": "FDA Approved Hypoallergenic Food-grade Silicone", "Age Group": "5 - 12 Years", "Drop Resistance": "Drop-tested up to 3m", "Weight": "13g"}',
    1499.00, 1199.00, 20, 5,
    46, 16, 128, 122, 'Small', 'Square', 'Silicone TR90', 'Electric Blue & Neon Cyan', 'Kids',
    1, 0, 1, 0, 1
),
(
    7, 7, 3, 'Titanium Pure Sovereign Rimless', 'titanium-pure-sovereign-rimless', 'NU-FRM-00107', 'NU00107896',
    'The pinnacle of executive minimalism. Ultra-pure seamless rimless construction with high-tensile three-piece titanium mounting. Barely felt on the face.',
    '{"Weight": "7.9g (Frame Only)", "Material": "Grade 5 Japanese Beta-Titanium", "Mounting": "Compression Bushing (Screwless)", "Warranty": "3 Years"}',
    4999.00, 4299.00, 7, 2,
    53, 17, 142, 137, 'Medium', 'Rectangle', 'Titanium', 'Polished Silver', 'Unisex',
    1, 0, 1, 1, 1
),
(
    8, 2, 1, 'Netra Riviera Cat-Eye Glamour', 'netra-riviera-cat-eye-glamour', 'NU-FRM-00108', 'NU00108897',
    'Bold Italian acetate with upward feline contours, polished beveled rims, and gradient smoke brown polarized lenses with 100% UV400 defense.',
    '{"Lens Category": "Cat 3 Polarized Gradient", "Acetate Origin": "Mazzucchelli Italy", "Hinge": "5-barrel Core-wire Hinge", "Weight": "26g"}',
    3199.00, 2499.00, 10, 3,
    54, 18, 142, 140, 'Medium', 'Cat-Eye', 'Acetate', 'Tortoise Shell & Amber', 'Women',
    0, 1, 0, 1, 1
),
(
    9, 1, 1, 'Netra Vintage Club Classic', 'netra-vintage-club-classic', 'NU-FRM-00109', 'NU00109898',
    'Timeless browline aesthetic blending polished ebony acetate brow arches with filigree metal lower rims. A distinguished look for academic and corporate meetings.',
    '{"Style": "Browline / Clubmaster", "Hinges": "Reinforced 7-barrel", "Weight": "19g", "Warranty": "2 Years"}',
    2799.00, 2199.00, 14, 4,
    51, 20, 145, 139, 'Medium', 'Square', 'Acetate & Metal', 'Ebony & Gold', 'Men',
    1, 1, 0, 0, 1
),
(
    10, 4, 2, 'Lumina BlueGuard Air Round', 'lumina-blueguard-air-round', 'NU-FRM-00110', 'NU00110899',
    'Ultra-thin circular rim wire crafted from flexible memory steel. Perfectly balances casual artistic flair with cutting-edge HEV screen protection.',
    '{"Lens": "BlueGuard 1.56 Aspheric Zero Power / Rx Compatible", "Frame Weight": "10.4g", "Shape": "Panto Round"}',
    1899.00, 1399.00, 22, 5,
    49, 20, 140, 134, 'Small', 'Round', 'Stainless Steel', 'Rose Gold', 'Women',
    1, 1, 1, 1, 1
),
(
    11, 1, 3, 'Titanium Pure Commander Wayfarer', 'titanium-pure-commander-wayfarer', 'NU-FRM-00111', 'NU00111900',
    'A robust, confident wayfarer silhouette redesigned with lightweight titanium core and reinforced bridge. Built for everyday rugged dependability.',
    '{"Frame Width": "144mm", "Bridge": "Keyhole bridge design", "Weight": "16.8g", "Warranty": "2 Years"}',
    3699.00, 2999.00, 9, 3,
    55, 18, 148, 144, 'Large', 'Wayfarer', 'Titanium & Acetate', 'Matte Carbon Black', 'Men',
    1, 1, 0, 0, 1
),
(
    12, 3, 1, 'Netra WorkStation Pro Ergonomic', 'netra-workstation-pro-ergonomic', 'NU-FRM-00112', 'NU00112901',
    'Specially calibrated for dual-monitor setups with broad vertical lens height for natural posture and wide panoramic blue-cut focal corridor.',
    '{"Lens Height": "42mm (Expanded Field)", "Weight": "15g", "Nosepads": "Contoured Gel", "Blue Shield": "Yes"}',
    2199.00, 1699.00, 16, 4,
    53, 18, 142, 138, 'Medium', 'Rectangle', 'Ultem', 'Smoky Translucent Grey', 'Unisex',
    1, 1, 0, 1, 1
);

-- 10. PRODUCT IMAGES (Curated high quality optical frame angles for each product)
INSERT INTO `product_images` (`product_id`, `image_url`, `view_type`, `display_order`, `is_primary`) VALUES
-- Product 1: Netra Apex Titanium (4 Views)
(1, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(1, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80', 'side', 2, 0),
(1, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80', 'angled', 3, 0),
(1, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&auto=format&fit=crop&q=80', 'lifestyle', 4, 0),

-- Product 2: Netra ClearPro (4 Views)
(2, 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(2, 'https://images.unsplash.com/photo-1509695503492-412db9d28266?w=800&auto=format&fit=crop&q=80', 'side', 2, 0),
(2, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80', 'angled', 3, 0),
(2, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80', 'lifestyle', 4, 0),

-- Product 3: Digha Aviator (4 Views)
(3, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(3, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&auto=format&fit=crop&q=80', 'lifestyle', 2, 0),
(3, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&auto=format&fit=crop&q=80', 'angled', 3, 0),
(3, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80', 'side', 4, 0),

-- Product 4: Lumina Hex (3 Views)
(4, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(4, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80', 'side', 2, 0),
(4, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80', 'lifestyle', 3, 0),

-- Product 5: FlexRead (3 Views)
(5, 'https://images.unsplash.com/photo-1509695503492-412db9d28266?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(5, 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&auto=format&fit=crop&q=80', 'side', 2, 0),
(5, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80', 'lifestyle', 3, 0),

-- Product 6: Kids SafeFlex (3 Views)
(6, 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(6, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&auto=format&fit=crop&q=80', 'side', 2, 0),
(6, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80', 'lifestyle', 3, 0),

-- Product 7: Sovereign Rimless (3 Views)
(7, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(7, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80', 'side', 2, 0),
(7, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80', 'lifestyle', 3, 0),

-- Product 8: Riviera Cat-Eye (3 Views)
(8, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(8, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&auto=format&fit=crop&q=80', 'lifestyle', 2, 0),
(8, 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&auto=format&fit=crop&q=80', 'angled', 3, 0),

-- Product 9: Vintage Club (3 Views)
(9, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(9, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80', 'side', 2, 0),
(9, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&auto=format&fit=crop&q=80', 'lifestyle', 3, 0),

-- Product 10: BlueGuard Air Round (3 Views)
(10, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(10, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80', 'angled', 2, 0),
(10, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80', 'side', 3, 0),

-- Product 11: Commander Wayfarer (3 Views)
(11, 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(11, 'https://images.unsplash.com/photo-1509695503492-412db9d28266?w=800&auto=format&fit=crop&q=80', 'side', 2, 0),
(11, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80', 'lifestyle', 3, 0),

-- Product 12: WorkStation Pro (3 Views)
(12, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80', 'front', 1, 1),
(12, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80', 'side', 2, 0),
(12, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80', 'lifestyle', 3, 0);

-- 11. INVENTORY INITIAL TRANSACTIONS (Audit Ledger)
INSERT INTO `inventory_transactions` (`product_id`, `transaction_type`, `quantity`, `previous_quantity`, `new_quantity`, `reference_type`, `reference_id`, `notes`, `created_by_admin_id`)
SELECT id, 'PURCHASE', stock_quantity, 0, stock_quantity, 'INITIAL_SEED', 'BATCH-2026-001', 'Initial opening stock intake for Netra Unnayan store launch', 1
FROM `products`;

-- 12. DOCTORS (Real Eye Specialists for Digha Clinic)
INSERT INTO `doctors` (`id`, `name`, `qualification`, `specialization`, `experience_years`, `reg_number`, `photo_url`, `bio`, `consultation_fee`, `available_days`, `available_time_start`, `available_time_end`, `slot_duration_minutes`, `max_daily_patients`, `is_active`) VALUES
(
    1, 'Dr. Arindam Banerjee', 'MBBS, MS (Ophthalmology), FICO (UK)',
    'Senior Eye Surgeon & Cataract Specialist', 16, 'WBMC-62419',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&auto=format&fit=crop&q=80',
    'Renowned ophthalmic surgeon with over 16 years of clinical expertise in micro-incision phacoemulsification, glaucoma management, and advanced refractive laser corrections. Trained at premier medical institutions in Kolkata and London.',
    500.00, 'Monday, Wednesday, Friday, Saturday', '10:00:00', '18:00:00', 20, 24, 1
),
(
    2, 'Dr. Sneha Mukherjee', 'DO, DNB (Ophthalmology), Fellow Pediatric Optometry',
    'Pediatric Ophthalmology & Cornea Consultant', 11, 'WBMC-78104',
    'https://images.unsplash.com/photo-1594824813500-2f3b97b003a2?w=800&auto=format&fit=crop&q=80',
    'Dedicated specialist in childhood refractive errors, amblyopia (lazy eye therapy), keratoconus management, and specialty contact lens fittings. Committed to accessible, gentle eye care for families across Purba Medinipur.',
    400.00, 'Tuesday, Thursday, Sunday', '11:00:00', '19:00:00', 20, 20, 1
);

-- 13. HOME EYE SERVICE CONFIGURATION
INSERT INTO `home_eye_services` (`id`, `service_name`, `base_fee`, `service_pincodes`, `max_daily_slots`, `slot_duration_minutes`, `is_active`) VALUES
(1, 'Netra Unnayan Comprehensive Home Eye Test', 299.00, '["721428", "721463", "721401", "721420", "721430"]', 8, 45, 1);

-- 14. COUPONS
INSERT INTO `coupons` (`id`, `code`, `discount_type`, `discount_value`, `min_order_amount`, `max_discount`, `valid_from`, `valid_until`, `usage_limit`, `times_used`, `is_active`) VALUES
(1, 'CLARITY10', 'PERCENTAGE', 10.00, 1499.00, 500.00, '2026-01-01', '2027-12-31', 500, 12, 1),
(2, 'NETRA500', 'FIXED', 500.00, 2999.00, 500.00, '2026-01-01', '2027-12-31', 200, 8, 1);

-- 15. SAMPLE ORDERS & INVOICES (Demonstrating timeline & POS sales)
INSERT INTO `orders` (
    `id`, `order_number`, `customer_id`, `order_type`, `customer_name`, `customer_email`, `customer_phone`,
    `shipping_address_line1`, `shipping_city`, `shipping_state`, `shipping_pincode`,
    `subtotal`, `discount_amount`, `shipping_fee`, `tax_amount`, `total_amount`,
    `payment_mode`, `payment_status`, `order_status`, `prescription_status`,
    `can_cancel_until`, `is_offline_bill`, `created_at`
) VALUES
(
    1, 'NU-ORD-88210', 1, 'ONLINE', 'Rahul Sen', 'rahul.sen@example.com', '9830123456',
    'Flat 4B, Sagarika Enclave, New Digha Road', 'Digha', 'West Bengal', '721463',
    2799.00, 279.90, 0.00, 0.00, 2519.10,
    'UPI', 'Paid', 'Lens Cutting', 'Approved',
    NOW() - INTERVAL 1 DAY, 0, NOW() - INTERVAL 2 DAY
),
(
    2, 'NU-POS-00451', NULL, 'POS_OFFLINE', 'Walk-in Customer (Bikas Mondal)', NULL, '9732115599',
    'Counter Sale (Digha Branch)', 'Digha', 'West Bengal', '721428',
    1499.00, 100.00, 0.00, 0.00, 1399.00,
    'CASH', 'Paid', 'Delivered', 'Completed',
    NULL, 1, NOW() - INTERVAL 1 DAY
);

INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `product_sku`, `unit_price`, `quantity`, `lens_type`, `lens_price`, `total_price`) VALUES
(1, 1, 'Netra Apex Matte Navy Titanium', 'NU-FRM-00101', 2799.00, 1, 'German Single Vision Anti-Glare (BluZero)', 0.00, 2799.00),
(2, 2, 'Netra ClearPro Computer BlueShield', 'NU-FRM-00102', 1499.00, 1, 'Zero Power BlueShield Ready-to-Wear', 0.00, 1499.00);

INSERT INTO `order_prescriptions` (`order_id`, `order_item_id`, `submission_method`, `right_sph`, `right_cyl`, `right_axis`, `right_add`, `right_pd`, `left_sph`, `left_cyl`, `left_axis`, `left_add`, `left_pd`, `single_pd`, `status`, `admin_notes`) VALUES
(1, 1, 'SAVED_PROFILE', -1.50, -0.50, 90, 0.00, 31.5, -1.25, -0.75, 85, 0.00, 31.0, 62.5, 'Approved', 'Prescription verified by Senior Optometrist. Optical center alignment verified.');

INSERT INTO `payments` (`id`, `order_id`, `payment_number`, `amount`, `payment_mode`, `payment_provider`, `gateway_transaction_id`, `upi_utr`, `status`, `verified_by_admin_id`, `verified_at`) VALUES
(1, 1, 'NU-PAY-99101', 2519.10, 'UPI', 'MANUAL_UPI', 'UPI-TXN-7789421', '625894120357', 'Paid', 1, NOW() - INTERVAL 2 DAY),
(2, 2, 'NU-PAY-99102', 1399.00, 'CASH', 'COUNTER_POS', 'POS-CASH-00451', NULL, 'Paid', 2, NOW() - INTERVAL 1 DAY);

INSERT INTO `invoices` (`invoice_number`, `order_id`, `invoice_type`, `invoice_date`, `customer_name`, `customer_phone`, `customer_address`, `subtotal`, `tax_amount`, `discount_amount`, `total_amount`, `payment_mode`, `payment_status`) VALUES
('NU-INV-2026-001', 1, 'ONLINE_STORE', CURDATE() - INTERVAL 2 DAY, 'Rahul Sen', '9830123456', 'Flat 4B, Sagarika Enclave, New Digha Road, Digha 721463', 2799.00, 0.00, 279.90, 2519.10, 'UPI', 'Paid'),
('NU-INV-2026-002', 2, 'OFFLINE_POS', CURDATE() - INTERVAL 1 DAY, 'Walk-in Customer (Bikas Mondal)', '9732115599', 'Digha Bypass Rd, Jatimati, Digha 721428', 1499.00, 0.00, 100.00, 1399.00, 'CASH', 'Paid');

-- 16. SAMPLE APPOINTMENTS
INSERT INTO `appointments` (`appointment_number`, `doctor_id`, `customer_id`, `patient_name`, `patient_phone`, `patient_email`, `appointment_date`, `appointment_time`, `consultation_fee`, `payment_status`, `status`, `notes`) VALUES
('NU-APT-1001', 1, 1, 'Rahul Sen', '9830123456', 'rahul.sen@example.com', CURDATE() + INTERVAL 2 DAY, '11:20:00', 500.00, 'Pay at Clinic', 'Confirmed', 'Routine vision checkup and night driving glare complaint.');

-- 17. SAMPLE HOME EYE VISIT
INSERT INTO `home_eye_appointments` (`booking_number`, `customer_id`, `customer_name`, `customer_phone`, `customer_email`, `address_line1`, `landmark`, `pincode`, `service_date`, `service_slot`, `service_fee`, `payment_status`, `status`, `assigned_optometrist`, `can_cancel_until`) VALUES
('NU-HET-2001', 2, 'Priya Das', '9831987654', 'priya.das@example.com', 'Ho
-- 18. SAMPLE DOCTOR POSTER
INSERT INTO `doctor_posters` (`doctor_id`, `title`, `tagline`, `template_style`, `headline`, `dates_text`, `venue_text`, `contact_phone`, `is_published`) VALUES
(1, 'Executive Eye & Cataract Care Clinic', 'Clarity You Can Trust', 'luxury_navy_cyan', 'Comprehensive Eye Screening & Cataract Consultation by Senior Specialist', 'Every Mon, Wed, Fri & Sat (10 AM - 6 PM)', 'Netra Unnayan, Digha Bypass Rd, Jatimati, Digha', '9382293614', 1);
