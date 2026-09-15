<?php
// Netra Unnayan - Customer Delivery Addresses CRUD API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$auth = requireCustomerAuth();
$customerId = (int)$auth['id'];
$pdo = Database::getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->prepare('
        SELECT * FROM customer_addresses 
        WHERE customer_id = ? 
        ORDER BY is_default DESC, id DESC
    ');
    $stmt->execute([$customerId]);
    $addresses = $stmt->fetchAll();
    Response::success($addresses, 'Addresses retrieved');
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $recipientName = trim($input['recipient_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $addressLine1 = trim($input['address_line1'] ?? '');
    $addressLine2 = trim($input['address_line2'] ?? '');
    $landmark = trim($input['landmark'] ?? '');
    $city = trim($input['city'] ?? 'Digha');
    $state = trim($input['state'] ?? 'West Bengal');
    $pincode = trim($input['pincode'] ?? '');
    $rawType = strtoupper(trim($input['address_type'] ?? 'HOME'));
    $addressType = in_array($rawType, ['HOME', 'OFFICE', 'OTHER']) ? $rawType : 'HOME';
    $isDefault = !empty($input['is_default']) ? 1 : 0;

    if (empty($recipientName) || empty($phone) || empty($addressLine1) || empty($pincode)) {
        Response::error('Recipient Name, Mobile Phone, Address Line 1, and PIN Code are required.', 422);
    }

    if ($isDefault) {
        // Unset any previous defaults
        $pdo->prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?')->execute([$customerId]);
    } else {
        // If this is the very first address, make it default automatically
        $count = (int)$pdo->prepare('SELECT COUNT(*) FROM customer_addresses WHERE customer_id = ?')->execute([$customerId]);
        if ($count === 0) $isDefault = 1;
    }

    $insStmt = $pdo->prepare('
        INSERT INTO customer_addresses (
            customer_id, recipient_name, phone, address_line1, address_line2,
            landmark, city, state, pincode, address_type, is_default
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
        )
    ');
    $insStmt->execute([
        $customerId, $recipientName, $phone, $addressLine1, $addressLine2 ?: null,
        $landmark ?: null, $city, $state, $pincode, $addressType, $isDefault
    ]);
    $addressId = (int)$pdo->lastInsertId();

    Response::created(['id' => $addressId], 'Address saved successfully');
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $addressId = (int)($input['id'] ?? 0);
    $action = $input['action'] ?? 'update';

    if (empty($addressId)) {
        Response::error('Address ID is required.', 422);
    }

    // Verify ownership
    $check = $pdo->prepare('SELECT id FROM customer_addresses WHERE id = ? AND customer_id = ?');
    $check->execute([$addressId, $customerId]);
    if (!$check->fetch()) {
        Response::error('Address not found or unauthorized.', 404);
    }

    if ($action === 'set_default') {
        $pdo->prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?')->execute([$customerId]);
        $pdo->prepare('UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND customer_id = ?')->execute([$addressId, $customerId]);
        Response::success(null, 'Default address updated');
    }

    $recipientName = trim($input['recipient_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $addressLine1 = trim($input['address_line1'] ?? '');
    $addressLine2 = trim($input['address_line2'] ?? '');
    $landmark = trim($input['landmark'] ?? '');
    $city = trim($input['city'] ?? 'Digha');
    $state = trim($input['state'] ?? 'West Bengal');
    $pincode = trim($input['pincode'] ?? '');
    $rawType = strtoupper(trim($input['address_type'] ?? 'HOME'));
    $addressType = in_array($rawType, ['HOME', 'OFFICE', 'OTHER']) ? $rawType : 'HOME';
    $isDefault = !empty($input['is_default']) ? 1 : 0;

    if ($isDefault) {
        $pdo->prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?')->execute([$customerId]);
    }

    $updStmt = $pdo->prepare('
        UPDATE customer_addresses SET
            recipient_name = ?, phone = ?, address_line1 = ?, address_line2 = ?,
            landmark = ?, city = ?, state = ?, pincode = ?, address_type = ?, is_default = ?
        WHERE id = ? AND customer_id = ?
    ');
    $updStmt->execute([
        $recipientName, $phone, $addressLine1, $addressLine2 ?: null,
        $landmark ?: null, $city, $state, $pincode, $addressType, $isDefault,
        $addressId, $customerId
    ]);

    Response::success(null, 'Address updated successfully');
}

if ($method === 'DELETE') {
    $addressId = (int)($_GET['id'] ?? 0);
    if (empty($addressId)) {
        Response::error('Address ID is required.', 422);
    }
    $delStmt = $pdo->prepare('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?');
    $delStmt->execute([$addressId, $customerId]);
    Response::success(null, 'Address removed successfully');
}
