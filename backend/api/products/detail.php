<?php
// Netra Unnayan - Product Detail API (By Slug or ID)
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$identifier = trim($_GET['slug'] ?? $_GET['id'] ?? '');

if (empty($identifier)) {
    Response::error('Product identifier required.', 400);
}

$pdo = Database::getConnection();

$where = is_numeric($identifier) ? 'p.id = ?' : 'p.slug = ?';
$stmt = $pdo->prepare("
    SELECT 
        p.*,
        c.name as category_name, c.slug as category_slug,
        b.name as brand_name, b.slug as brand_slug
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE $where AND p.is_active = 1
");
$stmt->execute([$identifier]);
$product = $stmt->fetch();

if (!$product) {
    Response::notFound('Product not found or currently unavailable.');
}

// Fetch all images for this product
$imgStmt = $pdo->prepare('SELECT id, image_url, view_type, is_primary FROM product_images WHERE product_id = ? ORDER BY display_order ASC, id ASC');
$imgStmt->execute([$product['id']]);
$product['images'] = $imgStmt->fetchAll();

// If no images in product_images, provide fallback
if (empty($product['images'])) {
    $product['images'] = [
        ['image_url' => 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80', 'view_type' => 'front', 'is_primary' => 1]
    ];
}

$regularPrice = (float)$product['price'];
$discountPrice = $product['discount_price'] !== null ? (float)$product['discount_price'] : null;
$product['effective_price'] = $discountPrice ?? $regularPrice;
$product['discount_percent'] = ($discountPrice && $regularPrice > $discountPrice) 
    ? round((($regularPrice - $discountPrice) / $regularPrice) * 100) 
    : 0;
$product['in_stock'] = (int)$product['stock_quantity'] > 0;
$product['is_low_stock'] = (int)$product['stock_quantity'] <= (int)$product['low_stock_threshold'] && (int)$product['stock_quantity'] > 0;
$product['specifications'] = json_decode($product['specifications'] ?? '{}', true);

// Dimensions label e.g. 52 □ 18 — 140
$product['dimensions_label'] = ($product['lens_width'] && $product['bridge_width'] && $product['temple_length'])
    ? "{$product['lens_width']} □ {$product['bridge_width']} — {$product['temple_length']}"
    : null;

// Public QR Code URL
$host = $_SERVER['HTTP_HOST'] ?? 'localhost:5173';
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$product['public_qr_url'] = "$protocol://$host/product/{$product['sku']}";

// Related products
$relStmt = $pdo->prepare('
    SELECT p.id, p.name, p.slug, p.sku, p.price, p.discount_price, p.frame_shape, p.frame_size,
           (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image
    FROM products p
    WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
    ORDER BY p.is_featured DESC, p.id DESC LIMIT 4
');
$relStmt->execute([$product['category_id'], $product['id']]);
$product['related_products'] = $relStmt->fetchAll();

Response::success($product, 'Product details loaded');
