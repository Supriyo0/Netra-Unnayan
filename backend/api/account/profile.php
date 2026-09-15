<?php
// Netra Unnayan - Customer Profile Settings API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$customer = requireCustomerAuth();
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT id, full_name, email, phone, avatar_url, created_at FROM customers WHERE id = ?');
    $stmt->execute([$customer['id']]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);
    Response::success($data, 'Profile retrieved');
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $fullName = trim($input['full_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $email = trim($input['email'] ?? '');
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

    $stmt = $pdo->prepare('
        UPDATE customers 
        SET full_name = ?, phone = ?, email = ?, avatar_url = ?
        WHERE id = ?
    ');
    $stmt->execute([$fullName, $phone, $email, $avatarUrl, $customer['id']]);

    $updated = [
        'id' => $customer['id'],
        'full_name' => $fullName,
        'email' => $email,
        'phone' => $phone,
        'avatar_url' => $avatarUrl
    ];

    Response::success($updated, 'Profile updated successfully');
}

Response::error('Method not allowed', 405);
