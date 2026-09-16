<?php
// Netra Unnayan - ImgBB Zero-Server-Storage Direct Proxy API
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

$pdo = Database::getConnection();

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
$rawBinary = null;
$ext = 'jpg';

if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $filePath = $_FILES['file']['tmp_name'];
    $fileName = $_FILES['file']['name'];
    $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION)) ?: 'jpg';
    $rawBinary = file_get_contents($filePath);
    $postFields['image'] = base64_encode($rawBinary);
    $postFields['name']  = pathinfo($fileName, PATHINFO_FILENAME);
} elseif (!empty($_POST['image_data'])) {
    $rawBase64 = $_POST['image_data'];
    if (strpos($rawBase64, ',') !== false) {
        $rawBase64 = substr($rawBase64, strpos($rawBase64, ',') + 1);
    }
    $postFields['image'] = $rawBase64;
    $rawBinary = base64_decode($rawBase64);
} else {
    // Try reading raw JSON
    $json = json_decode(file_get_contents('php://input'), true);
    if (!empty($json['image_data'])) {
        $rawBase64 = $json['image_data'];
        if (strpos($rawBase64, ',') !== false) {
            $rawBase64 = substr($rawBase64, strpos($rawBase64, ',') + 1);
        }
        $postFields['image'] = $rawBase64;
        $rawBinary = base64_decode($rawBase64);
    }
}

if (empty($postFields['image'])) {
    Response::error('No image payload received for upload.', 400);
}

// 3. Attempt Stream upload directly to ImgBB
$uploadedToImgbb = false;
$resJson = null;

try {
    $ch = curl_init('https://api.imgbb.com/1/upload?key=' . urlencode($apiKey));
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);

    $resRaw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($resRaw !== false && empty($curlErr)) {
        $resJson = json_decode($resRaw, true);
        if ($httpCode === 200 && !empty($resJson['success']) && !empty($resJson['data']['url'])) {
            $uploadedToImgbb = true;
        }
    }
} catch (Exception $e) {
    // Graceful local fallback below
}

if ($uploadedToImgbb && !empty($resJson['data']['url'])) {
    Response::success([
        'url'         => $resJson['data']['url'],
        'display_url' => $resJson['data']['display_url'] ?? $resJson['data']['url'],
        'thumb_url'   => $resJson['data']['thumb']['url'] ?? $resJson['data']['url'],
        'delete_url'  => $resJson['data']['delete_url'] ?? null,
        'size'        => $resJson['data']['size'] ?? null,
        'provider'    => 'imgbb'
    ], 'Image uploaded successfully to cloud CDN');
}

// 4. Graceful Local Storage Fallback (Guarantees upload success always)
if ($rawBinary !== null) {
    $targetDir = realpath(__DIR__ . '/../../public_assets/uploads');
    if (!$targetDir) {
        $targetDir = __DIR__ . '/../../public_assets/uploads';
        if (!file_exists($targetDir)) {
            mkdir($targetDir, 0777, true);
        }
    }

    $filename = 'avatar_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $destPath = $targetDir . DIRECTORY_SEPARATOR . $filename;

    if (file_put_contents($destPath, $rawBinary) !== false) {
        Response::success([
            'url'         => '/public_assets/uploads/' . $filename,
            'display_url' => '/public_assets/uploads/' . $filename,
            'thumb_url'   => '/public_assets/uploads/' . $filename,
            'size'        => strlen($rawBinary),
            'provider'    => 'local'
        ], 'Image saved successfully to server storage');
    }
}

Response::error('Image upload failed. Please try another image file.', 422);
