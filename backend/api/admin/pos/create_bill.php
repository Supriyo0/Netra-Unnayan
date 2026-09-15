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

$admin = requireAdminAuth(['super_admin', 'manager', 'billing_staff']);
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

    // Lock and verify stock for all items
    foreach ($items as $item) {
        $productId = (int)($item['product_id'] ?? 0);
        $qty = max(1, (int)($item['quantity'] ?? 1));
        $customPrice = isset($item['unit_price']) ? (float)$item['unit_price'] : null;

        $stmt = $pdo->prepare('
            SELECT id, name, sku, barcode, price, discount_price, stock_quantity, primary_image
            FROM products
            WHERE id = ? AND is_active = 1
            FOR UPDATE
        ');
        $stmt->execute([$productId]);
        $prod = $stmt->fetch();

        if (!$prod) {
            $pdo->rollBack();
            Response::error("Item ID {$productId} not found in catalog.", 400);
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
        $newQty = $prevQty - $qty;

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
            'new_qty'      => $newQty
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
        $paymentMode, $notes ?: 'Counter POS Billing by ' . $admin['full_name']
    ]);
    $orderId = (int)$pdo->lastInsertId();

    // Insert Order Items & Audit Ledger
    $invStmt = $pdo->prepare('
        INSERT INTO inventory_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reference_type, reference_id, notes, created_by_admin_id)
        VALUES (?, "OFFLINE_SALE", ?, ?, ?, "INVOICE", ?, ?, ?)
    ');

    foreach ($itemsToInsert as $oi) {
        try {
            $oiStmt = $pdo->prepare('
                INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, lens_type, lens_price, total_price, frame_size, frame_color)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $oiStmt->execute([
                $orderId, $oi['product_id'], $oi['product_name'], $oi['product_sku'],
                $oi['unit_price'], $oi['quantity'], $oi['lens_type'], $oi['lens_price'], $oi['total_price'],
                $oi['frame_size'], $oi['frame_color']
            ]);
        } catch (Exception $e) {
            $oiStmt = $pdo->prepare('
                INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, lens_type, lens_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $displayName = $oi['product_name'] . " [Size: {$oi['frame_size']} | Color: {$oi['frame_color']}]";
            $oiStmt->execute([
                $orderId, $oi['product_id'], $displayName, $oi['product_sku'],
                $oi['unit_price'], $oi['quantity'], $oi['lens_type'], $oi['lens_price'], $oi['total_price']
            ]);
        }

        $invStmt->execute([
            $oi['product_id'], -$oi['quantity'], $oi['prev_qty'], $oi['new_qty'],
            $invoiceNumber, "Offline POS counter sale {$invoiceNumber} by {$admin['full_name']}", $admin['id']
        ]);
    }

    // Insert Invoice Record
    try {
        $invRec = $pdo->prepare('
            INSERT INTO invoices (
                invoice_number, order_id, invoice_type, invoice_date, customer_name,
                customer_phone, customer_address, subtotal, tax_amount, discount_amount,
                total_amount, payment_mode, payment_status, is_gst_invoice
            ) VALUES (
                ?, ?, "OFFLINE_POS", CURDATE(), ?,
                ?, ?, ?, 0.00, ?,
                ?, ?, "Paid", ?
            )
        ');
        $invRec->execute([
            $invoiceNumber, $orderId, $customerName, $customerPhone,
            $customerAddress, $subtotal, $discountAmount, $totalAmount, $paymentMode, $isGstInvoice
        ]);
    } catch (Exception $e) {
        // Fallback if is_gst_invoice column not yet created
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
    }
    $invoiceId = (int)$pdo->lastInsertId();

    // Insert Payment Record
    $payNumber = 'NU-PAY-' . strtoupper(bin2hex(random_bytes(4)));
    $pdo->prepare('
        INSERT INTO payments (order_id, payment_number, amount, payment_mode, payment_provider, status, verified_by_admin_id, verified_at)
        VALUES (?, ?, ?, ?, "COUNTER_POS", "Paid", ?, NOW())
    ')->execute([$orderId, $payNumber, $totalAmount, $paymentMode, $admin['id']]);

    // Insert status history
    $pdo->prepare('
        INSERT INTO order_status_history (order_id, old_status, new_status, note, updated_by_admin_id)
        VALUES (?, "None", "Delivered", "Offline POS bill generated and fulfilled at store counter.", ?)
    ')->execute([$orderId, $admin['id']]);

    $pdo->commit();

    Response::created([
        'order_id'         => $orderId,
        'order_number'     => $orderNumber,
        'invoice_id'       => $invoiceId,
        'invoice_number'   => $invoiceNumber,
        'invoice_date'     => date('Y-m-d'),
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
        'cashier'          => $admin['full_name']
    ], "Invoice {$invoiceNumber} finalized successfully. Stock updated in inventory.");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Response::error("POS Billing failed: " . $e->getMessage(), 500);
}
