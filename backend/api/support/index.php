<?php
// Netra Unnayan - Customer Support & Live Chat API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

$pdo = Database::getConnection();

// 1. Auto-create support tables if not existing
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `support_conversations` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `customer_id` INT NULL,
            `guest_name` VARCHAR(150) NULL,
            `guest_email` VARCHAR(150) NULL,
            `guest_phone` VARCHAR(30) NULL,
            `subject` VARCHAR(255) DEFAULT 'Customer Optical Inquiry',
            `status` ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
            `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
            `unread_admin_count` INT DEFAULT 0,
            `unread_customer_count` INT DEFAULT 0,
            `last_message_text` TEXT NULL,
            `last_message_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX (`customer_id`),
            INDEX (`status`),
            INDEX (`last_message_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `support_messages` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `conversation_id` INT NOT NULL,
            `sender_type` ENUM('customer', 'admin', 'bot') NOT NULL,
            `sender_id` INT NULL,
            `sender_name` VARCHAR(150) NOT NULL,
            `message` TEXT NOT NULL,
            `attachment_url` VARCHAR(500) NULL,
            `attachment_type` VARCHAR(50) NULL,
            `is_read` TINYINT(1) DEFAULT 0,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX (`conversation_id`),
            INDEX (`is_read`),
            INDEX (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
} catch (Exception $e) {
    // Tables already exist or permission granted
}

// 2. Resolve optional customer auth
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$customer = null;
if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    $token = $matches[1];
    $c = Auth::validateToken($token);
    if ($c) {
        $customer = $c;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $conversationId = (int)($_GET['conversation_id'] ?? 0);

    if ($conversationId > 0) {
        // Fetch specific conversation
        $cStmt = $pdo->prepare("SELECT * FROM `support_conversations` WHERE `id` = ?");
        $cStmt->execute([$conversationId]);
        $conversation = $cStmt->fetch(PDO::FETCH_ASSOC);

        if (!$conversation) {
            Response::error('Conversation not found', 404);
        }

        // Mark customer unread as read
        $pdo->prepare("UPDATE `support_conversations` SET `unread_customer_count` = 0 WHERE `id` = ?")->execute([$conversationId]);
        $pdo->prepare("UPDATE `support_messages` SET `is_read` = 1 WHERE `conversation_id` = ? AND `sender_type` = 'admin'")->execute([$conversationId]);

        // Fetch messages
        $mStmt = $pdo->prepare("SELECT * FROM `support_messages` WHERE `conversation_id` = ? ORDER BY `id` ASC");
        $mStmt->execute([$conversationId]);
        $messages = $mStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success([
            'conversation' => $conversation,
            'messages'     => $messages
        ], 'Conversation loaded successfully');
        exit;
    }

    // If customer logged in, fetch their most recent active or latest conversation
    if ($customer) {
        $stmt = $pdo->prepare("
            SELECT * FROM `support_conversations` 
            WHERE `customer_id` = ? 
            ORDER BY `status` = 'open' DESC, `status` = 'in_progress' DESC, `last_message_at` DESC 
            LIMIT 1
        ");
        $stmt->execute([(int)$customer['id']]);
        $conv = $stmt->fetch(PDO::FETCH_ASSOC);

        $messages = [];
        if ($conv) {
            // Mark customer unread as 0
            $pdo->prepare("UPDATE `support_conversations` SET `unread_customer_count` = 0 WHERE `id` = ?")->execute([(int)$conv['id']]);
            $pdo->prepare("UPDATE `support_messages` SET `is_read` = 1 WHERE `conversation_id` = ? AND `sender_type` = 'admin'")->execute([(int)$conv['id']]);

            $mStmt = $pdo->prepare("SELECT * FROM `support_messages` WHERE `conversation_id` = ? ORDER BY `id` ASC");
            $mStmt->execute([(int)$conv['id']]);
            $messages = $mStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        Response::success([
            'conversation' => $conv ?: null,
            'messages'     => $messages
        ], 'Customer active support thread');
        exit;
    }

    Response::success([
        'conversation' => null,
        'messages'     => []
    ], 'No active thread');
    exit;

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? 'send_message';

    $conversationId = (int)($input['conversation_id'] ?? 0);
    $messageText = trim((string)($input['message'] ?? ''));
    $attachmentUrl = trim((string)($input['attachment_url'] ?? ''));
    $guestName = trim((string)($input['guest_name'] ?? ''));
    $guestEmail = trim((string)($input['guest_email'] ?? ''));
    $guestPhone = trim((string)($input['guest_phone'] ?? ''));
    $subject = trim((string)($input['subject'] ?? 'Live Optical Inquiry'));

    if (empty($messageText) && empty($attachmentUrl)) {
        Response::error('Message or image attachment is required.', 400);
    }

    $customerId = $customer ? (int)$customer['id'] : null;
    $senderName = $customer ? ($customer['full_name'] ?? $customer['name'] ?? 'Customer') : ($guestName ?: 'Guest Shopper');

    // 1. Resolve or create conversation
    if ($conversationId > 0) {
        $checkStmt = $pdo->prepare("SELECT * FROM `support_conversations` WHERE `id` = ?");
        $checkStmt->execute([$conversationId]);
        $conv = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if (!$conv) {
            $conversationId = 0;
        }
    }

    if ($conversationId === 0) {
        // If customer is logged in, check if they have an active open/in_progress thread
        if ($customerId) {
            $openStmt = $pdo->prepare("SELECT id FROM `support_conversations` WHERE `customer_id` = ? AND `status` IN ('open', 'in_progress') ORDER BY `id` DESC LIMIT 1");
            $openStmt->execute([$customerId]);
            $existingId = $openStmt->fetchColumn();
            if ($existingId) {
                $conversationId = (int)$existingId;
            }
        }
    }

    if ($conversationId === 0) {
        // Create new conversation
        $insConv = $pdo->prepare("
            INSERT INTO `support_conversations` 
            (`customer_id`, `guest_name`, `guest_email`, `guest_phone`, `subject`, `status`, `priority`, `unread_admin_count`, `unread_customer_count`, `last_message_text`, `last_message_at`)
            VALUES (?, ?, ?, ?, ?, 'open', 'medium', 1, 0, ?, NOW())
        ");
        $insConv->execute([
            $customerId,
            $guestName ?: ($customer ? $customer['full_name'] : 'Guest'),
            $guestEmail ?: ($customer ? $customer['email'] : null),
            $guestPhone ?: ($customer ? $customer['phone'] : null),
            $subject,
            $messageText ?: '[Image Attachment]'
        ]);
        $conversationId = (int)$pdo->lastInsertId();
    } else {
        // Update existing conversation
        $updConv = $pdo->prepare("
            UPDATE `support_conversations` 
            SET `status` = CASE WHEN `status` = 'closed' OR `status` = 'resolved' THEN 'open' ELSE `status` END,
                `unread_admin_count` = `unread_admin_count` + 1,
                `last_message_text` = ?,
                `last_message_at` = NOW()
            WHERE `id` = ?
        ");
        $updConv->execute([
            $messageText ?: '[Image Attachment]',
            $conversationId
        ]);
    }

    // 2. Insert Message
    $senderType = !empty($input['is_bot']) ? 'bot' : 'customer';
    $insMsg = $pdo->prepare("
        INSERT INTO `support_messages`
        (`conversation_id`, `sender_type`, `sender_id`, `sender_name`, `message`, `attachment_url`, `is_read`, `created_at`)
        VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
    ");
    $insMsg->execute([
        $conversationId,
        $senderType,
        $customerId,
        $senderName,
        $messageText,
        $attachmentUrl ?: null
    ]);
    $messageId = (int)$pdo->lastInsertId();

    // Fetch refreshed conversation & messages
    $cStmt = $pdo->prepare("SELECT * FROM `support_conversations` WHERE `id` = ?");
    $cStmt->execute([$conversationId]);
    $convData = $cStmt->fetch(PDO::FETCH_ASSOC);

    $mStmt = $pdo->prepare("SELECT * FROM `support_messages` WHERE `conversation_id` = ? ORDER BY `id` ASC");
    $mStmt->execute([$conversationId]);
    $allMessages = $mStmt->fetchAll(PDO::FETCH_ASSOC);

    Response::success([
        'conversation_id' => $conversationId,
        'conversation'    => $convData,
        'messages'        => $allMessages
    ], 'Message sent to support.');
}
