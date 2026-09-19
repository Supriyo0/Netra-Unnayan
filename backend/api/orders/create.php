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
$pdo = Database::getConnection();

$customerId = null;
if ($auth) {
    if (($auth['type'] ?? '') === 'customer') {
        $customerId = (int)$auth['id'];
    } elseif (($auth['type'] ?? '') === 'admin') {
        try {
            $adm = $pdo->prepare('SELECT email, phone FROM admins WHERE id = ?');
            $adm->execute([$auth['id']]);
            $admRow = $adm->fetch();
            if ($admRow) {
                $aStmt = $pdo->prepare('SELECT id FROM customers WHERE email = ? OR (phone = ? AND phone != "") LIMIT 1');
                $aStmt->execute([$admRow['email'] ?? '', $admRow['phone'] ?? '']);
                $cId = $aStmt->fetchColumn();
                if ($cId) $customerId = (int)$cId;
            }
        } catch (Exception $e) {}
    }
}

// Fallback: Check if client explicitly sent customer_id
if (empty($customerId) && !empty($input['customer_id'])) {
    try {
        $cCheck = $pdo->prepare('SELECT id FROM customers WHERE id = ? LIMIT 1');
        $cCheck->execute([(int)$input['customer_id']]);
        $cValid = $cCheck->fetchColumn();
        if ($cValid) $customerId = (int)$cValid;
    } catch (Exception $e) {}
}

// Customer & Shipping Info
$customerName = trim($input['customer_name'] ?? '');
$customerPhone = trim($input['customer_phone'] ?? '');
$cleanPhone = preg_replace('/[^0-9]/', '', $customerPhone);
$last10 = substr($cleanPhone, -10);
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

