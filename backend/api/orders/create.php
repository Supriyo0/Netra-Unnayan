<?php
// Netra Unnayan - Concurrency-Safe Order Creation Engine
// Atomically reserves/deducts stock and prevents overselling with row-locking transactions

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$auth = getOptionalAuth();
$customerId = ($auth && ($auth['type'] ?? '') === 'customer') ? (int)$auth['id'] : null;

// Customer & Shipping Info
$customerName = trim($input['customer_name'] ?? '');
$customerPhone = trim($input['customer_phone'] ?? '');
$customerEmail = trim($input['customer_email'] ?? '');
$addressLine1 = trim($input['address_line1'] ?? '');
$addressLine2 = trim($input['address_line2'] ?? '');
$landmark = trim($input['landmark'] ?? '');
$city = trim($input['city'] ?? '');
$state = trim($input['state'] ?? 'West Bengal');
$pincode = trim($input['pincode'] ?? '');
$paymentMode = strtoupper(trim($input['payment_mode'] ?? 'COD')); // 'COD' or 'UPI'
$couponCode = trim($input['coupon_code'] ?? '');
$orderNotes = trim($input['notes'] ?? '');
$items = $input['items'] ?? [];
$prescriptionData = $input['prescription'] ?? null;

if (empty($customerName) || empty($customerPhone) || empty($addressLine1) || empty($city) || empty($pincode)) {
    Response::error('Please provide complete shipping details (Name, Phone, Address, City, PIN).', 422);
}

if (empty($items) || !is_array($items)) {
    Response::error('Your cart is empty. Cannot place an empty order.', 422);
}

if (!in_array($paymentMode, ['COD', 'UPI'])) {
    Response::error('Invalid payment method selected.', 422);
}

$pdo = Database::getConnection();

