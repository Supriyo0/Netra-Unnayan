<?php
// Netra Unnayan - ImgBB Zero-Server-Storage Direct Proxy API
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

$db = Database::getInstance();
$pdo = $db->getConnection();

// 1. Get ImgBB API Key from request, database settings, or fallback default
$apiKey = trim($_POST['api_key'] ?? '');
if (empty($apiKey)) {
    try {
        $stmt = $pdo->query("SELECT setting_value FROM settings WHERE setting_key = 'imgbb_api_key' LIMIT 1");
        $dbKey = $stmt->fetchColumn();
        if (!empty($dbKey)) {
            $apiKey = trim($dbKey);
        }
    } catch (Exception $e) {
        // ignore
    }
}
if (empty($apiKey)) {
    $apiKey = '6d207e02198a847aa5ad3ac50e97ff43'; // Default ImgBB API key
}

// 2. Prepare payload for ImgBB
$postFields = [];

if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $filePath = $_FILES['file']['tmp_name'];
    $fileName = $_FILES['file']['name'];
    $mimeType = mime_content_type($filePath) ?: 'image/jpeg';
    
    // Convert to base64 to ensure seamless ImgBB API compatibility
    $fileData = file_get_contents($filePath);
    $postFields['image'] = base64_encode($fileData);
    $postFields['name']  = pathinfo($fileName, PATHINFO_FILENAME);
} elseif (!empty($_POST['image_data'])) {
    $rawBase64 = $_POST['image_data'];
    if (strpos($rawBase64, ',') !== false) {
        $rawBase64 = substr($rawBase64, strpos($rawBase64, ',') + 1);
    }
    $postFields['image'] = $rawBase64;
} else {
    // Try reading raw JSON
    $json = json_decode(file_get_contents('php://input'), true);
    if (!empty($json['image_data'])) {
        $rawBase64 = $json['image_data'];
        if (strpos($rawBase64, ',') !== false) {
            $rawBase64 = substr($rawBase64, strpos($rawBase64, ',') + 1);
        }
        $postFields['image'] = $rawBase64;
    }
}

if (empty($postFields['image'])) {
    Response::error('No image payload received for ImgBB upload.', 400);
}

// 3. Stream upload directly to ImgBB
$ch = curl_init('https://api.imgbb.com/1/upload?key=' . urlencode($apiKey));
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$resRaw = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($resRaw === false || !empty($curlErr)) {
    Response::error('ImgBB connection error: ' . $curlErr, 502);
}

$resJson = json_decode($resRaw, true);

if ($httpCode === 200 && !empty($resJson['success']) && !empty($resJson['data']['url'])) {
    Response::success([
        'url'         => $resJson['data']['url'],
        'display_url' => $resJson['data']['display_url'] ?? $resJson['data']['url'],
        'thumb_url'   => $resJson['data']['thumb']['url'] ?? $resJson['data']['url'],
        'delete_url'  => $resJson['data']['delete_url'] ?? null,
        'size'        => $resJson['data']['size'] ?? null,
        'provider'    => 'imgbb'
    ], 'Image streamed to ImgBB successfully with zero local disk usage');
} else {
    $msg = $resJson['error']['message'] ?? 'ImgBB upload failed with status ' . $httpCode;
    Response::error($msg, 422);
}
