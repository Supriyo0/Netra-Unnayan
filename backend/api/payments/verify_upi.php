<?php
// Netra Unnayan - Customer UPI UTR Submission & Payment Verification API
// Front-end cannot mark payment 'Paid'. This flags payment as 'Under Verification' with UTR reference.

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$orderNumber = trim($input['order_number'] ?? '');
$utr = trim($input['utr'] ?? $input['upi_reference'] ?? '');

if (empty($orderNumber) || empty($utr)) {
    Response::error('Please enter the 12-digit UPI Transaction ID / UTR number from your payment app.', 422);
}

// Basic UTR sanitation
if (strlen($utr) < 8) {
    Response::error('Invalid UPI Reference/UTR number. It typically contains 12 digits.', 422);
}

$pdo = Database::getConnection();

$stmt = $pdo->prepare('SELECT id, order_number, total_amount, order_status, payment_status FROM orders WHERE order_number = ?');
$stmt->execute([$orderNumber]);
$order = $stmt->fetch();

if (!$order) {
    Response::notFound('Order not found.');
}

if ($order['payment_status'] === 'Paid') {
    Response::success(['status' => 'Paid'], 'Order is already marked as Paid.');
}

// Update payment record to 'Under Verification' with UTR
$updatePay = $pdo->prepare('
    UPDATE payments 
    SET upi_utr = ?, 
        status = "Under Verification",
        updated_at = NOW()
    WHERE order_id = ?
');
$updatePay->execute([$utr, $order['id']]);

// Update order status
$updateOrd = $pdo->prepare('
    UPDATE orders 
    SET payment_status = "Under Verification",
        order_status = "Payment Pending"
    WHERE id = ?
');
$updateOrd->execute([$order['id']]);

// Status history
$pdo->prepare('
    INSERT INTO order_status_history (order_id, old_status, new_status, note)
    VALUES (?, ?, "Payment Pending", ?)
')->execute([$order['id'], $order['order_status'], "Customer submitted UPI Reference (UTR: {$utr}) for verification."]);

Response::success([
    'order_number'   => $orderNumber,
    'payment_status' => 'Under Verification',
    'utr'            => $utr
], 'UTR submitted successfully. Our billing desk will verify your payment shortly.');
