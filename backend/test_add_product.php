<?php
require_once __DIR__ . '/config/database.php';

try {
    $pdo = Database::getConnection();

    $sku = 'NU-TITAN-TEST-004';
    $name = 'Netra Sovereign Titanium Quad-View';
    $slug = 'netra-sovereign-titanium-quad-view';
    $barcode = 'NUTITAN004';
    $price = 2499.00;
    $discountPrice = 1799.00;
    $stock = 25;
    $extraShipping = 50.00;

    // Remove if exists
    $existing = $pdo->prepare('SELECT id FROM products WHERE sku = ?');
    $existing->execute([$sku]);
    $oldId = $existing->fetchColumn();
    if ($oldId) {
        $pdo->prepare('DELETE FROM product_images WHERE product_id = ?')->execute([$oldId]);
        $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$oldId]);
    }

    $images = [
        'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&auto=format&fit=crop&q=80'
    ];

    $stmt = $pdo->prepare('
        INSERT INTO products (
            category_id, name, slug, sku, barcode,
            price, discount_price, stock_quantity, low_stock_threshold, extra_shipping_fee,
            lens_width, bridge_width, temple_length, total_frame_width,
            frame_size, frame_shape, frame_material, frame_color, gender,
            available_sizes, available_colors,
            is_tryon_enabled, is_prescription_compatible, is_featured, is_new_arrival,
            description, primary_image, is_active
        ) VALUES (
            1, ?, ?, ?, ?,
            ?, ?, ?, 5, ?,
            54, 18, 142, 140,
            "Medium", "Aviator", "Titanium", "Matte Gunmetal", "Unisex",
            "Small, Medium, Large", "Matte Black, Gunmetal, Rose Gold",
            1, 1, 1, 1,
            "Engineered with ultra-pure Japanese Beta-Titanium and precision high-index optical lens geometry.",
            ?, 1
        )
    ');

    $stmt->execute([
        $name, $slug, $sku, $barcode,
        $price, $discountPrice, $stock, $extraShipping,
        $images[0]
    ]);
    $newId = (int)$pdo->lastInsertId();

    $imgIns = $pdo->prepare('
        INSERT INTO product_images (product_id, image_url, view_type, display_order, is_primary)
        VALUES (?, ?, ?, ?, ?)
    ');
    foreach ($images as $idx => $url) {
        $viewType = ($idx === 0) ? 'front' : (($idx === 1) ? 'side' : (($idx === 2) ? 'angle' : 'lifestyle'));
        $imgIns->execute([$newId, $url, $viewType, $idx, ($idx === 0 ? 1 : 0)]);
    }

    echo "SUCCESS: Product created with ID: {$newId}, SKU: {$sku}\n";

    // Test product retrieval
    $testQuery = $pdo->prepare('SELECT p.*, (SELECT COUNT(*) FROM product_images WHERE product_id = p.id) as img_count FROM products p WHERE p.id = ?');
    $testQuery->execute([$newId]);
    $prod = $testQuery->fetch(PDO::FETCH_ASSOC);

    $imgList = $pdo->prepare('SELECT image_url, view_type FROM product_images WHERE product_id = ? ORDER BY display_order ASC');
    $imgList->execute([$newId]);
    $imgs = $imgList->fetchAll(PDO::FETCH_ASSOC);

    echo "Verified Product: " . $prod['name'] . "\n";
    echo "SKU: " . $prod['sku'] . " | Stock: " . $prod['stock_quantity'] . " | Price: ₹" . $prod['discount_price'] . "\n";
    echo "Images Attached: " . count($imgs) . "\n";
    foreach ($imgs as $i => $im) {
        echo "  - Image " . ($i + 1) . " (" . $im['view_type'] . "): " . $im['image_url'] . "\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
