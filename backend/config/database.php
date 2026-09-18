<?php
// Netra Unnayan - Database Connection (PDO)
class Database {
    private static ?PDO $instance = null;

    private static function loadEnv(): void {
        $possiblePaths = [
            __DIR__ . '/../.env',
            __DIR__ . '/../../.env',
            dirname(__DIR__, 2) . '/.env'
        ];
        foreach ($possiblePaths as $path) {
            if (file_exists($path) && is_readable($path)) {
                $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line === '' || str_starts_with($line, '#')) continue;
                    if (str_contains($line, '=')) {
                        [$key, $val] = explode('=', $line, 2);
                        $key = trim($key);
                        $val = trim(trim($val), "\"'");
                        putenv("$key=$val");
                        $_ENV[$key] = $val;
                        $_SERVER[$key] = $val;
                    }
                }
                break;
            }
        }
    }

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            self::loadEnv();
            $host = getenv('DB_HOST') ?: '127.0.0.1';
            $db   = getenv('DB_NAME') ?: 'netra_unnayan_db';
            $user = getenv('DB_USER') ?: 'root';
            $pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
            $port = getenv('DB_PORT') ?: '3306';
            $charset = 'utf8mb4';

            $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                if (($host === 'localhost' || $host === '127.0.0.1') && $user !== 'root') {
                    try {
                        self::$instance = new PDO("mysql:host=127.0.0.1;port=$port;dbname=netra_unnayan_db;charset=$charset", 'root', '', $options);
                        return self::$instance;
                    } catch (PDOException $e2) {
                        // fallback failed too, let error below handle
                    }
                }
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed: ' . $e->getMessage()
                ]);
                exit;
            }
        }
        return self::$instance;
    }

    public static function getInstance(): PDO {
        return self::getConnection();
    }
}
