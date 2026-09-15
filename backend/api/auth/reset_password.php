<?php
// Netra Unnayan - Reset Password via OTP Verification
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

date_default_timezone_set('Asia/Kolkata');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$email = strtolower(trim($input['email'] ?? ''));
$otp = trim($input['otp'] ?? '');
$newPassword = trim($input['new_password'] ?? '');

if (empty($email) || empty($otp) || empty($newPassword)) {
    Response::error('Email, 6-digit OTP, and new password are required.', 422);
}

if (strlen($newPassword) < 6) {
    Response::error('New password must be at least 6 characters long.', 422);
}

$pdo = Database::getConnection();

// Verify OTP
$stmt = $pdo->prepare('
    SELECT id, email, otp, expires_at 
    FROM password_resets 
    WHERE LOWER(email) = ? AND otp = ? AND expires_at >= NOW()
    ORDER BY id DESC LIMIT 1
');
$stmt->execute([$email, $otp]);
$reset = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$reset) {
    Response::error('Invalid or expired OTP code. Please verify the 6-digit code or request a fresh OTP.', 400);
}

$hashed = password_hash($newPassword, PASSWORD_BCRYPT);
$updated = false;

// Check if admin/staff account
$admCheck = $pdo->prepare('SELECT id FROM admins WHERE LOWER(email) = ? OR LOWER(username) = ?');
$admCheck->execute([$email, $email]);
$admins = $admCheck->fetchAll(PDO::FETCH_ASSOC);
foreach ($admins as $adm) {
    $upd = $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?');
    $upd->execute([$hashed, $adm['id']]);
    $updated = true;
}

// Check if customer account
$custCheck = $pdo->prepare('SELECT id FROM customers WHERE LOWER(email) = ?');
$custCheck->execute([$email]);
$customers = $custCheck->fetchAll(PDO::FETCH_ASSOC);
foreach ($customers as $cust) {
    $upd = $pdo->prepare('UPDATE customers SET password_hash = ? WHERE id = ?');
    $upd->execute([$hashed, $cust['id']]);
    $updated = true;
}

if (!$updated) {
    Response::error('User account not found.', 404);
}

// Invalidate reset records for this email
$del = $pdo->prepare('DELETE FROM password_resets WHERE LOWER(email) = ?');
$del->execute([$email]);

Response::success([], 'Password has been reset successfully! You can now sign in with your new password.');
