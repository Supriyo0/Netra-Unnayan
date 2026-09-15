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
        o.id, o.order_number, o.order_type, o.created_at, o.subtotal, o.discount_amount,
        o.shipping_fee, o.tax_amount, o.total_amount,
        o.payment_mode, o.payment_status, o.order_status, o.prescription_status,
        o.can_cancel_until, o.cancelled_at, o.cancel_reason, o.notes,
        o.shipping_address_line1, o.shipping_address_line2, o.shipping_landmark,
        o.shipping_city, o.shipping_state, o.shipping_pincode,
        o.customer_name, o.customer_phone, o.customer_email,
        (SELECT invoice_number FROM invoices WHERE order_id = o.id LIMIT 1) as invoice_number,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    WHERE o.customer_id = ? 
       OR (o.customer_phone = ? AND o.customer_phone != "") 
       OR (o.customer_email = ? AND o.customer_email != "")
    ORDER BY o.id DESC
');
$stmt->execute([$customer['id'], $customer['phone'] ?? '', $customer['email'] ?? '']);
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($orders as &$ord) {
    $itemStmt = $pdo->prepare('
        SELECT product_id, product_name, product_sku, quantity, unit_price, total_price, frame_size, frame_color, lens_type,
               (SELECT image_url FROM product_images WHERE product_id = order_items.product_id ORDER BY is_primary DESC LIMIT 1) as image_url
        FROM order_items
        WHERE order_id = ?
    ');
    $itemStmt->execute([$ord['id']]);
    $ord['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
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

    $ord['can_cancel'] = ($ord['can_cancel_until'] !== null) 
        && (strtotime($ord['can_cancel_until']) > time()) 
        && !in_array($ord['order_status'], ['Lens Cutting', 'Fitting', 'Quality Check', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']);
}

Response::success($orders, 'Customer order history loaded');


