<?php
// Netra Unnayan - Order Tracking & Timeline API
// Excludes internal confidential admin notes from customer view

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

$orderNumber = trim($_GET['order_number'] ?? '');
$phone = trim($_GET['phone'] ?? '');

$auth = getOptionalAuth();

$pdo = Database::getConnection();

if (empty($orderNumber)) {
    Response::error('Please provide an order number.', 400);
}

// Build query
$params = [$orderNumber];
$where = 'o.order_number = ?';

// If not logged in or searching publicly, require phone number verification
if (!$auth) {
    if (empty($phone)) {
        Response::error('Please provide the phone number used during checkout to verify your order.', 401);
    }
    $where .= ' AND o.customer_phone = ?';
    $params[] = $phone;
} else if ($auth['type'] === 'customer') {
    // If customer, ensure it's their order OR phone matches
    $where .= ' AND (o.customer_id = ? OR o.customer_phone = ?)';
    $params[] = $auth['id'];
    $params[] = $phone ?: 'CUSTOMER_AUTH_MATCH';
}
// Admin can view any order

$stmt = $pdo->prepare("
    SELECT 
        o.id, o.order_number, o.order_type, o.customer_name, o.customer_email, o.customer_phone,
        o.shipping_address_line1, o.shipping_address_line2, o.shipping_city, o.shipping_state, o.shipping_pincode,
        o.subtotal, o.discount_amount, o.shipping_fee, o.tax_amount, o.total_amount,
        o.payment_mode, o.payment_status, o.order_status, o.prescription_status,
        o.can_cancel_until, o.cancelled_at, o.cancel_reason, o.created_at
    FROM orders o
    WHERE $where
");
$stmt->execute($params);
$order = $stmt->fetch();

if (!$order) {
    Response::notFound('Order not found or verification credentials do not match.');
}

// Fetch items
$itemStmt = $pdo->prepare('
    SELECT oi.*, p.slug as product_slug,
           (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC LIMIT 1) as product_image
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
');
$itemStmt->execute([$order['id']]);
$order['items'] = $itemStmt->fetchAll();

// Fetch status history (sanitized, excluding any private internal notes)
$historyStmt = $pdo->prepare('
    SELECT old_status, new_status, note, created_at
    FROM order_status_history
    WHERE order_id = ?
    ORDER BY id ASC
');
$historyStmt->execute([$order['id']]);
$rawHistory = $historyStmt->fetchAll();

$sanitizedHistory = [];
foreach ($rawHistory as $h) {
    $sanitizedHistory[] = [
        'status'    => $h['new_status'],
        'note'      => $h['note'],
        'timestamp' => $h['created_at']
    ];
}
$order['status_history'] = $sanitizedHistory;

// Standard Optical Lifecycle Pipeline
$stages = [
    'Order Placed'          => ['key' => 'placed', 'desc' => 'Order submitted by customer'],
    'Payment Confirmed'     => ['key' => 'payment', 'desc' => 'Payment processed and verified'],
    'Prescription Review'   => ['key' => 'rx_review', 'desc' => 'Prescription verified by clinical optometrist'],
    'Prescription Approved' => ['key' => 'rx_approved', 'desc' => 'Prescription passed optical tolerances'],
    'Lens Cutting'          => ['key' => 'cutting', 'desc' => 'Lens edging and laser surfacing in optical lab'],
    'Fitting'               => ['key' => 'fitting', 'desc' => 'Mounting lenses securely into frame chassis'],
    'Quality Check'         => ['key' => 'qc', 'desc' => 'Focimeter optical power and axis verification'],
    'Packed'                => ['key' => 'packed', 'desc' => 'Disinfected, sealed in hard case with microfiber cloth'],
    'Shipped'               => ['key' => 'shipped', 'desc' => 'Handed over for delivery'],
    'Out for Delivery'      => ['key' => 'out_for_delivery', 'desc' => 'Local courier en route to destination'],
    'Delivered'             => ['key' => 'delivered', 'desc' => 'Delivered to recipient']
];

$order['timeline_stages'] = $stages;

// Cancellation eligibility flag
$order['can_cancel'] = ($order['can_cancel_until'] !== null) 
    && (strtotime($order['can_cancel_until']) > time()) 
    && !in_array($order['order_status'], ['Lens Cutting', 'Fitting', 'Quality Check', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']);

Response::success($order, 'Order details loaded');
