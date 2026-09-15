<?php
// Netra Unnayan - Customer Orders History API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$customer = requireCustomerAuth();
$pdo = Database::getConnection();

$stmt = $pdo->prepare('
    SELECT 
        o.id, o.order_number, o.order_type, o.created_at, o.total_amount,
        o.payment_mode, o.payment_status, o.order_status, o.prescription_status,
        o.can_cancel_until,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    WHERE o.customer_id = ?
    ORDER BY o.id DESC
');
$stmt->execute([$customer['id']]);
$orders = $stmt->fetchAll();

foreach ($orders as &$ord) {
    $itemStmt = $pdo->prepare('
        SELECT product_name, product_sku, quantity, unit_price, total_price,
               (SELECT image_url FROM product_images WHERE product_id = order_items.product_id ORDER BY is_primary DESC LIMIT 1) as image_url
        FROM order_items
        WHERE order_id = ?
        LIMIT 2
    ');
    $itemStmt->execute([$ord['id']]);
    $ord['preview_items'] = $itemStmt->fetchAll();

    $ord['can_cancel'] = ($ord['can_cancel_until'] !== null) 
        && (strtotime($ord['can_cancel_until']) > time()) 
        && !in_array($ord['order_status'], ['Lens Cutting', 'Fitting', 'Quality Check', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']);
}

Response::success($orders, 'Customer order history loaded');
