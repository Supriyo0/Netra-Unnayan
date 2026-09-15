<?php
/**
 * Netra Unnayan - Admin Categories & Roundels Management API
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');

$user = require_admin();
$db = get_db();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $db->query("SELECT * FROM categories ORDER BY display_order ASC, id ASC");
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $categories]);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $action = $input['action'] ?? 'create';

        if ($action === 'toggle_status') {
            $id = (int)($input['id'] ?? 0);
            $isActive = (int)($input['is_active'] ?? 0);
            $stmt = $db->prepare("UPDATE categories SET is_active = ? WHERE id = ?");
            $stmt->execute([$isActive, $id]);
            echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
            exit;
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
                echo json_encode(['success' => false, 'error' => 'Category name is required']);
                exit;
            }

            if ($action === 'create') {
                $stmt = $db->prepare("INSERT INTO categories (name, slug, description, image_url, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$name, $slug, $description, $imageUrl, $displayOrder, $isActive]);
                echo json_encode(['success' => true, 'message' => 'Category created successfully', 'id' => $db->lastInsertId()]);
                exit;
            } else {
                $id = (int)($input['id'] ?? 0);
                $stmt = $db->prepare("UPDATE categories SET name = ?, slug = ?, description = ?, image_url = ?, display_order = ?, is_active = ? WHERE id = ?");
                $stmt->execute([$name, $slug, $description, $imageUrl, $displayOrder, $isActive, $id]);
                echo json_encode(['success' => true, 'message' => 'Category updated successfully']);
                exit;
            }
        }
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            echo json_encode(['success' => false, 'error' => 'Category ID required']);
            exit;
        }
        $stmt = $db->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Category removed successfully']);
        exit;
    }

    echo json_encode(['success' => false, 'error' => 'Unsupported request method']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
