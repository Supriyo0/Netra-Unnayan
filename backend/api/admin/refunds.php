<?php
// Netra Unnayan - Admin Refund Approval & Management Engine
// RULE: Only authorized staff (Super Admin / Manager) can approve refunds. All actions audited.

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/mailer.php';

$admin = requireAdminAuth(['super_admin', 'manager']);
$pdo = Database::getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query('
        SELECT r.*, o.order_number, o.customer_name, o.customer_email, o.customer_phone, o.payment_mode,
               a.full_name as approved_by_name
        FROM refunds r
        JOIN orders o ON r.order_id = o.id
        LEFT JOIN admins a ON r.approved_by_admin_id = a.id
        ORDER BY r.id DESC
    ');
    $refunds = $stmt->fetchAll();
    Response::success($refunds, 'Refund requests loaded');

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $refundId = (int)($input['refund_id'] ?? 0);
    $status = trim($input['status'] ?? 'Completed'); // Approved, Completed, Failed
    $txnRef = trim($input['transaction_reference'] ?? 'BANK-REF-' . strtoupper(bin2hex(random_bytes(3))));

    if (!$refundId || !in_array($status, ['Approved', 'Completed', 'Failed'])) {
        Response::error('Valid Refund ID and status (Approved/Completed/Failed) required.', 422);
    }

    $stmt = $pdo->prepare('SELECT r.*, o.order_number, o.customer_name, o.customer_email FROM refunds r JOIN orders o ON r.order_id = o.id WHERE r.id = ?');
    $stmt->execute([$refundId]);
    $refund = $stmt->fetch();

    if (!$refund) Response::notFound('Refund record not found.');

    $pdo->prepare('
        UPDATE refunds 
        SET status = ?, transaction_reference = ?, approved_by_admin_id = ?, processed_at = NOW()
        WHERE id = ?
    ')->execute([$status, $txnRef, $admin['id'], $refundId]);

    // Update order payment status
    $newPayStatus = ($status === 'Completed') ? 'Refunded' : 'Refund Initiated';
    $pdo->prepare('UPDATE orders SET payment_status = ? WHERE id = ?')->execute([$newPayStatus, $refund['order_id']]);

    // Status history
    $pdo->prepare('
        INSERT INTO order_status_history (order_id, old_status, new_status, note, updated_by_admin_id)
        VALUES (?, "Cancelled", "Refunded", ?, ?)
    ')->execute([$refund['order_id'], "Refund {$refund['refund_number']} marked as {$status} by {$admin['full_name']}. Ref: {$txnRef}", $admin['id']]);

    // Notify customer
    if (!empty($refund['customer_email']) && $status === 'Completed') {
        $emailBody = <<<HTML
            <div class="badge" style="background:#D1FAE5; color:#065F46;">Refund Completed</div>
            <h2>Refund Processed</h2>
            <p>Dear {$refund['customer_name']}, your refund of <strong>₹{$refund['amount']}</strong> for Order <strong>{$refund['order_number']}</strong> has been processed successfully.</p>
            <p><strong>Bank Reference #:</strong> {$txnRef}</p>
            <p>The funds will reflect in your source account within 5–7 business days according to standard banking clearing schedules.</p>
HTML;
        Mailer::send($refund['customer_email'], $refund['customer_name'], "Refund Processed - {$refund['refund_number']} | Netra Unnayan", $emailBody);
    }

    Response::success([
        'refund_id'             => $refundId,
        'refund_number'         => $refund['refund_number'],
        'status'                => $status,
        'transaction_reference' => $txnRef
    ], "Refund {$refund['refund_number']} marked as {$status}.");
}
