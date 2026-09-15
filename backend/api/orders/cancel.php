<?php
// Netra Unnayan - Order Cancellation Rule Engine
// RULE: Cancellation strictly allowed within 12 hours OR before lens cutting begins.
// Rejects unauthorized direct API calls. Restores deducted inventory safely.

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$orderNumber = trim($input['order_number'] ?? '');
$cancelReason = trim($input['reason'] ?? 'Customer requested cancellation');

if (empty($orderNumber)) {
    Response::error('Order number is required.', 400);
}

$auth = getOptionalAuth();
if (!$auth) {
    Response::unauthorized('Authentication required to cancel an order.');
}

$pdo = Database::getConnection();

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('
        SELECT * FROM orders 
        WHERE order_number = ? 
        FOR UPDATE
    ');
    $stmt->execute([$orderNumber]);
    $order = $stmt->fetch();

    if (!$order) {
        $pdo->rollBack();
        Response::notFound('Order not found.');
    }

    // Customer can only cancel their own order; admin can cancel any
    if ($auth['type'] === 'customer' && (int)$order['customer_id'] !== (int)$auth['id']) {
        $pdo->rollBack();
        Response::forbidden('You are not authorized to cancel this order.');
    }

    // Check if already cancelled or delivered
    if (in_array($order['order_status'], ['Cancelled', 'Refunded'])) {
        $pdo->rollBack();
        Response::error('This order is already cancelled.', 400);
    }
    if ($order['order_status'] === 'Delivered') {
        $pdo->rollBack();
        Response::error('Delivered orders cannot be cancelled. Please initiate a return request instead.', 400);
    }

    // RULE: Lens production check
    $productionBlockedStatuses = ['Lens Cutting', 'Fitting', 'Quality Check', 'Packed', 'Shipped', 'Out for Delivery'];
    if (in_array($order['order_status'], $productionBlockedStatuses) || $order['prescription_status'] === 'Production Started') {
        $pdo->rollBack();
        Response::error(
            'Cannot cancel order: Customized optical lens cutting and fitting has already commenced in our optical lab. Under our policy, customized lenses cannot be cancelled once edging begins.',
            400
        );
    }

    // RULE: 12-hour cancellation window check (unless admin override)
    if ($auth['type'] === 'customer') {
        if (!empty($order['can_cancel_until']) && strtotime($order['can_cancel_until']) < time()) {
            $pdo->rollBack();
            Response::error(
                'The 12-hour standard cancellation window for this order has expired. Please contact customer support at 9382293614.',
                400
            );
        }
    }

    // Restore inventory
    $itemsStmt = $pdo->prepare('SELECT product_id, quantity, product_name FROM order_items WHERE order_id = ?');
    $itemsStmt->execute([$order['id']]);
    $items = $itemsStmt->fetchAll();

    $invStmt = $pdo->prepare('
        INSERT INTO inventory_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reference_type, reference_id, notes)
        VALUES (?, "RETURN", ?, ?, ?, "CANCELLED_ORDER", ?, ?)
    ');

    foreach ($items as $item) {
        $lockProd = $pdo->prepare('SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE');
        $lockProd->execute([$item['product_id']]);
        $currentStock = (int)$lockProd->fetchColumn();
        $restoredStock = $currentStock + (int)$item['quantity'];

        // Update product stock
        $pdo->prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')->execute([$restoredStock, $item['product_id']]);

        // Audit inventory restoration
        $invStmt->execute([
            $item['product_id'], (int)$item['quantity'], $currentStock, $restoredStock,
            $orderNumber, "Stock restored due to cancellation of Order #{$orderNumber}"
        ]);
    }

    // Update order status
    $newPaymentStatus = ($order['payment_status'] === 'Paid') ? 'Refund Initiated' : 'Cancelled';
    $cancelStmt = $pdo->prepare('
        UPDATE orders 
        SET order_status = "Cancelled", 
            payment_status = ?,
            cancelled_at = NOW(),
            cancel_reason = ?
        WHERE id = ?
    ');
    $cancelStmt->execute([$newPaymentStatus, $cancelReason, $order['id']]);

    // Record status history
    $pdo->prepare('
        INSERT INTO order_status_history (order_id, old_status, new_status, note)
        VALUES (?, ?, "Cancelled", ?)
    ')->execute([$order['id'], $order['order_status'], "Cancelled by {$auth['type']}: {$cancelReason}"]);

    // If paid, create refund record
    if ($order['payment_status'] === 'Paid') {
        $refundNumber = 'NU-REF-' . strtoupper(bin2hex(random_bytes(4)));
        $pdo->prepare('
            INSERT INTO refunds (order_id, refund_number, amount, reason, status)
            VALUES (?, ?, ?, ?, "Pending")
        ')->execute([$order['id'], $refundNumber, $order['total_amount'], "Cancellation refund: " . $cancelReason]);
    }

    $pdo->commit();

    // Send cancellation notification
    if (!empty($order['customer_email'])) {
        $emailBody = <<<HTML
            <div class="badge" style="background:#FEE2E2; color:#B91C1C;">Order Cancelled</div>
            <h2>Order {$orderNumber} Cancelled</h2>
            <p>Your order has been cancelled as requested.</p>
            <p><strong>Reason:</strong> {$cancelReason}</p>
            <p>If you made an online payment, a full refund of ₹{$order['total_amount']} has been initiated and will credit to your account within 5–7 business days.</p>
HTML;
        Mailer::send($order['customer_email'], $order['customer_name'], "Order Cancelled - {$orderNumber} | Netra Unnayan", $emailBody);
    }

    Response::success([
        'order_number' => $orderNumber,
        'order_status' => 'Cancelled',
        'refund_status'=> ($order['payment_status'] === 'Paid') ? 'Initiated' : 'Not Required'
    ], "Order {$orderNumber} has been successfully cancelled and stock restored.");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Response::error("Failed to cancel order: " . $e->getMessage(), 500);
}
