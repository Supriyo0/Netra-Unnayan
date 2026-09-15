<?php
// Netra Unnayan - Admin Orders & Prescription Workflow Engine
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/mailer.php';

$admin = requireAdminAuth();
$pdo = Database::getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Single Order Details
    if (!empty($_GET['id'])) {
        $orderId = (int)$_GET['id'];
        $stmt = $pdo->prepare("
            SELECT 
                o.*,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
                (SELECT invoice_number FROM invoices WHERE order_id = o.id LIMIT 1) as invoice_number
            FROM orders o
            WHERE o.id = ?
        ");
        $stmt->execute([$orderId]);
        $ord = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ord) {
            Response::notFound('Order not found.');
        }

        try {
            $iStmt = $pdo->prepare('
                SELECT oi.*, p.primary_image, p.sku as product_sku_code, p.lens_width, p.bridge_width, p.temple_length 
                FROM order_items oi 
                LEFT JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?
            ');
            $iStmt->execute([$orderId]);
            $ord['items'] = $iStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $ord['items'] = [];
        }

        try {
            $rxStmt = $pdo->prepare('SELECT * FROM order_prescriptions WHERE order_id = ? ORDER BY id DESC');
            $rxStmt->execute([$orderId]);
            $prescriptions = $rxStmt->fetchAll(PDO::FETCH_ASSOC);
            $ord['prescriptions'] = $prescriptions;
            $ord['prescription'] = $prescriptions[0] ?? null;
        } catch (Exception $e) {
            $ord['prescriptions'] = [];
            $ord['prescription'] = null;
        }

        try {
            $payStmt = $pdo->prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1');
            $payStmt->execute([$orderId]);
            $ord['payment'] = $payStmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $ord['payment'] = null;
        }

        try {
            $histStmt = $pdo->prepare('
                SELECT h.*, a.full_name as staff_name 
                FROM order_status_history h 
                LEFT JOIN admins a ON h.updated_by_admin_id = a.id 
                WHERE h.order_id = ? 
                ORDER BY h.id DESC
            ');
            $histStmt->execute([$orderId]);
            $ord['status_history'] = $histStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $ord['status_history'] = [];
        }

        Response::success($ord, 'Order details retrieved');
        exit;
    }

    // List orders
    $status = trim($_GET['status'] ?? '');
    $search = trim($_GET['search'] ?? '');
    $type = trim($_GET['order_type'] ?? ''); // ONLINE or POS_OFFLINE

    $where = ['1=1'];
    $params = [];

    if (!empty($status) && strtolower($status) !== 'all') {
        $where[] = '(LOWER(o.order_status) = :status OR o.order_status = :status_raw)';
        $params[':status'] = strtolower($status);
        $params[':status_raw'] = $status;
    }
    if (!empty($type)) {
        $where[] = 'o.order_type = :type';
        $params[':type'] = $type;
    }
    if (!empty($search)) {
        $where[] = '(o.order_number LIKE :search OR o.customer_name LIKE :search OR o.customer_phone LIKE :search OR o.customer_email LIKE :search)';
        $params[':search'] = "%$search%";
    }

    $whereSql = implode(' AND ', $where);
    $stmt = $pdo->prepare("
        SELECT 
            o.*,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
            (SELECT invoice_number FROM invoices WHERE order_id = o.id LIMIT 1) as invoice_number
        FROM orders o
        WHERE $whereSql
        ORDER BY o.id DESC
        LIMIT 200
    ");
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($orders as &$ord) {
        try {
            $iStmt = $pdo->prepare('SELECT oi.*, p.primary_image FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?');
            $iStmt->execute([$ord['id']]);
            $ord['items'] = $iStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $ord['items'] = [];
        }

        try {
            $rxStmt = $pdo->prepare('SELECT * FROM order_prescriptions WHERE order_id = ?');
            $rxStmt->execute([$ord['id']]);
            $ord['prescriptions'] = $rxStmt->fetchAll(PDO::FETCH_ASSOC);
            $ord['prescription'] = $ord['prescriptions'][0] ?? null;
        } catch (Exception $e) {
            $ord['prescriptions'] = [];
            $ord['prescription'] = null;
        }

        try {
            $payStmt = $pdo->prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1');
            $payStmt->execute([$ord['id']]);
            $ord['payment'] = $payStmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $ord['payment'] = null;
        }
    }

    Response::success($orders, 'Orders list retrieved');

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
    // Update Order Status / Prescription Workflow
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $orderId = (int)($input['order_id'] ?? 0);
    $newStatus = trim($input['new_status'] ?? '');
    $note = trim($input['note'] ?? 'Status updated by staff');
    $paymentStatus = trim($input['payment_status'] ?? '');
    $prescriptionStatus = trim($input['prescription_status'] ?? '');

    if (empty($orderId) || empty($newStatus)) {
        Response::error('Order ID and new status are required.', 422);
    }

    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();

    if (!$order) Response::notFound('Order not found.');

    $action = trim($input['action'] ?? '');
    $rejectionReason = trim($input['rejection_reason'] ?? $input['note'] ?? '');

    // 1. REJECT CANCELLATION WORKFLOW
    if ($action === 'reject_cancellation') {
        if (empty($rejectionReason)) {
            Response::error('A reason note is required when rejecting cancellation.', 422);
        }
        $targetStatus = !empty($newStatus) && $newStatus !== 'Cancelled' ? $newStatus : ($oldStatus === 'Cancelled' ? 'Order Confirmed' : $oldStatus);
        
        $pdo->prepare('
            UPDATE orders 
            SET order_status = ?, notes = CONCAT(COALESCE(notes, ""), "\n[Cancellation Rejected by Admin]: ", ?) 
            WHERE id = ?
        ')->execute([$targetStatus, $rejectionReason, $orderId]);

        $pdo->prepare('
            INSERT INTO order_status_history (order_id, old_status, new_status, note, updated_by_admin_id)
            VALUES (?, ?, ?, ?, ?)
        ')->execute([$orderId, $oldStatus, $targetStatus, "Cancellation Request Rejected: {$rejectionReason}", $admin['id']]);

        // Send email to customer explaining why cancellation was declined
        if (!empty($order['customer_email'])) {
            $emailHtml = <<<HTML
                <div class="badge" style="background:#FEF3C7; color:#92400E; padding:4px 10px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block;">Cancellation Request Update</div>
                <h2>Order {$order['order_number']} Cancellation Notice</h2>
                <p>Dear {$order['customer_name']}, your cancellation request for order <strong>{$order['order_number']}</strong> could not be processed at this time.</p>
                <div style="margin-top:12px; padding:12px; background:#F8FAFC; border-left:4px solid #F59E0B; border-radius:4px;">
                    <p style="margin:0; font-weight:bold; color:#0F172A;">Reason from Optical Team:</p>
                    <p style="margin:4px 0 0; color:#334155;">{$rejectionReason}</p>
                </div>
                <p style="color:#64748B; font-size:12px; margin-top:16px;">If you have questions, please feel free to call our Digha clinical support line at 9382293614.</p>
HTML;
            Mailer::send($order['customer_email'], $order['customer_name'], "Cancellation Update - Order {$order['order_number']} | Netra Unnayan", $emailHtml);
        }

        Response::success([
            'order_id'   => $orderId,
            'old_status' => $oldStatus,
            'new_status' => $targetStatus,
            'rejection_reason' => $rejectionReason
        ], "Cancellation request rejected and customer notified.");
        exit;
    }

    // 2. CANCEL ORDER / APPROVE CANCELLATION WORKFLOW (Restores stock)
    if ($newStatus === 'Cancelled' || $action === 'approve_cancellation') {
        $cancelReason = trim($input['cancel_reason'] ?? $note ?? 'Cancelled by administrator');
        $newPaymentStatus = ($order['payment_status'] === 'Paid') ? 'Refund Initiated' : 'Cancelled';

        // Restore stock
        $itemsStmt = $pdo->prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?');
        $itemsStmt->execute([$orderId]);
        $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        $invStmt = $pdo->prepare('
            INSERT INTO inventory_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reference_type, reference_id, notes)
            VALUES (?, "RETURN", ?, ?, ?, "CANCELLED_ORDER", ?, ?)
        ');

        foreach ($orderItems as $item) {
            $pId = (int)($item['product_id'] ?? 0);
            $qty = (int)($item['quantity'] ?? 0);
            if ($pId > 0 && $qty > 0) {
                $curStock = (int)$pdo->query("SELECT stock_quantity FROM products WHERE id = {$pId}")->fetchColumn();
                $newStock = $curStock + $qty;
                $pdo->prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')->execute([$newStock, $pId]);
                $invStmt->execute([$pId, $qty, $curStock, $newStock, $order['order_number'], "Stock restored due to cancellation of Order #{$order['order_number']}"]);
            }
        }

        $pdo->prepare('
            UPDATE orders 
            SET order_status = "Cancelled", payment_status = ?, cancelled_at = NOW(), cancel_reason = ? 
            WHERE id = ?
        ')->execute([$newPaymentStatus, $cancelReason, $orderId]);

        $pdo->prepare('
            INSERT INTO order_status_history (order_id, old_status, new_status, note, updated_by_admin_id)
            VALUES (?, ?, "Cancelled", ?, ?)
        ')->execute([$orderId, $oldStatus, "Cancelled by staff: {$cancelReason}", $admin['id']]);

        // If paid, insert refund record
        if ($order['payment_status'] === 'Paid') {
            $refundNumber = 'NU-REF-' . strtoupper(bin2hex(random_bytes(4)));
            $pdo->prepare('
                INSERT INTO refunds (order_id, refund_number, amount, reason, status)
                VALUES (?, ?, ?, ?, "Pending")
            ')->execute([$orderId, $refundNumber, $order['total_amount'], "Cancellation refund: " . $cancelReason]);
        }

        // Send email
        if (!empty($order['customer_email'])) {
            $emailBody = <<<HTML
                <div class="badge" style="background:#FEE2E2; color:#B91C1C; padding:4px 10px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block;">Order Cancelled</div>
                <h2>Order {$order['order_number']} Cancelled</h2>
                <p>Your order has been cancelled.</p>
                <p><strong>Reason:</strong> {$cancelReason}</p>
HTML;
            Mailer::send($order['customer_email'], $order['customer_name'], "Order Cancelled - {$order['order_number']} | Netra Unnayan", $emailBody);
        }

        Response::success([
            'order_id'       => $orderId,
            'old_status'     => $oldStatus,
            'new_status'     => 'Cancelled',
            'payment_status' => $newPaymentStatus
        ], "Order #{$order['order_number']} cancelled and stock restored to inventory.");
        exit;
    }

    // 3. REGULAR STATUS ADVANCEMENT WORKFLOW
    // If changing to Lens Cutting, auto set prescription status to Production Started
    if (in_array($newStatus, ['Lens Cutting', 'Fitting', 'Quality Check'])) {
        $prescriptionStatus = 'Production Started';
    }

    $updates = ['order_status = ?'];
    $params = [$newStatus];

    if (!empty($paymentStatus)) {
        $updates[] = 'payment_status = ?';
        $params[] = $paymentStatus;
    }
    if (!empty($prescriptionStatus)) {
        $updates[] = 'prescription_status = ?';
        $params[] = $prescriptionStatus;
    }

    $courierName = trim($input['courier_name'] ?? '');
    $trackingNumber = trim($input['tracking_number'] ?? '');
    $trackingUrl = trim($input['tracking_url'] ?? '');
    $estimatedDelivery = trim($input['estimated_delivery_date'] ?? '');

    if (!empty($courierName)) {
        $updates[] = 'courier_name = ?';
        $params[] = $courierName;
    }
    if (!empty($trackingNumber)) {
        $updates[] = 'tracking_number = ?';
        $params[] = $trackingNumber;
    }
    if (!empty($trackingUrl)) {
        $updates[] = 'tracking_url = ?';
        $params[] = $trackingUrl;
    }
    if (!empty($estimatedDelivery)) {
        $updates[] = 'estimated_delivery_date = ?';
        $params[] = $estimatedDelivery;
    }

    $params[] = $orderId;
    $pdo->prepare('UPDATE orders SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);

    // Update prescription table if needed
    if (!empty($prescriptionStatus)) {
        $pdo->prepare('UPDATE order_prescriptions SET status = ?, admin_notes = ? WHERE order_id = ?')
            ->execute([$prescriptionStatus, $note, $orderId]);
    }

    // Update payment record if payment confirmed
    if ($paymentStatus === 'Paid') {
        $pdo->prepare('UPDATE payments SET status = "Paid", verified_by_admin_id = ?, verified_at = NOW() WHERE order_id = ?')
            ->execute([$admin['id'], $orderId]);
    }

    // Record Status History
    $pdo->prepare('
        INSERT INTO order_status_history (order_id, old_status, new_status, note, updated_by_admin_id)
        VALUES (?, ?, ?, ?, ?)
    ')->execute([$orderId, $oldStatus, $newStatus, $note, $admin['id']]);

    // Send customer email update
    if (!empty($order['customer_email']) && $oldStatus !== $newStatus) {
        $shippingInfoHtml = '';
        if (!empty($courierName) || !empty($trackingNumber)) {
            $shippingInfoHtml = "<div style='margin-top:14px; padding:12px; background:#F1F5F9; border-radius:8px; border:1px solid #CBD5E1;'>";
            if (!empty($courierName)) $shippingInfoHtml .= "<p style='margin:0 0 4px;'><strong>Courier Partner:</strong> {$courierName}</p>";
            if (!empty($trackingNumber)) $shippingInfoHtml .= "<p style='margin:0 0 4px;'><strong>AWB / Tracking #:</strong> {$trackingNumber}</p>";
            if (!empty($trackingUrl)) $shippingInfoHtml .= "<p style='margin:0;'><a href='{$trackingUrl}' target='_blank' style='color:#0284C7; font-weight:bold;'>Click to Track Shipment Online &rarr;</a></p>";
            $shippingInfoHtml .= "</div>";
        }

        $emailHtml = <<<HTML
            <div class="badge" style="background:#E0F2FE; color:#0369A1; padding:4px 10px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block;">Status Update: {$newStatus}</div>
            <h2>Order {$order['order_number']} Progress Update</h2>
            <p>Dear {$order['customer_name']}, your eyewear order has progressed to stage: <strong>{$newStatus}</strong>.</p>
            <p><strong>Note:</strong> {$note}</p>
            {$shippingInfoHtml}
            <p style="color:#64748B; font-size:12px; margin-top:16px;">You can track live optical fabrication and courier delivery updates anytime in your Netra Unnayan account portal.</p>
HTML;
        Mailer::send($order['customer_email'], $order['customer_name'], "Order Update: {$newStatus} - {$order['order_number']} | Netra Unnayan", $emailHtml);
    }

    Response::success([
        'order_id'            => $orderId,
        'old_status'          => $oldStatus,
        'new_status'          => $newStatus,
        'prescription_status' => $prescriptionStatus ?: $order['prescription_status'],
        'payment_status'      => $paymentStatus ?: $order['payment_status']
    ], "Order status updated to '{$newStatus}' successfully.");

} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $orderId = (int)($_GET['id'] ?? 0);
    $restoreStock = isset($_GET['restore_stock']) ? (int)$_GET['restore_stock'] : 0;
    
    if (!$orderId) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $orderId = (int)($input['id'] ?? 0);
        if (isset($input['restore_stock'])) {
            $restoreStock = (int)$input['restore_stock'];
        }
    }
    if (!$orderId) Response::error('Order ID is required.', 400);

    // If restore_stock requested, add quantities back to product catalog inventory
    $stockRestoredCount = 0;
    if ($restoreStock === 1) {
        $itemsStmt = $pdo->prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?');
        $itemsStmt->execute([$orderId]);
        $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($orderItems as $item) {
            $pId = (int)($item['product_id'] ?? 0);
            $qty = (int)($item['quantity'] ?? 0);
            if ($pId > 0 && $qty > 0) {
                $pdo->prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?')
                    ->execute([$qty, $pId]);
                $stockRestoredCount += $qty;
            }
        }
    }

    // Delete associated records first to preserve database integrity
    $pdo->prepare('DELETE FROM invoices WHERE order_id = ?')->execute([$orderId]);
    $pdo->prepare('DELETE FROM payments WHERE order_id = ?')->execute([$orderId]);
    $pdo->prepare('DELETE FROM order_items WHERE order_id = ?')->execute([$orderId]);
    $pdo->prepare('DELETE FROM order_prescriptions WHERE order_id = ?')->execute([$orderId]);
    $pdo->prepare('DELETE FROM order_status_history WHERE order_id = ?')->execute([$orderId]);
    $pdo->prepare('DELETE FROM orders WHERE id = ?')->execute([$orderId]);

    $msg = $restoreStock === 1 
        ? "Order deleted successfully and {$stockRestoredCount} items returned back to inventory stock."
        : "Order and invoice permanently deleted without modifying stock.";

    Response::success(['order_id' => $orderId, 'stock_restored' => $restoreStock === 1], $msg);
}
