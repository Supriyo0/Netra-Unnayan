<?php
// Netra Unnayan - Admin Product Management API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth(['super_admin', 'manager', 'inventory_staff']);
$pdo = Database::getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $id = isset($input['id']) ? (int)$input['id'] : null;
    $categoryId = (int)($input['category_id'] ?? 1);
    $name = trim($input['name'] ?? '');
    $sku = trim($input['sku'] ?? '');
    $barcode = trim($input['barcode'] ?? '');
    $price = (float)($input['price'] ?? 0);
    $discountPrice = !empty($input['discount_price']) ? (float)$input['discount_price'] : null;
    $stock = (int)($input['stock_quantity'] ?? 0);
    $lowStockThreshold = (int)($input['low_stock_threshold'] ?? 5);
    $frameShape = trim($input['frame_shape'] ?? 'Rectangle');
    $frameMaterial = trim($input['frame_material'] ?? 'Acetate');
    $frameSize = trim($input['frame_size'] ?? 'Medium');
    $frameColor = trim($input['frame_color'] ?? 'Black');
    $gender = trim($input['gender'] ?? 'Unisex');
    $lensWidth = !empty($input['lens_width']) ? (int)$input['lens_width'] : 52;
    $bridgeWidth = !empty($input['bridge_width']) ? (int)$input['bridge_width'] : 18;
    $templeLength = !empty($input['temple_length']) ? (int)$input['temple_length'] : 140;
    $totalWidth = !empty($input['total_frame_width']) ? (int)$input['total_frame_width'] : 138;
    $isTryon = !empty($input['is_tryon_enabled']) ? 1 : 0;
    $isPrescription = isset($input['is_prescription_compatible']) ? (int)$input['is_prescription_compatible'] : 1;
    $isFeatured = !empty($input['is_featured']) ? 1 : 0;
    $isNewArrival = !empty($input['is_new_arrival']) ? 1 : 0;
    $description = trim($input['description'] ?? '');
    $availableSizes = isset($input['available_sizes']) 
        ? (is_array($input['available_sizes']) ? implode(', ', $input['available_sizes']) : trim((string)$input['available_sizes'])) 
        : 'Small, Medium, Large';
    $availableColors = isset($input['available_colors']) 
        ? (is_array($input['available_colors']) ? implode(', ', $input['available_colors']) : trim((string)$input['available_colors'])) 
        : 'Black, Gold, Silver, Crystal';
    $images = $input['images'] ?? [];

    if (empty($name) || empty($sku) || $price <= 0) {
        Response::error('Product name, unique SKU, and positive price are required.', 422);
    }

    if (empty($barcode)) {
        $barcode = 'NU' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $sku), 0, 10));
    }

    // Slug generation
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));

    if ($id) {
        // Update
        $stmt = $pdo->prepare('
            UPDATE products SET
                category_id = ?, name = ?, slug = ?, sku = ?, barcode = ?,
                price = ?, discount_price = ?, stock_quantity = ?, low_stock_threshold = ?,
                lens_width = ?, bridge_width = ?, temple_length = ?, total_frame_width = ?,
                frame_size = ?, frame_shape = ?, frame_material = ?, frame_color = ?, gender = ?,
                available_sizes = ?, available_colors = ?,
                is_tryon_enabled = ?, is_prescription_compatible = ?, is_featured = ?, is_new_arrival = ?,
                description = ?
            WHERE id = ?
        ');
        $stmt->execute([
            $categoryId, $name, $slug, $sku, $barcode,
            $price, $discountPrice, $stock, $lowStockThreshold,
            $lensWidth, $bridgeWidth, $templeLength, $totalWidth,
            $frameSize, $frameShape, $frameMaterial, $frameColor, $gender,
            $availableSizes, $availableColors,
            $isTryon, $isPrescription, $isFeatured, $isNewArrival,
            $description, $id
        ]);
        $productId = $id;
        $msg = "Product '$name' updated.";
    } else {
        // Insert
        $stmt = $pdo->prepare('
            INSERT INTO products (
                category_id, name, slug, sku, barcode,
                price, discount_price, stock_quantity, low_stock_threshold,
                lens_width, bridge_width, temple_length, total_frame_width,
                frame_size, frame_shape, frame_material, frame_color, gender,
                available_sizes, available_colors,
                is_tryon_enabled, is_prescription_compatible, is_featured, is_new_arrival,
                description, is_active
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?,
                ?, 1
            )
        ');
        $stmt->execute([
            $categoryId, $name, $slug, $sku, $barcode,
            $price, $discountPrice, $stock, $lowStockThreshold,
            $lensWidth, $bridgeWidth, $templeLength, $totalWidth,
            $frameSize, $frameShape, $frameMaterial, $frameColor, $gender,
            $availableSizes, $availableColors,
            $isTryon, $isPrescription, $isFeatured, $isNewArrival,
            $description
        ]);
        $productId = (int)$pdo->lastInsertId();

        // Initial inventory record
        $pdo->prepare('
            INSERT INTO inventory_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reference_type, reference_id, notes, created_by_admin_id)
            VALUES (?, "PURCHASE", ?, 0, ?, "NEW_PRODUCT", ?, "Initial stock on product creation", ?)
        ')->execute([$productId, $stock, $stock, $sku, $admin['id']]);

        $msg = "Product '$name' created.";
    }

    // Update images if provided
    if (!empty($images) && is_array($images)) {
        $pdo->prepare('DELETE FROM product_images WHERE product_id = ?')->execute([$productId]);
        $imgIns = $pdo->prepare('
            INSERT INTO product_images (product_id, image_url, view_type, display_order, is_primary)
            VALUES (?, ?, ?, ?, ?)
        ');
        foreach ($images as $idx => $img) {
            $url = is_string($img) ? $img : ($img['image_url'] ?? '');
            if (!empty($url)) {
                $isPrim = ($idx === 0) ? 1 : 0;
                $viewType = is_array($img) ? ($img['view_type'] ?? 'front') : 'front';
                $imgIns->execute([$productId, $url, $viewType, $idx, $isPrim]);
            }
        }
    }

    Response::success(['product_id' => $productId, 'sku' => $sku], $msg);

} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) Response::error('Product ID required.', 400);

    // Soft delete (archive) to preserve inventory foreign keys
    $pdo->prepare('UPDATE products SET is_active = 0 WHERE id = ?')->execute([$id]);
    Response::success(['id' => $id], 'Product archived successfully');

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $categoryId = isset($_GET['category_id']) ? (int)$_GET['category_id'] : null;

    $query = '
        SELECT 
            p.*,
            c.name as category_name,
            b.name as brand_name,
            (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.is_active = 1
    ';
    $params = [];

    if (!empty($search)) {
        $query .= ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    if ($categoryId) {
        $query .= ' AND p.category_id = ?';
        $params[] = $categoryId;
    }

    $query .= ' ORDER BY p.id DESC';

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    Response::success(['products' => $products]);
}

