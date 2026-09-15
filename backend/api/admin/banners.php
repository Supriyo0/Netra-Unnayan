<?php
// Netra Unnayan - Admin Hero Banners API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth(['super_admin', 'manager', 'inventory_staff']);
$pdo = Database::getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('
        SELECT * FROM hero_banners 
        ORDER BY display_order ASC, id DESC
    ');
    $banners = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($banners as &$banner) {
        $pids = [];
        if (!empty($banner['featured_products_json'])) {
            $decoded = json_decode($banner['featured_products_json'], true);
            if (is_array($decoded)) {
                $pids = array_filter(array_map('intval', $decoded));
            }
        }
        $banner['featured_product_ids'] = $pids;
    }

    Response::success(['banners' => $banners]);

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    // Toggle active shortcut
    if (isset($input['toggle_id'])) {
        $toggleId = (int)$input['toggle_id'];
        $pdo->prepare('UPDATE hero_banners SET is_active = IF(is_active = 1, 0, 1) WHERE id = ?')->execute([$toggleId]);
        Response::success(['id' => $toggleId], 'Banner status toggled');
    }

    $id = isset($input['id']) ? (int)$input['id'] : null;
    $title = trim($input['title'] ?? '');
    $subtitle = trim($input['subtitle'] ?? '');
    $tag = trim($input['tag'] ?? 'PREMIUM EYEWEAR');
    $buttonText = trim($input['button_text'] ?? 'EXPLORE FRAMES');
    $buttonUrl = trim($input['button_url'] ?? '/shop');
    $image = trim($input['image'] ?? '');
    $gradient = trim($input['gradient'] ?? 'from-[#060D17] via-[#0A192F] to-[#040912]');
    $displayOrder = (int)($input['display_order'] ?? 1);
    $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;
    
    // Background picture customization
    $bgImageUrl = trim($input['background_image_url'] ?? '');
    $bgZoom = isset($input['background_zoom']) && is_numeric($input['background_zoom']) ? (float)$input['background_zoom'] : 100;
    $bgPosition = trim($input['background_position'] ?? 'center center');
    $bgOpacity = isset($input['background_opacity']) && is_numeric($input['background_opacity']) ? (float)$input['background_opacity'] : 0.85;

    $featuredProducts = isset($input['featured_products']) ? (array)$input['featured_products'] : [];
    $featuredProductsJson = json_encode(array_values(array_filter(array_map('intval', $featuredProducts))));

    if (empty($title)) {
        Response::error('Banner title is required', 422);
    }

    if ($id) {
        $stmt = $pdo->prepare('
            UPDATE hero_banners SET
                title = ?, subtitle = ?, tag = ?, button_text = ?, button_url = ?,
                image = ?, gradient = ?, featured_products_json = ?, display_order = ?, is_active = ?,
                background_image_url = ?, background_zoom = ?, background_position = ?, background_opacity = ?
            WHERE id = ?
        ');
        $stmt->execute([
            $title, $subtitle, $tag, $buttonText, $buttonUrl,
            $image, $gradient, $featuredProductsJson, $displayOrder, $isActive,
            $bgImageUrl, $bgZoom, $bgPosition, $bgOpacity,
            $id
        ]);
        Response::success(['id' => $id], 'Banner updated successfully');
    } else {
        $stmt = $pdo->prepare('
            INSERT INTO hero_banners (
                title, subtitle, tag, button_text, button_url,
                image, gradient, featured_products_json, display_order, is_active,
                background_image_url, background_zoom, background_position, background_opacity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $title, $subtitle, $tag, $buttonText, $buttonUrl,
            $image, $gradient, $featuredProductsJson, $displayOrder, $isActive,
            $bgImageUrl, $bgZoom, $bgPosition, $bgOpacity
        ]);
        $newId = (int)$pdo->lastInsertId();
        Response::success(['id' => $newId], 'Banner created successfully');
    }

} elseif ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) Response::error('Banner ID required', 400);

    $pdo->prepare('DELETE FROM hero_banners WHERE id = ?')->execute([$id]);
    Response::success(['id' => $id], 'Banner deleted successfully');
}
