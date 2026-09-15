<?php
// Netra Unnayan - Book Eye Doctor Appointment API
// RULE: Appointment slots cannot be double-booked. Enforced by DB constraint & transactional check.

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

$doctorId = (int)($input['doctor_id'] ?? 0);
$patientName = trim($input['patient_name'] ?? '');
$patientPhone = trim($input['patient_phone'] ?? '');
$patientEmail = trim($input['patient_email'] ?? '');
$appointmentDate = trim($input['appointment_date'] ?? '');
$appointmentTime = trim($input['appointment_time'] ?? '');
$notes = trim($input['notes'] ?? '');

if (empty($doctorId) || empty($patientName) || empty($patientPhone) || empty($appointmentDate) || empty($appointmentTime)) {
    Response::error('Please fill in all mandatory booking fields (Doctor, Patient Name, Phone, Date, Time Slot).', 422);
}

// Validate date is not in the past
if (strtotime($appointmentDate) < strtotime(date('Y-m-d'))) {
    Response::error('Appointment date cannot be in the past.', 422);
}

$pdo = Database::getConnection();

// Verify doctor exists
$docStmt = $pdo->prepare('SELECT id, name, consultation_fee, qualification, available_days, is_active, day_fees FROM doctors WHERE id = ?');
$docStmt->execute([$doctorId]);
$doctor = $docStmt->fetch();

if (!$doctor || !$doctor['is_active']) {
    Response::error('Selected doctor is currently unavailable.', 400);
}

// Check day of week against doctor's available days
$dayOfWeek = date('l', strtotime($appointmentDate));
if (stripos($doctor['available_days'], $dayOfWeek) === false) {
    Response::error("{$doctor['name']} does not consult on {$dayOfWeek}s. Available days: {$doctor['available_days']}", 400);
}

// Calculate dynamic fee per day (e.g. Sunday fee vs Monday fee)
$consultationFee = (float)$doctor['consultation_fee'];
if (!empty($doctor['day_fees'])) {
    $dayFees = json_decode($doctor['day_fees'], true);
    if (is_array($dayFees) && isset($dayFees[$dayOfWeek]) && is_numeric($dayFees[$dayOfWeek])) {
        $consultationFee = (float)$dayFees[$dayOfWeek];
    }
}

try {
    $pdo->beginTransaction();

    // Check if slot is already occupied
    $conflictStmt = $pdo->prepare('
        SELECT id FROM appointments 
        WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != "Cancelled"
        FOR UPDATE
    ');
    $conflictStmt->execute([$doctorId, $appointmentDate, $appointmentTime]);
    if ($conflictStmt->fetch()) {
        $pdo->rollBack();
        Response::error("The slot at {$appointmentTime} on {$appointmentDate} is already booked. Please choose another slot.", 409);
    }

    $appointmentNumber = 'NU-APT-' . strtoupper(bin2hex(random_bytes(4)));

    $insStmt = $pdo->prepare('
        INSERT INTO appointments (
            appointment_number, doctor_id, customer_id, patient_name, patient_phone,
            patient_email, appointment_date, appointment_time, consultation_fee,
            payment_status, status, notes
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            "Pay at Clinic", "Pending", ?
        )
    ');
    $insStmt->execute([
        $appointmentNumber, $doctorId, $customerId, $patientName, $patientPhone,
        $patientEmail ?: null, $appointmentDate, $appointmentTime, $consultationFee,
        $notes ?: null
    ]);
    $appointmentId = (int)$pdo->lastInsertId();

    $pdo->commit();

    // Dispatch appointment booking request email
    if (!empty($patientEmail)) {
        $emailHtml = <<<HTML
            <div class="badge" style="background:#FEF3C7; color:#B45309; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; display: inline-block;">Booking Status: Pending Clinic Confirmation</div>
            <h2>Doctor Appointment Requested</h2>
            <p>Dear {$patientName}, your appointment request has been submitted and is awaiting confirmation from our optical clinic staff.</p>
            <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;">
            <p><strong>Appointment #:</strong> {$appointmentNumber}</p>
            <p><strong>Doctor:</strong> {$doctor['name']} ({$doctor['qualification']})</p>
            <p><strong>Date & Time Slot:</strong> {$appointmentDate} at {$appointmentTime}</p>
            <p><strong>Venue:</strong> Netra Unnayan, Digha Bypass Rd, Jatimati, Digha, West Bengal 721428</p>
            <p><strong>Consultation Fee:</strong> ₹{$doctor['consultation_fee']} (Pay at Clinic Counter)</p>
            <p style="color: #64748B; font-size: 12px; margin-top: 20px;">Once approved by our clinical desk, your appointment will show as <strong>Confirmed</strong> in your customer profile, and you will receive a final confirmation notification.</p>
HTML;
        Mailer::send($patientEmail, $patientName, "Appointment Request #{$appointmentNumber} - Netra Unnayan", $emailHtml);
    }

    Response::created([
        'appointment_id'     => $appointmentId,
        'appointment_number' => $appointmentNumber,
        'doctor_name'        => $doctor['name'],
        'date'               => $appointmentDate,
        'time'               => $appointmentTime,
        'fee'                => (float)$doctor['consultation_fee'],
        'status'             => 'Confirmed',
        'clinic_address'     => 'Digha Bypass Rd, Jatimati, Digha, West Bengal 721428'
    ], "Appointment {$appointmentNumber} confirmed with {$doctor['name']}!");

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($e->getCode() == 23000) {
        Response::error("This appointment slot was just claimed by another patient. Please select another time.", 409);
    }
    Response::error("Failed to book appointment: " . $e->getMessage(), 500);
}
