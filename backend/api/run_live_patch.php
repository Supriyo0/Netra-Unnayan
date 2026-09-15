<?php
// Netra Unnayan - Comprehensive Live Database Schema & Table Provisioner
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

$pdo = Database::getConnection();
$log = [];

// 1. hero_banners Table
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `hero_banners` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `title` VARCHAR(255) NOT NULL,
            `subtitle` TEXT NULL,
            `tag` VARCHAR(100) NULL,
            `button_text` VARCHAR(100) NULL,
            `button_url` VARCHAR(255) NULL,
            `image` VARCHAR(500) NULL,
            `gradient` VARCHAR(255) NULL,
            `featured_products_json` JSON NULL,
            `display_order` INT NOT NULL DEFAULT 0,
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `background_image_url` VARCHAR(500) NULL,
            `background_zoom` VARCHAR(50) NULL DEFAULT '100%',
            `background_position` VARCHAR(100) NULL DEFAULT 'center',
            `background_opacity` VARCHAR(20) NULL DEFAULT '1.0',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    $log[] = 'hero_banners table verified/created.';
} catch (Exception $e) {
    $log[] = 'hero_banners error: ' . $e->getMessage();
}

// Seed default banners if table is empty
try {
    $count = (int)$pdo->query("SELECT COUNT(*) FROM hero_banners")->fetchColumn();
    if ($count === 0) {
        $pdo->exec("
            INSERT INTO `hero_banners` (`id`, `title`, `subtitle`, `tag`, `button_text`, `button_url`, `image`, `gradient`, `featured_products_json`, `display_order`, `is_active`) VALUES
            (1, 'CLARITY YOU CAN TRUST: JAPAN TITANIUM FRAMES', 'Engineered from surgical-grade Beta Titanium. Featherlight 8-gram weight, zero temple pressure, German optical edging.', 'LUXURY DROP 2026', 'SHOP TITANIUM COLLECTION', '/catalog?category=eyeglasses', 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=1200&auto=format&fit=crop&q=80', 'from-cyan-500/20 to-blue-600/20', '[1, 2, 3]', 1, 1),
            (2, 'BLUZERO™ COMPUTER FATIGUE LENSES', 'Block 98% harmful 420nm digital blue light. Eliminate eye strain, headaches, and dry eyes during extended screen work.', 'DIGITAL WELLNESS', 'EXPLORE BLUE-CUT', '/catalog?category=computer-glasses', 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=1200&auto=format&fit=crop&q=80', 'from-blue-600/20 to-indigo-600/20', '[2, 3, 4]', 2, 1),
            (3, 'EXPERT EYE DOCTOR APPOINTMENTS IN DIGHA', 'Consult senior visiting ophthalmologists and surgical specialists at our Jatimati Bypass clinical facility. Zero waiting time.', 'CLINICAL EYE CARE', 'BOOK APPOINTMENT', '/doctors', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=1200&auto=format&fit=crop&q=80', 'from-teal-500/20 to-emerald-600/20', '[4, 1, 2]', 3, 1);
        ");
        $log[] = 'hero_banners seeded with 3 default banners.';
    }
} catch (Exception $e) {
    $log[] = 'hero_banners seed error: ' . $e->getMessage();
}

// 2. Add day_fees to doctors
try {
    $pdo->exec("ALTER TABLE `doctors` ADD COLUMN `day_fees` LONGTEXT NULL AFTER `consultation_fee`");
    $log[] = 'Added day_fees to doctors.';
} catch (Exception $e) {
    $log[] = 'doctors.day_fees already exists.';
}

// 3. Add location_fees to home_eye_services
try {
    $pdo->exec("ALTER TABLE `home_eye_services` ADD COLUMN `location_fees` LONGTEXT NULL AFTER `service_pincodes`");
    $log[] = 'Added location_fees to home_eye_services.';
} catch (Exception $e) {
    $log[] = 'home_eye_services.location_fees already exists.';
}

// 4. Add location_name to home_eye_appointments
try {
    $pdo->exec("ALTER TABLE `home_eye_appointments` ADD COLUMN `location_name` VARCHAR(150) NULL AFTER `landmark`");
    $log[] = 'Added location_name to home_eye_appointments.';
} catch (Exception $e) {
    $log[] = 'home_eye_appointments.location_name already exists.';
}

// 5. Add courier_name & tracking_number to orders
try {
    $pdo->exec("ALTER TABLE `orders` ADD COLUMN `courier_name` VARCHAR(100) NULL AFTER `notes`");
    $log[] = 'Added courier_name to orders.';
} catch (Exception $e) {
    $log[] = 'orders.courier_name already exists.';
}

try {
    $pdo->exec("ALTER TABLE `orders` ADD COLUMN `tracking_number` VARCHAR(100) NULL AFTER `courier_name`");
    $log[] = 'Added tracking_number to orders.';
} catch (Exception $e) {
    $log[] = 'orders.tracking_number already exists.';
}

// 6. Add available_sizes & available_colors to products
try {
    $pdo->exec("ALTER TABLE `products` ADD COLUMN `available_sizes` VARCHAR(255) NULL DEFAULT 'Small, Medium, Large' AFTER `frame_size`");
    $log[] = 'Added available_sizes to products.';
} catch (Exception $e) {
    $log[] = 'products.available_sizes already exists.';
}

try {
    $pdo->exec("ALTER TABLE `products` ADD COLUMN `available_colors` VARCHAR(500) NULL DEFAULT 'Black, Gold, Silver, Crystal' AFTER `frame_color`");
    $log[] = 'Added available_colors to products.';
} catch (Exception $e) {
    $log[] = 'products.available_colors already exists.';
}

// 7. Add avatar_url to customers
try {
    $pdo->exec("ALTER TABLE `customers` ADD COLUMN `avatar_url` VARCHAR(500) NULL AFTER `phone`");
    $log[] = 'Added avatar_url to customers.';
} catch (Exception $e) {
    $log[] = 'customers.avatar_url already exists.';
}

// 8. Ensure 'Best Sellers & Signature Drops' category exists
try {
    $checkCat = $pdo->prepare("SELECT id FROM categories WHERE slug = 'best-sellers-signature-drops'");
    $checkCat->execute();
    $catId = $checkCat->fetchColumn();
    if (!$catId) {
        $pdo->exec("
            INSERT INTO `categories` (`name`, `slug`, `description`, `image_url`, `display_order`, `is_active`, `seo_title`, `seo_description`)
            VALUES ('Best Sellers & Signature Drops', 'best-sellers-signature-drops', 'Curated best-selling luxury optical frames and exclusive limited signature drops.', 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80', 0, 1, 'Best Sellers & Signature Drops | Netra Unnayan', 'Explore top trending and best-selling luxury optical frames.')
        ");
        $catId = (int)$pdo->lastInsertId();
        $log[] = "Created 'Best Sellers & Signature Drops' category with ID $catId.";
    } else {
        $log[] = "'Best Sellers & Signature Drops' category already exists (ID $catId).";
    }

    // Ensure top 8 products have is_featured = 1 for immediate Best Sellers drop
    $topIds = $pdo->query("SELECT id FROM products WHERE is_active = 1 ORDER BY id DESC LIMIT 8")->fetchAll(PDO::FETCH_COLUMN);
    if (!empty($topIds)) {
        $idList = implode(',', array_map('intval', $topIds));
        $pdo->exec("UPDATE products SET is_featured = 1 WHERE id IN ($idList)");
        $log[] = "Marked top 8 products ($idList) as is_featured = 1 for Best Sellers.";
    }
} catch (Exception $e) {
    $log[] = "Best sellers category error: " . $e->getMessage();
}

// 9. Add frame_size and frame_color to order_items
try {
    $pdo->exec("ALTER TABLE `order_items` ADD COLUMN `frame_size` VARCHAR(50) NULL AFTER `quantity`");
    $log[] = 'Added frame_size to order_items.';
} catch (Exception $e) {
    $log[] = 'order_items.frame_size already exists.';
}

try {
    $pdo->exec("ALTER TABLE `order_items` ADD COLUMN `frame_color` VARCHAR(100) NULL AFTER `frame_size`");
    $log[] = 'Added frame_color to order_items.';
} catch (Exception $e) {
    $log[] = 'order_items.frame_color already exists.';
}

// 10. Add extra_shipping_fee to products
try {
    $pdo->exec("ALTER TABLE `products` ADD COLUMN `extra_shipping_fee` DECIMAL(10,2) DEFAULT 0.00 AFTER `low_stock_threshold`");
    $log[] = 'Added extra_shipping_fee to products.';
} catch (Exception $e) {
    $log[] = 'products.extra_shipping_fee already exists.';
}

// 11. Add is_gst_invoice to orders and invoices
try {
    $pdo->exec("ALTER TABLE `orders` ADD COLUMN `is_gst_invoice` TINYINT(1) DEFAULT 0 AFTER `is_offline_bill`");
    $log[] = 'Added is_gst_invoice to orders.';
} catch (Exception $e) {
    $log[] = 'orders.is_gst_invoice already exists.';
}

try {
    $pdo->exec("ALTER TABLE `invoices` ADD COLUMN `is_gst_invoice` TINYINT(1) DEFAULT 0");
    $log[] = 'Added is_gst_invoice to invoices.';
} catch (Exception $e) {
    $log[] = 'invoices.is_gst_invoice already exists.';
}

Response::json(['status' => 'completed', 'log' => $log]);
