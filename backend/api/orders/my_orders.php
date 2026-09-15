<?php
// Netra Unnayan - Customer Orders History API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$customer = requireCustomerAuth();
$pdo = Database::getConnection();

// 1. Auto-link any orders created with customer's phone or email
if (!empty($customer['phone'])) {
    try {
        $pdo->prepare('UPDATE orders SET customer_id = ? WHERE (customer_id IS NULL OR customer_id = 0) AND customer_phone = ?')->execute([$customer['id'], $customer['phone']]);
    } catch (Exception $e) {}
}
if (!empty($customer['email'])) {
    try {
        $pdo->prepare('UPDATE orders SET customer_id = ? WHERE (customer_id IS NULL OR customer_id = 0) AND customer_email = ?')->execute([$customer['id'], $customer['email']]);
    } catch (Exception $e) {}
}

$stmt = $pdo->prepare('
    SELECT 
        o.id, o.order_number, o.order_type, o.created_at, o.total_amount,
        o.payment_mode, o.payment_status, o.order_status, o.prescription_status,
        o.can_cancel_until,
        o.shipping_address_line1, o.shipping_city, o.shipping_pincode,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    WHERE o.customer_id = ? 
       OR (o.customer_phone = ? AND o.customer_phone != "") 
       OR (o.customer_email = ? AND o.customer_email != "")
    ORDER BY o.id DESC
');
$stmt->execute([$customer['id'], $customer['phone'] ?? '', $customer['email'] ?? '']);
$orders = $stmt->fetchAll();

foreach ($orders as &$ord) {
    $itemStmt = $pdo->prepare('
        SELECT product_name, product_sku, quantity, unit_price, total_price, frame_size, frame_color, lens_type,
               (SELECT image_url FROM product_images WHERE product_id = order_items.product_id ORDER BY is_primary DESC LIMIT 1) as image_url
        FROM order_items
        WHERE order_id = ?
        LIMIT 4
    ');
    $itemStmt->execute([$ord['id']]);
    $ord['preview_items'] = $itemStmt->fetchAll();

    $ord['can_cancel'] = ($ord['can_cancel_until'] !== null) 
        && (strtotime($ord['can_cancel_until']) > time()) 
        && !in_array($ord['order_status'], ['Lens Cutting', 'Fitting', 'Quality Check', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']);
}

Response::success($orders, 'Customer order history loaded');

