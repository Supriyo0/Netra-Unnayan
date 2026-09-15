<?php
// Netra Unnayan - Admin Invoices Archive API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth();
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $search = trim($_GET['search'] ?? '');
        $type = trim($_GET['type'] ?? ''); // OFFLINE_POS, ONLINE_ORDER, ALL

        $query = "
            SELECT 
                i.*,
                COALESCE(i.total_amount, o.total_amount, 0.00) as total_amount,
                COALESCE(i.subtotal, o.subtotal, 0.00) as subtotal,
                COALESCE(i.customer_name, o.customer_name, 'Walk-in Customer') as customer_name,
                COALESCE(i.customer_phone, o.customer_phone, '') as customer_phone,
                o.order_number,
                o.order_status,
                o.payment_mode as order_payment_mode,
                o.notes as order_notes
            FROM invoices i
            LEFT JOIN orders o ON i.order_id = o.id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($type) && $type !== 'ALL') {
            $query .= " AND i.invoice_type = ?";
            $params[] = $type;
        }

        if (!empty($search)) {
            $query .= " AND (i.invoice_number LIKE ? OR i.customer_name LIKE ? OR i.customer_phone LIKE ? OR o.order_number LIKE ?)";
            $term = "%$search%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $query .= " ORDER BY i.id DESC LIMIT 200";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch order items for each invoice
        foreach ($invoices as &$inv) {
            $orderId = (int)($inv['order_id'] ?? 0);
            $inv['items'] = [];
            if ($orderId > 0) {
                $itemStmt = $pdo->prepare("
                    SELECT id, product_id, product_name, product_sku, unit_price, quantity, lens_type, lens_price, total_price 
                    FROM order_items 
                    WHERE order_id = ?
                ");
                $itemStmt->execute([$orderId]);
                $inv['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
            }
        }

        Response::success([
            'invoices' => $invoices,
            'total'    => count($invoices)
        ], 'Invoices retrieved successfully');
    }

    Response::error('Method not allowed', 405);
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
