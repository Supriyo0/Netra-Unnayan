<?php
// Netra Unnayan - Admin Live Messaging & Support Inbox API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth();
$pdo = Database::getConnection();

// Ensure support tables exist
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
} catch (Exception $e) {}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $conversationId = (int)($_GET['conversation_id'] ?? 0);

    // 1. Fetch single conversation thread + messages
    if ($conversationId > 0) {
        $cStmt = $pdo->prepare("
            SELECT 
                sc.*,
                c.full_name as registered_name,
                c.email as registered_email,
                c.phone as registered_phone,
                (SELECT COUNT(*) FROM `orders` WHERE `customer_id` = sc.customer_id) as total_customer_orders
            FROM `support_conversations` sc
            LEFT JOIN `customers` c ON sc.customer_id = c.id
            WHERE sc.id = ?
        ");
        $cStmt->execute([$conversationId]);
        $conversation = $cStmt->fetch(PDO::FETCH_ASSOC);

        if (!$conversation) {
            Response::error('Conversation not found', 404);
        }

        // Mark as read by admin
        $pdo->prepare("UPDATE `support_conversations` SET `unread_admin_count` = 0 WHERE `id` = ?")->execute([$conversationId]);
        $pdo->prepare("UPDATE `support_messages` SET `is_read` = 1 WHERE `conversation_id` = ? AND `sender_type` != 'admin'")->execute([$conversationId]);

        // Fetch messages
        $mStmt = $pdo->prepare("SELECT * FROM `support_messages` WHERE `conversation_id` = ? ORDER BY `id` ASC");
        $mStmt->execute([$conversationId]);
        $messages = $mStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success([
            'conversation' => $conversation,
            'messages'     => $messages
        ], 'Conversation details retrieved.');
        exit;
    }

    // 2. Fetch list of conversations
    $search = trim($_GET['search'] ?? '');
    $filter = trim($_GET['filter'] ?? 'all'); // 'all', 'unread', 'open', 'resolved', 'closed'

    $query = "
        SELECT 
            sc.*,
            c.full_name as registered_name,
            c.email as registered_email,
            c.phone as registered_phone,
            c.avatar_url,
            (SELECT COUNT(*) FROM `orders` WHERE `customer_id` = sc.customer_id) as total_customer_orders,
            (SELECT COUNT(*) FROM `support_messages` WHERE `conversation_id` = sc.id) as message_count
        FROM `support_conversations` sc
        LEFT JOIN `customers` c ON sc.customer_id = c.id
        WHERE 1=1
    ";

    $params = [];

    if (!empty($search)) {
        $query .= " AND (
            sc.guest_name LIKE ? OR 
            sc.guest_email LIKE ? OR 
            sc.guest_phone LIKE ? OR 
            sc.subject LIKE ? OR 
            sc.last_message_text LIKE ? OR 
            c.full_name LIKE ? OR 
            c.email LIKE ? OR 
            c.phone LIKE ?
        )";
        $term = "%$search%";
        for ($i = 0; $i < 8; $i++) {
            $params[] = $term;
        }
    }

    if ($filter === 'unread') {
        $query .= " AND sc.unread_admin_count > 0";
    } elseif (in_array($filter, ['open', 'in_progress', 'resolved', 'closed'])) {
        $query .= " AND sc.status = ?";
        $params[] = $filter;
    }

    // Strict Ordering Rule:
    // 1. Unread conversations pinned on top (`unread_admin_count > 0` DESC)
    // 2. Most recent message on top (`last_message_at` DESC)
    $query .= " ORDER BY (sc.unread_admin_count > 0) DESC, sc.last_message_at DESC LIMIT 150";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Global Metrics
    $totalUnread = (int)$pdo->query("SELECT SUM(unread_admin_count) FROM `support_conversations`")->fetchColumn();
    $totalOpen = (int)$pdo->query("SELECT COUNT(*) FROM `support_conversations` WHERE `status` IN ('open', 'in_progress')")->fetchColumn();
    $totalResolved = (int)$pdo->query("SELECT COUNT(*) FROM `support_conversations` WHERE `status` = 'resolved'")->fetchColumn();

    Response::success([
        'conversations' => $conversations,
        'metrics' => [
            'total_unread'   => $totalUnread,
            'total_open'     => $totalOpen,
            'total_resolved' => $totalResolved,
            'total_all'      => count($conversations)
        ]
    ], 'Conversations retrieved successfully.');

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? 'reply';

    // Action 1: Admin sends a live reply (with optional attached image)
    if ($action === 'reply') {
        $conversationId = (int)($input['conversation_id'] ?? 0);
        $messageText = trim((string)($input['message'] ?? ''));
        $attachmentUrl = trim((string)($input['attachment_url'] ?? ''));

        if (!$conversationId) {
            Response::error('Conversation ID is required.', 400);
        }

        if (empty($messageText) && empty($attachmentUrl)) {
            Response::error('Message text or image attachment is required.', 400);
        }

        $adminId = (int)($admin['id'] ?? 1);
        $adminName = $admin['full_name'] ?? 'Netra Support Team';

        // Insert Admin Message
        $ins = $pdo->prepare("
            INSERT INTO `support_messages`
            (`conversation_id`, `sender_type`, `sender_id`, `sender_name`, `message`, `attachment_url`, `is_read`, `created_at`)
            VALUES (?, 'admin', ?, ?, ?, ?, 0, NOW())
        ");
        $ins->execute([
            $conversationId,
            $adminId,
            $adminName,
            $messageText,
            $attachmentUrl ?: null
        ]);

        // Update conversation meta: status to in_progress, increment customer unread, update last message
        $upd = $pdo->prepare("
            UPDATE `support_conversations`
            SET `status` = 'in_progress',
                `unread_customer_count` = `unread_customer_count` + 1,
                `unread_admin_count` = 0,
                `last_message_text` = ?,
                `last_message_at` = NOW()
            WHERE `id` = ?
        ");
        $upd->execute([
            $messageText ?: '[Image Attachment]',
            $conversationId
        ]);

        // Fetch refreshed thread
        $mStmt = $pdo->prepare("SELECT * FROM `support_messages` WHERE `conversation_id` = ? ORDER BY `id` ASC");
        $mStmt->execute([$conversationId]);
        $messages = $mStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success([
            'conversation_id' => $conversationId,
            'messages'        => $messages
        ], 'Reply dispatched to customer.');
    }

    // Action 2: Update conversation status or priority
    if ($action === 'update_status') {
        $conversationId = (int)($input['conversation_id'] ?? 0);
        $status = trim((string)($input['status'] ?? ''));
        $priority = trim((string)($input['priority'] ?? ''));

        if (!$conversationId) Response::error('Conversation ID required.', 400);

        if (!empty($status)) {
            $pdo->prepare("UPDATE `support_conversations` SET `status` = ? WHERE `id` = ?")->execute([$status, $conversationId]);
        }
        if (!empty($priority)) {
            $pdo->prepare("UPDATE `support_conversations` SET `priority` = ? WHERE `id` = ?")->execute([$priority, $conversationId]);
        }

        Response::success(['conversation_id' => $conversationId, 'status' => $status], 'Status updated.');
    }

    // Action 3: Mark conversation as read
    if ($action === 'mark_read') {
        $conversationId = (int)($input['conversation_id'] ?? 0);
        if (!$conversationId) Response::error('Conversation ID required.', 400);

        $pdo->prepare("UPDATE `support_conversations` SET `unread_admin_count` = 0 WHERE `id` = ?")->execute([$conversationId]);
        $pdo->prepare("UPDATE `support_messages` SET `is_read` = 1 WHERE `conversation_id` = ? AND `sender_type` != 'admin'")->execute([$conversationId]);

        Response::success(['conversation_id' => $conversationId], 'Marked as read.');
    }

    // Action 4: Delete conversation
    if ($action === 'delete_conversation') {
        $conversationId = (int)($input['conversation_id'] ?? 0);
        if (!$conversationId) Response::error('Conversation ID required.', 400);

        $pdo->prepare("DELETE FROM `support_messages` WHERE `conversation_id` = ?")->execute([$conversationId]);
        $pdo->prepare("DELETE FROM `support_conversations` WHERE `id` = ?")->execute([$conversationId]);

        Response::success(['conversation_id' => $conversationId], 'Conversation deleted.');
    }

    Response::error('Invalid action.', 400);
}
