<?php
// Netra Unnayan - Current Authenticated User & Profile API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

$auth = getOptionalAuth();
if (!$auth) {
    Response::unauthorized('Not authenticated');
}

$pdo = Database::getConnection();

try {
    $pdo->exec("ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL");
    $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL");
} catch (Exception $e) {}

$isSuperAdmin = (($auth['type'] ?? '') === 'admin' && ($auth['role'] ?? '') === 'super_admin') 
             || (strtolower($auth['email'] ?? '') === 'netraunnayan@gmail.com');

if (($auth['type'] ?? '') === 'admin' || $isSuperAdmin) {
    $stmt = $pdo->prepare('
        SELECT a.id, a.username, a.email, a.full_name, a.phone, a.is_active, COALESCE(a.avatar_url, "") as avatar_url,
               r.slug as role_slug, r.name as role_name, r.permissions
        FROM admins a
        JOIN admin_roles r ON a.role_id = r.id
        WHERE a.id = ? OR LOWER(a.email) = "netraunnayan@gmail.com"
        LIMIT 1
    ');
    $stmt->execute([(int)$auth['id']]);
    $admin = $stmt->fetch();

    if (!$admin && $isSuperAdmin) {
        $admin = [
            'id' => (int)$auth['id'],
            'username' => 'admin',
            'email' => 'netraunnayan@gmail.com',
            'full_name' => 'Netra Unnayan Super Admin',
            'phone' => '9382293614',
            'is_active' => 1,
            'role_slug' => 'super_admin',
            'role_name' => 'Super Administrator',
            'permissions' => '["*"]'
        ];
    }

    if (!$admin) Response::unauthorized('Admin session expired.');

    // If admin avatar is empty, check if their linked customer account has an avatar
    if (empty($admin['avatar_url'])) {
        $cStmt = $pdo->prepare('SELECT avatar_url FROM customers WHERE (email = ? AND email != "") OR (phone = ? AND phone != "") LIMIT 1');
        $cStmt->execute([$admin['email'], $admin['phone']]);
        $cAvatar = $cStmt->fetchColumn();
        if (!empty($cAvatar)) {
            $admin['avatar_url'] = $cAvatar;
            try {
                $sync = $pdo->prepare('UPDATE admins SET avatar_url = ? WHERE id = ?');
                $sync->execute([$cAvatar, $admin['id']]);
            } catch (Exception $e) {}
        }
    }

    $admin['type'] = 'admin';
    if (strtolower($admin['email']) === 'netraunnayan@gmail.com') {
        $admin['role_slug'] = 'super_admin';
        $admin['role_name'] = 'Super Administrator';
        $admin['permissions'] = ['*'];
    } else {
        $admin['permissions'] = is_array($admin['permissions']) ? $admin['permissions'] : json_decode($admin['permissions'] ?? '[]', true);
    }
    Response::success($admin, 'Admin profile retrieved');
    exit;
} else {
    try {
        $pdo->exec("ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL");
    } catch (Exception $e) {}

    $stmt = $pdo->prepare('SELECT id, full_name, email, phone, COALESCE(avatar_url, "") as avatar_url, created_at FROM customers WHERE id = ?');
    $stmt->execute([(int)$auth['id']]);
    $customer = $stmt->fetch();
    if (!$customer) Response::unauthorized('Customer session expired.');

    // If this customer is netraunnayan@gmail.com, upgrade type to admin
    if (strtolower($customer['email']) === 'netraunnayan@gmail.com') {
        $customer['type'] = 'admin';
        $customer['role_slug'] = 'super_admin';
        $customer['role_name'] = 'Super Administrator';
        $customer['permissions'] = ['*'];
        Response::success($customer, 'Super Admin profile retrieved');
        exit;
    }

    // Fetch saved addresses
    $addrStmt = $pdo->prepare('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC');
    $addrStmt->execute([(int)$customer['id']]);
    $customer['addresses'] = $addrStmt->fetchAll();

    // Fetch saved prescriptions count
    $rxStmt = $pdo->prepare('SELECT COUNT(*) FROM customer_prescriptions WHERE customer_id = ?');
    $rxStmt->execute([(int)$customer['id']]);
    $customer['prescription_count'] = (int)$rxStmt->fetchColumn();

    $customer['type'] = 'customer';
    Response::success($customer, 'Customer profile retrieved');
    exit;
}
