<?php
// Netra Unnayan - Direct Storage Image Upload API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth();

$targetDir = realpath(__DIR__ . '/../../../public_assets/uploads');
if (!$targetDir) {
    $targetDir = __DIR__ . '/../../../public_assets/uploads';
    if (!file_exists($targetDir)) {
        mkdir($targetDir, 0777, true);
    }
}

$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
$allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Case 1: Base64 JSON Payload (e.g. from Webcam capture or canvas)
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $base64Data = $input['image_data'] ?? '';
    $prefix = $input['prefix'] ?? 'opt';

    if (empty($base64Data)) {
        Response::error('No image payload received.', 400);
    }

    // Match data:image/png;base64,...
    if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
        $ext = strtolower($type[1]);
        if ($ext === 'jpeg') $ext = 'jpg';
        if (!in_array($ext, $allowedExtensions, true)) {
            Response::error('Unsupported image format: ' . $ext, 422);
        }

        $cleanData = substr($base64Data, strpos($base64Data, ',') + 1);
        $decoded = base64_decode($cleanData);
        if ($decoded === false) {
            Response::error('Base64 decode failed.', 422);
        }

        $filename = $prefix . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $destPath = $targetDir . DIRECTORY_SEPARATOR . $filename;

        if (file_put_contents($destPath, $decoded) === false) {
            Response::error('Failed to save file to server storage.', 500);
        }

        Response::success([
            'url'      => '/public_assets/uploads/' . $filename,
            'filename' => $filename,
            'size'     => strlen($decoded),
            'type'     => $ext
        ], 'Image captured and stored successfully');
    } else {
        Response::error('Invalid data URL format.', 422);
    }
}

// Case 2: Multipart Form Data ($_FILES['file'])
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errCode = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
    Response::error('No valid file uploaded. Error code: ' . $errCode, 400);
}

$file = $_FILES['file'];
$fileSize = $file['size'];
$tmpPath = $file['tmp_name'];
$origName = basename($file['name']);
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

if ($fileSize > 10 * 1024 * 1024) { // 10MB limit
    Response::error('File size exceeds maximum 10MB limit.', 422);
}

if (!in_array($ext, $allowedExtensions, true)) {
    Response::error('Invalid file extension. Allowed: jpg, jpeg, png, webp, gif', 422);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $tmpPath);
finfo_close($finfo);

if (!in_array($mimeType, $allowedMimes, true)) {
    Response::error('Invalid file MIME type: ' . $mimeType, 422);
}

$prefix = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['prefix'] ?? 'opt');
if (empty($prefix)) $prefix = 'frame';

$filename = $prefix . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$destPath = $targetDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($tmpPath, $destPath)) {
    Response::error('Failed to move uploaded file to permanent storage.', 500);
}

Response::success([
    'url'      => '/public_assets/uploads/' . $filename,
    'filename' => $filename,
    'size'     => $fileSize,
    'type'     => $ext
], 'File uploaded successfully to server storage');
