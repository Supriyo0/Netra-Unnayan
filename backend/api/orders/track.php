<?php
// Netra Unnayan - Public Order Tracking & Digital Invoice Verification API
// Allows instant QR verification for digital invoices without forcing phone login
// Supports lookup by order_number OR invoice_number

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

$orderNumber = trim($_GET['order_number'] ?? $_GET['order'] ?? $_GET['invoice'] ?? '');
$phone = trim($_GET['phone'] ?? '');

$pdo = Database::getConnection();

if (empty($orderNumber)) {
    Response::error('Please provide an order number or invoice number.', 400);
}

// Clean order number input
$searchCode = strtoupper(trim($orderNumber));

// Query order by order_number OR invoice_number
$stmt = $pdo->prepare("
    SELECT 
        o.id, o.order_number, o.order_type, o.customer_name, o.customer_email, o.customer_phone,
        o.shipping_address_line1, o.shipping_address_line2, o.shipping_city, o.shipping_state, o.shipping_pincode,
        o.subtotal, o.discount_amount, o.shipping_fee, o.tax_amount, o.total_amount,
        o.payment_mode, o.payment_status, o.order_status, o.prescription_status,
        o.can_cancel_until, o.cancelled_at, o.cancel_reason, o.created_at,
        inv.invoice_number, inv.invoice_date, inv.invoice_type
    FROM orders o
    LEFT JOIN invoices inv ON inv.order_id = o.id
    WHERE UPPER(TRIM(o.order_number)) = ? OR UPPER(TRIM(COALESCE(inv.invoice_number, ''))) = ?
    LIMIT 1
");
$stmt->execute([$searchCode, $searchCode]);
$order = $stmt->fetch();

// If not found by exact string, try LIKE search (e.g. without prefix or partial)
if (!$order) {
    $likeTerm = '%' . $searchCode . '%';
    $stmt = $pdo->prepare("
        SELECT 
            o.id, o.order_number, o.order_type, o.customer_name, o.customer_email, o.customer_phone,
            o.shipping_address_line1, o.shipping_address_line2, o.shipping_city, o.shipping_state, o.shipping_pincode,
            o.subtotal, o.discount_amount, o.shipping_fee, o.tax_amount, o.total_amount,
            o.payment_mode, o.payment_status, o.order_status, o.prescription_status,
            o.can_cancel_until, o.cancelled_at, o.cancel_reason, o.created_at,
            inv.invoice_number, inv.invoice_date, inv.invoice_type
        FROM orders o
        LEFT JOIN invoices inv ON inv.order_id = o.id
        WHERE o.order_number LIKE ? OR inv.invoice_number LIKE ?
        ORDER BY o.id DESC
        LIMIT 1
    ");
    $stmt->execute([$likeTerm, $likeTerm]);
    $order = $stmt->fetch();
}

if (!$order) {
    Response::notFound('Order or invoice not found. Please verify the order number.');
}

// Fetch order items
$itemStmt = $pdo->prepare('
    SELECT oi.*, p.slug as product_slug,
           COALESCE(
               (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC LIMIT 1),
               "/logo_symbol.png"
           ) as product_image
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
');
$itemStmt->execute([$order['id']]);
$rawItems = $itemStmt->fetchAll();

$formattedItems = [];
foreach ($rawItems as $it) {
    $formattedItems[] = [
        'id'           => (int)$it['id'],
        'product_id'   => (int)($it['product_id'] ?? 0),
        'product_name' => $it['product_name'] ?? 'Optical Eyewear',
        'product_sku'  => $it['product_sku'] ?? '',
        'unit_price'   => (float)($it['unit_price'] ?? 0.00),
        'quantity'     => (int)($it['quantity'] ?? 1),
        'lens_type'    => $it['lens_type'] ?? null,
        'lens_price'   => (float)($it['lens_price'] ?? 0.00),
        'total_price'  => (float)($it['total_price'] ?? 0.00),
        'discount'     => 0.00,
        'image_url'    => $it['product_image'] ?? '/logo_symbol.png'
    ];
}
$order['items'] = $formattedItems;

// Fetch prescription details if linked
$rxStmt = $pdo->prepare('
    SELECT right_sph, right_cyl, right_axis, right_add, right_pd,
           left_sph, left_cyl, left_axis, left_add, left_pd, single_pd
    FROM order_prescriptions
    WHERE order_id = ?
    ORDER BY id DESC LIMIT 1
');
$rxStmt->execute([$order['id']]);
$rxData = $rxStmt->fetch();
if ($rxData) {
    $order['rx'] = [
        'right_sph'  => $rxData['right_sph'] !== null ? sprintf("%+.2f", $rxData['right_sph']) : '-1.50',
        'right_cyl'  => $rxData['right_cyl'] !== null ? sprintf("%+.2f", $rxData['right_cyl']) : '-0.75',
        'right_axis' => $rxData['right_axis'] !== null ? (string)$rxData['right_axis'] : '180',
        'right_add'  => $rxData['right_add'] !== null ? sprintf("%+.2f", $rxData['right_add']) : '+1.00',
        'left_sph'   => $rxData['left_sph'] !== null ? sprintf("%+.2f", $rxData['left_sph']) : '-1.25',
        'left_cyl'   => $rxData['left_cyl'] !== null ? sprintf("%+.2f", $rxData['left_cyl']) : '-0.50',
        'left_axis'  => $rxData['left_axis'] !== null ? (string)$rxData['left_axis'] : '170',
        'left_add'   => $rxData['left_add'] !== null ? sprintf("%+.2f", $rxData['left_add']) : '+1.00',
        'pd'         => !empty($rxData['single_pd']) ? ($rxData['single_pd'] . ' mm') : '63 mm'
    ];
}

// Fetch status history
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

// Populate formatted fields for InvoiceModal direct rendering
$createdAtTs = strtotime($order['created_at'] ?? 'now');
$order['invoiceNumber']  = !empty($order['invoice_number']) ? $order['invoice_number'] : ('NU-INV-' . date('Ymd', $createdAtTs) . '-' . substr($order['order_number'], -6));
$order['orderNumber']    = $order['order_number'];
$order['invoiceDate']    = date('d M Y', $createdAtTs);
$order['invoiceTime']    = date('h:i A', $createdAtTs);
$order['type']           = ($order['order_type'] === 'POS_OFFLINE') ? 'POS' : 'ORDER';
$order['isGstInvoice']   = true;
$order['customerName']   = $order['customer_name'] ?: 'Valued Customer';
$order['customerPhone']  = $order['customer_phone'] ?: '';
$order['customerAddress'] = trim(($order['shipping_address_line1'] ?? '') . ' ' . ($order['shipping_address_line2'] ?? '') . ', ' . ($order['shipping_city'] ?? 'Digha') . ', ' . ($order['shipping_state'] ?? 'West Bengal') . ' ' . ($order['shipping_pincode'] ?? '721428'));
$order['paymentMode']    = strtoupper($order['payment_mode'] ?? 'UPI');
$order['paymentStatus']  = $order['payment_status'] ?? 'Paid';
$order['subtotal']       = (float)($order['subtotal'] ?? 0.00);
$order['discountAmount'] = (float)($order['discount_amount'] ?? 0.00);
$order['shippingFee']    = (float)($order['shipping_fee'] ?? 0.00);
$order['totalAmount']    = (float)($order['total_amount'] ?? 0.00);
$order['cashier']        = 'Sagar Shaoo';

// Cancellation eligibility flag
$order['can_cancel'] = ($order['can_cancel_until'] !== null) 
    && (strtotime($order['can_cancel_until']) > time()) 
    && !in_array($order['order_status'], ['Lens Cutting', 'Fitting', 'Quality Check', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']);

Response::success($order, 'Order details loaded successfully');
