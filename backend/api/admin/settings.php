<?php
// Netra Unnayan - Admin Settings Management API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth(['super_admin', 'manager', 'admin']);
$pdo = Database::getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query('SELECT setting_key, setting_value, group_name, description FROM settings');
    $rows = $stmt->fetchAll();
    $settings = [];
    foreach ($rows as $r) {
        $settings[$r['setting_key']] = $r['setting_value'];
    }
    Response::success($settings, 'All settings retrieved');

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $allowedKeys = [
        'business_name', 'tagline', 'business_address', 'contact_phone',
        'contact_email', 'google_maps_url', 'upi_id', 'upi_merchant_name',
        'cod_enabled', 'online_payment_enabled', 'free_shipping_threshold',
        'standard_shipping_fee', 'home_eye_checkup_fee', 'cancellation_cutoff_hours',
        'home_visit_cancellation_cutoff_hours', 'return_window_days',
        'low_stock_global_threshold', 'maintenance_mode',
        'home_visit_enabled', 'home_visit_notice', 'doctor_appointments_enabled',
        'doctor_clinic_notice', 'offers_slider_enabled', 'serviceable_pincodes',
        'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass',
        'smtp_encryption', 'smtp_from_email', 'smtp_from_name',
        'trust_features', 'imgbb_api_key'
    ];

    $updateStmt = $pdo->prepare('
        INSERT INTO settings (setting_key, setting_value, group_name) 
        VALUES (:key, :val, "general") 
        ON DUPLICATE KEY UPDATE setting_value = :val
    ');

    $updated = [];
    foreach ($input as $key => $val) {
        if (in_array($key, $allowedKeys, true)) {
            $valStr = is_bool($val) ? ($val ? '1' : '0') : (string)$val;
            $updateStmt->execute([':key' => $key, ':val' => $valStr]);
            $updated[$key] = $valStr;
        }
    }

    Response::success($updated, 'Settings updated successfully');
}
