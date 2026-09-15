<?php
// Netra Unnayan - Barcode & QR Label Printing Engine (Thermal & A4 Printable Sheets)
// Generates Code 128 barcodes and public QR links for optical frame tags

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/barcode.php';

$admin = requireAdminAuth(['super_admin', 'manager', 'inventory_staff', 'billing_staff']);
$pdo = Database::getConnection();

$productIds = [];
if (!empty($_GET['product_id'])) {
    $productIds = [(int)$_GET['product_id']];
} elseif (!empty($_GET['product_ids'])) {
    $productIds = array_map('intval', explode(',', $_GET['product_ids']));
} else {
    // If none specified, fetch all active products
    $all = $pdo->query('SELECT id FROM products WHERE is_active = 1 LIMIT 24')->fetchAll(PDO::FETCH_COLUMN);
    $productIds = $all;
}

if (empty($productIds)) {
    Response::error('No products selected for label generation.', 400);
}

$inClause = implode(',', array_fill(0, count($productIds), '?'));
$stmt = $pdo->prepare("
    SELECT 
        p.id, p.name, p.sku, p.barcode, p.price, p.discount_price,
        p.lens_width, p.bridge_width, p.temple_length, p.frame_size, p.frame_shape, p.frame_material,
        c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id IN ($inClause)
");
$stmt->execute($productIds);
$products = $stmt->fetchAll();

$host = $_SERVER['HTTP_HOST'] ?? 'localhost:5173';
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';

$labels = [];
foreach ($products as $p) {
    $publicUrl = "$protocol://$host/product/{$p['sku']}";
    $barcodeSvg = Barcode128::getSvg($p['sku'], 42, 1.4);
    
    // Quick QR code API link (safe, high resolution SVG/PNG)
    $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" . urlencode($publicUrl);

    $dimensions = ($p['lens_width'] && $p['bridge_width'] && $p['temple_length'])
        ? "{$p['lens_width']} □ {$p['bridge_width']} — {$p['temple_length']}"
        : $p['frame_size'];

    $labels[] = [
        'product_id'   => (int)$p['id'],
        'name'         => $p['name'],
        'sku'          => $p['sku'],
        'barcode'      => $p['barcode'],
        'category'     => $p['category_name'],
        'dimensions'   => $dimensions,
        'material'     => $p['frame_material'],
        'price'        => (float)$p['price'],
        'sale_price'   => $p['discount_price'] !== null ? (float)$p['discount_price'] : (float)$p['price'],
        'public_url'   => $publicUrl,
        'barcode_svg'  => $barcodeSvg,
        'qr_code_url'  => $qrCodeUrl
    ];
}

Response::success([
    'labels'       => $labels,
    'store_name'   => 'NETRA UNNAYAN',
    'tagline'      => 'Clarity You Can Trust',
    'store_phone'  => '9382293614',
    'location'     => 'Digha Bypass Rd, Jatimati, Digha'
], 'Printable barcode & QR labels generated');
