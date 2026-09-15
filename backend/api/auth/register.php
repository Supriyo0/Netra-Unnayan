<?php
// Netra Unnayan - Customer Registration API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/jwt.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$fullName = trim($input['full_name'] ?? '');
$email = strtolower(trim($input['email'] ?? ''));
$phone = trim($input['phone'] ?? '');
$password = $input['password'] ?? '';

if (empty($fullName) || empty($email) || empty($phone) || empty($password)) {
    Response::error('Please fill in all required fields (Name, Email, Phone, Password).', 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::error('Please provide a valid email address.', 422);
}

if (strlen($password) < 6) {
    Response::error('Password must be at least 6 characters long.', 422);
}

$pdo = Database::getConnection();

// Check unique email & phone
$stmt = $pdo->prepare('SELECT id FROM customers WHERE email = ? OR phone = ?');
$stmt->execute([$email, $phone]);
if ($stmt->fetch()) {
    Response::error('An account already exists with this email address or phone number.', 409);
}

$passwordHash = password_hash($password, PASSWORD_BCRYPT);

$insert = $pdo->prepare('
    INSERT INTO customers (full_name, email, phone, password_hash, is_active)
    VALUES (?, ?, ?, ?, 1)
');
$insert->execute([$fullName, $email, $phone, $passwordHash]);
$newCustomerId = (int)$pdo->lastInsertId();

$token = JWT::encode([
    'id'    => $newCustomerId,
    'type'  => 'customer',
    'email' => $email,
    'name'  => $fullName
]);

Response::created([
    'token' => $token,
    'user'  => [
        'id'        => $newCustomerId,
        'type'      => 'customer',
        'full_name' => $fullName,
        'email'     => $email,
        'phone'     => $phone
    ]
], 'Account created successfully. Welcome to Netra Unnayan!');
