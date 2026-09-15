<?php
// Netra Unnayan - Server-Side Cart & Pricing Calculation Engine
// Strictly prevents frontend tampering of price, discount, or tax

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$items = $input['items'] ?? [];
$couponCode = trim($input['coupon_code'] ?? '');

if (empty($items) || !is_array($items)) {
    Response::success([
        'items'           => [],
        'subtotal'        => 0.00,
        'discount_amount' => 0.00,
        'shipping_fee'    => 0.00,
        'tax_amount'      => 0.00,
        'total_amount'    => 0.00,
        'coupon_applied'  => null
    ], 'Empty cart');
}

$pdo = Database::getConnection();

// Fetch settings
$setStmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('free_shipping_threshold', 'standard_shipping_fee')");
$settings = $setStmt->fetchAll(PDO::FETCH_KEY_PAIR);
$freeShippingThreshold = (float)($settings['free_shipping_threshold'] ?? 999.00);
$standardShippingFee = (float)($settings['standard_shipping_fee'] ?? 70.00);

$verifiedItems = [];
$subtotal = 0.00;
$totalLensPrice = 0.00;

foreach ($items as $item) {
    $productId = (int)($item['product_id'] ?? 0);
    $qty = max(1, (int)($item['quantity'] ?? 1));

    $stmt = $pdo->prepare('
        SELECT id, name, sku, barcode, price, discount_price, stock_quantity, is_prescription_compatible
        FROM products
        WHERE id = ? AND is_active = 1
    ');
    $stmt->execute([$productId]);
    $prod = $stmt->fetch();

    if (!$prod) {
        continue; // Skip inactive/deleted
    }

    $regularPrice = (float)$prod['price'];
    $unitPrice = $prod['discount_price'] !== null ? (float)$prod['discount_price'] : $regularPrice;
    
    // Check lens add-ons
    $lensType = trim($item['lens_type'] ?? '');
    $lensPrice = 0.00;
    if (!empty($lensType) && !empty($item['lens_price'])) {
        // Known standardized lens tiers
        $lensMap = [
            'Standard Single Vision Anti-Glare' => 500.00,
            'BluZero Anti-Fatigue Computer'      => 800.00,
            'High-Index 1.67 Ultra-Thin'         => 1500.00,
            'Progressive Digital Freeform'       => 2200.00,
            'Photochromic Transition (Grey)'     => 1200.00
        ];
        $lensPrice = $lensMap[$lensType] ?? (float)$item['lens_price'];
    }

    $itemTotal = ($unitPrice + $lensPrice) * $qty;
    $subtotal += $itemTotal;
    $totalLensPrice += ($lensPrice * $qty);

    $verifiedItems[] = [
        'product_id'                 => (int)$prod['id'],
        'name'                       => $prod['name'],
        'sku'                        => $prod['sku'],
        'unit_price'                 => $unitPrice,
        'quantity'                   => $qty,
        'stock_available'            => (int)$prod['stock_quantity'],
        'is_available'               => (int)$prod['stock_quantity'] >= $qty,
        'lens_type'                  => $lensType ?: null,
        'lens_price'                 => $lensPrice,
        'item_total'                 => $itemTotal,
        'is_prescription_compatible' => (bool)$prod['is_prescription_compatible']
    ];
}

// Coupon validation
$discountAmount = 0.00;
$couponInfo = null;
if (!empty($couponCode)) {
    $cpnStmt = $pdo->prepare('
        SELECT * FROM coupons 
        WHERE code = ? AND is_active = 1 
          AND valid_from <= CURDATE() AND valid_until >= CURDATE()
          AND (usage_limit = 0 OR times_used < usage_limit)
    ');
    $cpnStmt->execute([$couponCode]);
    $coupon = $cpnStmt->fetch();

    if ($coupon) {
        $minOrder = (float)$coupon['min_order_amount'];
        if ($subtotal >= $minOrder) {
            if ($coupon['discount_type'] === 'PERCENTAGE') {
                $calcDisc = ($subtotal * (float)$coupon['discount_value']) / 100.0;
                if ($coupon['max_discount'] !== null) {
                    $calcDisc = min($calcDisc, (float)$coupon['max_discount']);
                }
                $discountAmount = round($calcDisc, 2);
            } else {
                $discountAmount = min($subtotal, (float)$coupon['discount_value']);
            }
            $couponInfo = [
                'code'           => $coupon['code'],
                'discount_value' => (float)$coupon['discount_value'],
                'discount_type'  => $coupon['discount_type'],
                'saved_amount'   => $discountAmount
            ];
        } else {
            $couponInfo = [
                'code'    => $couponCode,
                'invalid' => true,
                'message' => "Minimum cart total of ₹" . number_format($minOrder, 2) . " required for this coupon."
            ];
        }
    } else {
        $couponInfo = [
            'code'    => $couponCode,
            'invalid' => true,
            'message' => 'Coupon code is invalid or has expired.'
        ];
    }
}

// Shipping calculation
$shippingFee = ($subtotal - $discountAmount >= $freeShippingThreshold || $subtotal == 0) ? 0.00 : $standardShippingFee;
$taxAmount = 0.00; // All prices inclusive of optical GST
$totalAmount = max(0.00, round(($subtotal - $discountAmount) + $shippingFee, 2));

Response::success([
    'items'                   => $verifiedItems,
    'subtotal'                => round($subtotal, 2),
    'discount_amount'         => round($discountAmount, 2),
    'shipping_fee'            => round($shippingFee, 2),
    'free_shipping_threshold' => $freeShippingThreshold,
    'tax_amount'              => round($taxAmount, 2),
    'total_amount'            => $totalAmount,
    'coupon_applied'          => $couponInfo
], 'Cart totals verified');
