<?php
// Netra Unnayan - Offline POS Billing Engine
// RULE: Finalized POS invoice immediately decreases stock & records OFFLINE_SALE transaction in audit ledger.

require_once __DIR__ . '/../../../middleware/cors.php';
require_once __DIR__ . '/../../../middleware/auth.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$admin = requireAdminAuth();
$input = json_decode(file_get_contents('php://input'), true) ?? [];

$customerName = trim($input['customer_name'] ?? 'Walk-in Customer');
$customerPhone = trim($input['customer_phone'] ?? '9876543210');
$customerAddress = trim($input['customer_address'] ?? 'Digha Store Counter');
$paymentMode = strtoupper(trim($input['payment_mode'] ?? 'CASH')); // CASH, UPI, CARD
$discountAmount = max(0.00, (float)($input['discount_amount'] ?? 0.00));
$items = $input['items'] ?? [];
$notes = trim($input['notes'] ?? '');
$isGstInvoice = !empty($input['is_gst_invoice']) ? 1 : 0;
$warrantyNote = trim($input['warranty_note'] ?? '1-Year Optical Warranty on Frame & Multi-Coat Optics');

if (empty($items) || !is_array($items)) {
    Response::error('No items added to invoice.', 422);
}

$pdo = Database::getConnection();

try {
    $pdo->beginTransaction();

    $subtotal = 0.00;
    $itemsToInsert = [];

    // Ensure valid payment mode enum
    $validPaymentModes = ['CASH', 'UPI', 'CARD', 'COD'];
    if (!in_array($paymentMode, $validPaymentModes, true)) {
        $paymentMode = 'CASH';
    }

    $adminId = !empty($admin['id']) ? (int)$admin['id'] : null;
    $adminName = $admin['full_name'] ?? 'Store Admin';

    // Lock and verify stock for all items
    foreach ($items as $item) {
        $productId = (int)($item['product_id'] ?? 0);
        $sku = trim($item['product_sku'] ?? $item['sku'] ?? '');
        $qty = max(1, (int)($item['quantity'] ?? 1));
        $customPrice = isset($item['unit_price']) ? (float)$item['unit_price'] : null;
        $isCustomItem = !empty($item['is_custom']); // Custom items bypass DB & stock

        if ($isCustomItem) {
            // ---- CUSTOM ITEM: no DB product, no stock deduction ----
            $unitPrice = $customPrice > 0 ? $customPrice : 0.00;
            $lensType = trim($item['lens_type'] ?? '');
            $lensPrice = max(0.00, (float)($item['lens_price'] ?? 0.00));
            $lineTotal = ($unitPrice + $lensPrice) * $qty;
            $subtotal += $lineTotal;

            $itemsToInsert[] = [
                'product_id'   => 0,
                'product_name' => trim($item['product_name'] ?? 'Custom Item'),
                'product_sku'  => trim($item['product_sku'] ?? ('CUSTOM-' . time())),
                'image_url'    => '',
                'unit_price'   => $unitPrice,
                'quantity'     => $qty,
                'lens_type'    => $lensType ?: null,
                'lens_price'   => $lensPrice,
                'total_price'  => $lineTotal,
                'frame_size'   => '',
                'frame_color'  => '',
                'prev_qty'     => 0,
                'new_qty'      => 0,
                'is_custom'    => true
            ];
            continue; // Skip all catalog-product logic below
        }

        // ---- CATALOG ITEM: DB lookup + stock check + deduction ----
        if ($productId > 0) {
            $stmt = $pdo->prepare('
                SELECT p.id, p.name, p.sku, p.barcode, p.price, p.discount_price, p.stock_quantity,
                       COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1), "") as primary_image
                FROM products p
                WHERE p.id = ? AND p.is_active = 1
                FOR UPDATE
            ');
            $stmt->execute([$productId]);
            $prod = $stmt->fetch();
        } else if (!empty($sku)) {
            $stmt = $pdo->prepare('
                SELECT p.id, p.name, p.sku, p.barcode, p.price, p.discount_price, p.stock_quantity,
                       COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1), "") as primary_image
                FROM products p
                WHERE (p.sku = ? OR p.barcode = ?) AND p.is_active = 1
                FOR UPDATE
            ');
            $stmt->execute([$sku, $sku]);
            $prod = $stmt->fetch();
        } else {
            $prod = null;
        }

        if (!$prod) {
            $pdo->rollBack();
            $label = !empty($item['product_name']) ? $item['product_name'] : ($sku ?: "ID {$productId}");
            Response::error("Item '{$label}' not found in catalog.", 400);
        }

        if ((int)$prod['stock_quantity'] < $qty) {
            $pdo->rollBack();
            Response::error("Insufficient stock for '{$prod['name']}'. Only {$prod['stock_quantity']} units in store.", 400);
        }

        $unitPrice = $customPrice ?? ($prod['discount_price'] !== null ? (float)$prod['discount_price'] : (float)$prod['price']);
        $lensType = trim($item['lens_type'] ?? '');
        $lensPrice = max(0.00, (float)($item['lens_price'] ?? 0.00));

        $lineTotal = ($unitPrice + $lensPrice) * $qty;
        $subtotal += $lineTotal;

        // Deduct inventory
        $prevQty = (int)$prod['stock_quantity'];
        $newQty = max(0, $prevQty - $qty);

        $pdo->prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')->execute([$newQty, $prod['id']]);

        $frameSize = trim($item['frame_size'] ?? $item['size'] ?? 'Medium');
        $frameColor = trim($item['frame_color'] ?? $item['color'] ?? 'Matte Black');

        $itemsToInsert[] = [
            'product_id'   => $prod['id'],
            'product_name' => $prod['name'],
            'product_sku'  => $prod['sku'],
            'image_url'    => $prod['primary_image'] ?? '',
            'unit_price'   => $unitPrice,
            'quantity'     => $qty,
            'lens_type'    => $lensType ?: null,
            'lens_price'   => $lensPrice,
            'total_price'  => $lineTotal,
            'frame_size'   => $frameSize,
            'frame_color'  => $frameColor,
            'prev_qty'     => $prevQty,
            'new_qty'      => $newQty,
            'is_custom'    => false
        ];
    }

    $totalAmount = max(0.00, round($subtotal - $discountAmount, 2));

    // Generate POS Order & Invoice numbers
    $orderNumber = 'NU-POS-' . strtoupper(bin2hex(random_bytes(3)));
    $invoiceNumber = 'NU-INV-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));

    // Create Order Record
    $ordStmt = $pdo->prepare('
        INSERT INTO orders (
            order_number, order_type, customer_name, customer_phone,
            shipping_address_line1, shipping_city, shipping_state, shipping_pincode,
            subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
            payment_mode, payment_status, order_status, prescription_status,
            is_offline_bill, notes
        ) VALUES (
            ?, "POS_OFFLINE", ?, ?,
            ?, "Digha", "West Bengal", "721428",
            ?, ?, 0.00, 0.00, ?,
            ?, "Paid", "Delivered", "Completed",
            1, ?
        )
    ');
    $ordStmt->execute([
        $orderNumber, $customerName, $customerPhone,
        $customerAddress, $subtotal, $discountAmount, $totalAmount,
        $paymentMode, $notes ?: 'Counter POS Billing by ' . $adminName
    ]);
    $orderId = (int)$pdo->lastInsertId();

    // Insert Order Items & Audit Ledger
    $invStmt = $pdo->prepare('
        INSERT INTO inventory_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reference_type, reference_id, notes, created_by_admin_id)
        VALUES (?, "OFFLINE_SALE", ?, ?, ?, "INVOICE", ?, ?, ?)
    ');

    foreach ($itemsToInsert as $oi) {
        $displayName = $oi['product_name'];
        if (!$oi['is_custom'] && (!empty($oi['frame_size']) || !empty($oi['frame_color']))) {
            $displayName .= " [Size: {$oi['frame_size']} | Color: {$oi['frame_color']}]";
        }

        $oiStmt = $pdo->prepare('
            INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, lens_type, lens_price, total_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $oiStmt->execute([
            $orderId, $oi['product_id'], $displayName, $oi['product_sku'],
            $oi['unit_price'], $oi['quantity'], $oi['lens_type'], $oi['lens_price'], $oi['total_price']
        ]);

        // Only log inventory transactions for real catalog products
        if (!$oi['is_custom'] && $oi['product_id'] > 0) {
            $invStmt->execute([
                $oi['product_id'], -$oi['quantity'], $oi['prev_qty'], $oi['new_qty'],
                $invoiceNumber, "Offline POS counter sale {$invoiceNumber} by {$adminName}", $adminId
            ]);
        }
    }

    // Insert Invoice Record
    $invRec = $pdo->prepare('
        INSERT INTO invoices (
            invoice_number, order_id, invoice_type, invoice_date, customer_name,
            customer_phone, customer_address, subtotal, tax_amount, discount_amount,
            total_amount, payment_mode, payment_status
        ) VALUES (
            ?, ?, "OFFLINE_POS", CURDATE(), ?,
            ?, ?, ?, 0.00, ?,
            ?, ?, "Paid"
        )
    ');
    $invRec->execute([
        $invoiceNumber, $orderId, $customerName, $customerPhone,
        $customerAddress, $subtotal, $discountAmount, $totalAmount, $paymentMode
    ]);
    $invoiceId = (int)$pdo->lastInsertId();

    // Insert Payment Record
    $payNumber = 'NU-PAY-' . strtoupper(bin2hex(random_bytes(4)));
    $pdo->prepare('
        INSERT INTO payments (order_id, payment_number, amount, payment_mode, payment_provider, status, verified_by_admin_id, verified_at)
        VALUES (?, ?, ?, ?, "COUNTER_POS", "Paid", ?, NOW())
    ')->execute([$orderId, $payNumber, $totalAmount, $paymentMode, $adminId]);

    // Insert status history
    $pdo->prepare('
        INSERT INTO order_status_history (order_id, old_status, new_status, note, updated_by_admin_id)
        VALUES (?, "None", "Delivered", "Offline POS bill generated and fulfilled at store counter.", ?)
    ')->execute([$orderId, $adminId]);

    $pdo->commit();

    Response::created([
        'order_id'         => $orderId,
        'order_number'     => $orderNumber,
        'invoice_id'       => $invoiceId,
        'invoice_number'   => $invoiceNumber,
        'invoice_date'     => date('d M Y'),
        'customer_name'    => $customerName,
        'customer_phone'   => $customerPhone,
        'customer_address' => $customerAddress,
        'subtotal'         => $subtotal,
        'discount_amount'  => $discountAmount,
        'total_amount'     => $totalAmount,
        'payment_mode'     => $paymentMode,
        'is_gst_invoice'   => $isGstInvoice,
        'warranty_note'    => $warrantyNote,
        'notes'            => $notes,
        'items'            => $itemsToInsert,
        'cashier'          => $adminName
    ], "Invoice {$invoiceNumber} finalized successfully. Stock updated in inventory.");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Response::error("POS Billing failed: " . $e->getMessage(), 500);
}
