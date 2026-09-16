<?php
// Netra Unnayan - Customer Delivery Addresses CRUD API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$auth = requireCustomerAuth();
$customerId = (int)$auth['id'];
$custPhone = trim($auth['phone'] ?? '');
$cleanPhone = preg_replace('/[^0-9]/', '', $custPhone);
$last10 = substr($cleanPhone, -10);

$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? [];
$action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';

// 1. DELETE ADDRESS (via HTTP DELETE or POST action=delete)
if ($method === 'DELETE' || ($method === 'POST' && $action === 'delete')) {
    $addressId = (int)($input['id'] ?? $_GET['id'] ?? $_POST['id'] ?? 0);
    if (empty($addressId)) {
        Response::error('Address ID is required.', 422);
    }

    $delStmt = $pdo->prepare('
        DELETE FROM customer_addresses 
        WHERE id = ? 
          AND (
            customer_id = ? 
            OR (phone != "" AND phone = ?) 
            OR (? != "" AND phone != "" AND RIGHT(REGEXP_REPLACE(phone, "[^0-9]", ""), 10) = ?)
          )
    ');
    $delStmt->execute([$addressId, $customerId, $custPhone, $last10, $last10]);

    if ($delStmt->rowCount() === 0) {
        // Fallback: If address customer_id is 0 or null, check if ownership can be claimed or deleted
        $forceStmt = $pdo->prepare('DELETE FROM customer_addresses WHERE id = ? AND (customer_id = ? OR customer_id IS NULL OR customer_id = 0)');
        $forceStmt->execute([$addressId, $customerId]);
    }

    Response::success(null, 'Address removed successfully');
}

// 2. SET DEFAULT ADDRESS (via HTTP PUT or POST action=set_default)
if (($method === 'PUT' && ($action === 'set_default' || !empty($input['is_default']))) || ($method === 'POST' && $action === 'set_default')) {
    $addressId = (int)($input['id'] ?? $_GET['id'] ?? $_POST['id'] ?? 0);
    if (empty($addressId)) {
        Response::error('Address ID is required.', 422);
    }
    $pdo->prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? OR (phone != "" AND phone = ?)')->execute([$customerId, $custPhone]);
    $pdo->prepare('UPDATE customer_addresses SET is_default = 1 WHERE id = ?')->execute([$addressId]);
    Response::success(null, 'Default address updated');
}

// 3. GET ADDRESSES
if ($method === 'GET') {
    $stmt = $pdo->prepare('
        SELECT * FROM customer_addresses 
        WHERE customer_id = ? 
           OR (phone != "" AND phone = ?)
           OR (? != "" AND phone != "" AND RIGHT(REGEXP_REPLACE(phone, "[^0-9]", ""), 10) = ?)
        ORDER BY is_default DESC, id DESC
    ');
    $stmt->execute([$customerId, $custPhone, $last10, $last10]);
    $addresses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    Response::success($addresses, 'Addresses retrieved');
}

// 4. UPDATE ADDRESS (via HTTP PUT or POST action=update)
if ($method === 'PUT' || ($method === 'POST' && $action === 'update')) {
    $addressId = (int)($input['id'] ?? $_GET['id'] ?? $_POST['id'] ?? 0);
    if (empty($addressId)) {
        Response::error('Address ID is required.', 422);
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
        $pdo->prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? OR (phone != "" AND phone = ?)')->execute([$customerId, $custPhone]);
    }

    $updStmt = $pdo->prepare('
        UPDATE customer_addresses SET
            recipient_name = ?, phone = ?, address_line1 = ?, address_line2 = ?,
            landmark = ?, city = ?, state = ?, pincode = ?, address_type = ?, is_default = ?, customer_id = ?
        WHERE id = ?
    ');
    $updStmt->execute([
        $recipientName, $phone, $addressLine1, $addressLine2 ?: null,
        $landmark ?: null, $city, $state, $pincode, $addressType, $isDefault,
        $customerId,
        $addressId
    ]);

    Response::success(null, 'Address updated successfully');
}

// 5. CREATE ADDRESS
if ($method === 'POST') {
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
        $pdo->prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? OR (phone != "" AND phone = ?)')->execute([$customerId, $custPhone]);
    } else {
        // If this is the very first address, make it default automatically
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM customer_addresses WHERE customer_id = ?');
        $countStmt->execute([$customerId]);
        $count = (int)$countStmt->fetchColumn();
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
