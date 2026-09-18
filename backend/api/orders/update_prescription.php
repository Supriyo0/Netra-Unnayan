<?php
// Netra Unnayan - Customer Prescription Update API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$customer = requireCustomerAuth();
$pdo = Database::getConnection();

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$orderId = (int)($input['order_id'] ?? 0);

if (!$orderId) {
    Response::error('Order ID is required.', 422);
}

$stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
$stmt->execute([$orderId]);
$order = $stmt->fetch();

if (!$order) {
    Response::notFound('Order not found.');
}

// Ensure customer has rights to update this order
$custId = (int)($customer['id'] ?? 0);
$custPhone = trim($customer['phone'] ?? '');
$cleanPhone = preg_replace('/[^0-9]/', '', $custPhone);
$last10 = strlen($cleanPhone) >= 10 ? substr($cleanPhone, -10) : $cleanPhone;
$custEmail = strtolower(trim($customer['email'] ?? ''));

$isOwner = ((int)$order['customer_id'] === $custId)
    || (!empty($custEmail) && strtolower($order['customer_email']) === $custEmail)
    || (!empty($last10) && str_ends_with(preg_replace('/[^0-9]/', '', $order['customer_phone']), $last10));

if (!$isOwner && ($customer['type'] ?? '') !== 'admin') {
    Response::error('You do not have permission to update this order.', 403);
}

$rawMethod = strtoupper(trim($input['method'] ?? 'IMAGE_UPLOAD'));
$validMethods = ['FORM', 'IMAGE_UPLOAD', 'WHATSAPP', 'SAVED_PROFILE'];
$method = 'IMAGE_UPLOAD';
if (in_array($rawMethod, $validMethods)) {
    $method = $rawMethod;
} elseif ($rawMethod === 'UPLOAD') {
    $method = 'IMAGE_UPLOAD';
}

$imageUrl = $input['rx_image_url'] ?? $input['file_url'] ?? $input['image_url'] ?? null;
$customerNotes = trim($input['notes'] ?? '');

$rightSph = isset($input['right_sph']) && $input['right_sph'] !== '' ? (float)$input['right_sph'] : null;
$rightCyl = isset($input['right_cyl']) && $input['right_cyl'] !== '' ? (float)$input['right_cyl'] : null;
$rightAxis = isset($input['right_axis']) && $input['right_axis'] !== '' ? (int)$input['right_axis'] : null;
$rightAdd = isset($input['right_add']) && $input['right_add'] !== '' ? (float)$input['right_add'] : null;
$rightPd = isset($input['right_pd']) && $input['right_pd'] !== '' ? (float)$input['right_pd'] : null;

$leftSph = isset($input['left_sph']) && $input['left_sph'] !== '' ? (float)$input['left_sph'] : null;
$leftCyl = isset($input['left_cyl']) && $input['left_cyl'] !== '' ? (float)$input['left_cyl'] : null;
$leftAxis = isset($input['left_axis']) && $input['left_axis'] !== '' ? (int)$input['left_axis'] : null;
$leftAdd = isset($input['left_add']) && $input['left_add'] !== '' ? (float)$input['left_add'] : null;
$leftPd = isset($input['left_pd']) && $input['left_pd'] !== '' ? (float)$input['left_pd'] : null;
$singlePd = isset($input['single_pd']) && $input['single_pd'] !== '' ? (float)$input['single_pd'] : null;

// Update or Insert into order_prescriptions
$rxCount = (int)$pdo->query("SELECT COUNT(*) FROM order_prescriptions WHERE order_id = {$orderId}")->fetchColumn();

