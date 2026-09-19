<?php
// Netra Unnayan - Admin User Management & Role Promotion API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth();
$pdo = Database::getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Action: Fetch prescriptions for a specific customer
    if (isset($_GET['customer_id']) && isset($_GET['prescriptions'])) {
        $customerId = (int)$_GET['customer_id'];
        
        $cStmt = $pdo->prepare('SELECT id, full_name, email, phone FROM customers WHERE id = ?');
        $cStmt->execute([$customerId]);
        $customer = $cStmt->fetch(PDO::FETCH_ASSOC);
        if (!$customer) {
            Response::error('Customer not found.', 404);
        }

        // Vault Prescriptions
        $rxStmt = $pdo->prepare('SELECT * FROM customer_prescriptions WHERE customer_id = ? ORDER BY id DESC');
        $rxStmt->execute([$customerId]);
        $vaultPrescriptions = $rxStmt->fetchAll(PDO::FETCH_ASSOC);

        // Order Attached Prescriptions
        $ordRxStmt = $pdo->prepare('
            SELECT op.*, o.order_number, o.created_at as order_date
            FROM order_prescriptions op
            JOIN orders o ON op.order_id = o.id
            WHERE o.customer_id = ?
            ORDER BY op.id DESC
        ');
        $ordRxStmt->execute([$customerId]);
        $orderPrescriptions = $ordRxStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success([
            'customer'            => $customer,
            'vault_prescriptions' => $vaultPrescriptions,
            'order_prescriptions' => $orderPrescriptions,
            'total'               => count($vaultPrescriptions) + count($orderPrescriptions)
        ], 'Customer prescriptions retrieved successfully');
        exit;
    }

    $search = trim($_GET['search'] ?? '');
    $filter = trim($_GET['filter'] ?? 'all'); // 'all', 'customers', 'staff'

    // 1. Fetch available staff roles
    $rolesStmt = $pdo->query('SELECT id, name, slug, description FROM admin_roles ORDER BY id ASC');
    $roles = $rolesStmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch Customers with order & prescription counts and cross-matched admin role
    $custQuery = "
        SELECT 
            c.id,
            c.full_name,
            c.email,
            c.phone,
            c.is_active,
            c.created_at,
            'customer' as account_type,
            COUNT(DISTINCT o.id) as total_orders,
            COALESCE(SUM(o.total_amount), 0) as total_spent,
            COUNT(DISTINCT cp.id) as prescriptions_count,
            a.id as admin_id,
            a.role_id,
            r.slug as role_slug,
            r.name as role_name,
            CASE WHEN a.id IS NOT NULL AND a.is_active = 1 THEN 1 ELSE 0 END as is_staff
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        LEFT JOIN customer_prescriptions cp ON c.id = cp.customer_id
        LEFT JOIN admins a ON (c.email = a.email OR c.phone = a.phone)
        LEFT JOIN admin_roles r ON a.role_id = r.id
    ";

    $params = [];
    if (!empty($search)) {
        $custQuery .= " WHERE (c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    $custQuery .= " GROUP BY c.id ORDER BY is_staff DESC, c.id DESC LIMIT 100";

    $stmt = $pdo->prepare($custQuery);
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Filter if requested
    if ($filter === 'staff') {
        $users = array_values(array_filter($users, fn($u) => $u['is_staff'] == 1));
    } elseif ($filter === 'customers') {
        $users = array_values(array_filter($users, fn($u) => $u['is_staff'] == 0));
    }

    Response::success([
        'users' => $users,
        'roles' => $roles,
        'total' => count($users)
    ], 'Users retrieved successfully');

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? '';

    // Action 1: Promote Customer to Staff / Admin
    if ($action === 'promote_to_staff') {
        $customerId = (int)($input['customer_id'] ?? 0);
        $roleId = (int)($input['role_id'] ?? 2); // default Store Manager

        if (!$customerId) Response::error('Customer ID is required.', 400);

        // Fetch customer record
        $cStmt = $pdo->prepare('SELECT * FROM customers WHERE id = ?');
        $cStmt->execute([$customerId]);
        $customer = $cStmt->fetch(PDO::FETCH_ASSOC);
        if (!$customer) Response::error('Customer not found.', 404);

        $email = $customer['email'];
        $phone = $customer['phone'] ?? '';
        $name = $customer['full_name'];
        $passwordHash = $customer['password_hash'];
        $username = strtolower(explode('@', $email)[0]);

        // Check if admin record exists
        $aStmt = $pdo->prepare('SELECT id FROM admins WHERE email = ?');
        $aStmt->execute([$email]);
        $existingAdmin = $aStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingAdmin) {
            // Update existing
            $uStmt = $pdo->prepare('UPDATE admins SET role_id = ?, is_active = 1 WHERE id = ?');
            $uStmt->execute([$roleId, $existingAdmin['id']]);
        } else {
            // Ensure unique username
            $uCheck = $pdo->prepare('SELECT id FROM admins WHERE username = ?');
            $uCheck->execute([$username]);
            if ($uCheck->fetch()) {
                $username .= '_' . rand(10, 99);
            }

            // Insert new admin record
            $insStmt = $pdo->prepare('
                INSERT INTO admins (role_id, username, email, password_hash, full_name, phone, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            ');
            $insStmt->execute([$roleId, $username, $email, $passwordHash, $name, $phone]);
        }

        // Get role name
        $rStmt = $pdo->prepare('SELECT name FROM admin_roles WHERE id = ?');
        $rStmt->execute([$roleId]);
        $roleName = $rStmt->fetchColumn() ?: 'Staff';

        Response::success([], "User '$name' has been successfully promoted to '$roleName'. They can now access the staff portal.");
    }

    // Action 2: Demote Staff back to Customer
    if ($action === 'demote_to_customer') {
        $email = trim($input['email'] ?? '');
        $adminId = (int)($input['admin_id'] ?? 0);

        if (!$email && !$adminId) Response::error('User email or admin ID is required.', 400);

        if ($adminId) {
            $stmt = $pdo->prepare('UPDATE admins SET is_active = 0 WHERE id = ?');
            $stmt->execute([$adminId]);
        } else {
            $stmt = $pdo->prepare('UPDATE admins SET is_active = 0 WHERE email = ?');
            $stmt->execute([$email]);
        }

        Response::success([], 'Staff access revoked. User is now a regular customer.');
    }

    // Action 3: Toggle Customer Active Status
    if ($action === 'toggle_active') {
        $customerId = (int)($input['customer_id'] ?? 0);
        $isActive = !empty($input['is_active']) ? 1 : 0;

        if (!$customerId) Response::error('Customer ID required.', 400);

        $pdo->prepare('UPDATE customers SET is_active = ? WHERE id = ?')->execute([$isActive, $customerId]);

        Response::success(['is_active' => $isActive], 'User account status updated.');
    }

    // Action 4: Permanent Delete / Disable User Account
    if ($action === 'delete_user') {
        $customerId = (int)($input['customer_id'] ?? 0);
        if (!$customerId) Response::error('Customer ID required.', 400);

        // Fetch customer email
        $cStmt = $pdo->prepare('SELECT email FROM customers WHERE id = ?');
        $cStmt->execute([$customerId]);
        $cEmail = $cStmt->fetchColumn();

        try {
            $checkOrders = $pdo->prepare('SELECT COUNT(*) FROM orders WHERE customer_id = ?');
            $checkOrders->execute([$customerId]);
            $orderCount = (int)$checkOrders->fetchColumn();

            if ($orderCount === 0) {
                $pdo->prepare('DELETE FROM customer_prescriptions WHERE customer_id = ?')->execute([$customerId]);
                $pdo->prepare('DELETE FROM customers WHERE id = ?')->execute([$customerId]);
                if ($cEmail) {
                    $pdo->prepare('DELETE FROM admins WHERE email = ?')->execute([$cEmail]);
                }
            } else {
                $pdo->prepare('UPDATE customers SET is_active = 0, password_hash = CONCAT("DELETED_", MD5(RAND())), email = CONCAT("deleted_", id, "_", email) WHERE id = ?')->execute([$customerId]);
                if ($cEmail) {
                    $pdo->prepare('UPDATE admins SET is_active = 0 WHERE email = ?')->execute([$cEmail]);
                }
            }
        } catch (Exception $e) {
            $pdo->prepare('UPDATE customers SET is_active = 0, password_hash = CONCAT("DELETED_", MD5(RAND())) WHERE id = ?')->execute([$customerId]);
        }

        Response::success(['customer_id' => $customerId], 'User account deleted successfully.');
    }

    Response::error('Invalid action requested.', 400);

} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $customerId = (int)($_GET['customer_id'] ?? $_GET['id'] ?? 0);
    if (!$customerId) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $customerId = (int)($input['customer_id'] ?? $input['id'] ?? 0);
    }
    if (!$customerId) Response::error('Customer ID required.', 400);

    $cStmt = $pdo->prepare('SELECT email FROM customers WHERE id = ?');
    $cStmt->execute([$customerId]);
    $cEmail = $cStmt->fetchColumn();

    try {
        $checkOrders = $pdo->prepare('SELECT COUNT(*) FROM orders WHERE customer_id = ?');
        $checkOrders->execute([$customerId]);
        $orderCount = (int)$checkOrders->fetchColumn();

        if ($orderCount === 0) {
            $pdo->prepare('DELETE FROM customer_prescriptions WHERE customer_id = ?')->execute([$customerId]);
            $pdo->prepare('DELETE FROM customers WHERE id = ?')->execute([$customerId]);
            if ($cEmail) {
                $pdo->prepare('DELETE FROM admins WHERE email = ?')->execute([$cEmail]);
            }
        } else {
            $pdo->prepare('UPDATE customers SET is_active = 0, password_hash = CONCAT("DELETED_", MD5(RAND())), email = CONCAT("deleted_", id, "_", email) WHERE id = ?')->execute([$customerId]);
            if ($cEmail) {
                $pdo->prepare('UPDATE admins SET is_active = 0 WHERE email = ?')->execute([$cEmail]);
            }
        }
    } catch (Exception $e) {
        $pdo->prepare('UPDATE customers SET is_active = 0, password_hash = CONCAT("DELETED_", MD5(RAND())) WHERE id = ?')->execute([$customerId]);
    }

    Response::success(['customer_id' => $customerId], 'User account deleted successfully.');
}
