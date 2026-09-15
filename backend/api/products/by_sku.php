<?php
// Netra Unnayan - Lookup Product by SKU or Barcode (QR Resolution & POS scanner)
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$code = trim($_GET['sku'] ?? $_GET['barcode'] ?? $_GET['code'] ?? $_GET['name'] ?? '');

if (empty($code)) {
    Response::error('SKU, barcode, or product name parameter is required.', 400);
}

$pdo = Database::getConnection();
$wildCode = '%' . $code . '%';
$prefixCode = $code . '%';

$stmt = $pdo->prepare('
    SELECT 
        p.*,
        c.name as category_name, c.slug as category_slug,
        b.name as brand_name,
        (
            SELECT image_url FROM product_images 
            WHERE product_id = p.id 
            ORDER BY is_primary DESC, display_order ASC LIMIT 1
        ) as primary_image
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE (p.sku = ? OR p.barcode = ? OR p.name = ? OR p.name LIKE ? OR p.sku LIKE ? OR b.name LIKE ?) AND p.is_active = 1
    ORDER BY 
        CASE 
            WHEN p.barcode = ? THEN 1
            WHEN p.sku = ? THEN 2
            WHEN p.name = ? THEN 3
            WHEN p.name LIKE ? THEN 4
            ELSE 5
        END,
        p.is_featured DESC,
        p.id DESC
    LIMIT 1
');
$stmt->execute([
    $code, $code, $code, $wildCode, $wildCode, $wildCode,
    $code, $code, $code, $prefixCode
]);
$product = $stmt->fetch();

if (!$product) {
    Response::notFound("No active product matching '$code'.");
}

$regularPrice = (float)$product['price'];
$discountPrice = $product['discount_price'] !== null ? (float)$product['discount_price'] : null;
$product['effective_price'] = $discountPrice ?? $regularPrice;
$product['discount_percent'] = ($discountPrice && $regularPrice > $discountPrice) 
    ? round((($regularPrice - $discountPrice) / $regularPrice) * 100) 
    : 0;
$product['in_stock'] = (int)$product['stock_quantity'] > 0;
$product['is_low_stock'] = (int)$product['stock_quantity'] <= (int)$product['low_stock_threshold'] && (int)$product['stock_quantity'] > 0;

// Fetch all images
$imgStmt = $pdo->prepare('SELECT id, image_url, view_type, is_primary FROM product_images WHERE product_id = ? ORDER BY display_order ASC');
$imgStmt->execute([$product['id']]);
$product['images'] = $imgStmt->fetchAll();

Response::success($product, 'Product found');
