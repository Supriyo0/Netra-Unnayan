<?php
// Netra Unnayan - Save Prescription to Customer Vault
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$customer = requireCustomerAuth();
$input = json_decode(file_get_contents('php://input'), true) ?? [];

$label = trim($input['label'] ?? 'Prescription ' . date('M Y'));
$doctorName = trim($input['doctor_name'] ?? '');
$clinicName = trim($input['clinic_name'] ?? '');
$rxDate = $input['prescription_date'] ?? date('Y-m-d');

$pdo = Database::getConnection();
$stmt = $pdo->prepare('
    INSERT INTO customer_prescriptions (
        customer_id, label, doctor_name, clinic_name, prescription_date,
        right_sph, right_cyl, right_axis, right_add, right_pd,
        left_sph, left_cyl, left_axis, left_add, left_pd,
        single_pd, prescription_file_url, notes
    ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
    )
');

$stmt->execute([
    $customer['id'], $label, $doctorName ?: null, $clinicName ?: null, $rxDate,
    $input['right_sph'] ?? null, $input['right_cyl'] ?? null,
    $input['right_axis'] ?? null, $input['right_add'] ?? null,
    $input['right_pd'] ?? null,
    $input['left_sph'] ?? null, $input['left_cyl'] ?? null,
    $input['left_axis'] ?? null, $input['left_add'] ?? null,
    $input['left_pd'] ?? null,
    $input['single_pd'] ?? null,
    $input['prescription_file_url'] ?? null,
    $input['notes'] ?? null
]);

$id = (int)$pdo->lastInsertId();
Response::created(['id' => $id, 'label' => $label], 'Prescription saved to your vault.');
