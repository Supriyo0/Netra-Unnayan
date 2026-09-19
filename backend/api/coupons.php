<?php
/**
 * Netra Unnayan - Public Active Coupons API
 */
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    Response::error('Method not allowed', 405);
}

try {
    $code = isset($_GET['code']) ? strtoupper(trim($_GET['code'])) : null;

    if ($code) {
        $stmt = $pdo->prepare('
            SELECT id, code, discount_type, discount_value, min_order_amount, max_discount, valid_from, valid_until
            FROM coupons 
            WHERE UPPER(code) = UPPER(?) AND is_active = 1 
              AND (valid_from IS NULL OR valid_from <= CURDATE())
              AND (valid_until IS NULL OR valid_until >= CURDATE())
              AND (usage_limit = 0 OR usage_limit IS NULL OR times_used < usage_limit)
            LIMIT 1
        ');
        $stmt->execute([$code]);
        $coupon = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$coupon) {
            Response::error('Invalid or expired coupon code', 404);
        }

        Response::success($coupon, 'Valid coupon');
    } else {
        $stmt = $pdo->query('
            SELECT id, code, discount_type, discount_value, min_order_amount, max_discount, valid_from, valid_until
            FROM coupons 
            WHERE is_active = 1 
              AND (valid_from IS NULL OR valid_from <= CURDATE())
              AND (valid_until IS NULL OR valid_until >= CURDATE())
              AND (usage_limit = 0 OR usage_limit IS NULL OR times_used < usage_limit)
            ORDER BY id DESC
            LIMIT 10
        ');
        $coupons = $stmt->fetchAll(PDO::FETCH_ASSOC);
        Response::success($coupons, 'Active coupons loaded');
    }
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}