if ($rxCount > 0) {
    $upStmt = $pdo->prepare('
        UPDATE order_prescriptions 
        SET submission_method = ?,
            rx_image_url = COALESCE(?, rx_image_url),
            right_sph = ?, right_cyl = ?, right_axis = ?, right_add = ?, right_pd = ?,
            left_sph = ?, left_cyl = ?, left_axis = ?, left_add = ?, left_pd = ?,
            single_pd = ?,
            status = "Pending Review",
            admin_notes = ?
        WHERE order_id = ?
    ');
    $upStmt->execute([
        $method, $imageUrl,
        $rightSph, $rightCyl, $rightAxis, $rightAdd, $rightPd,
        $leftSph, $leftCyl, $leftAxis, $leftAdd, $leftPd,
        $singlePd,
        $customerNotes ? "Customer update: {$customerNotes}" : "Updated by customer",
        $orderId
    ]);
} else {
    $insStmt = $pdo->prepare('
        INSERT INTO order_prescriptions (
            order_id, submission_method, rx_image_url,
            right_sph, right_cyl, right_axis, right_add, right_pd,
            left_sph, left_cyl, left_axis, left_add, left_pd,
            single_pd, status, admin_notes
        ) VALUES (
            ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, "Pending Review", ?
        )
    ');
    $insStmt->execute([
        $orderId, $method, $imageUrl,
        $rightSph, $rightCyl, $rightAxis, $rightAdd, $rightPd,
        $leftSph, $leftCyl, $leftAxis, $leftAdd, $leftPd,
        $singlePd,
        $customerNotes ? "Customer submission: {$customerNotes}" : "Submitted by customer"
    ]);
}

// Update Order status
$pdo->prepare('UPDATE orders SET prescription_status = "Pending Review" WHERE id = ?')->execute([$orderId]);

// Record history
$logNote = "Customer submitted updated prescription ({$method})" . ($customerNotes ? ": {$customerNotes}" : "");
$pdo->prepare('
    INSERT INTO order_status_history (order_id, old_status, new_status, note)
    VALUES (?, ?, ?, ?)
')->execute([$orderId, $order['order_status'], $order['order_status'], $logNote]);

// Dispatch email confirmation
try {
    $custEmail = Mailer::resolveCustomerEmail($pdo, $order);
    if (!empty($custEmail)) {
        $custName = !empty($order['customer_name']) ? $order['customer_name'] : 'Valued Customer';
        $emailBody = <<<HTML
            <div style="background:#E0F2FE; color:#0369A1; padding:6px 14px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block; border:1px solid #BAE6FD;">
                Prescription Under Review
            </div>
            <h2 style="color:#0F172A; margin-top:16px;">Updated Prescription Received for Order #{$order['order_number']}</h2>
            <p>Dear {$custName},</p>
            <p>Thank you for providing your updated optical prescription parameters. Our senior clinical optometrist is reviewing your details to ensure exact optical focal alignment.</p>
            <div style="margin:16px 0; padding:14px; background:#F8FAFC; border-left:4px solid #0284C7; border-radius:6px;">
                <p style="margin:0; font-size:13px; color:#334155;"><strong>Status:</strong> Under Verification by Optometrist Desk</p>
                <p style="margin:4px 0 0; font-size:12px; color:#64748B;">Once approved, customized lens cutting and frame edging will start immediately.</p>
            </div>
            <div style="margin-top:20px; text-align:center;">
                <a href="https://netraunnayan.com/order-tracking?order={$order['order_number']}" style="display:inline-block; background:#0284C7; color:#FFFFFF; text-decoration:none; padding:10px 18px; border-radius:6px; font-weight:bold; font-size:13px;">Track Order Live &rarr;</a>
            </div>
            <p style="color:#64748B; font-size:12px; margin-top:20px;">For instant support, WhatsApp our optometrist team at <a href="https://wa.me/919382293614" style="color:#059669; font-weight:bold;">+91 9382293614</a>.</p>
HTML;
        Mailer::send($custEmail, $custName, "Updated Prescription Received - Order #{$order['order_number']} | Netra Unnayan", $emailBody);
    }
} catch (\Throwable $mailErr) {
    error_log('Update prescription email non-fatal error: ' . $mailErr->getMessage());
}

Response::success([
    'order_id'            => $orderId,
    'prescription_status' => 'Pending Review',
    'status'              => 'Pending Review',
    'rx_image_url'        => $imageUrl
], 'Prescription updated successfully. Our optometrist team will review it shortly.');
