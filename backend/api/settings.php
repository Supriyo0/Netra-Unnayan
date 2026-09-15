<?php
// Netra Unnayan - Public Store Settings API
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

$pdo = Database::getConnection();
$stmt = $pdo->query("
    SELECT setting_key, setting_value, group_name
    FROM settings
    WHERE setting_key IN (
        'business_name', 'tagline', 'business_address', 'contact_phone',
        'contact_email', 'google_maps_url', 'upi_id', 'upi_merchant_name',
        'cod_enabled', 'online_payment_enabled', 'free_shipping_threshold',
        'standard_shipping_fee', 'home_eye_checkup_fee', 'cancellation_cutoff_hours',
        'home_visit_cancellation_cutoff_hours', 'return_window_days', 'maintenance_mode',
        'home_visit_enabled', 'home_visit_notice', 'doctor_appointments_enabled',
        'doctor_clinic_notice', 'offers_slider_enabled', 'serviceable_pincodes', 'trust_features',
        'imgbb_api_key'
    )
");

$rows = $stmt->fetchAll();
$settings = [
    'home_visit_enabled'          => '1',
    'doctor_appointments_enabled' => '1',
    'offers_slider_enabled'       => '1',
    'home_eye_checkup_fee'        => '299',
    'serviceable_pincodes'        => '721428, 721463, 721401, 721453, 721441',
    'home_visit_notice'           => '',
    'doctor_clinic_notice'        => '',
    'trust_features'              => json_encode([
        ['id' => 'tf_1', 'title' => 'JAPAN TITANIUM', 'description' => '100% Certified Japanese Beta-Titanium', 'icon' => 'Shield'],
        ['id' => 'tf_2', 'title' => 'GERMAN OPTICS', 'description' => 'Digital Blue & UV400 Anti-Glare Cut', 'icon' => 'Eye'],
        ['id' => 'tf_3', 'title' => '14-DAY REPLACEMENT', 'description' => 'Zero-Risk Optical Frame Exchange', 'icon' => 'RotateCcw'],
        ['id' => 'tf_4', 'title' => 'SECURE CHECKOUT', 'description' => 'Instant UPI QR & Verified COD Orders', 'icon' => 'Truck']
    ])
];
foreach ($rows as $row) {
    $settings[$row['setting_key']] = $row['setting_value'];
}

Response::success($settings, 'Public store configuration loaded');
