<?php
// Netra Unnayan - Admin Settings Management API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/mailer.php';

try {
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

        // If test_email is sent, trigger SMTP test dispatch
        if (!empty($input['test_email'])) {
            $testTo = trim($input['test_email']);
            $testSent = Mailer::send(
                $testTo,
                'Netra Admin',
                'SMTP Configuration Test — Netra Unnayan',
                '<h3>SMTP Mailer Verified</h3><p>Your transactional email dispatcher is operational with Google SMTP (netraunnayan@gmail.com).</p>'
            );
            if (!$testSent) {
                Response::error('Failed to send test email. Please check your SMTP host, port, and 16-character App Password.', 500);
            }
        }

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
            'trust_features', 'imgbb_api_key', 'upi_qr_image',
            'active_theme', 'festive_banner_enabled', 'festive_banner_text', 'festive_effects_enabled',
            'curated_categories'
        ];

        // Safe prepared statement with positional placeholders avoiding duplicate named parameter issue
        $updateStmt = $pdo->prepare('
            INSERT INTO settings (setting_key, setting_value, group_name) 
            VALUES (?, ?, "general") 
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        ');

        $updated = [];
        foreach ($input as $key => $val) {
            if (in_array($key, $allowedKeys, true)) {
                if (is_array($val) || is_object($val)) {
                    $valStr = json_encode($val);
                } elseif (is_bool($val)) {
                    $valStr = $val ? '1' : '0';
                } else {
                    $valStr = (string)$val;
                }
                $updateStmt->execute([$key, $valStr]);
                $updated[$key] = $valStr;
            }
        }

        Response::success($updated, 'Settings updated successfully');
    }
} catch (\Throwable $e) {
    Response::error($e->getMessage(), 500);
}
