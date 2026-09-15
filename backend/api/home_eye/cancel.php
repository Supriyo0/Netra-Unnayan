<?php
// Netra Unnayan - Home Eye Checkup Cancellation API
// RULE: Customer can cancel/reschedule up to 2 hours before scheduled slot.
// Beyond that, automated cancellation is blocked unless overridden by admin.

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$bookingNumber = trim($input['booking_number'] ?? '');
$reason = trim($input['reason'] ?? 'Customer request');

if (empty($bookingNumber)) {
    Response::error('Booking number is required.', 400);
}

$auth = getOptionalAuth();
if (!$auth) {
    Response::unauthorized('Authentication required.');
}

$pdo = Database::getConnection();
$stmt = $pdo->prepare('SELECT * FROM home_eye_appointments WHERE booking_number = ?');
$stmt->execute([$bookingNumber]);
$booking = $stmt->fetch();

if (!$booking) {
    Response::notFound('Home eye appointment not found.');
}

if ($booking['status'] === 'Cancelled') {
    Response::error('This appointment is already cancelled.', 400);
}

// 2-hour rule check
$now = time();
$cutoff = !empty($booking['can_cancel_until']) ? strtotime($booking['can_cancel_until']) : 0;

if ($auth['type'] === 'customer') {
    if ((int)$booking['customer_id'] !== (int)$auth['id']) {
        Response::forbidden('Not authorized to cancel this appointment.');
    }

    if ($cutoff > 0 && $now > $cutoff) {
        Response::error(
            'The 2-hour cancellation deadline for this home visit slot has passed. To request a reschedule or cancellation due to emergency, please call our clinic coordinator directly at 9382293614.',
            400
        );
    }
}

require_once __DIR__ . '/../../helpers/mailer.php';

// Update status
$upd = $pdo->prepare('
    UPDATE home_eye_appointments 
    SET status = "Cancelled", cancelled_at = NOW(), cancel_reason = ?
    WHERE id = ?
');
$upd->execute([$reason, $booking['id']]);

if (!empty($booking['customer_email'])) {
    Mailer::sendHomeEyeCancellation($booking['customer_email'], $booking['customer_name'] ?? 'Customer', $bookingNumber, $reason);
}

Response::success([
    'booking_number' => $bookingNumber,
    'status'         => 'Cancelled'
], "Home eye checkup appointment {$bookingNumber} has been cancelled.");
