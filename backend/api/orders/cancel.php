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
    Response::unauthorized('Authentication required to cancel an order. Please log in to your account.');
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

    // In-store POS offline bills cannot be cancelled online
    if ($order['order_type'] === 'POS_OFFLINE' || !empty($order['is_offline_bill'])) {
        $pdo->rollBack();
        Response::error('In-store counter purchases cannot be cancelled online. Please visit our Digha store/clinic for counter assistance.', 400);
    }

    // Authorization validation:
    $isAuthorized = false;
    if ($auth['type'] === 'admin') {
        $isAuthorized = true;
    } elseif ($auth['type'] === 'customer') {
        $custId = (int)$auth['id'];
        if (!empty($order['customer_id']) && (int)$order['customer_id'] === $custId) {
            $isAuthorized = true;
        } else {
            // Check customer record phone/email
            $cStmt = $pdo->prepare('SELECT phone, email FROM customers WHERE id = ?');
            $cStmt->execute([$custId]);
            $custRow = $cStmt->fetch();
            if ($custRow) {
                $userPhoneClean = preg_replace('/[^0-9]/', '', $custRow['phone'] ?? '');
                $orderPhoneClean = preg_replace('/[^0-9]/', '', $order['customer_phone'] ?? '');
                $userLast10 = substr($userPhoneClean, -10);
                $orderLast10 = substr($orderPhoneClean, -10);

                if (!empty($userLast10) && !empty($orderLast10) && $userLast10 === $orderLast10) {
                    $isAuthorized = true;
                    $pdo->prepare('UPDATE orders SET customer_id = ? WHERE id = ?')->execute([$custId, $order['id']]);
                } elseif (!empty($custRow['email']) && !empty($order['customer_email']) && strtolower(trim($custRow['email'])) === strtolower(trim($order['customer_email']))) {
                    $isAuthorized = true;
                    $pdo->prepare('UPDATE orders SET customer_id = ? WHERE id = ?')->execute([$custId, $order['id']]);
                }
            }
        }
    }

    if (!$isAuthorized) {
        $pdo->rollBack();
        Response::forbidden('You do not have permission to cancel this order.');
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
        VALUES (?, "RETURN", ?, ?, ?, "ORDER", ?, ?)
    ');

    foreach ($items as $item) {
        $productId = (int)($item['product_id'] ?? 0);
        if ($productId <= 0) continue;

        $lockProd = $pdo->prepare('SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE');
        $lockProd->execute([$productId]);
        $currentStock = (int)$lockProd->fetchColumn();
        $restoredStock = $currentStock + (int)$item['quantity'];

        // Update product stock
        $pdo->prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')->execute([$restoredStock, $productId]);

        // Audit inventory restoration
        try {
            $invStmt->execute([
                $productId, (int)$item['quantity'], $currentStock, $restoredStock,
                $orderNumber, "Stock restored due to cancellation of Order #{$orderNumber}"
            ]);
        } catch (Exception $e) {}
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
        try {
            $pdo->prepare('
                INSERT INTO refunds (order_id, refund_number, amount, reason, status)
                VALUES (?, ?, ?, ?, "Pending")
            ')->execute([$order['id'], $refundNumber, $order['total_amount'], "Cancellation refund: " . $cancelReason]);
        } catch (Exception $e) {}
    }

    $pdo->commit();

    // Send cancellation notification
    $custEmail = !empty($order['customer_email']) ? trim($order['customer_email']) : '';
    if ((empty($custEmail) || str_ends_with($custEmail, '@netraunnayan.com')) && !empty($order['customer_id'])) {
        try {
            $cStmt = $pdo->prepare('SELECT email FROM customers WHERE id = ?');
            $cStmt->execute([$order['customer_id']]);
            $dbEmail = trim((string)$cStmt->fetchColumn());
            if (!empty($dbEmail) && !str_ends_with($dbEmail, '@netraunnayan.com')) {
                $custEmail = $dbEmail;
            }
        } catch (Exception $e) {}
    }

    if (!empty($custEmail) && !str_ends_with($custEmail, '@netraunnayan.com')) {
        try {
            $custName = $order['customer_name'] ?: 'Valued Customer';
            $refundNotice = ($order['payment_status'] === 'Paid')
                ? "<div style='padding:12px; background:#ECFDF5; border-left:4px solid #10B981; border-radius:6px; margin:16px 0; color:#065F46; font-size:13px;'><strong>Full Refund Initiated:</strong> A refund of ₹{$order['total_amount']} has been initiated to your original payment mode and will credit within 5–7 business days.</div>"
                : "<div style='padding:12px; background:#F8FAFC; border-left:4px solid #64748B; border-radius:6px; margin:16px 0; color:#475569; font-size:13px;'>No payment was captured for this order.</div>";

            $emailBody = <<<HTML
                <div style="background:#FEE2E2; color:#B91C1C; padding:6px 14px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block; border:1px solid #F87171;">
                    Order Cancelled
                </div>
                <h2 style="color:#0F172A; margin-top:14px;">Cancellation Confirmation for Order #{$orderNumber}</h2>
                <p>Dear {$custName},</p>
                <p>Your order <strong>{$orderNumber}</strong> has been cancelled as requested before lens cutting started.</p>
                
                <div style="margin:16px 0; padding:12px 16px; background:#FFFBEB; border-left:4px solid #F59E0B; border-radius:6px; font-size:13px; color:#78350F;">
                    <strong>Reason for Cancellation:</strong> {$cancelReason}
                </div>

                {$refundNotice}

                <div style="margin-top:24px; text-align:center;">
                    <a href="https://netraunnayan.com/shop" style="background:#0284C7; color:#FFFFFF; padding:12px 24px; border-radius:10px; font-weight:bold; font-size:13px; text-decoration:none; display:inline-block;">
                        Browse Eyewear Catalog &rarr;
                    </a>
                </div>
HTML;
            Mailer::send($custEmail, $custName, "Order Cancelled - {$orderNumber} | Netra Unnayan", $emailBody);
        } catch (\Throwable $e) {
            error_log('Cancellation email non-fatal error: ' . $e->getMessage());
        }
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
