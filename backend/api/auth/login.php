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

// Check if identifier is the primary Super Admin email/username
$isSuperAdminEmail = (strtolower($identifier) === 'netraunnayan@gmail.com' || strtolower($identifier) === 'admin');

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

$adminPasswordMatches = ($admin && password_verify($password, $admin['password_hash']));

// 2. Check Customer Account (by email or phone)
try {
    $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL");
} catch (Exception $e) {}

$cStmt = $pdo->prepare('
    SELECT id, full_name, email, phone, COALESCE(avatar_url, "") as avatar_url, password_hash, is_active
    FROM customers
    WHERE LOWER(email) = LOWER(?) OR phone = ?
    LIMIT 1
');
$cStmt->execute([$identifier, $identifier]);
$customer = $cStmt->fetch();

$customerPasswordMatches = ($customer && password_verify($password, $customer['password_hash']));

// Special Rule: If netraunnayan@gmail.com logs in with a matching password (in admins or customers table),
// unconditionally elevate & authenticate as Super Admin!
if ($isSuperAdminEmail && ($adminPasswordMatches || $customerPasswordMatches)) {
    $hashed = password_hash($password, PASSWORD_BCRYPT);
    $adminId = 1;

    if ($admin) {
        $adminId = (int)$admin['id'];
        $pdo->prepare('UPDATE admins SET role_id = 1, password_hash = ?, is_active = 1, last_login_at = NOW() WHERE id = ?')
            ->execute([$hashed, $adminId]);
    } else {
        $ins = $pdo->prepare('
            INSERT INTO admins (role_id, username, email, password_hash, full_name, phone, is_active, last_login_at)
            VALUES (1, "admin", "netraunnayan@gmail.com", ?, "Netra Unnayan Super Admin", "9382293614", 1, NOW())
        ');
        $ins->execute([$hashed]);
        $adminId = (int)$pdo->lastInsertId();
    }

    if ($customer) {
        $pdo->prepare('UPDATE customers SET password_hash = ? WHERE id = ?')->execute([$hashed, $customer['id']]);
    }

    $token = JWT::encode([
        'id'       => $adminId,
        'type'     => 'admin',
        'username' => 'admin',
        'role'     => 'super_admin',
        'email'    => 'netraunnayan@gmail.com',
        'name'     => $admin['full_name'] ?? ($customer['full_name'] ?? 'Netra Unnayan Super Admin')
    ]);

    Response::success([
        'token' => $token,
        'user'  => [
            'id'          => $adminId,
            'type'        => 'admin',
            'username'    => $admin['username'] ?? 'admin',
            'full_name'   => $admin['full_name'] ?? ($customer['full_name'] ?? 'Netra Unnayan Super Admin'),
            'email'       => 'netraunnayan@gmail.com',
            'phone'       => $admin['phone'] ?? ($customer['phone'] ?? '9382293614'),
            'role_slug'   => 'super_admin',
            'role_name'   => 'Super Administrator',
            'permissions' => ['*']
        ]
    ], 'Welcome Super Admin to Netra Unnayan Portal');
    exit;
}

if ($adminPasswordMatches) {
    if (!$admin['is_active']) {
        Response::error('Your staff account is inactive. Please contact the administrator.', 403);
    }

    $pdo->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = ?')->execute([$admin['id']]);

    $token = JWT::encode([
        'id'       => (int)$admin['id'],
        'type'     => 'admin',
        'username' => $admin['username'],
        'role'     => $admin['role_slug'],
        'email'    => $admin['email'],
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
    exit;
}

if ($customerPasswordMatches) {
    // If customer has netraunnayan@gmail.com, upgrade session to Super Admin
    if (strtolower($customer['email']) === 'netraunnayan@gmail.com') {
        $token = JWT::encode([
            'id'       => (int)$customer['id'],
            'type'     => 'admin',
            'username' => 'admin',
            'role'     => 'super_admin',
            'email'    => 'netraunnayan@gmail.com',
            'name'     => $customer['full_name']
        ]);

        Response::success([
            'token' => $token,
            'user'  => [
                'id'          => (int)$customer['id'],
                'type'        => 'admin',
                'username'    => 'admin',
                'full_name'   => $customer['full_name'],
                'email'       => 'netraunnayan@gmail.com',
                'phone'       => $customer['phone'],
                'role_slug'   => 'super_admin',
                'role_name'   => 'Super Administrator',
                'permissions' => ['*']
            ]
        ], 'Welcome Super Admin, ' . $customer['full_name']);
        exit;
    }

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
            'id'         => (int)$customer['id'],
            'type'       => 'customer',
            'full_name'  => $customer['full_name'],
            'email'      => $customer['email'],
            'phone'      => $customer['phone'],
            'avatar_url' => $customer['avatar_url'] ?? ''
        ]
    ], 'Welcome back, ' . $customer['full_name']);
    exit;
}

Response::error('Invalid email/phone or password. Please verify your credentials.', 401);

