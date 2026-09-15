<?php
// Netra Unnayan - Inventory Ledger & Stock Adjustment Engine
// Double-entry stock transactions with audit trail

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth(['super_admin', 'manager', 'inventory_staff']);
$pdo = Database::getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'list';

    if ($action === 'history') {
        // Fetch stock audit ledger
        $productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;
        $where = $productId ? 'WHERE t.product_id = ?' : '';
        $params = $productId ? [$productId] : [];

        $stmt = $pdo->prepare("
            SELECT t.*, p.name as product_name, p.sku, p.barcode, a.full_name as admin_name
            FROM inventory_transactions t
            JOIN products p ON t.product_id = p.id
            LEFT JOIN admins a ON t.created_by_admin_id = a.id
            $where
            ORDER BY t.id DESC
            LIMIT 100
        ");
        $stmt->execute($params);
        $transactions = $stmt->fetchAll();
        Response::success($transactions, 'Inventory ledger history loaded');
    } else {
        // Fetch inventory status across catalog
        $stmt = $pdo->query('
            SELECT 
                p.id, p.name, p.sku, p.barcode, p.stock_quantity, p.low_stock_threshold,
                p.price, p.discount_price, p.frame_size, p.frame_shape, p.is_active,
                c.name as category_name,
                (p.stock_quantity <= p.low_stock_threshold) as is_low_stock,
                (SELECT COUNT(*) FROM inventory_transactions WHERE product_id = p.id) as transaction_count,
                (SELECT created_at FROM inventory_transactions WHERE product_id = p.id ORDER BY id DESC LIMIT 1) as last_movement_at
            FROM products p
            JOIN categories c ON p.category_id = c.id
            ORDER BY is_low_stock DESC, p.stock_quantity ASC
        ');
        $inventory = $stmt->fetchAll();
        Response::success($inventory, 'Inventory catalog loaded');
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Manual Stock Adjustment / Restock Intake
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $productId = (int)($input['product_id'] ?? 0);
    $type = strtoupper(trim($input['transaction_type'] ?? 'MANUAL_ADD')); // PURCHASE, MANUAL_ADD, MANUAL_REMOVE, DAMAGE, ADJUSTMENT
    $quantity = (int)($input['quantity'] ?? 0);
    $notes = trim($input['notes'] ?? '');
    $referenceId = trim($input['reference_id'] ?? 'MANUAL-' . date('Ymd'));

    if (empty($productId) || $quantity === 0) {
        Response::error('Valid Product ID and non-zero quantity required.', 422);
    }

    if (empty($notes)) {
        Response::error('A reason/note is strictly required for stock adjustment audits.', 422);
    }

    $validTypes = ['PURCHASE', 'MANUAL_ADD', 'MANUAL_REMOVE', 'DAMAGE', 'ADJUSTMENT', 'RETURN', 'EXCHANGE'];
    if (!in_array($type, $validTypes)) {
        Response::error('Invalid inventory transaction type.', 422);
    }

    try {
        $pdo->beginTransaction();

        $lockStmt = $pdo->prepare('SELECT id, name, sku, stock_quantity FROM products WHERE id = ? FOR UPDATE');
        $lockStmt->execute([$productId]);
        $prod = $lockStmt->fetch();

        if (!$prod) {
            $pdo->rollBack();
            Response::notFound('Product not found.');
        }

        $prevQty = (int)$prod['stock_quantity'];
        
        // Negative adjustment for removals/damage
        $delta = in_array($type, ['MANUAL_REMOVE', 'DAMAGE']) ? -abs($quantity) : abs($quantity);
        $newQty = $prevQty + $delta;

        if ($newQty < 0) {
            $pdo->rollBack();
            Response::error("Cannot reduce stock below zero. Current available: {$prevQty}.", 400);
        }

        // Update product stock
        $pdo->prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')->execute([$newQty, $productId]);

        // Record double-entry transaction
        $stmt = $pdo->prepare('
            INSERT INTO inventory_transactions (
                product_id, transaction_type, quantity, previous_quantity, new_quantity,
                reference_type, reference_id, notes, created_by_admin_id
            ) VALUES (?, ?, ?, ?, ?, "MANUAL", ?, ?, ?)
        ');
        $stmt->execute([
            $productId, $type, $delta, $prevQty, $newQty,
            $referenceId, $notes, $admin['id']
        ]);

        $pdo->commit();

        Response::success([
            'product_id'        => $productId,
            'sku'               => $prod['sku'],
            'previous_quantity' => $prevQty,
            'quantity_change'   => $delta,
            'new_quantity'      => $newQty,
            'transaction_type'  => $type
        ], "Stock for '{$prod['name']}' updated to {$newQty} units.");

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        Response::error('Failed to update inventory: ' . $e->getMessage(), 500);
    }
}
