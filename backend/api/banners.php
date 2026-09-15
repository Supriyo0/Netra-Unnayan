<?php
// Netra Unnayan - Storefront Hero Banners API
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

try {
    $pdo = Database::getConnection();

    $stmt = $pdo->query('
        SELECT * FROM hero_banners 
        WHERE is_active = 1 
        ORDER BY display_order ASC, id ASC
    ');
    $banners = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch product details for featured_products_json on each banner
    foreach ($banners as &$banner) {
        $pids = [];
        if (!empty($banner['featured_products_json'])) {
            $decoded = json_decode($banner['featured_products_json'], true);
            if (is_array($decoded)) {
                $pids = array_filter(array_map('intval', $decoded));
            }
        }

        $banner['featured_products'] = [];
        if (!empty($pids)) {
            $inClause = implode(',', $pids);
            $pStmt = $pdo->query("
                SELECT 
                    p.id, p.name, p.slug, p.sku, p.price, p.discount_price,
                    p.frame_size, p.frame_shape, p.frame_material, p.is_tryon_enabled,
                    (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as image_url
                FROM products p
                WHERE p.id IN ($inClause) AND p.is_active = 1
            ");
            $banner['featured_products'] = $pStmt->fetchAll(PDO::FETCH_ASSOC);
        }
    }

    Response::success($banners);
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
