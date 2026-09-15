<?php
// Netra Unnayan - Cryptographic JWT Helper (HMAC-SHA256)

class JWT {
    private static string $secretKey = 'NetraUnnayan_SecureKey_2026_ClarityYouCanTrust_PurbaMedinipur!';

    public static function encode(array $payload, int $expirySeconds = 86400 * 7): string {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + $expirySeconds;
        $payloadJson = json_encode($payload);

        $base64Header = self::base64UrlEncode($header);
        $base64Payload = self::base64UrlEncode($payloadJson);

        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", self::$secretKey, true);
        $base64Signature = self::base64UrlEncode($signature);

        return "$base64Header.$base64Payload.$base64Signature";
    }

    public static function decode(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$base64Header, $base64Payload, $base64Signature] = $parts;

        $expectedSig = hash_hmac('sha256', "$base64Header.$base64Payload", self::$secretKey, true);
        if (!hash_equals($expectedSig, self::base64UrlDecode($base64Signature))) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($base64Payload), true);
        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            return null; // Expired or malformed
        }

        return $payload;
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
