<?php
// Netra Unnayan - Home Eye Services & Location Tiers API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$pdo = Database::getConnection();

try {
    $stmt = $pdo->query('SELECT * FROM home_eye_services WHERE is_active = 1 LIMIT 1');
    $service = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$service) {
        // Fallback default
        $service = [
            'id' => 1,
            'service_name' => 'Complete 12-Step Doorstep Vision Examination & 100+ Frame Trial',
            'base_fee' => 299.00,
            'max_daily_slots' => 12,
            'slot_duration_minutes' => 45,
            'is_active' => 1,
            'location_fees' => json_encode([
                [
                    'id' => 'loc_1',
                    'name' => 'Zone 1: Core City & Central (Park St, Bhowanipore, Salt Lake, New Town)',
                    'pincodes' => '700001, 700016, 700020, 700025, 700064, 700091, 700156',
                    'fee' => 199,
                    'sla' => 'Same Day / 2-Hour Slot'
                ],
                [
                    'id' => 'loc_2',
                    'name' => 'Zone 2: North & South Suburbs (Dum Dum, Garia, Behala, Jadavpur)',
                    'pincodes' => '700028, 700032, 700034, 700084, 700102',
                    'fee' => 299,
                    'sla' => 'Next Day Slot'
                ],
                [
                    'id' => 'loc_3',
                    'name' => 'Zone 3: Greater Metro & Outskirts (Barasat, Howrah, Sonarpur, Digha Rural)',
                    'pincodes' => '700120, 700124, 700135, 711101, 711102, 721428',
                    'fee' => 449,
                    'sla' => 'Scheduled Visit'
                ]
            ])
        ];
    }

    $service['location_fees_list'] = !empty($service['location_fees']) 
        ? json_decode($service['location_fees'], true) 
        : [];

    Response::success($service, 'Home eye checkup service details loaded');

} catch (Exception $e) {
    Response::error('Failed to load home eye checkup details: ' . $e->getMessage(), 500);
}
