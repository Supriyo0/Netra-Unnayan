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

try {
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

    // Save OTP in password_resets table (auto-create table if missing)
    try {
        $ins = $pdo->prepare('
            INSERT INTO password_resets (email, otp, token, expires_at)
            VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
        ');
        $ins->execute([$email, $otp, $token]);
    } catch (\PDOException $e) {
        if (str_contains($e->getMessage(), "doesn't exist") || str_contains($e->getMessage(), '42S02') || str_contains($e->getMessage(), '1146')) {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS `password_resets` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `email` VARCHAR(150) NOT NULL,
                    `otp` VARCHAR(10) NOT NULL,
                    `token` VARCHAR(100) NULL,
                    `expires_at` DATETIME NOT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX `idx_reset_email` (`email`),
                    INDEX `idx_reset_otp` (`otp`),
                    INDEX `idx_reset_token` (`token`)
                ) ENGINE=InnoDB;
            ");
            $ins = $pdo->prepare('
                INSERT INTO password_resets (email, otp, token, expires_at)
                VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
            ');
            $ins->execute([$email, $otp, $token]);
        } else {
            throw $e;
        }
    }

    // Dispatch OTP Email
    $sent = false;
    try {
        $sent = Mailer::sendPasswordReset($email, $user['full_name'] ?? 'Valued Member', $otp, "https://netraunnayan.com/reset-password?token=$token");
    } catch (\Throwable $mailErr) {
        error_log('Mailer error: ' . $mailErr->getMessage());
    }

    Response::success([
        'email' => $email,
        'token' => $token,
        'expires_in_minutes' => 15,
        'email_dispatched' => $sent
    ], $sent 
        ? 'A 6-digit security OTP has been dispatched to your email address.'
        : 'A 6-digit security OTP has been generated. Please check your email or contact support if not received.');

} catch (\Throwable $e) {
    Response::error('Failed to process password reset: ' . $e->getMessage(), 500);
}
