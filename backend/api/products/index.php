<?php
// Netra Unnayan - Products Catalog & Search API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$pdo = Database::getConnection();

$params = [];
$where = ['p.is_active = 1'];

if (!empty($_GET['search'])) {
    $search = trim($_GET['search']);
    $where[] = '(p.name LIKE :s_name OR p.sku LIKE :s_sku OR p.barcode LIKE :s_barcode OR b.name LIKE :s_brand OR c.name LIKE :s_cat OR p.description LIKE :s_desc OR p.frame_shape LIKE :s_shape OR p.frame_material LIKE :s_mat OR p.frame_color LIKE :s_col)';
    $searchWild = "%$search%";
    $params[':s_name'] = $searchWild;
    $params[':s_sku'] = $searchWild;
    $params[':s_barcode'] = $searchWild;
    $params[':s_brand'] = $searchWild;
    $params[':s_cat'] = $searchWild;
    $params[':s_desc'] = $searchWild;
    $params[':s_shape'] = $searchWild;
    $params[':s_mat'] = $searchWild;
    $params[':s_col'] = $searchWild;
}

// Category filter (by slug or id)
if (!empty($_GET['category'])) {
    $cat = trim($_GET['category']);
    if (is_numeric($cat)) {
        $where[] = 'p.category_id = :cat_id';
        $params[':cat_id'] = (int)$cat;
    } elseif ($cat === 'best-sellers-signature-drops') {
        $where[] = '(c.slug = :cat_slug OR p.is_featured = 1)';
        $params[':cat_slug'] = $cat;
    } else {
        $where[] = 'c.slug = :cat_slug';
        $params[':cat_slug'] = $cat;
    }
}

// Frame Shape
if (!empty($_GET['shape'])) {
    $where[] = 'p.frame_shape = :shape';
    $params[':shape'] = trim($_GET['shape']);
}

// Frame Material
if (!empty($_GET['material'])) {
    $where[] = 'p.frame_material LIKE :mat';
    $params[':mat'] = '%' . trim($_GET['material']) . '%';
}

// Frame Size (Small, Medium, Large)
if (!empty($_GET['size'])) {
    $where[] = 'p.frame_size = :size';
    $params[':size'] = trim($_GET['size']);
}

// Gender
if (!empty($_GET['gender'])) {
    $where[] = '(p.gender = :gender OR p.gender = "Unisex")';
    $params[':gender'] = trim($_GET['gender']);
}

// Price range
if (isset($_GET['min_price']) && is_numeric($_GET['min_price'])) {
    $where[] = 'COALESCE(p.discount_price, p.price) >= :min_price';
    $params[':min_price'] = (float)$_GET['min_price'];
}
if (isset($_GET['max_price']) && is_numeric($_GET['max_price'])) {
    $where[] = 'COALESCE(p.discount_price, p.price) <= :max_price';
    $params[':max_price'] = (float)$_GET['max_price'];
}

// Flags
if (!empty($_GET['prescription_only'])) {
    $where[] = 'p.is_prescription_compatible = 1';
}
if (!empty($_GET['tryon_only'])) {
    $where[] = 'p.is_tryon_enabled = 1';
}
if (!empty($_GET['featured'])) {
    $where[] = 'p.is_featured = 1';
}
if (!empty($_GET['new_arrival'])) {
    $where[] = 'p.is_new_arrival = 1';
}

// Sorting
$orderBy = 'p.id DESC';
$sort = $_GET['sort'] ?? 'newest';
switch ($sort) {
    case 'price_asc':
        $orderBy = 'COALESCE(p.discount_price, p.price) ASC';
        break;
    case 'price_desc':
        $orderBy = 'COALESCE(p.discount_price, p.price) DESC';
        break;
    case 'name_asc':
        $orderBy = 'p.name ASC';
        break;
    case 'popular':
        $orderBy = 'p.is_featured DESC, p.id DESC';
        break;
    case 'newest':
    default:
        $orderBy = 'p.is_new_arrival DESC, p.id DESC';
        break;
}

// Pagination
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(50, max(1, (int)($_GET['limit'] ?? 16)));
$offset = ($page - 1) * $limit;

$whereSql = implode(' AND ', $where);

// Count query
$countStmt = $pdo->prepare("
    SELECT COUNT(*) 
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE $whereSql
");
$countStmt->execute($params);
$totalProducts = (int)$countStmt->fetchColumn();

// Fetch products with primary image
$stmt = $pdo->prepare("
    SELECT 
        p.id, p.category_id, p.brand_id, p.name, p.slug, p.sku, p.barcode,
        p.price, p.discount_price, p.stock_quantity, p.low_stock_threshold,
        p.lens_width, p.bridge_width, p.temple_length, p.total_frame_width,
        p.frame_size, p.frame_shape, p.frame_material, p.frame_color, p.gender,
        p.is_prescription_compatible, p.is_tryon_enabled, p.is_cod_allowed,
        p.is_featured, p.is_new_arrival,
        c.name as category_name, c.slug as category_slug,
        b.name as brand_name,
        (
            SELECT image_url FROM product_images 
            WHERE product_id = p.id 
            ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1
        ) as primary_image
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE $whereSql
    ORDER BY $orderBy
    LIMIT $limit OFFSET $offset
");
$stmt->execute($params);
$products = $stmt->fetchAll();

// Add calculated fields (effective price, discount %, in-stock flag)
foreach ($products as &$prod) {
    $regularPrice = (float)$prod['price'];
    $discountPrice = $prod['discount_price'] !== null ? (float)$prod['discount_price'] : null;
    $prod['effective_price'] = $discountPrice ?? $regularPrice;
    $prod['discount_percent'] = ($discountPrice && $regularPrice > $discountPrice) 
        ? round((($regularPrice - $discountPrice) / $regularPrice) * 100) 
        : 0;
    $prod['in_stock'] = (int)$prod['stock_quantity'] > 0;
    $prod['is_low_stock'] = (int)$prod['stock_quantity'] <= (int)$prod['low_stock_threshold'] && (int)$prod['stock_quantity'] > 0;
    $prod['dimensions_label'] = ($prod['lens_width'] && $prod['bridge_width'] && $prod['temple_length'])
        ? "{$prod['lens_width']} □ {$prod['bridge_width']} — {$prod['temple_length']}"
        : null;
}

Response::success([
    'products'     => $products,
    'pagination'   => [
        'total'        => $totalProducts,
        'page'         => $page,
        'limit'        => $limit,
        'total_pages'  => ceil($totalProducts / $limit)
    ]
], 'Products retrieved successfully');
