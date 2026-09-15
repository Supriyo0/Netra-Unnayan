<?php
// Netra Unnayan - Doctor Poster Builder Engine
// Generates promotional clinic posters with Netra Unnayan luxury branding

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$pdo = Database::getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List posters
    $stmt = $pdo->query('
        SELECT p.*, d.name as doctor_name, d.qualification, d.specialization, d.experience_years, d.photo_url
        FROM doctor_posters p
        JOIN doctors d ON p.doctor_id = d.id
        ORDER BY p.id DESC
    ');
    $posters = $stmt->fetchAll();
    Response::success($posters, 'Posters list retrieved');

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $admin = requireAdminAuth(['super_admin', 'manager', 'appointment_desk']);
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    $doctorId = (int)($input['doctor_id'] ?? 0);
    $title = trim($input['title'] ?? 'Eye Care & Specialist Consultation');
    $headline = trim($input['headline'] ?? 'Advanced Eye Examination & Screening Camp');
    $datesText = trim($input['dates_text'] ?? 'Every Monday & Wednesday (10 AM - 5 PM)');
    $venueText = trim($input['venue_text'] ?? 'Netra Unnayan, Digha Bypass Rd, Jatimati, Digha');
    $contactPhone = trim($input['contact_phone'] ?? '9382293614');
    $templateStyle = trim($input['template_style'] ?? 'luxury_navy_cyan');

    if (empty($doctorId) || empty($title) || empty($headline)) {
        Response::error('Doctor, poster title, and headline are required.', 422);
    }

    $docStmt = $pdo->prepare('SELECT * FROM doctors WHERE id = ?');
    $docStmt->execute([$doctorId]);
    $doctor = $docStmt->fetch();

    if (!$doctor) {
        Response::notFound('Doctor not found.');
    }

    $stmt = $pdo->prepare('
        INSERT INTO doctor_posters (
            doctor_id, title, tagline, template_style, headline,
            dates_text, venue_text, contact_phone, is_published
        ) VALUES (
            ?, ?, "Clarity You Can Trust", ?, ?,
            ?, ?, ?, 1
        )
    ');
    $stmt->execute([
        $doctorId, $title, $templateStyle, $headline,
        $datesText, $venueText, $contactPhone
    ]);
    $posterId = (int)$pdo->lastInsertId();

    Response::created([
        'poster_id'      => $posterId,
        'doctor_name'    => $doctor['name'],
        'doctor_photo'   => $doctor['photo_url'],
        'specialization' => $doctor['specialization'],
        'qualification'  => $doctor['qualification'],
        'title'          => $title,
        'headline'       => $headline,
        'dates_text'     => $datesText,
        'venue_text'     => $venueText,
        'contact_phone'  => $contactPhone,
        'template_style' => $templateStyle
    ], 'Doctor poster created successfully');
}
