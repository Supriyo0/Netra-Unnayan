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
        $docQuery .= ' AND a.status = ?';
        $docParams[] = $status;
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
        $homeQuery .= ' AND h.status = ?';
        $homeParams[] = $status;
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
    $pendingDoc = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE status = 'Pending'")->fetchColumn();
    $pendingHome = (int)$pdo->query("SELECT COUNT(*) FROM home_eye_appointments WHERE status = 'Pending'")->fetchColumn();
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
    $action = $input['action'] ?? '';
    $bookingType = $input['booking_type'] ?? 'doctor'; // 'doctor' or 'home_eye'
    $id = (int)($input['id'] ?? 0);

    if (empty($id) || empty($action)) {
        Response::error('Booking ID and Action are required.', 422);
    }

    if ($action === 'approve') {
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

    Response::error('Invalid action specified.', 400);
}
