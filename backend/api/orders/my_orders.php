<?php
// Netra Unnayan - Customer Orders History API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$customer = requireCustomerAuth();
$pdo = Database::getConnection();

$custId = (int)($customer['id'] ?? 0);
$custPhone = trim($customer['phone'] ?? '');
$cleanPhone = preg_replace('/[^0-9]/', '', $custPhone);
$last10 = strlen($cleanPhone) >= 10 ? substr($cleanPhone, -10) : $cleanPhone;
$custEmail = trim($customer['email'] ?? '');

// 0. Ensure invoices table exists
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `invoices` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `invoice_number` varchar(50) NOT NULL,
            `order_id` int(11) DEFAULT NULL,
            `invoice_type` varchar(50) DEFAULT 'ONLINE',
            `invoice_date` date DEFAULT NULL,
            `customer_name` varchar(255) DEFAULT NULL,
            `customer_phone` varchar(50) DEFAULT NULL,
            `customer_address` text DEFAULT NULL,
            `subtotal` decimal(10,2) DEFAULT 0.00,
            `tax_amount` decimal(10,2) DEFAULT 0.00,
            `discount_amount` decimal(10,2) DEFAULT 0.00,
            `total_amount` decimal(10,2) DEFAULT 0.00,
            `payment_mode` varchar(50) DEFAULT 'COD',
            `payment_status` varchar(50) DEFAULT 'Pending',
            `is_gst_invoice` tinyint(1) DEFAULT 0,
            `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uk_invoice_number` (`invoice_number`),
            KEY `idx_inv_order` (`order_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (Exception $e) {}

// 1. Auto-link any unlinked orders matching customer's phone or email
if (!empty($last10)) {
    try {
        $pdo->prepare('
            UPDATE orders 
            SET customer_id = ? 
            WHERE (customer_id IS NULL OR customer_id = 0) 
              AND (
                customer_phone LIKE CONCAT("%", ?)
                OR customer_phone = ?
              )
        ')->execute([$custId, $last10, $custPhone]);
    } catch (Exception $e) {}
}
if (!empty($custEmail)) {
    try {
        $pdo->prepare('
            UPDATE orders 
            SET customer_id = ? 
            WHERE (customer_id IS NULL OR customer_id = 0) 
              AND LOWER(customer_email) = LOWER(?) 
              AND customer_email != ""
        ')->execute([$custId, $custEmail]);
    } catch (Exception $e) {}
}

// 2. Fetch all orders belonging to this customer
$orders = [];
try {
    $stmt = $pdo->prepare('
        SELECT 
            o.id, o.order_number, o.order_type, o.created_at, o.subtotal, o.discount_amount,
            o.shipping_fee, o.tax_amount, o.total_amount,
            o.payment_mode, o.payment_status, o.order_status, o.prescription_status,
            o.can_cancel_until, o.cancelled_at, o.cancel_reason, o.notes,
            o.shipping_address_line1, o.shipping_address_line2, o.shipping_landmark,
            o.shipping_city, o.shipping_state, o.shipping_pincode,
            o.courier_name, o.tracking_number, o.tracking_url, o.estimated_delivery_date,
            o.customer_name, o.customer_phone, o.customer_email,
            COALESCE((SELECT invoice_number FROM invoices WHERE order_id = o.id LIMIT 1), CONCAT("NU-INV-", o.id)) as invoice_number,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
        FROM orders o
        WHERE o.customer_id = :custId 
           OR (:last10 != "" AND (o.customer_phone LIKE CONCAT("%", :last10) OR o.customer_phone = :custPhone))
           OR (:custEmail != "" AND LOWER(o.customer_email) = LOWER(:custEmail))
        ORDER BY o.id DESC
    ');
    $stmt->execute([
        ':custId'    => $custId,
        ':last10'    => $last10,
        ':custPhone' => $custPhone,
        ':custEmail' => $custEmail
    ]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    // Fallback query if any issue
    try {
        $stmt = $pdo->prepare('
            SELECT o.*, CONCAT("NU-INV-", o.id) as invoice_number, 0 as item_count
            FROM orders o
            WHERE o.customer_id = ? 
               OR (o.customer_phone = ? AND o.customer_phone != "")
               OR (LOWER(o.customer_email) = LOWER(?) AND o.customer_email != "")
            ORDER BY o.id DESC
        ');
        $stmt->execute([$custId, $custPhone, $custEmail]);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e2) {
        $orders = [];
    }
}

foreach ($orders as &$ord) {
    try {
        $itemStmt = $pdo->prepare('
            SELECT oi.*, p.slug as product_slug,
                   COALESCE(
                       (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC LIMIT 1),
                       "/logo_symbol.png"
                   ) as image_url
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ');
        $itemStmt->execute([$ord['id']]);
        $ord['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $ord['items'] = [];
    }

    $ord['preview_items'] = array_slice($ord['items'], 0, 4);

    try {
        $histStmt = $pdo->prepare('
            SELECT old_status, new_status, note, created_at 
            FROM order_status_history 
            WHERE order_id = ? 
            ORDER BY id DESC
        ');
        $histStmt->execute([$ord['id']]);
        $ord['status_history'] = $histStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $ord['status_history'] = [];
    }

    // Prescription details
    try {
        $rxStmt = $pdo->prepare('SELECT * FROM order_prescriptions WHERE order_id = ? ORDER BY id DESC');
        $rxStmt->execute([$ord['id']]);
        $ord['prescriptions'] = $rxStmt->fetchAll(PDO::FETCH_ASSOC);
        $ord['prescription'] = $ord['prescriptions'][0] ?? null;
    } catch (Exception $e) {
        $ord['prescriptions'] = [];
        $ord['prescription'] = null;
    }

    // Fallback synthesis if prescription record is not yet in order_prescriptions
    if (empty($ord['prescriptions'])) {
        $lensItem = null;
        foreach ($ord['items'] as $it) {
            if (!empty($it['lens_type'])) {
                $lensItem = $it;
                break;
            }
        }
        if ($lensItem || (!empty($ord['prescription_status']) && $ord['prescription_status'] !== 'Not Required')) {
            $synth = [
                'id'                => 0,
                'order_id'          => $ord['id'],
                'submission_method' => 'FORM',
                'lens_type'         => $lensItem['lens_type'] ?? 'Prescription Lenses',
                'status'            => $ord['prescription_status'] ?: 'Pending Review',
                'admin_notes'       => $ord['notes'] ?? null,
                'right_sph'         => null,
                'left_sph'          => null,
                'single_pd'         => 63,
                'rx_image_url'      => null
            ];
            $ord['prescriptions'] = [$synth];
            $ord['prescription'] = $synth;
        }
    }

    $ord['can_cancel'] = ($ord['can_cancel_until'] !== null) 
        && (strtotime($ord['can_cancel_until']) > time()) 
        && !in_array($ord['order_status'], ['Lens Cutting', 'Fitting', 'Quality Check', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']);
}

Response::success($orders, 'Customer order history loaded');
