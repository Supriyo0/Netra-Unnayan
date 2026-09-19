<?php
// Netra Unnayan - Customer Portal Bookings API (Doctor Appointments + Home Eye Tests)
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$auth = requireCustomerAuth();
$customerId = (int)$auth['id'];
$customerEmail = $auth['email'] ?? '';
$customerPhone = $auth['phone'] ?? '';

$pdo = Database::getConnection();

// 1. Fetch Doctor Clinic Appointments
$docStmt = $pdo->prepare('
    SELECT 
        a.id, a.appointment_number, a.doctor_id, a.patient_name, a.patient_phone,
        a.patient_email, a.appointment_date, a.appointment_time, a.consultation_fee,
        a.payment_status, a.status, a.ticket_no, a.notes, a.created_at,
        d.name as doctor_name, d.qualification as doctor_qualification,
        d.specialization as doctor_specialization, d.photo_url as doctor_photo
    FROM appointments a
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE a.customer_id = ? 
       OR (a.patient_email IS NOT NULL AND a.patient_email = ?)
       OR (a.patient_phone IS NOT NULL AND a.patient_phone = ?)
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
');
$docStmt->execute([$customerId, $customerEmail, $customerPhone]);
$doctorAppointments = $docStmt->fetchAll();

// 2. Fetch Home Eye Test Visits
$homeStmt = $pdo->prepare('
    SELECT 
        h.id, h.booking_number, h.customer_name, h.customer_phone, h.customer_email,
        h.address_line1, h.address_line2, h.landmark, h.pincode, h.service_date,
        h.service_slot, h.service_fee, h.payment_status, h.status,
        h.assigned_optometrist, h.ticket_no, h.notes, h.can_cancel_until, h.created_at
    FROM home_eye_appointments h
    WHERE h.customer_id = ? 
       OR (h.customer_email IS NOT NULL AND h.customer_email = ?)
       OR (h.customer_phone IS NOT NULL AND h.customer_phone = ?)
    ORDER BY h.service_date DESC, h.id DESC
');
$homeStmt->execute([$customerId, $customerEmail, $customerPhone]);
$homeVisits = $homeStmt->fetchAll();

Response::success([
    'doctor_appointments' => $doctorAppointments,
    'home_visits'         => $homeVisits,
    'counts'              => [
        'total'     => count($doctorAppointments) + count($homeVisits),
        'pending'   => count(array_filter($doctorAppointments, fn($a) => strtolower($a['status']) === 'pending')) +
                       count(array_filter($homeVisits, fn($h) => strtolower($h['status']) === 'pending')),
        'confirmed' => count(array_filter($doctorAppointments, fn($a) => strtolower($a['status']) === 'confirmed')) +
                       count(array_filter($homeVisits, fn($h) => strtolower($h['status']) === 'confirmed'))
    ]
], 'Customer bookings loaded successfully');
