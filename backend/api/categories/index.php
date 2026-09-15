<?php
// Netra Unnayan - Categories List API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$pdo = Database::getConnection();
$stmt = $pdo->query('
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
    WHERE c.is_active = 1
    GROUP BY c.id
    ORDER BY c.display_order ASC, c.name ASC
');

$categories = $stmt->fetchAll();
Response::success($categories, 'Categories loaded successfully');
