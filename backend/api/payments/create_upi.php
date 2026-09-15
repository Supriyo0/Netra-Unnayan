<?php
// Netra Unnayan - Dynamic UPI Payment Intent Generator
// Calculates exact verified server amount & produces authentic UPI deep-link

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$orderNumber = trim($input['order_number'] ?? '');

if (empty($orderNumber)) {
    Response::error('Order number is required.', 400);
}

$pdo = Database::getConnection();

$stmt = $pdo->prepare('SELECT id, order_number, total_amount, payment_mode, payment_status FROM orders WHERE order_number = ?');
$stmt->execute([$orderNumber]);
$order = $stmt->fetch();

if (!$order) {
    Response::notFound('Order not found.');
}

if ($order['payment_status'] === 'Paid') {
    Response::error('This order has already been paid for.', 400);
}

// Fetch configured UPI Settings
$setStmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('upi_id', 'upi_merchant_name')");
$settings = $setStmt->fetchAll(PDO::FETCH_KEY_PAIR);

$upiId = $settings['upi_id'] ?? '9382293614@upi';
$merchantName = $settings['upi_merchant_name'] ?? 'NETRA UNNAYAN OPTICALS';
$amount = number_format((float)$order['total_amount'], 2, '.', '');
$note = "Order $orderNumber Netra Unnayan";

// Dynamic pre-filled UPI URL specification (NPCI UPI linking specs)
$encodedPn = rawurlencode($merchantName);
$encodedTn = rawurlencode($note);
$upiDeepLink = "upi://pay?pa={$upiId}&pn={$encodedPn}&am={$amount}&cu=INR&tn={$encodedTn}";

// Update or create payment record
$payStmt = $pdo->prepare('SELECT id, payment_number FROM payments WHERE order_id = ? AND payment_mode = "UPI" ORDER BY id DESC LIMIT 1');
$payStmt->execute([$order['id']]);
$existingPay = $payStmt->fetch();

if (!$existingPay) {
    $paymentNumber = 'NU-PAY-' . strtoupper(bin2hex(random_bytes(4)));
    $ins = $pdo->prepare('
        INSERT INTO payments (order_id, payment_number, amount, payment_mode, payment_provider, status)
        VALUES (?, ?, ?, "UPI", "MANUAL_UPI", "Pending")
    ');
    $ins->execute([$order['id'], $paymentNumber, $order['total_amount']]);
} else {
    $paymentNumber = $existingPay['payment_number'];
}

Response::success([
    'order_number'    => $orderNumber,
    'payment_number'  => $paymentNumber,
    'amount'          => (float)$amount,
    'upi_id'          => $upiId,
    'merchant_name'   => $merchantName,
    'note'            => $note,
    'upi_deep_link'   => $upiDeepLink
], 'Dynamic UPI payment request ready');
