<?php
/**
 * Netra Unnayan - Admin Coupons & Promo Codes API
 */
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth(['super_admin', 'manager']);
$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $db->query("SELECT * FROM coupons ORDER BY id DESC");
        $coupons = $stmt->fetchAll(PDO::FETCH_ASSOC);
        Response::success($coupons, 'Coupons loaded');
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $action = $input['action'] ?? 'create';

        if ($action === 'toggle_status') {
            $id = (int)($input['id'] ?? 0);
            $isActive = (int)($input['is_active'] ?? 0);
            $stmt = $db->prepare("UPDATE coupons SET is_active = ? WHERE id = ?");
            $stmt->execute([$isActive, $id]);
            Response::success(['id' => $id, 'is_active' => $isActive], 'Status updated');
        }

        if ($action === 'create' || $action === 'update') {
            $code = strtoupper(trim($input['code'] ?? ''));
            $discountType = strtoupper(trim($input['discount_type'] ?? 'PERCENTAGE'));
            $discountValue = (float)($input['discount_value'] ?? 0);
            $minOrderAmount = (float)($input['min_order_amount'] ?? 0);
            $maxDiscount = !empty($input['max_discount']) ? (float)$input['max_discount'] : null;
            $validFrom = !empty($input['valid_from']) ? $input['valid_from'] : date('Y-m-d');
            $validUntil = !empty($input['valid_until']) ? $input['valid_until'] : date('Y-m-d', strtotime('+30 days'));
            $usageLimit = (int)($input['usage_limit'] ?? 100);
            $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;

            if (empty($code) || $discountValue <= 0) {
                Response::error('Coupon code and positive discount value are required', 422);
            }

            if ($action === 'create') {
                $stmt = $db->prepare("
                    INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, valid_from, valid_until, usage_limit, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$code, $discountType, $discountValue, $minOrderAmount, $maxDiscount, $validFrom, $validUntil, $usageLimit, $isActive]);
                Response::success(['id' => (int)$db->lastInsertId()], 'Coupon created successfully');
            } else {
                $id = (int)($input['id'] ?? 0);
                if (!$id) Response::error('Coupon ID required for update', 400);

                $stmt = $db->prepare("
                    UPDATE coupons 
                    SET code = ?, discount_type = ?, discount_value = ?, min_order_amount = ?, max_discount = ?, valid_from = ?, valid_until = ?, usage_limit = ?, is_active = ?
                    WHERE id = ?
                ");
                $stmt->execute([$code, $discountType, $discountValue, $minOrderAmount, $maxDiscount, $validFrom, $validUntil, $usageLimit, $isActive, $id]);
                Response::success(['id' => $id], 'Coupon updated successfully');
            }
        }
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            Response::error('Coupon ID required', 400);
        }
        $stmt = $db->prepare("DELETE FROM coupons WHERE id = ?");
        $stmt->execute([$id]);
        Response::success(['id' => $id], 'Coupon removed');
    }

    Response::error('Unsupported method', 405);
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
