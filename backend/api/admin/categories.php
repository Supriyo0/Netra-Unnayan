<?php
/**
 * Netra Unnayan - Admin Categories & Roundels Management API
 */

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth();
$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $db->query("SELECT * FROM categories ORDER BY display_order ASC, id ASC");
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        Response::success($categories, 'Categories loaded successfully');
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $action = $input['action'] ?? 'create';

        if ($action === 'toggle_status') {
            $id = (int)($input['id'] ?? 0);
            $isActive = (int)($input['is_active'] ?? 0);
            $stmt = $db->prepare("UPDATE categories SET is_active = ? WHERE id = ?");
            $stmt->execute([$isActive, $id]);
            Response::success(['id' => $id, 'is_active' => $isActive], 'Status updated successfully');
        }

        if ($action === 'create' || $action === 'update') {
            $name = trim($input['name'] ?? '');
            $slug = trim($input['slug'] ?? '');
            if (empty($slug)) {
                $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));
            }
            $description = trim($input['description'] ?? '');
            $imageUrl = trim($input['image_url'] ?? '');
            $displayOrder = (int)($input['display_order'] ?? 0);
            $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;

            if (empty($name)) {
                Response::error('Category name is required', 422);
            }

            if ($action === 'create') {
                $stmt = $db->prepare("INSERT INTO categories (name, slug, description, image_url, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$name, $slug, $description, $imageUrl, $displayOrder, $isActive]);
                Response::success(['id' => (int)$db->lastInsertId()], 'Category created successfully');
            } else {
                $id = (int)($input['id'] ?? 0);
                $stmt = $db->prepare("UPDATE categories SET name = ?, slug = ?, description = ?, image_url = ?, display_order = ?, is_active = ? WHERE id = ?");
                $stmt->execute([$name, $slug, $description, $imageUrl, $displayOrder, $isActive, $id]);
                Response::success(['id' => $id], 'Category updated successfully');
            }
        }
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            Response::error('Category ID required', 400);
        }
        $stmt = $db->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        Response::success(['id' => $id], 'Category removed successfully');
    }

    Response::error('Unsupported request method', 405);
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
