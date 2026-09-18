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

    $stmt = $pdo->prepare('SELECT r.*, o.order_number, o.customer_name, o.customer_email, o.customer_id, o.customer_phone FROM refunds r JOIN orders o ON r.order_id = o.id WHERE r.id = ?');
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
    if ($status === 'Completed') {
        try {
            $custEmail = Mailer::resolveCustomerEmail($pdo, $refund);
            if (!empty($custEmail)) {
                $custName = !empty($refund['customer_name']) ? $refund['customer_name'] : 'Valued Customer';
                $emailBody = <<<HTML
                    <div class="badge" style="background:#D1FAE5; color:#065F46; padding:4px 10px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block; border:1px solid #A7F3D0;">&#10003; Refund Completed</div>
                    <h2 style="color:#0F172A; margin-top:14px;">Refund Processed for Order #{$refund['order_number']}</h2>
                    <p>Dear {$custName},</p>
                    <p>Your refund of <strong>₹{$refund['amount']}</strong> for Order <strong>#{$refund['order_number']}</strong> has been processed successfully by our accounts team.</p>
                    <div style="margin:16px 0; padding:14px; background:#F0FDF4; border-left:4px solid #10B981; border-radius:6px;">
                        <p style="margin:0; font-size:13px; color:#065F46;"><strong>Refund Reference:</strong> {$refund['refund_number']}</p>
                        <p style="margin:4px 0 0; font-size:13px; color:#065F46;"><strong>Bank Reference #:</strong> {$txnRef}</p>
                    </div>
                    <p style="color:#334155; font-size:13px;">The funds will reflect in your source bank account / UPI within 3–5 business days depending on your bank's clearing cycle.</p>
                    <p style="color:#64748B; font-size:12px; margin-top:20px;">If you have any questions, feel free to reach out to us at <a href="https://wa.me/919382293614" style="color:#059669; font-weight:bold;">+91 9382293614</a>.</p>
HTML;
                Mailer::send($custEmail, $custName, "Refund Processed - {$refund['refund_number']} | Netra Unnayan", $emailBody);
            }
        } catch (\Throwable $mailErr) {
            error_log('Refund notification email error: ' . $mailErr->getMessage());
        }
    }

    Response::success([
        'refund_id'             => $refundId,
        'refund_number'         => $refund['refund_number'],
        'status'                => $status,
        'transaction_reference' => $txnRef
    ], "Refund {$refund['refund_number']} marked as {$status}.");
}
