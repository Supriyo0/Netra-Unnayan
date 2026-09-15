<?php
// Netra Unnayan - Local Development Router for PHP Built-in Server

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Serve public static assets (logos, images, etc.)
if (strpos($uri, '/public_assets/') === 0) {
    $filePath = __DIR__ . '/../' . ltrim($uri, '/');
    if (file_exists($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimes = [
            'png'  => 'image/png',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'svg'  => 'image/svg+xml',
            'ico'  => 'image/x-icon',
            'json' => 'application/json'
        ];
        header('Content-Type: ' . ($mimes[$ext] ?? 'application/octet-stream'));
        readfile($filePath);
        return true;
    }
}

// Route API requests
if (strpos($uri, '/api/') === 0) {
    // Check if direct file exists
    $apiFile = __DIR__ . $uri;
    if (file_exists($apiFile) && is_file($apiFile)) {
        require $apiFile;
        return true;
    }
    // Check with .php extension
    if (file_exists($apiFile . '.php') && is_file($apiFile . '.php')) {
        require $apiFile . '.php';
        return true;
    }
    // Check directory index.php
    if (file_exists($apiFile . '/index.php') && is_file($apiFile . '/index.php')) {
        require $apiFile . '/index.php';
        return true;
    }
}

// Fallback
http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['success' => false, 'message' => "Endpoint not found: $uri"]);
return true;