// If customerId is not found from token or payload, look it up by phone or email in customers table
if (empty($customerId)) {
    if (!empty($last10)) {
        $cStmt = $pdo->prepare('SELECT id FROM customers WHERE phone LIKE ? OR phone = ? OR RIGHT(REGEXP_REPLACE(phone, "[^0-9]", ""), 10) = ? LIMIT 1');
        $cStmt->execute(['%' . $last10, $customerPhone, $last10]);
        $cId = $cStmt->fetchColumn();
        if ($cId) $customerId = (int)$cId;
    }
    if (empty($customerId) && !empty($customerEmail)) {
        $cStmt = $pdo->prepare('SELECT id FROM customers WHERE LOWER(email) = LOWER(?) LIMIT 1');
        $cStmt->execute([$customerEmail]);
        $cId = $cStmt->fetchColumn();
        if ($cId) $customerId = (int)$cId;
    }
    if (empty($customerId) && !empty($customerName) && !empty($customerPhone)) {
        try {
            $regPass = password_hash('Pass@' . (substr($last10, -4) ?: '1234'), PASSWORD_DEFAULT);
            $regEmail = $customerEmail ?: ($last10 . '@netraunnayan.com');
            $regStmt = $pdo->prepare('INSERT INTO customers (full_name, phone, email, password_hash, is_active) VALUES (?, ?, ?, ?, 1)');
            $regStmt->execute([$customerName, $customerPhone, $regEmail, $regPass]);
            $customerId = (int)$pdo->lastInsertId();
        } catch (Exception $e) {}
    }
}


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
            WHERE UPPER(TRIM(code)) = UPPER(TRIM(?)) AND is_active = 1 
              AND (valid_from IS NULL OR valid_from <= CURDATE())
              AND (valid_until IS NULL OR valid_until >= CURDATE())
              AND (usage_limit = 0 OR usage_limit IS NULL OR times_used < usage_limit)
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
        $orderStatus = 'Pending';
        $paymentStatus = 'Pending';
    } else {
        if (!empty($upiUtr) || !empty($paymentProofUrl)) {
            $paymentStatus = 'Under Verification';
            $orderStatus = 'Pending';
        } else {
            $paymentStatus = 'Payment Pending';
            $orderStatus = 'Payment Pending';
        }
    }
    $prescriptionStatus = (!empty($prescriptionData) || $hasPrescription) ? 'Pending Review' : 'Not Required';

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
        $orderNumber, $customerId ?: null, $customerName, $customerEmail ?: null, $customerPhone,
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

    $primaryOrderItemId = null;
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
        $currentOrderItemId = (int)$pdo->lastInsertId();
        if ($primaryOrderItemId === null) {
            $primaryOrderItemId = $currentOrderItemId;
        }

        // Audit inventory reduction
        $invLogStmt->execute([
            $oi['product_id'], -$oi['quantity'], $oi['prev_qty'], $oi['new_qty'],
            $orderNumber, "Online Order #{$orderNumber} placed by {$customerName}"
        ]);
    }

    // Insert Prescription if provided (or if lens requires prescription)
    if (!empty($prescriptionData) || $hasPrescription) {
        $rawMethod = strtoupper(trim($prescriptionData['method'] ?? 'FORM'));
        $validMethods = ['FORM', 'IMAGE_UPLOAD', 'WHATSAPP', 'SAVED_PROFILE'];
        $rxMethod = 'FORM';
        if (in_array($rawMethod, $validMethods)) {
            $rxMethod = $rawMethod;
        } elseif ($rawMethod === 'UPLOAD') {
            $rxMethod = 'IMAGE_UPLOAD';
        }

        $rxImageUrl = $prescriptionData['rx_image_url'] 
            ?? $prescriptionData['file_url'] 
            ?? $prescriptionData['image_url'] 
            ?? null;

        $notesStr = trim($prescriptionData['notes'] ?? '');
        if ($rxMethod === 'WHATSAPP' && empty($notesStr)) {
            $notesStr = 'Customer opted to send prescription slip via WhatsApp';
        }

        $rxInsert = $pdo->prepare('
            INSERT INTO order_prescriptions (
                order_id, order_item_id, submission_method, right_sph, right_cyl, right_axis, right_add, right_pd,
                left_sph, left_cyl, left_axis, left_add, left_pd, single_pd, rx_image_url, status, admin_notes
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, "Pending Review", ?
            )
        ');
        $rxInsert->execute([
            $orderId,
            $primaryOrderItemId,
            $rxMethod,
            isset($prescriptionData['right_sph']) && $prescriptionData['right_sph'] !== '' ? $prescriptionData['right_sph'] : null,
            isset($prescriptionData['right_cyl']) && $prescriptionData['right_cyl'] !== '' ? $prescriptionData['right_cyl'] : null,
            isset($prescriptionData['right_axis']) && $prescriptionData['right_axis'] !== '' ? $prescriptionData['right_axis'] : null,
            isset($prescriptionData['right_add']) && $prescriptionData['right_add'] !== '' ? $prescriptionData['right_add'] : null,
            isset($prescriptionData['right_pd']) && $prescriptionData['right_pd'] !== '' ? $prescriptionData['right_pd'] : null,
            isset($prescriptionData['left_sph']) && $prescriptionData['left_sph'] !== '' ? $prescriptionData['left_sph'] : null,
            isset($prescriptionData['left_cyl']) && $prescriptionData['left_cyl'] !== '' ? $prescriptionData['left_cyl'] : null,
            isset($prescriptionData['left_axis']) && $prescriptionData['left_axis'] !== '' ? $prescriptionData['left_axis'] : null,
            isset($prescriptionData['left_add']) && $prescriptionData['left_add'] !== '' ? $prescriptionData['left_add'] : null,
            isset($prescriptionData['left_pd']) && $prescriptionData['left_pd'] !== '' ? $prescriptionData['left_pd'] : null,
            isset($prescriptionData['single_pd']) && $prescriptionData['single_pd'] !== '' ? $prescriptionData['single_pd'] : null,
            $rxImageUrl,
            $notesStr ?: null
        ]);
    }

    // Auto-link any past orders for this customer by phone or email
    if (!empty($customerId)) {
        try {
            if (!empty($last10)) {
                $pdo->prepare('UPDATE orders SET customer_id = ? WHERE (customer_id IS NULL OR customer_id = 0) AND customer_phone LIKE CONCAT("%", ?)')->execute([$customerId, $last10]);
            }
            if (!empty($customerEmail)) {
                $pdo->prepare('UPDATE orders SET customer_id = ? WHERE (customer_id IS NULL OR customer_id = 0) AND LOWER(customer_email) = LOWER(?)')->execute([$customerId, $customerEmail]);
            }
        } catch (Exception $e) {}
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
        try {
            $stmtPay = $pdo->prepare('
                INSERT INTO payments (order_id, payment_number, amount, payment_mode, payment_provider, upi_utr, payment_proof_url, status)
                VALUES (?, ?, ?, "UPI", "MANUAL_UPI", ?, ?, ?)
            ');
            $stmtPay->execute([$orderId, $paymentNumber, $totalAmount, $upiUtr ?: null, $paymentProofUrl ?: null, $payStatus]);
        } catch (\PDOException $pe) {
            // If payment_proof_url column is missing in DB schema, attempt auto-alter or fallback to standard columns
            if (str_contains($pe->getMessage(), 'payment_proof_url') || $pe->getCode() == '42S22' || str_contains($pe->getMessage(), '1054')) {
                try {
                    $pdo->exec("ALTER TABLE payments ADD COLUMN payment_proof_url VARCHAR(500) NULL AFTER upi_utr");
                    $stmtPay = $pdo->prepare('
                        INSERT INTO payments (order_id, payment_number, amount, payment_mode, payment_provider, upi_utr, payment_proof_url, status)
                        VALUES (?, ?, ?, "UPI", "MANUAL_UPI", ?, ?, ?)
                    ');
                    $stmtPay->execute([$orderId, $paymentNumber, $totalAmount, $upiUtr ?: null, $paymentProofUrl ?: null, $payStatus]);
                } catch (\Throwable $t) {
                    $stmtPay = $pdo->prepare('
                        INSERT INTO payments (order_id, payment_number, amount, payment_mode, payment_provider, upi_utr, status)
                        VALUES (?, ?, ?, "UPI", "MANUAL_UPI", ?, ?)
                    ');
                    $stmtPay->execute([$orderId, $paymentNumber, $totalAmount, $upiUtr ?: null, $payStatus]);
                }
            } else {
                throw $pe;
            }
        }

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

    // Auto-generate Invoice Record
    try {
        $invNumber = 'NU-INV-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
        $invAddress = trim("{$addressLine1}, {$addressLine2} {$landmark} {$city}, {$state} - {$pincode}");
        $invStmt = $pdo->prepare('
            INSERT INTO invoices (
                invoice_number, order_id, invoice_type, invoice_date, customer_name,
                customer_phone, customer_address, subtotal, tax_amount, discount_amount,
                total_amount, payment_mode, payment_status
            ) VALUES (?, ?, "ONLINE", CURDATE(), ?, ?, ?, ?, 0.00, ?, ?, ?, ?)
        ');
        $invStmt->execute([
            $invNumber, $orderId, $customerName, $customerPhone, $invAddress,
            $subtotal, $discountAmount, $totalAmount, $paymentMode, $paymentStatus
        ]);
    } catch (Exception $e) {}

    // Auto-save address to customer profile if customerId is present
    if (!empty($customerId) && !empty($addressLine1)) {
        try {
            $addrCheck = $pdo->prepare('SELECT id FROM customer_addresses WHERE customer_id = ? AND address_line1 = ? AND pincode = ? LIMIT 1');
            $addrCheck->execute([$customerId, $addressLine1, $pincode]);
            if (!$addrCheck->fetchColumn()) {
                $insAddr = $pdo->prepare('
                    INSERT INTO customer_addresses (customer_id, recipient_name, phone, address_line1, address_line2, landmark, city, state, pincode, address_type, is_default)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "HOME", 0)
                ');
                $insAddr->execute([
                    $customerId, $customerName, $customerPhone, $addressLine1, $addressLine2 ?: null, $landmark ?: null, $city, $state, $pincode
                ]);
            }
        } catch (Exception $e) {}
    }

    // COMMIT ATOMIC TRANSACTION
    $pdo->commit();

    // Send confirmation email with full Tax Invoice details
    if ((empty($customerEmail) || str_ends_with($customerEmail, '@netraunnayan.com')) && !empty($customerId)) {
        try {
            $cStmt = $pdo->prepare('SELECT email FROM customers WHERE id = ?');
            $cStmt->execute([$customerId]);
            $dbEmail = trim((string)$cStmt->fetchColumn());
            if (!empty($dbEmail) && !str_ends_with($dbEmail, '@netraunnayan.com')) {
                $customerEmail = $dbEmail;
            }
        } catch (Exception $e) {}
    }

    if (!empty($customerEmail) && !str_ends_with($customerEmail, '@netraunnayan.com')) {
        try {
            $invDate = date('d M Y');
            $fullAddress = trim("{$addressLine1}, {$addressLine2} {$landmark} {$city}, {$state} - {$pincode}");
            
            $itemsRows = '';
            foreach ($orderItemsToInsert as $oi) {
                $lensNote = !empty($oi['lens_type']) ? "<br><span style='font-size:11px; color:#0284C7;'>Lens: {$oi['lens_type']}</span>" : "";
                $itemsRows .= "
                    <tr style='border-bottom: 1px solid #E2E8F0;'>
                        <td style='padding: 10px 8px; font-size: 13px; color: #0F172A;'>
                            <strong>{$oi['product_name']}</strong>{$lensNote}
                            <div style='font-size: 11px; color: #64748B; font-family: monospace;'>SKU: {$oi['product_sku']}</div>
                        </td>
                        <td style='padding: 10px 8px; text-align: center; font-size: 13px; color: #334155;'>{$oi['quantity']}</td>
                        <td style='padding: 10px 8px; text-align: right; font-size: 13px; color: #334155;'>₹" . number_format($oi['unit_price'], 2) . "</td>
                        <td style='padding: 10px 8px; text-align: right; font-size: 13px; font-weight: bold; color: #0F172A;'>₹" . number_format($oi['total_price'], 2) . "</td>
                    </tr>
                ";
            }

            $emailHtml = <<<HTML
                <div style="background:#DCFCE7; color:#15803D; padding:6px 14px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block; border:1px solid #86EFAC;">
                    Order Confirmed &bull; Tax Invoice Issued
                </div>
                <h2 style="color:#0F172A; margin-top:14px; margin-bottom:4px;">Thank you for your order, {$customerName}!</h2>
                <p style="color:#475569; font-size:14px; margin-top:0;">Your optical eyewear order <strong>{$orderNumber}</strong> has been received and verified by our clinical desk.</p>

                <!-- Tax Invoice Header Card -->
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:16px; margin:20px 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding-bottom:10px; margin-bottom:12px;">
                        <div>
                            <span style="font-size:10px; font-weight:bold; color:#64748B; text-transform:uppercase;">Tax Invoice / Cash Bill</span>
                            <div style="font-size:16px; font-weight:bold; color:#0F172A; font-family:monospace;">{$invNumber}</div>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:10px; font-weight:bold; color:#64748B; text-transform:uppercase;">Date</span>
                            <div style="font-size:13px; font-weight:600; color:#334155;">{$invDate}</div>
                        </div>
                    </div>

                    <div style="font-size:12px; color:#475569; line-height:1.5;">
                        <p style="margin:0;"><strong>Billed &amp; Shipped To:</strong> {$customerName} &bull; {$customerPhone}</p>
                        <p style="margin:2px 0 0;">{$fullAddress}</p>
                        <p style="margin:2px 0 0;"><strong>Payment Method:</strong> {$paymentMode} ({$paymentStatus})</p>
                    </div>

                    <!-- Itemized Invoice Table -->
                    <table style="width:100%; border-collapse:collapse; margin-top:14px; background:#FFFFFF; border-radius:8px; overflow:hidden; border:1px solid #E2E8F0;">
                        <thead>
                            <tr style="background:#F1F5F9; font-size:11px; font-weight:bold; color:#475569; text-transform:uppercase;">
                                <th style="padding:8px; text-align:left;">Item / Optics</th>
                                <th style="padding:8px; text-align:center;">Qty</th>
                                <th style="padding:8px; text-align:right;">Rate</th>
                                <th style="padding:8px; text-align:right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {$itemsRows}
                        </tbody>
                        <tfoot>
                            <tr style="border-top:1px solid #E2E8F0; font-size:12px; color:#475569;">
                                <td colspan="3" style="padding:8px; text-align:right;">Subtotal:</td>
                                <td style="padding:8px; text-align:right; font-weight:bold;">₹" . number_format($subtotal, 2) . "</td>
                            </tr>
                            " . ($discountAmount > 0 ? "
                            <tr style='font-size:12px; color:#059669;'>
                                <td colspan='3' style='padding:4px 8px; text-align:right;'>Discount Coupon:</td>
                                <td style='padding:4px 8px; text-align:right; font-weight:bold;'>-₹" . number_format($discountAmount, 2) . "</td>
                            </tr>
                            " : "") . "
                            <tr style="font-size:12px; color:#475569;">
                                <td colspan="3" style="padding:4px 8px; text-align:right;">Eyewear GST (12% Included):</td>
                                <td style="padding:4px 8px; text-align:right;">Included</td>
                            </tr>
                            <tr style="font-size:12px; color:#475569;">
                                <td colspan="3" style="padding:4px 8px; text-align:right;">Delivery / Courier:</td>
                                <td style="padding:4px 8px; text-align:right; font-weight:bold;">" . ($shippingFee > 0 ? "₹" . number_format($shippingFee, 2) : "FREE") . "</td>
                            </tr>
                            <tr style="border-top:2px solid #0F172A; font-size:14px; font-weight:bold; color:#0F172A; background:#F8FAFC;">
                                <td colspan="3" style="padding:10px 8px; text-align:right;">Total Amount:</td>
                                <td style="padding:10px 8px; text-align:right; color:#0284C7; font-size:16px;">₹" . number_format($totalAmount, 2) . "</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- Action Buttons -->
                <div style="margin:24px 0; text-align:center;">
                    <a href="https://netraunnayan.com/order-tracking?order={$orderNumber}&view=invoice" target="_blank" style="background:#0284C7; color:#FFFFFF; padding:12px 24px; border-radius:10px; font-weight:bold; font-size:13px; text-decoration:none; display:inline-block; margin-right:8px; box-shadow:0 4px 12px rgba(2,132,199,0.25);">
                        View &amp; Print Official Tax Invoice &rarr;
                    </a>
                    <a href="https://netraunnayan.com/order-tracking?order={$orderNumber}" target="_blank" style="background:#F1F5F9; color:#0F172A; padding:12px 20px; border-radius:10px; font-weight:bold; font-size:13px; text-decoration:none; display:inline-block; border:1px solid #CBD5E1;">
                        Live Manufacturing Tracker
                    </a>
                </div>

                <!-- Optical Guarantee Notice -->
                <div style="padding:12px 16px; background:#F0FDF4; border-radius:8px; border:1px solid #BBF7D0; font-size:12px; color:#166534; margin-top:20px;">
                    <strong>Netra Unnayan Clinical Guarantee:</strong> All lenses undergo focimeter laser tolerance verification and carry a 1-year anti-peel coating warranty. For questions, WhatsApp our clinical desk at <a href="https://wa.me/919382293614" style="color:#15803D; font-weight:bold;">+91 9382293614</a>.
                </div>
HTML;
            Mailer::send($customerEmail, $customerName, "Order Confirmed & Tax Invoice - {$orderNumber} | Netra Unnayan", $emailHtml);
        } catch (\Throwable $e) {
            error_log('Order confirmation email non-fatal error: ' . $e->getMessage());
        }
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
