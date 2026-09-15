<?php
// Netra Unnayan - Admin Doctor & Specialist Management API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth(['super_admin', 'manager', 'appointment_desk']);
$pdo = Database::getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List all doctors including inactive
    $stmt = $pdo->query('
        SELECT 
            d.*,
            (SELECT COUNT(*) FROM appointments WHERE doctor_id = d.id) as total_appointments,
            (SELECT COUNT(*) FROM appointments WHERE doctor_id = d.id AND status = "Pending") as pending_appointments
        FROM doctors d
        ORDER BY d.is_active DESC, d.experience_years DESC, d.id ASC
    ');
    $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);

    Response::success($doctors, 'All specialists loaded');

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? '';

    // Action 1: Toggle active state
    if ($action === 'toggle') {
        $id = (int)($input['id'] ?? 0);
        $isActive = !empty($input['is_active']) ? 1 : 0;
        if (!$id) Response::error('Doctor ID required.', 400);

        $stmt = $pdo->prepare('UPDATE doctors SET is_active = ? WHERE id = ?');
        $stmt->execute([$isActive, $id]);

        Response::success(['id' => $id, 'is_active' => $isActive], 'Specialist status updated.');
    }

    // Action 2: Add or Edit Doctor
    $id = isset($input['id']) && $input['id'] ? (int)$input['id'] : null;
    $name = trim($input['name'] ?? '');
    $qualification = trim($input['qualification'] ?? 'MBBS, MS (Ophthalmology)');
    $specialization = trim($input['specialization'] ?? 'Eye Surgeon');
    $experienceYears = (int)($input['experience_years'] ?? 5);
    $regNumber = trim($input['reg_number'] ?? 'WBMC-' . rand(10000, 99999));
    $photoUrl = trim($input['photo_url'] ?? '');
    $bio = trim($input['bio'] ?? '');
    $consultationFee = (float)($input['consultation_fee'] ?? 400);
    $availableDays = is_array($input['available_days']) ? implode(', ', $input['available_days']) : trim($input['available_days'] ?? 'Monday, Wednesday, Friday');
    $startTime = trim($input['available_time_start'] ?? '10:00:00');
    $endTime = trim($input['available_time_end'] ?? '18:00:00');
    $slotDuration = (int)($input['slot_duration_minutes'] ?? 20);
    $maxDailyPatients = (int)($input['max_daily_patients'] ?? 24);
    $isActive = isset($input['is_active']) ? ((int)$input['is_active']) : 1;
    
    // Day-wise fees (JSON or array e.g. {"Monday": 500, "Sunday": 700})
    $dayFeesInput = $input['day_fees'] ?? null;
    $dayFeesJson = null;
    if (is_array($dayFeesInput)) {
        $dayFeesJson = json_encode($dayFeesInput);
    } elseif (is_string($dayFeesInput) && !empty($dayFeesInput)) {
        $dayFeesJson = $dayFeesInput;
    }

    if (empty($name)) {
        Response::error('Doctor full name is mandatory.', 422);
    }

    if (empty($photoUrl)) {
        $photoUrl = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80';
    }

    if ($id) {
        // Update existing doctor
        $stmt = $pdo->prepare('
            UPDATE doctors SET
                name = ?, qualification = ?, specialization = ?,
                experience_years = ?, reg_number = ?, photo_url = ?,
                bio = ?, consultation_fee = ?, day_fees = ?, available_days = ?,
                available_time_start = ?, available_time_end = ?,
                slot_duration_minutes = ?, max_daily_patients = ?, is_active = ?
            WHERE id = ?
        ');
        $stmt->execute([
            $name, $qualification, $specialization,
            $experienceYears, $regNumber, $photoUrl,
            $bio, $consultationFee, $dayFeesJson, $availableDays,
            $startTime, $endTime,
            $slotDuration, $maxDailyPatients, $isActive,
            $id
        ]);
        Response::success(['id' => $id], "Specialist '$name' details updated successfully.");
    } else {
        // Insert new doctor
        $stmt = $pdo->prepare('
            INSERT INTO doctors (
                name, qualification, specialization,
                experience_years, reg_number, photo_url,
                bio, consultation_fee, day_fees, available_days,
                available_time_start, available_time_end,
                slot_duration_minutes, max_daily_patients, is_active
            ) VALUES (
                ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?
            )
        ');
        $stmt->execute([
            $name, $qualification, $specialization,
            $experienceYears, $regNumber, $photoUrl,
            $bio, $consultationFee, $dayFeesJson, $availableDays,
            $startTime, $endTime,
            $slotDuration, $maxDailyPatients, $isActive
        ]);
        $newId = (int)$pdo->lastInsertId();
        Response::success(['id' => $newId], "Specialist '$name' successfully added to clinic roster.");
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) Response::error('Doctor ID required.', 400);

    // Soft delete to protect appointment records
    $stmt = $pdo->prepare('UPDATE doctors SET is_active = 0 WHERE id = ?');
    $stmt->execute([$id]);

    Response::success(['id' => $id], 'Doctor deactivated from active roster.');
}