try {
    // START ATOMIC TRANSACTION
    $pdo->beginTransaction();

    $subtotal = 0.00;
    $totalLensAddon = 0.00;
    $orderItemsToInsert = [];
    $hasPrescription = false;

    // Concurrency Lock: FOR UPDATE on all requested products
    foreach ($items as $item) {
        $productId = (int)($item['product_id'] ?? 0);
        $qty = max(1, (int)($item['quantity'] ?? 1));

        // SELECT ... FOR UPDATE locks the product row until transaction ends
        $lockStmt = $pdo->prepare('
            SELECT id, name, sku, barcode, price, discount_price, stock_quantity, low_stock_threshold, is_prescription_compatible
            FROM products
            WHERE id = ? AND is_active = 1
            FOR UPDATE
        ');
        $lockStmt->execute([$productId]);
        $product = $lockStmt->fetch();

        if (!$product) {
            $pdo->rollBack();
            Response::error("One of the selected items is no longer active or available.", 400);
        }

        if ((int)$product['stock_quantity'] < $qty) {
            $pdo->rollBack();
            Response::error("Insufficient stock for '{$product['name']}'. Only {$product['stock_quantity']} unit(s) remaining.", 400);
        }

        $regPrice = (float)$product['price'];
        $unitPrice = $product['discount_price'] !== null ? (float)$product['discount_price'] : $regPrice;

        $lensType = trim($item['lens_type'] ?? '');
        $lensPrice = 0.00;
        if (!empty($lensType)) {
            $hasPrescription = true;
            $lensMap = [
                'Standard Single Vision Anti-Glare' => 500.00,
                'BluZero Anti-Fatigue Computer'      => 800.00,
                'High-Index 1.67 Ultra-Thin'         => 1500.00,
                'Progressive Digital Freeform'       => 2200.00,
                'Photochromic Transition (Grey)'     => 1200.00
            ];
            $lensPrice = $lensMap[$lensType] ?? (float)($item['lens_price'] ?? 0.00);
        }

        $lineTotal = ($unitPrice + $lensPrice) * $qty;
        $subtotal += $lineTotal;
        $totalLensAddon += ($lensPrice * $qty);

        // Deduct inventory atomically
        $prevQty = (int)$product['stock_quantity'];
        $newQty = $prevQty - $qty;

        $updateStock = $pdo->prepare('UPDATE products SET stock_quantity = ? WHERE id = ?');
        $updateStock->execute([$newQty, $product['id']]);

        $frameSize = trim($item['frame_size'] ?? $item['selected_size'] ?? 'Medium');
        $frameColor = trim($item['frame_color'] ?? $item['selected_color'] ?? 'Matte Black');

        $orderItemsToInsert[] = [
            'product_id'   => $product['id'],
            'product_name' => $product['name'],
            'product_sku'  => $product['sku'],
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

    // Coupon calculation
    $discountAmount = 0.00;
    if (!empty($couponCode)) {
        $cpnStmt = $pdo->prepare('
            SELECT * FROM coupons 
            WHERE code = ? AND is_active = 1 
              AND valid_from <= CURDATE() AND valid_until >= CURDATE()
              AND (usage_limit = 0 OR times_used < usage_limit)
            FOR UPDATE
        ');
        $cpnStmt->execute([$couponCode]);
        $coupon = $cpnStmt->fetch();

        if ($coupon && $subtotal >= (float)$coupon['min_order_amount']) {
            if ($coupon['discount_type'] === 'PERCENTAGE') {
                $calc = ($subtotal * (float)$coupon['discount_value']) / 100.0;
                if ($coupon['max_discount'] !== null) $calc = min($calc, (float)$coupon['max_discount']);
                $discountAmount = round($calc, 2);
            } else {
                $discountAmount = min($subtotal, (float)$coupon['discount_value']);
            }
            // Increment coupon usage
            $pdo->prepare('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?')->execute([$coupon['id']]);
        }
    }

    // Shipping calculation
    $setStmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('free_shipping_threshold', 'standard_shipping_fee')");
    $settings = $setStmt->fetchAll(PDO::FETCH_KEY_PAIR);
    $freeShippingThreshold = (float)($settings['free_shipping_threshold'] ?? 999.00);
    $standardShippingFee = (float)($settings['standard_shipping_fee'] ?? 70.00);
    $shippingFee = ($subtotal - $discountAmount >= $freeShippingThreshold) ? 0.00 : $standardShippingFee;

    $totalAmount = max(0.00, round(($subtotal - $discountAmount) + $shippingFee, 2));

    // Unique Order Number
    $orderNumber = 'NU-ORD-' . strtoupper(bin2hex(random_bytes(4)));

    // Extract optional UPI UTR & Payment Proof Screenshot
    $upiUtr = trim($input['upi_utr'] ?? '');
    $paymentProofUrl = trim($input['payment_proof_url'] ?? '');

    // Statuses based on payment mode & prescription
    if ($paymentMode === 'COD') {
        $orderStatus = 'Order Confirmed';
        $paymentStatus = 'Pending';
    } else {
        if (!empty($upiUtr) || !empty($paymentProofUrl)) {
            $paymentStatus = 'Under Verification';
            $orderStatus = 'Payment Under Verification';
        } else {
            $paymentStatus = 'Payment Pending';
            $orderStatus = 'Payment Pending';
        }
    }
    $prescriptionStatus = $hasPrescription ? 'Pending Review' : 'Not Required';

    // 12-hour cancellation cutoff window
    $canCancelUntil = date('Y-m-d H:i:s', strtotime('+12 hours'));

    // Insert Order
    $orderStmt = $pdo->prepare('
        INSERT INTO orders (
            order_number, customer_id, order_type, customer_name, customer_email, customer_phone,
            shipping_address_line1, shipping_address_line2, shipping_landmark, shipping_city,
            shipping_state, shipping_pincode, subtotal, discount_amount, shipping_fee,
            tax_amount, total_amount, payment_mode, payment_status, order_status,
            prescription_status, can_cancel_until, is_offline_bill, notes
        ) VALUES (
            ?, ?, "ONLINE", ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            0.00, ?, ?, ?, ?,
            ?, ?, 0, ?
        )
    ');
    $orderStmt->execute([
        $orderNumber, $customerId, $customerName, $customerEmail ?: null, $customerPhone,
        $addressLine1, $addressLine2 ?: null, $landmark ?: null, $city,
        $state, $pincode, $subtotal, $discountAmount, $shippingFee,
        $totalAmount, $paymentMode, $paymentStatus, $orderStatus,
        $prescriptionStatus, $canCancelUntil, $orderNotes ?: null
    ]);
    $orderId = (int)$pdo->lastInsertId();

    // Insert Order Items & Inventory Ledger Transactions
    $itemInsert = $pdo->prepare('
        INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, lens_type, lens_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $invLogStmt = $pdo->prepare('
        INSERT INTO inventory_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reference_type, reference_id, notes)
        VALUES (?, "ONLINE_SALE", ?, ?, ?, "ORDER", ?, ?)
    ');

    foreach ($orderItemsToInsert as $oi) {
        try {
            $itemInsert = $pdo->prepare('
                INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, lens_type, lens_price, total_price, frame_size, frame_color)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $itemInsert->execute([
                $orderId, $oi['product_id'], $oi['product_name'], $oi['product_sku'],
                $oi['unit_price'], $oi['quantity'], $oi['lens_type'], $oi['lens_price'], $oi['total_price'],
                $oi['frame_size'], $oi['frame_color']
            ]);
        } catch (Exception $e) {
            $itemInsert = $pdo->prepare('
                INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, lens_type, lens_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $displayName = $oi['product_name'] . " [Size: {$oi['frame_size']} | Color: {$oi['frame_color']}]";
            $itemInsert->execute([
                $orderId, $oi['product_id'], $displayName, $oi['product_sku'],
                $oi['unit_price'], $oi['quantity'], $oi['lens_type'], $oi['lens_price'], $oi['total_price']
            ]);
        }
        $orderItemId = (int)$pdo->lastInsertId();

        // Audit inventory reduction
        $invLogStmt->execute([
            $oi['product_id'], -$oi['quantity'], $oi['prev_qty'], $oi['new_qty'],
            $orderNumber, "Online Order #{$orderNumber} placed by {$customerName}"
        ]);
    }

    // Insert Prescription if provided
    if ($hasPrescription && !empty($prescriptionData)) {
        $rxMethod = $prescriptionData['method'] ?? 'FORM';
        $rxInsert = $pdo->prepare('
            INSERT INTO order_prescriptions (
                order_id, submission_method, right_sph, right_cyl, right_axis, right_add, right_pd,
                left_sph, left_cyl, left_axis, left_add, left_pd, single_pd, rx_image_url, status
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, "Pending Review"
            )
        ');
        $rxInsert->execute([
            $orderId, $rxMethod,
            $prescriptionData['right_sph'] ?? null, $prescriptionData['right_cyl'] ?? null,
            $prescriptionData['right_axis'] ?? null, $prescriptionData['right_add'] ?? null,
            $prescriptionData['right_pd'] ?? null,
            $prescriptionData['left_sph'] ?? null, $prescriptionData['left_cyl'] ?? null,
            $prescriptionData['left_axis'] ?? null, $prescriptionData['left_add'] ?? null,
            $prescriptionData['left_pd'] ?? null,
            $prescriptionData['single_pd'] ?? null,
            $prescriptionData['image_url'] ?? null
        ]);
    }

    // Insert Order Status History
    $historyStmt = $pdo->prepare('
        INSERT INTO order_status_history (order_id, old_status, new_status, note)
        VALUES (?, "None", ?, ?)
    ');
    $historyStmt->execute([$orderId, $orderStatus, "Order placed successfully. Payment mode: {$paymentMode}."]);

    // If UPI, generate Payment Record
    $upiPaymentData = null;
    if ($paymentMode === 'UPI') {
        $paymentNumber = 'NU-PAY-' . strtoupper(bin2hex(random_bytes(4)));
        $payStatus = (!empty($upiUtr) || !empty($paymentProofUrl)) ? 'Under Verification' : 'Pending';
        $stmtPay = $pdo->prepare('
            INSERT INTO payments (order_id, payment_number, amount, payment_mode, payment_provider, upi_utr, payment_proof_url, status)
            VALUES (?, ?, ?, "UPI", "MANUAL_UPI", ?, ?, ?)
        ');
        $stmtPay->execute([$orderId, $paymentNumber, $totalAmount, $upiUtr ?: null, $paymentProofUrl ?: null, $payStatus]);

        $upiMerchantId = $settings['upi_id'] ?? '9382293614@upi';
        $upiMerchantName = rawurlencode('NETRA UNNAYAN OPTICALS');
        $upiNote = rawurlencode("Order $orderNumber Netra Unnayan");
        $deepLink = "upi://pay?pa={$upiMerchantId}&pn={$upiMerchantName}&am={$totalAmount}&cu=INR&tn={$upiNote}";

        $upiPaymentData = [
            'payment_number' => $paymentNumber,
            'upi_id'         => $upiMerchantId,
            'merchant_name'  => 'NETRA UNNAYAN OPTICALS',
            'amount'         => $totalAmount,
            'deep_link'      => $deepLink
        ];
    }

    // COMMIT ATOMIC TRANSACTION
    $pdo->commit();

    // Send confirmation email asynchronously / logged
    if (!empty($customerEmail)) {
        $itemsHtml = '';
        foreach ($orderItemsToInsert as $oi) {
            $itemsHtml .= "<li><strong>{$oi['product_name']}</strong> ({$oi['product_sku']}) &times; {$oi['quantity']} - ₹" . number_format($oi['total_price'], 2) . "</li>";
        }
        $emailHtml = <<<HTML
            <div class="badge">Order Confirmed</div>
            <h2>Thank you for your order, {$customerName}!</h2>
            <p>Your order <strong>{$orderNumber}</strong> has been received and is being prepared with clinical precision.</p>
            <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;">
            <h3>Order Details</h3>
            <ul>{$itemsHtml}</ul>
            <p><strong>Total Amount:</strong> ₹{$totalAmount} ({$paymentMode})</p>
            <p><strong>Delivery Address:</strong> {$addressLine1}, {$city}, {$pincode}</p>
            <p style="color: #64748B; font-size: 13px;">Our optical lab team is verifying your frame and lens specifications. You can track your order status in real time on our website.</p>
HTML;
        Mailer::send($customerEmail, $customerName, "Order Confirmed - {$orderNumber} | Netra Unnayan", $emailHtml);
    }

    Response::created([
        'order_id'         => $orderId,
        'order_number'     => $orderNumber,
        'total_amount'     => $totalAmount,
        'payment_mode'     => $paymentMode,
        'order_status'     => $orderStatus,
        'can_cancel_until' => $canCancelUntil,
        'upi_data'         => $upiPaymentData
    ], "Order {$orderNumber} placed successfully!");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Response::error("Failed to place order: " . $e->getMessage(), 500);
}
