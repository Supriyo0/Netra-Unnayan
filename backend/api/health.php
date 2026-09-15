<?php
// Netra Unnayan - System Health & Diagnostics Endpoint
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$response = [
    'app'         => 'Netra Unnayan Optical Platform',
    'status'      => 'healthy',
    'timestamp'   => date('c'),
    'php_version' => PHP_VERSION,
    'server_time' => date('Y-m-d H:i:s T'),
    'database'    => [
        'status'  => 'unknown',
        'message' => '',
        'tables'  => 0
    ],
    'uploads_writable' => false
];

// Check database connection
try {
    $pdo = Database::getConnection();
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $response['database']['status'] = 'connected';
    $response['database']['tables'] = count($tables);
    $response['database']['table_list'] = array_slice($tables, 0, 10);
} catch (Exception $e) {
    $response['status'] = 'degraded';
    $response['database']['status'] = 'error';
    $response['database']['message'] = $e->getMessage();
}

// Check uploads directory
$uploadDir = realpath(__DIR__ . '/../../../public_assets/uploads') ?: (__DIR__ . '/../../../public_assets/uploads');
$response['uploads_writable'] = is_writable($uploadDir) || is_writable(dirname($uploadDir));

Response::json($response);
