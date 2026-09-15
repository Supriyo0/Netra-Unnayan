<?php
// Netra Unnayan - Unified Authentication (Customer & Staff Admin)
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/jwt.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$identifier = trim($input['identifier'] ?? $input['email'] ?? $input['username'] ?? '');
$password = $input['password'] ?? '';

if (empty($identifier) || empty($password)) {
    Response::error('Please provide email/username and password.', 422);
}

$pdo = Database::getConnection();

// 1. Check if matching Admin / Staff Account
$stmt = $pdo->prepare('
    SELECT a.id, a.username, a.email, a.password_hash, a.full_name, a.phone, a.is_active,
           r.slug as role_slug, r.name as role_name, r.permissions
    FROM admins a
    JOIN admin_roles r ON a.role_id = r.id
    WHERE (LOWER(a.username) = LOWER(?) OR LOWER(a.email) = LOWER(?))
    LIMIT 1
');
$stmt->execute([$identifier, $identifier]);
$admin = $stmt->fetch();

if ($admin && password_verify($password, $admin['password_hash'])) {
    if (!$admin['is_active']) {
        Response::error('Your staff account is inactive. Please contact the administrator.', 403);
    }

    $pdo->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = ?')->execute([$admin['id']]);

    $token = JWT::encode([
        'id'       => (int)$admin['id'],
        'type'     => 'admin',
        'username' => $admin['username'],
        'role'     => $admin['role_slug'],
        'name'     => $admin['full_name']
    ]);

    Response::success([
        'token' => $token,
        'user'  => [
            'id'          => (int)$admin['id'],
            'type'        => 'admin',
            'username'    => $admin['username'],
            'full_name'   => $admin['full_name'],
            'email'       => $admin['email'],
            'phone'       => $admin['phone'],
            'role_slug'   => $admin['role_slug'],
            'role_name'   => $admin['role_name'],
            'permissions' => json_decode($admin['permissions'] ?? '[]', true)
        ]
    ], 'Welcome to Netra Unnayan Admin Portal, ' . $admin['full_name']);
}

// 2. Check Customer Account (by email or phone)
$stmt = $pdo->prepare('
    SELECT id, full_name, email, phone, password_hash, is_active
    FROM customers
    WHERE LOWER(email) = LOWER(?) OR phone = ?
    LIMIT 1
');
$stmt->execute([$identifier, $identifier]);
$customer = $stmt->fetch();

if ($customer && password_verify($password, $customer['password_hash'])) {
    if (!$customer['is_active']) {
        Response::error('Your account is currently disabled. Please contact support.', 403);
    }

    $token = JWT::encode([
        'id'    => (int)$customer['id'],
        'type'  => 'customer',
        'email' => $customer['email'],
        'name'  => $customer['full_name']
    ]);

    Response::success([
        'token' => $token,
        'user'  => [
            'id'        => (int)$customer['id'],
            'type'      => 'customer',
            'full_name' => $customer['full_name'],
            'email'     => $customer['email'],
            'phone'     => $customer['phone']
        ]
    ], 'Welcome back, ' . $customer['full_name']);
}

Response::error('Invalid email/phone or password. Please verify your credentials.', 401);
