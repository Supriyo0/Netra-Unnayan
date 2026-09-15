<?php
// Netra Unnayan - Standard JSON API Response Helper

class Response {
    public static function json($data = null, int $status = 200, string $message = 'Success'): void {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => $status >= 200 && $status < 300,
            'message' => $message,
            'data'    => $data
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success($data = null, string $message = 'Operation successful'): void {
        self::json($data, 200, $message);
    }

    public static function created($data = null, string $message = 'Resource created'): void {
        self::json($data, 201, $message);
    }

    public static function error(string $message = 'An error occurred', int $status = 400, $errors = null): void {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'message' => $message,
            'errors'  => $errors
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function notFound(string $message = 'Resource not found'): void {
        self::error($message, 404);
    }

    public static function unauthorized(string $message = 'Unauthorized'): void {
        self::error($message, 401);
    }

    public static function forbidden(string $message = 'Forbidden'): void {
        self::error($message, 403);
    }
}
