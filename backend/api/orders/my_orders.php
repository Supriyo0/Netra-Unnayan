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
$last10 = substr($cleanPhone, -10);
$custEmail = trim($customer['email'] ?? '');

// 1. Auto-link any unlinked orders matching customer's phone or email
if (!empty($last10)) {
    try {
        $pdo->prepare('
            UPDATE orders 
            SET customer_id = ? 
            WHERE (customer_id IS NULL OR customer_id = 0) 
              AND (
                customer_phone = ? 
                OR customer_phone LIKE CONCAT("%", ?)
              )
        ')->execute([$custId, $custPhone, $last10]);
    } catch (Exception $e) {}
}
if (!empty($custEmail)) {
    try {
        $pdo->prepare('
            UPDATE orders 
            SET customer_id = ? 
            WHERE (customer_id IS NULL OR customer_id = 0) 
              AND customer_email = ? 
              AND customer_email != ""
        ')->execute([$custId, $custEmail]);
    } catch (Exception $e) {}
}

// 2. Fetch all orders belonging to this customer
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
       OR (? != "" AND o.customer_phone != "" AND o.customer_phone LIKE CONCAT("%", ?))
    ORDER BY o.id DESC
');
$stmt->execute([$custId, $custPhone, $custEmail, $last10, $last10]);
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

    $ord['can_cancel'] = ($ord['can_cancel_until'] !== null) 
        && (strtotime($ord['can_cancel_until']) > time()) 
        && !in_array($ord['order_status'], ['Lens Cutting', 'Fitting', 'Quality Check', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']);
}

Response::success($orders, 'Customer order history loaded');
