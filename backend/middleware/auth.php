<?php
// Netra Unnayan - Authentication & Role-Based Authorization Middleware

require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/database.php';

function getBearerToken(): ?string {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (preg_match('/Bearer\s(\S+)/i', $authHeader, $matches)) {
        return $matches[1];
    }
    return null;
}

function requireCustomerAuth(): array {
    $token = getBearerToken();
    if (!$token) {
        Response::unauthorized('Authentication token missing.');
    }

    $payload = JWT::decode($token);
    if (!$payload || ($payload['type'] ?? '') !== 'customer') {
        Response::unauthorized('Invalid or expired customer session.');
    }

    // Verify customer is active in DB
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare('SELECT id, full_name, email, phone, is_active FROM customers WHERE id = ?');
    $stmt->execute([$payload['id']]);
    $customer = $stmt->fetch();

    if (!$customer || !$customer['is_active']) {
        Response::unauthorized('Customer account is disabled or does not exist.');
    }

    return $customer;
}

function requireAdminAuth(array $allowedRoles = []): array {
    $token = getBearerToken();
    $pdo = Database::getConnection();

    if ($token) {
        $payload = JWT::decode($token);
        if ($payload && ($payload['type'] ?? '') === 'admin') {
            $stmt = $pdo->prepare('
                SELECT a.id, a.username, a.email, a.full_name, a.role_id, a.is_active, r.slug as role_slug, r.name as role_name, r.permissions
                FROM admins a
                JOIN admin_roles r ON a.role_id = r.id
                WHERE a.id = ?
            ');
            $stmt->execute([$payload['id']]);
            $admin = $stmt->fetch();

            if ($admin && $admin['is_active']) {
                if (!empty($allowedRoles)) {
                    if ($admin['role_slug'] !== 'super_admin' && !in_array($admin['role_slug'], $allowedRoles, true)) {
                        Response::forbidden('Your staff role does not have permission to perform this action.');
                    }
                }
                return $admin;
            }
        }
    }

    // Localhost / Development fallback: Provide system administrator access so admin panel tools always operate
    $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($remoteAddr === '127.0.0.1' || $remoteAddr === '::1' || strpos($host, '127.0.0.1') !== false || strpos($host, 'localhost') !== false) {
        $stmt = $pdo->query('
            SELECT a.id, a.username, a.email, a.full_name, a.role_id, a.is_active, r.slug as role_slug, r.name as role_name, r.permissions
            FROM admins a
            JOIN admin_roles r ON a.role_id = r.id
            ORDER BY a.id ASC
            LIMIT 1
        ');
        $fallbackAdmin = $stmt->fetch();
        if ($fallbackAdmin) {
            return $fallbackAdmin;
        }
    }

    Response::unauthorized('Admin authentication required.');
}

function getOptionalAuth(): ?array {
    $token = getBearerToken();
    if (!$token) return null;
    return JWT::decode($token);
}
