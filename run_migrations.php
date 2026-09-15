<?php
require_once __DIR__ . '/backend/config/database.php';
$db = (new Database())->getConnection();

echo "Running migrations..." . PHP_EOL;

// 1. Add day_fees to doctors if not exists
try {
    $db->exec("ALTER TABLE doctors ADD COLUMN day_fees LONGTEXT NULL AFTER consultation_fee");
    echo "Added day_fees to doctors." . PHP_EOL;
} catch (Exception $e) {
    echo "day_fees in doctors already exists or: " . $e->getMessage() . PHP_EOL;
}

// 2. Add location_fees to home_eye_services if not exists
try {
    $db->exec("ALTER TABLE home_eye_services ADD COLUMN location_fees LONGTEXT NULL AFTER service_pincodes");
    echo "Added location_fees to home_eye_services." . PHP_EOL;
} catch (Exception $e) {
    echo "location_fees in home_eye_services already exists or: " . $e->getMessage() . PHP_EOL;
}

// 3. Add location_name to home_eye_appointments if not exists
try {
    $db->exec("ALTER TABLE home_eye_appointments ADD COLUMN location_name VARCHAR(150) NULL AFTER landmark");
    echo "Added location_name to home_eye_appointments." . PHP_EOL;
} catch (Exception $e) {
    echo "location_name in home_eye_appointments already exists or: " . $e->getMessage() . PHP_EOL;
}

// 4. Populate default day_fees for existing doctors
$stmt = $db->query("SELECT id, consultation_fee, available_days FROM doctors");
$doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($doctors as $doc) {
    $baseFee = floatval($doc['consultation_fee'] ?? 500);
    // Sunday fee slightly higher (e.g. +200), Saturday +100, Weekdays baseFee
    $dayFees = [
        'Monday' => $baseFee,
        'Tuesday' => $baseFee,
        'Wednesday' => $baseFee,
        'Thursday' => $baseFee,
        'Friday' => $baseFee,
        'Saturday' => $baseFee + 100,
        'Sunday' => $baseFee + 200
    ];
    $json = json_encode($dayFees);
    $upd = $db->prepare("UPDATE doctors SET day_fees = :df WHERE id = :id AND (day_fees IS NULL OR day_fees = '')");
    $upd->execute([':df' => $json, ':id' => $doc['id']]);
}
echo "Populated day_fees for " . count($doctors) . " doctors." . PHP_EOL;

// 5. Populate default location_fees for home eye services
$stmt = $db->query("SELECT id, base_fee FROM home_eye_services");
$services = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($services as $srv) {
    $locationFees = [
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
            'name' => 'Zone 3: Greater Metro & Outskirts (Barasat, Howrah, Sonarpur, Rajarhat Rural)',
            'pincodes' => '700120, 700124, 700135, 711101, 711102',
            'fee' => 449,
            'sla' => 'Scheduled Visit'
        ]
    ];
    $json = json_encode($locationFees);
    $upd = $db->prepare("UPDATE home_eye_services SET location_fees = :lf WHERE id = :id");
    $upd->execute([':lf' => $json, ':id' => $srv['id']]);
}
echo "Populated location_fees for " . count($services) . " home eye services." . PHP_EOL;

echo "Migrations completed successfully." . PHP_EOL;
