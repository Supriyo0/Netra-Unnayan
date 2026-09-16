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
                $itemStmt = $pdo->prepare('
                    SELECT oi.*, 
                           p.name as product_name_master, p.sku as product_sku_code,
                           p.frame_size as p_frame_size, p.frame_color as p_frame_color, p.frame_material,
                           COALESCE(
                               (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC, id ASC LIMIT 1),
                               "/logo_symbol.png"
                           ) as image_url
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                ');
                $itemStmt->execute([$orderId]);
                $fetchedItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($fetchedItems as &$it) {
                    if (empty($it['product_name']) && !empty($it['product_name_master'])) {
                        $it['product_name'] = $it['product_name_master'];
                    }
                    if (empty($it['product_sku']) && !empty($it['product_sku_code'])) {
                        $it['product_sku'] = $it['product_sku_code'];
                    }
                    if (empty($it['frame_size']) && !empty($it['p_frame_size'])) {
                        $it['frame_size'] = $it['p_frame_size'];
                    }
                    if (empty($it['frame_color']) && !empty($it['p_frame_color'])) {
                        $it['frame_color'] = $it['p_frame_color'];
                    }
                    if (empty($it['material']) && !empty($it['frame_material'])) {
                        $it['material'] = $it['frame_material'];
                    }
                }
                $inv['items'] = $fetchedItems;
            }
        }

        Response::success([
            'invoices' => $invoices,
            'total'    => count($invoices)
        ], 'Invoices retrieved successfully');
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        $restoreStock = isset($_GET['restore_stock']) ? (int)$_GET['restore_stock'] : 0;

        if (!$id) {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $id = (int)($input['id'] ?? 0);
            if (isset($input['restore_stock'])) {
                $restoreStock = (int)$input['restore_stock'];
            }
        }
        if (!$id) Response::error('Invoice ID is required.', 400);

        // Fetch invoice to get order_id
        $invStmt = $pdo->prepare('SELECT id, order_id, invoice_number FROM invoices WHERE id = ?');
        $invStmt->execute([$id]);
        $inv = $invStmt->fetch(PDO::FETCH_ASSOC);

        $stockRestored = 0;
        if ($inv && !empty($inv['order_id']) && $restoreStock === 1) {
            $orderId = (int)$inv['order_id'];
            $itemsStmt = $pdo->prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?');
            $itemsStmt->execute([$orderId]);
            $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as $item) {
                $pId = (int)($item['product_id'] ?? 0);
                $qty = (int)($item['quantity'] ?? 0);
                if ($pId > 0 && $qty > 0) {
                    $pdo->prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?')
                        ->execute([$qty, $pId]);
                    $stockRestored += $qty;
                }
            }
        }

        $stmt = $pdo->prepare('DELETE FROM invoices WHERE id = ?');
        $stmt->execute([$id]);

        $msg = $restoreStock === 1
            ? "Invoice deleted and {$stockRestored} item units returned to product stock."
            : 'Invoice record permanently deleted without modifying stock.';

        Response::success(['id' => $id, 'stock_restored' => $restoreStock === 1], $msg);
    }

    Response::error('Method not allowed', 405);
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
