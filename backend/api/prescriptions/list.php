<?php
// Netra Unnayan - Customer Prescription Vault Listing
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$customer = requireCustomerAuth();
$pdo = Database::getConnection();

$stmt = $pdo->prepare('SELECT * FROM customer_prescriptions WHERE customer_id = ? ORDER BY id DESC');
$stmt->execute([$customer['id']]);
$prescriptions = $stmt->fetchAll();

Response::success($prescriptions, 'Prescriptions retrieved');
