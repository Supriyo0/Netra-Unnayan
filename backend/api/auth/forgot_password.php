<?php
// Netra Unnayan - Forgot Password (OTP Generation & Dispatch)
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/mailer.php';

date_default_timezone_set('Asia/Kolkata');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$email = strtolower(trim($input['email'] ?? ''));

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::error('Please enter a valid email address.', 422);
}

$pdo = Database::getConnection();

// Check if email exists in customers or admins
$customerStmt = $pdo->prepare('SELECT id, full_name, email FROM customers WHERE LOWER(email) = ? LIMIT 1');
$customerStmt->execute([$email]);
$user = $customerStmt->fetch(PDO::FETCH_ASSOC);
$userType = 'customer';

if (!$user) {
    $adminStmt = $pdo->prepare('SELECT id, full_name, email FROM admins WHERE LOWER(email) = ? LIMIT 1');
    $adminStmt->execute([$email]);
    $user = $adminStmt->fetch(PDO::FETCH_ASSOC);
    $userType = 'admin';
}

if (!$user) {
    // For security, don't leak user existence directly, but return friendly message
    Response::error('No account registered with this email address.', 404);
}

// Generate 6-digit numeric OTP
$otp = (string)random_int(100000, 999999);
$token = bin2hex(random_bytes(24));

// Save OTP in password_resets table using MySQL DATE_ADD to ensure consistent local timezone
$ins = $pdo->prepare('
    INSERT INTO password_resets (email, otp, token, expires_at)
    VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
');
$ins->execute([$email, $otp, $token]);

// Dispatch OTP Email
$sent = Mailer::sendPasswordReset($email, $user['full_name'] ?? 'Valued Member', $otp, "https://netraunnayan.com/reset-password?token=$token");

Response::success([
    'email' => $email,
    'token' => $token,
    'expires_in_minutes' => 15,
    'email_dispatched' => $sent
], 'A 6-digit security OTP has been dispatched to your email address.');
