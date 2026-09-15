<?php
// Netra Unnayan - Book Home Eye Checkup Service API
// Pincode validation, slot availability, and 2-hour cancellation rule setup

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$auth = getOptionalAuth();
$customerId = ($auth && ($auth['type'] ?? '') === 'customer') ? (int)$auth['id'] : null;

$customerName = trim($input['customer_name'] ?? '');
$customerPhone = trim($input['customer_phone'] ?? '');
$customerEmail = trim($input['customer_email'] ?? '');
$addressLine1 = trim($input['address_line1'] ?? '');
$addressLine2 = trim($input['address_line2'] ?? '');
$landmark = trim($input['landmark'] ?? '');
$pincode = trim($input['pincode'] ?? '');
$serviceDate = trim($input['service_date'] ?? '');
$serviceSlot = trim($input['service_slot'] ?? ''); // e.g. "10:00 AM - 12:00 PM"
$notes = trim($input['notes'] ?? '');

if (empty($customerName) || empty($customerPhone) || empty($addressLine1) || empty($pincode) || empty($serviceDate) || empty($serviceSlot)) {
    Response::error('Please fill all mandatory fields (Name, Phone, Address, PIN, Date, Slot).', 422);
}

// Validate date
if (strtotime($serviceDate) < strtotime(date('Y-m-d'))) {
    Response::error('Service date cannot be in the past.', 422);
}

$pdo = Database::getConnection();

// Check service configuration & location fees
$srvStmt = $pdo->query('SELECT * FROM home_eye_services WHERE is_active = 1 LIMIT 1');
$service = $srvStmt->fetch();
$baseFee = $service ? (float)$service['base_fee'] : 299.00;
$locationFees = !empty($service['location_fees']) ? json_decode($service['location_fees'], true) : [];

$selectedLocationId = trim($input['location_id'] ?? '');
$calculatedFee = $baseFee;
$locationName = 'Standard Service Zone';

// Match location tier either by passed location_id or by entered pincode
if (!empty($locationFees)) {
    $matched = false;
    foreach ($locationFees as $tier) {
        if (!empty($selectedLocationId) && ($tier['id'] ?? '') === $selectedLocationId) {
            $calculatedFee = (float)($tier['fee'] ?? $baseFee);
            $locationName = $tier['name'] ?? 'Custom Service Area';
            $matched = true;
            break;
        }
        // Match pincode
        if (!empty($tier['pincodes']) && !empty($pincode)) {
            $tierPincodes = array_map('trim', explode(',', $tier['pincodes']));
            if (in_array($pincode, $tierPincodes)) {
                $calculatedFee = (float)($tier['fee'] ?? $baseFee);
                $locationName = $tier['name'] ?? 'Covered Service Area';
                $matched = true;
                break;
            }
        }
    }
}

// Calculate cancellation deadline (2 hours before slot start time)
// Extract hour from slot e.g. "10:00 AM - 12:00 PM"
$slotStartHour = '10:00:00';
if (preg_match('/(\d{1,2}):(\d{2})\s*(AM|PM)/i', $serviceSlot, $m)) {
    $hr = (int)$m[1];
    $ampm = strtoupper($m[3]);
    if ($ampm === 'PM' && $hr < 12) $hr += 12;
    if ($ampm === 'AM' && $hr === 12) $hr = 0;
    $slotStartHour = sprintf('%02d:%02d:00', $hr, (int)$m[2]);
}

$slotDateTime = strtotime("$serviceDate $slotStartHour");
$canCancelUntil = date('Y-m-d H:i:s', $slotDateTime - (2 * 3600));

$bookingNumber = 'NU-HET-' . strtoupper(bin2hex(random_bytes(4)));

$stmt = $pdo->prepare('
    INSERT INTO home_eye_appointments (
        booking_number, customer_id, customer_name, customer_phone, customer_email,
        address_line1, address_line2, landmark, location_name, pincode, service_date, service_slot,
        service_fee, payment_status, status, can_cancel_until, notes
    ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, "Pay on Visit", "Pending", ?, ?
    )
');

$stmt->execute([
    $bookingNumber, $customerId, $customerName, $customerPhone, $customerEmail ?: null,
    $addressLine1, $addressLine2 ?: null, $landmark ?: null, $locationName, $pincode, $serviceDate, $serviceSlot,
    $calculatedFee, $canCancelUntil, $notes ?: null
]);
$bookingId = (int)$pdo->lastInsertId();

if (!empty($customerEmail)) {
    $emailHtml = <<<HTML
        <div class="badge" style="background:#FEF3C7; color:#B45309; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; display: inline-block;">Booking Status: Pending Allocation</div>
        <h2>Home Eye Test Request Received</h2>
        <p>Dear {$customerName}, your doorstep vision checkup request has been registered and is awaiting staff allocation.</p>
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;">
        <p><strong>Booking #:</strong> {$bookingNumber}</p>
        <p><strong>Scheduled Slot:</strong> {$serviceDate} ({$serviceSlot})</p>
        <p><strong>Address:</strong> {$addressLine1}, {$landmark}, PIN {$pincode}</p>
        <p><strong>Visit Fee:</strong> ₹{$baseFee} (Payable on visit)</p>
        <p style="font-size:12px; color:#64748B; margin-top: 15px;">When approved by our dispatch desk, our certified optometrist will bring 100+ trial frames and digital autorefractor directly to your doorstep. Status will update to <strong>Confirmed</strong> in your profile.</p>
HTML;
    Mailer::send($customerEmail, $customerName, "Home Eye Checkup Request #{$bookingNumber} - Netra Unnayan", $emailHtml);
}

Response::created([
    'booking_id'        => $bookingId,
    'booking_number'    => $bookingNumber,
    'service_date'      => $serviceDate,
    'service_slot'      => $serviceSlot,
    'fee'               => $baseFee,
    'status'            => 'Confirmed',
    'can_cancel_until'  => $canCancelUntil
], "Home eye checkup appointment {$bookingNumber} scheduled successfully!");
