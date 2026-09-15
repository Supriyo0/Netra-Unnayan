<?php
// Netra Unnayan - Doctors Listing & Profile API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$pdo = Database::getConnection();
$stmt = $pdo->query('
    SELECT * 
    FROM doctors 
    WHERE is_active = 1 
    ORDER BY experience_years DESC, id ASC
');
$doctors = $stmt->fetchAll();

// Add slot schedule metadata and day-specific consultation fees
foreach ($doctors as &$doc) {
    $doc['available_days_list'] = array_map('trim', explode(',', $doc['available_days'] ?? ''));
    
    // Parse day_fees JSON (e.g. {"Monday": 500, "Sunday": 700})
    $dayFees = !empty($doc['day_fees']) ? json_decode($doc['day_fees'], true) : [];
    if (!is_array($dayFees)) $dayFees = [];
    $doc['day_fees_parsed'] = $dayFees;
    
    // Generate next 14 available consultation dates for quick booking UI
    $dates = [];
    $start = new DateTime();
    for ($i = 0; $i < 14; $i++) {
        $check = clone $start;
        $check->modify("+$i day");
        $dayName = $check->format('l');
        
        $match = false;
        foreach ($doc['available_days_list'] as $ad) {
            if (stripos($ad, $dayName) !== false) {
                $match = true;
                break;
            }
        }
        if ($match) {
            $feeForDay = isset($dayFees[$dayName]) && is_numeric($dayFees[$dayName]) 
                ? (float)$dayFees[$dayName] 
                : (float)$doc['consultation_fee'];
                
            $dates[] = [
                'date'     => $check->format('Y-m-d'),
                'day'      => $dayName,
                'label'    => $check->format('D, M j'),
                'fee'      => $feeForDay
            ];
        }
    }
    $doc['upcoming_slots'] = $dates;
}

Response::success($doctors, 'Doctors loaded successfully');
