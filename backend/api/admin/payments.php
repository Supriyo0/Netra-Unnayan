<?php
// Netra Unnayan - Admin Payment Approval & UTR Verification API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/mailer.php';

$admin = requireAdminAuth();
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $status = $_GET['status'] ?? '';
        $query = "
            SELECT 
                p.*,
                o.order_number,
                o.customer_name,
                o.customer_phone,
                o.customer_email,
                o.total_amount,
                o.payment_mode,
                o.order_status,
                o.created_at as order_date
            FROM payments p
            LEFT JOIN orders o ON p.order_id = o.id
            WHERE 1=1
        ";
        
        $params = [];
        if (!empty($status) && $status !== 'all') {
            $query .= " AND p.status = ?";
            $params[] = $status;
        }
        $query .= " ORDER BY p.id DESC LIMIT 100";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $payments = $stmt->fetchAll();

        // Count pending approvals
        $pendingCount = (int)$pdo->query("SELECT COUNT(*) FROM payments WHERE status IN ('Pending', 'Under Verification')")->fetchColumn();

        Response::success([
            'payments'      => $payments,
            'pending_count' => $pendingCount
        ], 'Payments loaded');
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $paymentId = (int)($input['payment_id'] ?? 0);
        $newStatus = trim($input['status'] ?? ''); // 'Paid', 'Failed', 'Refunded'
        $reason = trim($input['reason'] ?? '');

        if (!$paymentId || empty($newStatus)) {
            Response::error('Payment ID and valid status required', 422);
        }

        // Get payment record
        $stmt = $pdo->prepare("SELECT p.*, o.order_number, o.customer_name, o.customer_email FROM payments p LEFT JOIN orders o ON p.order_id = o.id WHERE p.id = ?");
        $stmt->execute([$paymentId]);
        $payment = $stmt->fetch();

        if (!$payment) {
            Response::error('Payment record not found', 404);
        }

        $adminId = $admin['id'] ?? null;
        $now = date('Y-m-d H:i:s');

        $pdo->beginTransaction();

        $updateStmt = $pdo->prepare("
            UPDATE payments 
            SET status = ?, verified_by_admin_id = ?, verified_at = ?, failure_reason = ?
            WHERE id = ?
        ");
        $updateStmt->execute([$newStatus, $adminId, $now, $reason ?: null, $paymentId]);

        // If payment approved, update order payment_status to 'Paid' and order_status to 'Order Confirmed'
        if ($newStatus === 'Paid' && !empty($payment['order_id'])) {
            $orderStmt = $pdo->prepare("UPDATE orders SET payment_status = 'Paid', order_status = 'Order Confirmed', updated_at = NOW() WHERE id = ?");
            $orderStmt->execute([$payment['order_id']]);

            // Add to status history
            $pdo->prepare("INSERT INTO order_status_history (order_id, old_status, new_status, note, updated_by_admin_id) VALUES (?, 'Payment Under Verification', 'Order Confirmed', 'UPI Payment verified and confirmed by Admin staff.', ?)")
                ->execute([$payment['order_id'], $adminId]);

            // Send confirmation email
            if (!empty($payment['customer_email'])) {
                $emailHtml = <<<HTML
                    <div style="background:#DCFCE7; color:#15803D; padding:4px 10px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block;">&#10003; Payment Approved & Confirmed</div>
                    <h2>Payment Verified for Order #{$payment['order_number']}</h2>
                    <p>Dear {$payment['customer_name']}, your online UPI payment of <strong>₹{$payment['amount']}</strong> has been verified by our accounts team.</p>
                    <p>Your order is now <strong>Confirmed</strong> and moving into optical lens fabrication.</p>
HTML;
                Mailer::send($payment['customer_email'], $payment['customer_name'], "Payment Approved: Order #{$payment['order_number']} - Netra Unnayan", $emailHtml);
            }
        } elseif ($newStatus === 'Failed' && !empty($payment['order_id'])) {
            $orderStmt = $pdo->prepare("UPDATE orders SET payment_status = 'Failed', order_status = 'Payment Failed', updated_at = NOW() WHERE id = ?");
            $orderStmt->execute([$payment['order_id']]);
        }

        $pdo->commit();

        Response::success(null, "Payment status successfully updated to '{$newStatus}'!");
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    Response::error($e->getMessage(), 500);
}
