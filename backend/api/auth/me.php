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

if (($auth['type'] ?? '') === 'admin') {
    $stmt = $pdo->prepare('
        SELECT a.id, a.username, a.email, a.full_name, a.phone, a.is_active,
               r.slug as role_slug, r.name as role_name, r.permissions
        FROM admins a
        JOIN admin_roles r ON a.role_id = r.id
        WHERE a.id = ?
    ');
    $stmt->execute([$auth['id']]);
    $admin = $stmt->fetch();
    if (!$admin) Response::unauthorized('Admin session expired.');

    $admin['type'] = 'admin';
    $admin['permissions'] = json_decode($admin['permissions'] ?? '[]', true);
    Response::success($admin, 'Admin profile retrieved');
} else {
    $stmt = $pdo->prepare('SELECT id, full_name, email, phone, created_at FROM customers WHERE id = ?');
    $stmt->execute([$auth['id']]);
    $customer = $stmt->fetch();
    if (!$customer) Response::unauthorized('Customer session expired.');

    // Fetch saved addresses
    $addrStmt = $pdo->prepare('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC');
    $addrStmt->execute([$customer['id']]);
    $customer['addresses'] = $addrStmt->fetchAll();

    // Fetch saved prescriptions count
    $rxStmt = $pdo->prepare('SELECT COUNT(*) FROM customer_prescriptions WHERE customer_id = ?');
    $rxStmt->execute([$customer['id']]);
    $customer['prescription_count'] = (int)$rxStmt->fetchColumn();

    $customer['type'] = 'customer';
    Response::success($customer, 'Customer profile retrieved');
}
