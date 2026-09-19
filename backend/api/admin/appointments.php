<?php
// Netra Unnayan - Admin Appointments & Bookings Approval API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/mailer.php';

$admin = requireAdminAuth();
$pdo = Database::getConnection();

// Gracefully ensure ticket_no column exists in both tables
try {
    $pdo->exec("ALTER TABLE appointments ADD COLUMN ticket_no VARCHAR(100) NULL AFTER status");
} catch (Exception $e) {}
try {
    $pdo->exec("ALTER TABLE home_eye_appointments ADD COLUMN ticket_no VARCHAR(100) NULL AFTER status");
} catch (Exception $e) {}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $type = $_GET['type'] ?? 'all';
    $status = $_GET['status'] ?? 'all';

    $docQuery = '
        SELECT 
            "doctor" as booking_type,
            a.id, a.appointment_number as reference_number, a.doctor_id,
            a.customer_id, a.patient_name as customer_name, a.patient_phone as customer_phone,
            a.patient_email as customer_email, a.appointment_date as scheduled_date,
            a.appointment_time as scheduled_slot, a.consultation_fee as fee,
            a.payment_status, a.status, a.ticket_no, a.notes, a.created_at,
            d.name as doctor_name, d.specialization, d.qualification, d.photo_url as doctor_photo,
            NULL as address_line1, NULL as pincode, NULL as assigned_optometrist
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE 1=1
    ';
    $docParams = [];
    if ($status !== 'all') {
        if (strtolower($status) === 'pending') {
            $docQuery .= " AND (a.status = 'Pending' OR a.status = 'requested' OR a.status = 'Reschedule Requested' OR (a.status != 'Confirmed' AND a.status != 'Completed' AND a.status != 'Cancelled'))";
        } else {
            $docQuery .= ' AND a.status = ?';
            $docParams[] = $status;
        }
    }

    $homeQuery = '
        SELECT 
            "home_eye" as booking_type,
            h.id, h.booking_number as reference_number, NULL as doctor_id,
            h.customer_id, h.customer_name, h.customer_phone,
            h.customer_email, h.service_date as scheduled_date,
            h.service_slot as scheduled_slot, h.service_fee as fee,
            h.payment_status, h.status, h.ticket_no, h.notes, h.created_at,
            NULL as doctor_name, "Doorstep Optometrist Refraction" as specialization, NULL as qualification, NULL as doctor_photo,
            h.address_line1, h.pincode, h.assigned_optometrist
        FROM home_eye_appointments h
        WHERE 1=1
    ';
    $homeParams = [];
    if ($status !== 'all') {
        if (strtolower($status) === 'pending') {
            $homeQuery .= " AND (h.status = 'Pending' OR h.status = 'requested' OR h.status = 'Reschedule Requested' OR (h.status != 'Confirmed' AND h.status != 'Completed' AND h.status != 'Cancelled'))";
        } else {
            $homeQuery .= ' AND h.status = ?';
            $homeParams[] = $status;
        }
    }

    $bookings = [];

    if ($type === 'all' || $type === 'doctor') {
        $stmt = $pdo->prepare($docQuery . ' ORDER BY a.appointment_date DESC, a.id DESC');
        $stmt->execute($docParams);
        $bookings = array_merge($bookings, $stmt->fetchAll());
    }

    if ($type === 'all' || $type === 'home_eye') {
        $stmt = $pdo->prepare($homeQuery . ' ORDER BY h.service_date DESC, h.id DESC');
        $stmt->execute($homeParams);
        $bookings = array_merge($bookings, $stmt->fetchAll());
    }

    // Sort combined by created_at DESC
    usort($bookings, fn($a, $b) => strtotime($b['created_at'] ?? '') - strtotime($a['created_at'] ?? ''));

    // Compute live counter metrics
    $pendingDoc = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE status = 'Pending' OR status = 'Reschedule Requested' OR (status != 'Confirmed' AND status != 'Completed' AND status != 'Cancelled')")->fetchColumn();
    $pendingHome = (int)$pdo->query("SELECT COUNT(*) FROM home_eye_appointments WHERE status = 'Pending' OR status = 'Reschedule Requested' OR (status != 'Confirmed' AND status != 'Completed' AND status != 'Cancelled')")->fetchColumn();
    $confirmedTodayDoc = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE appointment_date = CURDATE() AND status = 'Confirmed'")->fetchColumn();
    $confirmedTodayHome = (int)$pdo->query("SELECT COUNT(*) FROM home_eye_appointments WHERE service_date = CURDATE() AND status = 'Confirmed'")->fetchColumn();

    Response::success([
        'bookings' => $bookings,
        'metrics'  => [
            'pending_total'        => $pendingDoc + $pendingHome,
            'pending_doctor'       => $pendingDoc,
            'pending_home_eye'     => $pendingHome,
            'today_clinic_visits'  => $confirmedTodayDoc,
            'today_home_visits'    => $confirmedTodayHome
        ]
    ], 'Admin bookings loaded');
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = strtolower(trim($input['action'] ?? ''));
    $bookingType = $input['booking_type'] ?? $input['type'] ?? 'doctor'; // 'doctor', 'home_eye', or 'store_visit'
    $id = (int)($input['id'] ?? 0);

    // 1. Action: Manual Store Visit / Doctor Appointment Booking created by Admin/Staff
    if ($action === 'create_manual' || $action === 'create_booking' || $action === 'manual_walkin') {
        $patientName = trim($input['patient_name'] ?? $input['customer_name'] ?? '');
        $patientPhone = trim($input['patient_phone'] ?? $input['customer_phone'] ?? '');
        $patientEmail = trim($input['patient_email'] ?? $input['customer_email'] ?? '');
        $aptDate = trim($input['appointment_date'] ?? $input['service_date'] ?? date('Y-m-d'));
        $aptTime = trim($input['appointment_time'] ?? $input['service_slot'] ?? date('h:i A'));
        $fee = isset($input['consultation_fee']) ? (float)$input['consultation_fee'] : (isset($input['fee']) ? (float)$input['fee'] : 0.0);
        $paymentStatus = trim($input['payment_status'] ?? 'Paid at Desk');
        $status = trim($input['status'] ?? 'Confirmed');
        $ticketNo = trim($input['ticket_no'] ?? $input['token_no'] ?? '');
        $notes = trim($input['notes'] ?? $input['admin_note'] ?? 'Walk-in booking registered by Clinic Front Desk');
        $doctorId = !empty($input['doctor_id']) ? (int)$input['doctor_id'] : null;

        if (empty($patientName) || empty($patientPhone)) {
            Response::error('Patient name and phone number are required.', 422);
        }

        if ($bookingType === 'home_eye') {
            $address = trim($input['address_line1'] ?? 'Netra Unnayan Clinic Area');
            $pincode = trim($input['pincode'] ?? '721428');
            $landmark = trim($input['landmark'] ?? '');
            $optometrist = trim($input['assigned_optometrist'] ?? 'Certified Senior Optometrist');
            $refNumber = 'NU-HET-' . strtoupper(bin2hex(random_bytes(3)));

            $stmt = $pdo->prepare('
                INSERT INTO home_eye_appointments (
                    booking_number, customer_name, customer_phone, customer_email,
                    address_line1, landmark, pincode, service_date, service_slot,
                    service_fee, payment_status, status, assigned_optometrist,
                    ticket_no, notes, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, NOW(), NOW()
                )
            ');
            $stmt->execute([
                $refNumber, $patientName, $patientPhone, $patientEmail ?: null,
                $address, $landmark ?: null, $pincode, $aptDate, $aptTime,
                $fee, $paymentStatus, $status, $optometrist,
                $ticketNo ?: null, $notes
            ]);
            $newId = (int)$pdo->lastInsertId();

            if (empty($ticketNo)) {
                $ticketNo = 'HET-' . str_pad($newId, 3, '0', STR_PAD_LEFT);
                $pdo->prepare("UPDATE home_eye_appointments SET ticket_no = ? WHERE id = ?")->execute([$ticketNo, $newId]);
            }

            if (!empty($patientEmail)) {
                $emailHtml = <<<HTML
                    <div style="background:#DCFCE7; color:#15803D; padding:6px 12px; border-radius:9999px; font-weight:800; font-size:12px; display:inline-block;">&#10003; Home Eye Visit Booked</div>
                    <h2 style="color:#0F172A; margin-top:12px;">Your Home Eye Test is Scheduled!</h2>
                    <p>Dear {$patientName}, your doorstep vision examination has been registered by our staff.</p>
                    <p><strong>Booking ID:</strong> {$refNumber}</p>
                    <p><strong>Token No:</strong> <span style="color:#0284C7; font-weight:bold;">#{$ticketNo}</span></p>
                    <p><strong>Date & Slot:</strong> {$aptDate} ({$aptTime})</p>
                    <p><strong>Optometrist:</strong> {$optometrist}</p>
HTML;
                Mailer::send($patientEmail, $patientName, "Confirmed: Home Eye Test #{$refNumber} [Token #{$ticketNo}] - Netra Unnayan", $emailHtml);
            }

            Response::success([
                'id' => $newId,
                'reference_number' => $refNumber,
                'ticket_no' => $ticketNo,
                'booking_type' => 'home_eye'
            ], "Home Eye Test booking #{$refNumber} created successfully!");
        } else {
            // Doctor Consultation or In-Store Screening
            // If doctor_id is provided, look up doctor details
            $doctorName = 'Clinic Optometrist';
            if ($doctorId) {
                $docStmt = $pdo->prepare('SELECT name, consultation_fee FROM doctors WHERE id = ?');
                $docStmt->execute([$doctorId]);
                $doc = $docStmt->fetch();
                if ($doc) {
                    $doctorName = $doc['name'];
                    if ($fee <= 0 && !empty($doc['consultation_fee'])) {
                        $fee = (float)$doc['consultation_fee'];
                    }
                }
            } else {
                // Check if there is a default doctor or first doctor in table
                $firstDoc = $pdo->query('SELECT id, name, consultation_fee FROM doctors LIMIT 1')->fetch();
                if ($firstDoc) {
                    $doctorId = (int)$firstDoc['id'];
                    $doctorName = $firstDoc['name'];
                    if ($fee <= 0 && !empty($firstDoc['consultation_fee'])) {
                        $fee = (float)$firstDoc['consultation_fee'];
                    }
                }
            }

            $refPrefix = $bookingType === 'store_visit' ? 'NU-STR-' : 'NU-DOC-';
            $refNumber = $refPrefix . strtoupper(bin2hex(random_bytes(3)));

            $stmt = $pdo->prepare('
                INSERT INTO appointments (
                    appointment_number, doctor_id, customer_id, patient_name, patient_phone,
                    patient_email, appointment_date, appointment_time, consultation_fee,
                    payment_status, status, ticket_no, notes, created_at, updated_at
                ) VALUES (
                    ?, ?, NULL, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, NOW(), NOW()
                )
            ');
            $stmt->execute([
                $refNumber, $doctorId, $patientName, $patientPhone,
                $patientEmail ?: null, $aptDate, $aptTime, $fee,
                $paymentStatus, $status, $ticketNo ?: null, $notes
            ]);
            $newId = (int)$pdo->lastInsertId();

            if (empty($ticketNo)) {
                $ticketNo = ($bookingType === 'store_visit' ? 'STR-' : 'TKN-') . str_pad($newId, 3, '0', STR_PAD_LEFT);
                $pdo->prepare("UPDATE appointments SET ticket_no = ? WHERE id = ?")->execute([$ticketNo, $newId]);
            }

            if (!empty($patientEmail)) {
                $emailHtml = <<<HTML
                    <div style="background:#DCFCE7; color:#15803D; padding:6px 12px; border-radius:9999px; font-weight:800; font-size:12px; display:inline-block;">&#10003; Appointment Scheduled</div>
                    <h2 style="color:#0F172A; margin-top:12px;">Your Appointment is Confirmed!</h2>
                    <p>Dear {$patientName}, your visit has been booked at Netra Unnayan Eye Clinic & Optical Studio.</p>
                    <hr style="border:0; border-top:1px solid #E2E8F0; margin:16px 0;">
                    <p><strong>Appointment ID:</strong> {$refNumber}</p>
                    <p><strong>Consultation Token:</strong> <span style="color:#0284C7; font-size:15px; font-weight:800;">#{$ticketNo}</span></p>
                    <p><strong>Specialist:</strong> {$doctorName}</p>
                    <p><strong>Date & Time Slot:</strong> {$aptDate} at {$aptTime}</p>
                    <p><strong>Venue:</strong> Netra Unnayan Eye Care Clinic, Digha Bypass Rd, Jatimati, Digha, West Bengal 721428</p>
                    <p><strong>Consultation Fee:</strong> ₹{$fee} ({$paymentStatus})</p>
                    <p style="color:#64748B; font-size:12px; margin-top:15px;">Desk Note: {$notes}</p>
HTML;
                Mailer::send($patientEmail, $patientName, "CONFIRMED: Store / Doctor Visit #{$refNumber} [Token #{$ticketNo}] - Netra Unnayan", $emailHtml);
            }

            Response::success([
                'id' => $newId,
                'reference_number' => $refNumber,
                'ticket_no' => $ticketNo,
                'doctor_name' => $doctorName,
                'booking_type' => 'doctor'
            ], "Appointment #{$refNumber} (Token #{$ticketNo}) registered successfully!");
        }
    }

    if (empty($id) || empty($action)) {
        Response::error('Booking ID and Action are required.', 422);
    }

    if ($action === 'complete' || $action === 'mark_completed') {
        if ($bookingType === 'doctor') {
            $pdo->prepare("UPDATE appointments SET status = 'Completed', updated_at = NOW() WHERE id = ?")->execute([$id]);
            Response::success(['status' => 'Completed'], "Doctor appointment marked as Completed.");
        } else {
            $pdo->prepare("UPDATE home_eye_appointments SET status = 'Completed', updated_at = NOW() WHERE id = ?")->execute([$id]);
            Response::success(['status' => 'Completed'], "Home Eye Test visit marked as Completed.");
        }
    }

    if ($action === 'approve' || $action === 'confirm') {
        $ticketNo = trim($input['ticket_no'] ?? '');
        $adminNote = trim($input['admin_note'] ?? $input['note'] ?? '');

        if ($bookingType === 'doctor') {
            $stmt = $pdo->prepare('
                SELECT a.*, d.name as doctor_name, d.qualification 
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                WHERE a.id = ?
            ');
            $stmt->execute([$id]);
            $apt = $stmt->fetch();
            if (!$apt) Response::error('Appointment not found.', 404);

            $noteAppend = '';
            if ($ticketNo !== '') {
                $noteAppend .= " [Ticket/Token: {$ticketNo}]";
            }
            if ($adminNote !== '') {
                $noteAppend .= " [Desk Note: {$adminNote}]";
            }

            try {
                $pdo->prepare("UPDATE appointments SET status = 'Confirmed', ticket_no = ?, notes = CONCAT(IFNULL(notes, ''), ?), updated_at = NOW() WHERE id = ?")
                    ->execute([$ticketNo ?: null, $noteAppend, $id]);
            } catch (Exception $e) {
                $pdo->prepare("UPDATE appointments SET status = 'Confirmed', notes = CONCAT(IFNULL(notes, ''), ?), updated_at = NOW() WHERE id = ?")
                    ->execute([$noteAppend, $id]);
            }

            // Dispatch Confirmation Email to Patient
            if (!empty($apt['patient_email'])) {
                $ticketSnippet = $ticketNo !== '' ? "<p><strong>Ticket / Token No:</strong> <span style='color:#0284C7; font-size:15px; font-weight:800;'>{$ticketNo}</span></p>" : "";
                $noteSnippet = $adminNote !== '' ? "<div style='background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:10px; margin:12px 0; font-size:13px; color:#166534;'><strong>Clinic Note:</strong> {$adminNote}</div>" : "";

                $emailHtml = <<<HTML
                    <div style="background:#DCFCE7; color:#15803D; padding:6px 12px; border-radius:9999px; font-weight:800; font-size:12px; display:inline-block;">&#10003; Appointment Approved & Confirmed</div>
                    <h2 style="color:#0F172A; margin-top:12px;">Your Eye Doctor Consultation is Confirmed!</h2>
                    <p>Dear {$apt['patient_name']}, your clinical eye appointment has been formally approved by our medical reception desk.</p>
                    <hr style="border:0; border-top:1px solid #E2E8F0; margin:16px 0;">
                    <p><strong>Appointment ID:</strong> {$apt['appointment_number']}</p>
                    {$ticketSnippet}
                    <p><strong>Specialist:</strong> {$apt['doctor_name']} ({$apt['qualification']})</p>
                    <p><strong>Confirmed Date & Slot:</strong> {$apt['appointment_date']} at {$apt['appointment_time']}</p>
                    <p><strong>Clinic Venue:</strong> Netra Unnayan Eye Care Clinic, Digha Bypass Rd, Jatimati, Digha, West Bengal 721428</p>
                    <p><strong>Consultation Fee:</strong> ₹{$apt['consultation_fee']} (Payable at clinic desk)</p>
                    {$noteSnippet}
                    <p style="color:#64748B; font-size:12px; margin-top:15px;">Please arrive 10 minutes before your consultation. Visual acuity screening will be conducted prior to doctor review.</p>
HTML;
                $subjectTag = $ticketNo !== '' ? "[Token #{$ticketNo}]" : "";
                Mailer::send($apt['patient_email'], $apt['patient_name'], "CONFIRMED: Doctor Appointment #{$apt['appointment_number']} {$subjectTag} - Netra Unnayan", $emailHtml);
            }

            Response::success([
                'ticket_no' => $ticketNo,
                'status' => 'Confirmed'
            ], "Doctor Appointment #{$apt['appointment_number']} approved and confirmed!" . ($ticketNo ? " (Ticket #{$ticketNo})" : ""));
        } else {
            // Home Eye Checkup
            $optometrist = trim($input['assigned_optometrist'] ?? 'Certified Senior Optometrist (Mobile Lab)');
            $stmt = $pdo->prepare('SELECT * FROM home_eye_appointments WHERE id = ?');
            $stmt->execute([$id]);
            $home = $stmt->fetch();
            if (!$home) Response::error('Home eye booking not found.', 404);

            $noteAppend = '';
            if ($ticketNo !== '') {
                $noteAppend .= " [Ticket/Token: {$ticketNo}]";
            }
            if ($adminNote !== '') {
                $noteAppend .= " [Desk Note: {$adminNote}]";
            }

            try {
                $pdo->prepare("UPDATE home_eye_appointments SET status = 'Confirmed', ticket_no = ?, assigned_optometrist = ?, notes = CONCAT(IFNULL(notes, ''), ?), updated_at = NOW() WHERE id = ?")
                    ->execute([$ticketNo ?: null, $optometrist, $noteAppend, $id]);
            } catch (Exception $e) {
                $pdo->prepare("UPDATE home_eye_appointments SET status = 'Confirmed', assigned_optometrist = ?, notes = CONCAT(IFNULL(notes, ''), ?), updated_at = NOW() WHERE id = ?")
                    ->execute([$optometrist, $noteAppend, $id]);
            }

            // Dispatch Confirmation Email
            if (!empty($home['customer_email'])) {
                $ticketSnippet = $ticketNo !== '' ? "<p><strong>Ticket / Token No:</strong> <span style='color:#0284C7; font-size:15px; font-weight:800;'>{$ticketNo}</span></p>" : "";
                $noteSnippet = $adminNote !== '' ? "<div style='background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:10px; margin:12px 0; font-size:13px; color:#166534;'><strong>Desk Note:</strong> {$adminNote}</div>" : "";

                $emailHtml = <<<HTML
                    <div style="background:#DCFCE7; color:#15803D; padding:6px 12px; border-radius:9999px; font-weight:800; font-size:12px; display:inline-block;">&#10003; Doorstep Visit Confirmed</div>
                    <h2 style="color:#0F172A; margin-top:12px;">Home Eye Test Allocated & Confirmed!</h2>
                    <p>Dear {$home['customer_name']}, your doorstep eye examination has been approved and assigned.</p>
                    <hr style="border:0; border-top:1px solid #E2E8F0; margin:16px 0;">
                    <p><strong>Booking ID:</strong> {$home['booking_number']}</p>
                    {$ticketSnippet}
                    <p><strong>Confirmed Date & Slot:</strong> {$home['service_date']} ({$home['service_slot']})</p>
                    <p><strong>Assigned Optometrist:</strong> {$optometrist}</p>
                    <p><strong>Destination:</strong> {$home['address_line1']}, {$home['landmark']}, PIN: {$home['pincode']}</p>
                    <p><strong>Visit Fee:</strong> ₹{$home['service_fee']} (Payable on visit)</p>
                    {$noteSnippet}
                    <p style="color:#64748B; font-size:12px; margin-top:15px;">Our optometrist will arrive equipped with computerized autorefractor, trial lens set, and 100+ designer frames for doorstep try-on.</p>
HTML;
                $subjectTag = $ticketNo !== '' ? "[Token #{$ticketNo}]" : "";
                Mailer::send($home['customer_email'], $home['customer_name'], "CONFIRMED: Home Eye Test Visit #{$home['booking_number']} {$subjectTag} - Netra Unnayan", $emailHtml);
            }

            Response::success([
                'ticket_no' => $ticketNo,
                'status' => 'Confirmed',
                'assigned_optometrist' => $optometrist
            ], "Home Eye Test #{$home['booking_number']} confirmed and assigned to {$optometrist}!" . ($ticketNo ? " (Ticket #{$ticketNo})" : ""));
        }
    }

    if ($action === 'cancel') {
        $reason = trim($input['reason'] ?? 'Cancelled by Clinic Administration');
        if ($bookingType === 'doctor') {
            $stmt = $pdo->prepare('SELECT a.*, d.name as doctor_name FROM appointments a LEFT JOIN doctors d ON a.doctor_id = d.id WHERE a.id = ?');
            $stmt->execute([$id]);
            $apt = $stmt->fetch();
            $pdo->prepare("UPDATE appointments SET status = 'Cancelled', notes = CONCAT(IFNULL(notes, ''), ' [Cancelled: ', ?, ']'), updated_at = NOW() WHERE id = ?")->execute([$reason, $id]);
            if ($apt && !empty($apt['patient_email'])) {
                Mailer::sendAppointmentCancellation($apt['patient_email'], $apt['patient_name'] ?? 'Patient', $apt['doctor_name'] ?? 'Consulting Ophthalmologist', $apt['appointment_date'] ?? '', $reason);
            }
        } else {
            $stmt = $pdo->prepare('SELECT * FROM home_eye_appointments WHERE id = ?');
            $stmt->execute([$id]);
            $home = $stmt->fetch();
            $pdo->prepare("UPDATE home_eye_appointments SET status = 'Cancelled', cancel_reason = ?, cancelled_at = NOW(), updated_at = NOW() WHERE id = ?")->execute([$reason, $id]);
            if ($home && !empty($home['customer_email'])) {
                $cancelHtml = <<<HTML
                    <span class="badge" style="background:#FEE2E2;color:#991B1B;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">HOME EYE VISIT CANCELLED</span>
                    <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Dear {$home['customer_name']},</h2>
                    <p>Your home eye checkup visit scheduled for <strong>{$home['service_date']}</strong> ({$home['service_slot']}) has been cancelled.</p>
                    <div style="background:#FFF5F5;border:1px solid #FED7D7;border-radius:12px;padding:15px;margin:15px 0;font-size:13px;color:#9B2C2C;">
                        <strong>Reason:</strong> {$reason}
                    </div>
                    <p>Please contact us at +91 9382293614 or rebook through our website if you wish to reschedule.</p>
HTML;
                Mailer::send($home['customer_email'], $home['customer_name'], "Home Eye Test Cancelled — #{$home['booking_number']}", $cancelHtml);
            }
        }
        Response::success(null, 'Booking cancelled and patient notified.');
    }

    if ($action === 'request_change_date' || $action === 'reschedule') {
        $newDate = trim($input['new_date'] ?? '');
        $newSlot = trim($input['new_slot'] ?? '');
        $note = trim($input['note'] ?? $input['reason'] ?? 'Suggested alternative slot by clinic desk');

        if (empty($newDate)) {
            Response::error('New requested date is required.', 422);
        }

        if ($bookingType === 'doctor') {
            $stmt = $pdo->prepare('SELECT a.*, d.name as doctor_name FROM appointments a LEFT JOIN doctors d ON a.doctor_id = d.id WHERE a.id = ?');
            $stmt->execute([$id]);
            $apt = $stmt->fetch();
            if (!$apt) Response::error('Appointment not found.', 404);

            $slotTime = !empty($newSlot) ? $newSlot : $apt['appointment_time'];
            $pdo->prepare("UPDATE appointments SET appointment_date = ?, appointment_time = ?, status = 'Reschedule Requested', notes = CONCAT(IFNULL(notes, ''), ' [Reschedule: ', ?, ']'), updated_at = NOW() WHERE id = ?")
                ->execute([$newDate, $slotTime, $note, $id]);

            if (!empty($apt['patient_email'])) {
                $emailHtml = <<<HTML
                    <span class="badge" style="background:#FEF3C7;color:#B45309;padding:6px 14px;border-radius:20px;font-weight:700;font-size:12px;">DATE CHANGE REQUEST</span>
                    <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Dear {$apt['patient_name']},</h2>
                    <p>Netra Unnayan clinic has requested to reschedule your doctor appointment (#{$apt['appointment_number']}) with <strong>{$apt['doctor_name']}</strong>.</p>
                    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:15px;margin:15px 0;font-size:13px;color:#92400E;">
                        <p><strong>Proposed New Date:</strong> {$newDate}</p>
                        <p><strong>Proposed Time Slot:</strong> {$slotTime}</p>
                        <p><strong>Clinic Note:</strong> {$note}</p>
                    </div>
                    <p>If this works for you, no further action is needed. You may also contact us at +91 9382293614.</p>
HTML;
                Mailer::send($apt['patient_email'], $apt['patient_name'], "Date Change Request: Doctor Appointment #{$apt['appointment_number']} - Netra Unnayan", $emailHtml);
            }
        } else {
            $stmt = $pdo->prepare('SELECT * FROM home_eye_appointments WHERE id = ?');
            $stmt->execute([$id]);
            $home = $stmt->fetch();
            if (!$home) Response::error('Home eye booking not found.', 404);

            $slotTime = !empty($newSlot) ? $newSlot : $home['service_slot'];
            $pdo->prepare("UPDATE home_eye_appointments SET service_date = ?, service_slot = ?, status = 'Reschedule Requested', notes = CONCAT(IFNULL(notes, ''), ' [Reschedule: ', ?, ']'), updated_at = NOW() WHERE id = ?")
                ->execute([$newDate, $slotTime, $note, $id]);

            if (!empty($home['customer_email'])) {
                $emailHtml = <<<HTML
                    <span class="badge" style="background:#FEF3C7;color:#B45309;padding:6px 14px;border-radius:20px;font-weight:700;font-size:12px;">DATE CHANGE REQUEST</span>
                    <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Dear {$home['customer_name']},</h2>
                    <p>Netra Unnayan has requested to adjust the visit schedule for your home eye checkup (#{$home['booking_number']}).</p>
                    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:15px;margin:15px 0;font-size:13px;color:#92400E;">
                        <p><strong>Proposed New Date:</strong> {$newDate}</p>
                        <p><strong>Proposed Time Window:</strong> {$slotTime}</p>
                        <p><strong>Desk Note:</strong> {$note}</p>
                    </div>
                    <p>If this works for you, our optometrist will arrive at this updated time. For adjustments, call +91 9382293614.</p>
HTML;
                Mailer::send($home['customer_email'], $home['customer_name'], "Date Change Request: Home Eye Test #{$home['booking_number']} - Netra Unnayan", $emailHtml);
            }
        }

        Response::success(null, 'Reschedule request sent to customer successfully.');
    }

    if ($action === 'send_message') {
        $subject = trim($input['subject'] ?? 'Update regarding your Netra Unnayan appointment');
        $message = trim($input['message'] ?? '');
        if (empty($message)) {
            Response::error('Message content is required.', 422);
        }

        $recipientEmail = '';
        $recipientName = '';
        if ($bookingType === 'doctor') {
            $stmt = $pdo->prepare('SELECT patient_name, patient_email FROM appointments WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) {
                $recipientEmail = $row['patient_email'];
                $recipientName = $row['patient_name'];
            }
        } else {
            $stmt = $pdo->prepare('SELECT customer_name, customer_email FROM home_eye_appointments WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) {
                $recipientEmail = $row['customer_email'];
                $recipientName = $row['customer_name'];
            }
        }

        if (empty($recipientEmail)) {
            Response::error('Recipient does not have a registered email address.', 400);
        }

        $staffName = $admin['name'] ?? 'Netra Unnayan Desk';
        $sent = Mailer::sendCustomStaffMessage($recipientEmail, $recipientName, $subject, $message, $staffName);
        if ($sent) {
            Response::success(null, "Message sent successfully to {$recipientName} ({$recipientEmail}).");
        } else {
            Response::error('Failed to dispatch email. Please check SMTP settings.', 500);
        }
    }

    if ($action === 'update_notes' || $action === 'edit_notes' || $action === 'save_notes') {
        $notes = trim($input['notes'] ?? $input['admin_note'] ?? '');
        $ticketNo = isset($input['ticket_no']) ? trim($input['ticket_no']) : null;
        $notifyPatient = !empty($input['notify_patient']);

        if ($bookingType === 'doctor') {
            $stmt = $pdo->prepare('SELECT a.*, d.name as doctor_name FROM appointments a LEFT JOIN doctors d ON a.doctor_id = d.id WHERE a.id = ?');
            $stmt->execute([$id]);
            $apt = $stmt->fetch();
            if (!$apt) Response::error('Appointment not found.', 404);

            if ($ticketNo !== null && $ticketNo !== '') {
                $pdo->prepare("UPDATE appointments SET notes = ?, ticket_no = ?, updated_at = NOW() WHERE id = ?")->execute([$notes, $ticketNo, $id]);
            } else {
                $pdo->prepare("UPDATE appointments SET notes = ?, updated_at = NOW() WHERE id = ?")->execute([$notes, $id]);
            }

            if ($notifyPatient && !empty($apt['patient_email'])) {
                $noteHtml = <<<HTML
                    <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:12px; margin:15px 0; font-size:13px; color:#166534;">
                        <strong>Updated Clinic Desk Note:</strong><br>{$notes}
                    </div>
                    <p><strong>Appointment:</strong> {$apt['appointment_number']} with {$apt['doctor_name']} on {$apt['appointment_date']} at {$apt['appointment_time']}</p>
HTML;
                Mailer::send($apt['patient_email'], $apt['patient_name'], "Clinic Update regarding Appointment #{$apt['appointment_number']} - Netra Unnayan", $noteHtml);
            }

            Response::success(['notes' => $notes, 'ticket_no' => $ticketNo], "Appointment notes and instructions updated successfully.");
        } else {
            $stmt = $pdo->prepare('SELECT * FROM home_eye_appointments WHERE id = ?');
            $stmt->execute([$id]);
            $home = $stmt->fetch();
            if (!$home) Response::error('Home eye booking not found.', 404);

            if ($ticketNo !== null && $ticketNo !== '') {
                $pdo->prepare("UPDATE home_eye_appointments SET notes = ?, ticket_no = ?, updated_at = NOW() WHERE id = ?")->execute([$notes, $ticketNo, $id]);
            } else {
                $pdo->prepare("UPDATE home_eye_appointments SET notes = ?, updated_at = NOW() WHERE id = ?")->execute([$notes, $id]);
            }

            if ($notifyPatient && !empty($home['customer_email'])) {
                $noteHtml = <<<HTML
                    <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:12px; margin:15px 0; font-size:13px; color:#166534;">
                        <strong>Updated Visit Instructions:</strong><br>{$notes}
                    </div>
                    <p><strong>Visit Booking:</strong> #{$home['booking_number']} scheduled on {$home['service_date']} ({$home['service_slot']})</p>
HTML;
                Mailer::send($home['customer_email'], $home['customer_name'], "Visit Update: Home Eye Test #{$home['booking_number']} - Netra Unnayan", $noteHtml);
            }

            Response::success(['notes' => $notes, 'ticket_no' => $ticketNo], "Home eye visit notes updated successfully.");
        }
    }

    Response::error('Invalid action specified.', 400);
}
