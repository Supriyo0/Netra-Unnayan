<?php
// Netra Unnayan - Instant Product Auto-Suggest Search API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$pdo = Database::getConnection();

$q = trim($_GET['q'] ?? $_GET['search'] ?? '');

if (strlen($q) < 1) {
    Response::json(['success' => true, 'suggestions' => [], 'total' => 0]);
    exit;
}

try {
    $searchWild = '%' . $q . '%';
    $searchPrefix = $q . '%';

    $sql = "
        SELECT 
            p.id,
            p.name,
            p.sku,
            p.price,
            p.discount_price,
            p.frame_shape,
            p.frame_material,
            p.gender,
            p.stock_quantity,
            c.name as category_name,
            c.slug as category_slug,
            b.name as brand_name,
            COALESCE(
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1),
                (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1),
                '/placeholder_frame.png'
            ) as thumbnail_url
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.is_active = 1
          AND (
                p.name LIKE ? 
             OR p.sku LIKE ? 
             OR p.barcode LIKE ? 
             OR b.name LIKE ? 
             OR c.name LIKE ?
             OR p.frame_shape LIKE ?
             OR p.frame_material LIKE ?
          )
        ORDER BY 
            CASE 
                WHEN p.name LIKE ? THEN 1
                WHEN p.sku LIKE ? THEN 2
                WHEN b.name LIKE ? THEN 3
                ELSE 4
            END,
            p.is_featured DESC,
            p.id DESC
        LIMIT 8
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $searchWild,   // p.name
        $searchPrefix, // p.sku
        $searchPrefix, // p.barcode
        $searchWild,   // b.name
        $searchWild,   // c.name
        $searchWild,   // p.frame_shape
        $searchWild,   // p.frame_material
        $searchPrefix, // CASE p.name
        $searchPrefix, // CASE p.sku
        $searchPrefix  // CASE b.name
    ]);

    $suggestions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Also get count
    $countSql = "
        SELECT COUNT(*) as total
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
          AND (
                p.name LIKE ? 
             OR p.sku LIKE ? 
             OR b.name LIKE ? 
             OR c.name LIKE ?
          )
    ";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute([
        $searchWild,
        $searchPrefix,
        $searchWild,
        $searchWild
    ]);
    $total = (int)($countStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? count($suggestions));

    Response::json([
        'success' => true,
        'query' => $q,
        'suggestions' => $suggestions,
        'total' => $total
    ]);

} catch (Exception $e) {
    Response::error('Failed to fetch search suggestions: ' . $e->getMessage(), 500);
}
