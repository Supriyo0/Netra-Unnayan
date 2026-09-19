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
        'imgbb_api_key', 'active_theme', 'festive_banner_enabled', 'festive_banner_text',
        'festive_effects_enabled', 'curated_categories',
        'theme_badge_text', 'theme_greeting_bengali', 'theme_greeting_english', 'theme_loading_tagline'
    )
");

$rows = $stmt->fetchAll();
$settings = [
    'active_theme'                => 'default',
    'festive_banner_enabled'      => '1',
    'festive_banner_text'         => 'Festive Optical Offers Active • Visit Our Digha Store or Book Home Eye Checkup',
    'festive_effects_enabled'     => '1',
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
    ]),
    'curated_categories'          => json_encode([
        ['id' => 'cat_1', 'name' => 'Japanese Titanium', 'slug' => 'eyeglasses', 'isLink' => '/catalog?category=eyeglasses', 'icon' => 'Glasses', 'image' => 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&auto=format&fit=crop&q=80', 'sub' => '8g Ultralight', 'is_active' => 1],
        ['id' => 'cat_2', 'name' => 'UV400 Polarized', 'slug' => 'sunglasses', 'isLink' => '/catalog?category=sunglasses', 'icon' => 'Compass', 'image' => 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&auto=format&fit=crop&q=80', 'sub' => 'Ocean Glare Cut', 'is_active' => 1],
        ['id' => 'cat_3', 'name' => 'BluZero™ Screen', 'slug' => 'computer-glasses', 'isLink' => '/catalog?category=computer-glasses', 'icon' => 'Eye', 'image' => 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&auto=format&fit=crop&q=80', 'sub' => '98% Blue Block', 'is_active' => 1],
        ['id' => 'cat_4', 'name' => 'Reading & Bifocal', 'slug' => 'reading-glasses', 'isLink' => '/catalog?category=reading-glasses', 'icon' => 'Glasses', 'image' => 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&auto=format&fit=crop&q=80', 'sub' => 'CR-39 Optics', 'is_active' => 1],
        ['id' => 'cat_5', 'name' => 'Digha Eye Clinic', 'slug' => 'doctors', 'isLink' => '/doctors', 'icon' => 'Stethoscope', 'image' => 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80', 'sub' => 'Senior Surgeons', 'is_active' => 1],
        ['id' => 'cat_6', 'name' => 'Free Home Test', 'slug' => 'home-eye-checkup', 'isLink' => '/home-eye-checkup', 'icon' => 'Home', 'image' => 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&auto=format&fit=crop&q=80', 'sub' => 'Doorstep Checkup', 'is_active' => 1]
    ])
];
foreach ($rows as $row) {
    $settings[$row['setting_key']] = $row['setting_value'];
}

Response::success($settings, 'Public store configuration loaded');
