<?php
// Netra Unnayan - Customer Profile Settings API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$customer = requireCustomerAuth();
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Ensure optional columns exist in customers table
try {
    $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL AFTER phone");
    $pdo->exec("ALTER TABLE customers MODIFY COLUMN avatar_url TEXT NULL");
    $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20) NULL AFTER phone");
    $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NULL AFTER phone");
    $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS dob DATE NULL AFTER phone");
    $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS optical_preference VARCHAR(100) NULL AFTER phone");
} catch (Exception $e) {
    // Ignore if column already exists on older MySQL without IF NOT EXISTS
}

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT id, full_name, email, phone, alternate_phone, gender, dob, optical_preference, avatar_url, created_at FROM customers WHERE id = ?');
    $stmt->execute([$customer['id']]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);
    Response::success($data, 'Profile retrieved');
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $action = trim($input['action'] ?? 'update_profile');

    // Action: Change Password
    if ($action === 'change_password') {
        $currentPass = trim($input['current_password'] ?? '');
        $newPass = trim($input['new_password'] ?? '');

        if (empty($currentPass) || empty($newPass)) {
            Response::error('Current and new password are required.', 422);
        }

        if (strlen($newPass) < 6) {
            Response::error('New password must be at least 6 characters long.', 422);
        }

        $stmt = $pdo->prepare('SELECT password_hash FROM customers WHERE id = ?');
        $stmt->execute([$customer['id']]);
        $currentHash = $stmt->fetchColumn();

        if (!$currentHash || !password_verify($currentPass, $currentHash)) {
            Response::error('Current password does not match our records.', 401);
        }

        $newHash = password_hash($newPass, PASSWORD_DEFAULT);
        $upStmt = $pdo->prepare('UPDATE customers SET password_hash = ? WHERE id = ?');
        $upStmt->execute([$newHash, $customer['id']]);

        Response::success([], 'Password updated successfully. Please use your new password next time.');
    }

    // Action: Update Profile Details
    $fullName = trim($input['full_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $email = trim($input['email'] ?? '');
    $alternatePhone = trim($input['alternate_phone'] ?? '');
    $gender = trim($input['gender'] ?? '');
    $dob = !empty($input['dob']) ? trim($input['dob']) : null;
    $opticalPreference = trim($input['optical_preference'] ?? '');
    $avatarUrl = trim($input['avatar_url'] ?? '');

    if (empty($fullName)) {
        Response::error('Full name cannot be empty', 422);
    }

    // Check email uniqueness if changed
    if (!empty($email) && $email !== $customer['email']) {
        $checkStmt = $pdo->prepare('SELECT id FROM customers WHERE email = ? AND id != ?');
        $checkStmt->execute([$email, $customer['id']]);
        if ($checkStmt->fetch()) {
            Response::error('This email is already associated with another account.', 409);
        }
    }

    // Attempt update with all columns
    try {
        $stmt = $pdo->prepare('
            UPDATE customers 
            SET full_name = ?, phone = ?, email = ?, alternate_phone = ?, gender = ?, dob = ?, optical_preference = ?, avatar_url = ?
            WHERE id = ?
        ');
        $stmt->execute([$fullName, $phone, $email, $alternatePhone, $gender, $dob, $opticalPreference, $avatarUrl, $customer['id']]);
    } catch (Exception $ex) {
        // Fallback if some columns are pending
        $stmt = $pdo->prepare('
            UPDATE customers 
            SET full_name = ?, phone = ?, email = ?, avatar_url = ?
            WHERE id = ?
        ');
        $stmt->execute([$fullName, $phone, $email, $avatarUrl, $customer['id']]);
    }

    // Also sync avatar to admin account if exists
    try {
        $pdo->exec("ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL");
        $aStmt = $pdo->prepare('UPDATE admins SET avatar_url = ? WHERE email = ? OR (phone = ? AND phone != "")');
        $aStmt->execute([$avatarUrl, $email, $phone]);
    } catch (Exception $e) {}

    $updated = [
        'id' => $customer['id'],
        'full_name' => $fullName,
        'email' => $email,
        'phone' => $phone,
        'alternate_phone' => $alternatePhone,
        'gender' => $gender,
        'dob' => $dob,
        'optical_preference' => $opticalPreference,
        'avatar_url' => $avatarUrl
    ];

    Response::success($updated, 'Profile updated successfully');
}

Response::error('Method not allowed', 405);

