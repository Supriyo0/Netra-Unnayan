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
                SELECT oi.*, 
                       p.name as product_name_master, p.sku as product_sku_code, p.lens_width, p.bridge_width, p.temple_length,
                       p.frame_size as p_frame_size, p.frame_color as p_frame_color, p.frame_material as p_frame_material, p.frame_shape as p_frame_shape,
                       COALESCE(
                           (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC, id ASC LIMIT 1),
                           "/logo_symbol.png"
                       ) as primary_image,
                       COALESCE(
                           (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC, id ASC LIMIT 1),
                           "/logo_symbol.png"
                       ) as image_url
                FROM order_items oi 
                LEFT JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?
            ');
            $iStmt->execute([$orderId]);
            $fetchedItems = $iStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($fetchedItems as &$it) {
                if (empty($it['product_name']) && !empty($it['product_name_master'])) {
                    $it['product_name'] = $it['product_name_master'];
                }
                if (empty($it['product_sku']) && !empty($it['product_sku_code'])) {
                    $it['product_sku'] = $it['product_sku_code'];
                }
                if (empty($it['frame_size']) && !empty($it['p_frame_size'])) {
                    $it['frame_size'] = $it['p_frame_size'];
                }
                if (empty($it['frame_color']) && !empty($it['p_frame_color'])) {
                    $it['frame_color'] = $it['p_frame_color'];
                }
                if (empty($it['material']) && !empty($it['p_frame_material'])) {
                    $it['material'] = $it['p_frame_material'];
                }
            }
            $ord['items'] = $fetchedItems;
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

        if (empty($ord['prescriptions'])) {
            $lensItem = null;
            if (!empty($ord['items']) && is_array($ord['items'])) {
                foreach ($ord['items'] as $it) {
                    if (!empty($it['lens_type'])) {
                        $lensItem = $it;
                        break;
                    }
                }
            }
            if ($lensItem || (!empty($ord['prescription_status']) && $ord['prescription_status'] !== 'Not Required')) {
                $synth = [
                    'id'                => 0,
                    'order_id'          => $ord['id'],
                    'submission_method' => 'FORM',
                    'lens_type'         => $lensItem['lens_type'] ?? 'Prescription Optical Lenses',
                    'status'            => $ord['prescription_status'] ?: 'Pending Review',
                    'admin_notes'       => $ord['notes'] ?? null,
                    'right_sph'         => null,
                    'left_sph'          => null,
                    'single_pd'         => 63,
                    'rx_image_url'      => null
                ];
                $ord['prescriptions'] = [$synth];
                $ord['prescription'] = $synth;
            }
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
            $iStmt = $pdo->prepare('
                SELECT oi.*, 
                       p.name as product_name_master, p.sku as product_sku_code, p.lens_width, p.bridge_width, p.temple_length,
                       p.frame_size as p_frame_size, p.frame_color as p_frame_color, p.frame_material as p_frame_material, p.frame_shape as p_frame_shape,
                       COALESCE(
                           (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC, id ASC LIMIT 1),
                           "/logo_symbol.png"
                       ) as primary_image,
                       COALESCE(
                           (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC, id ASC LIMIT 1),
                           "/logo_symbol.png"
                       ) as image_url
                FROM order_items oi 
                LEFT JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?
            ');
            $iStmt->execute([$ord['id']]);
            $fetchedItems = $iStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($fetchedItems as &$it) {
                if (empty($it['product_name']) && !empty($it['product_name_master'])) {
                    $it['product_name'] = $it['product_name_master'];
                }
                if (empty($it['product_sku']) && !empty($it['product_sku_code'])) {
                    $it['product_sku'] = $it['product_sku_code'];
                }
                if (empty($it['frame_size']) && !empty($it['p_frame_size'])) {
                    $it['frame_size'] = $it['p_frame_size'];
                }
                if (empty($it['frame_color']) && !empty($it['p_frame_color'])) {
                    $it['frame_color'] = $it['p_frame_color'];
                }
                if (empty($it['material']) && !empty($it['p_frame_material'])) {
                    $it['material'] = $it['p_frame_material'];
                }
            }
            $ord['items'] = $fetchedItems;
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

        if (empty($ord['prescriptions'])) {
            $lensItem = null;
            if (!empty($ord['items']) && is_array($ord['items'])) {
                foreach ($ord['items'] as $it) {
                    if (!empty($it['lens_type'])) {
                        $lensItem = $it;
                        break;
                    }
                }
            }
            if ($lensItem || (!empty($ord['prescription_status']) && $ord['prescription_status'] !== 'Not Required')) {
                $synth = [
                    'id'                => 0,
                    'order_id'          => $ord['id'],
                    'submission_method' => 'FORM',
                    'lens_type'         => $lensItem['lens_type'] ?? 'Prescription Optical Lenses',
                    'status'            => $ord['prescription_status'] ?: 'Pending Review',
                    'admin_notes'       => $ord['notes'] ?? null,
                    'right_sph'         => null,
                    'left_sph'          => null,
                    'single_pd'         => 63,
                    'rx_image_url'      => null
                ];
                $ord['prescriptions'] = [$synth];
                $ord['prescription'] = $synth;
            }
        }

        try {
            $payStmt = $pdo->prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1');
            $payStmt->execute([$ord['id']]);
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
            $histStmt->execute([$ord['id']]);
            $ord['status_history'] = $histStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $ord['status_history'] = [];
        }
    }

    Response::success($orders, 'Orders list retrieved');

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
    // Update Order Status / Prescription Workflow
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $orderId = (int)($input['order_id'] ?? 0);
    $action = trim($input['action'] ?? '');

    if (empty($orderId)) {
        Response::error('Order ID is required.', 422);
    }

    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();

    if (!$order) Response::notFound('Order not found.');
    $oldStatus = $order['order_status'] ?? 'Pending';

    // 0. VERIFY PRESCRIPTION WORKFLOW
    if ($action === 'verify_prescription') {
        $statusVal = trim($input['prescription_status'] ?? $input['verification_status'] ?? '');
        $note = trim($input['note'] ?? '');
        $prescriptionId = (int)($input['prescription_id'] ?? 0);

        if (empty($statusVal)) {
            Response::error('Prescription status is required.', 422);
        }

        // Map status
        $normalizedStatus = 'Pending Review';
        if (in_array(strtolower($statusVal), ['verified', 'approved'])) {
            $normalizedStatus = 'Approved';
            if (empty($note)) $note = 'Prescription diopters verified and approved by clinical optician for lab edging.';
        } elseif (in_array(strtolower($statusVal), ['needs clarification', 'needs_clarification', 'clarification'])) {
            $normalizedStatus = 'Needs Clarification';
            if (empty($note)) $note = 'Prescription parameters require clarification. Please review with customer.';
        } else {
            $normalizedStatus = $statusVal;
        }

        // Update or insert into order_prescriptions
        $rxExists = (int)$pdo->query("SELECT COUNT(*) FROM order_prescriptions WHERE order_id = {$orderId}")->fetchColumn();
        if ($rxExists > 0) {
            if ($prescriptionId > 0) {
                $pdo->prepare('UPDATE order_prescriptions SET status = ?, admin_notes = ? WHERE id = ? AND order_id = ?')
                    ->execute([$normalizedStatus, $note, $prescriptionId, $orderId]);
            } else {
                $pdo->prepare('UPDATE order_prescriptions SET status = ?, admin_notes = ? WHERE order_id = ?')
                    ->execute([$normalizedStatus, $note, $orderId]);
            }
        } else {
            // Synthesize and insert row
            $pdo->prepare('
                INSERT INTO order_prescriptions (order_id, submission_method, status, admin_notes)
                VALUES (?, "FORM", ?, ?)
            ')->execute([$orderId, $normalizedStatus, $note]);
        }

        // Update order record
        $targetOrderStatus = $oldStatus;
        if ($normalizedStatus === 'Approved') {
            if (in_array($oldStatus, ['Pending', 'Payment Confirmed', 'Prescription Review'])) {
                $targetOrderStatus = 'Order Confirmed';
            }
        } elseif ($normalizedStatus === 'Needs Clarification') {
            $targetOrderStatus = 'Prescription Review';
        }

        $pdo->prepare('UPDATE orders SET prescription_status = ?, order_status = ? WHERE id = ?')
            ->execute([$normalizedStatus, $targetOrderStatus, $orderId]);

        // Record Status History
        $pdo->prepare('
            INSERT INTO order_status_history (order_id, old_status, new_status, note, updated_by_admin_id)
            VALUES (?, ?, ?, ?, ?)
        ')->execute([$orderId, $oldStatus, $targetOrderStatus, "Prescription {$normalizedStatus}: {$note}", $admin['id']]);

        // Dispatch Email to Customer
        if (!empty($order['customer_email'])) {
            if ($normalizedStatus === 'Needs Clarification') {
                $emailBody = <<<HTML
                    <div style="background:#FEE2E2; color:#B91C1C; padding:6px 14px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block; border:1px solid #F87171;">
                        Action Required: Prescription Needs Clarification
                    </div>
                    <h2 style="color:#0F172A; margin-top:16px;">Prescription Clarification Required for Order #{$order['order_number']}</h2>
                    <p>Dear {$order['customer_name']},</p>
                    <p>Our senior clinical optometrist reviewed your prescription details for optical order <strong>{$order['order_number']}</strong>, but needs a quick clarification before our laboratory can cut your lenses.</p>
                    
                    <div style="margin:16px 0; padding:16px; background:#FFFBEB; border-left:4px solid #F59E0B; border-radius:8px;">
                        <p style="margin:0; font-weight:bold; color:#92400E; font-size:12px; text-transform:uppercase;">Optometrist Lab Note:</p>
                        <p style="margin:6px 0 0; color:#78350F; font-size:14px; font-weight:500;">{$note}</p>
                    </div>

                    <h3 style="color:#0F172A; font-size:14px; margin-top:20px;">How to resolve this easily:</h3>
                    <ol style="color:#334155; font-size:13px; line-height:1.6; padding-left:20px;">
                        <li><strong>Option 1 (Online):</strong> Log in to your Netra Unnayan account, go to <a href="https://netraunnayan.com/account?tab=orders" style="color:#0284C7; font-weight:bold;">My Orders</a>, and tap <em>"Re-Upload / Update Prescription"</em> to submit a new slip or diopters.</li>
                        <li><strong>Option 2 (WhatsApp - Recommended):</strong> Message our optometrist directly on WhatsApp at <a href="https://wa.me/919382293614?text=Hi%20Netra%20Unnayan,%20here%20is%20my%20prescription%20slip%20for%20Order%20{$order['order_number']}" style="color:#059669; font-weight:bold;">+91 9382293614</a> with your doctor's slip photo.</li>
                    </ol>
                    <p style="color:#64748B; font-size:12px; margin-top:20px;">Your frame has been safely reserved in our Digha clinical facility and lens cutting will commence immediately upon verification.</p>
HTML;
                Mailer::send($order['customer_email'], $order['customer_name'], "Action Required: Prescription Clarification - Order #{$order['order_number']} | Netra Unnayan", $emailBody);
            } elseif ($normalizedStatus === 'Approved') {
                $emailBody = <<<HTML
                    <div style="background:#DCFCE7; color:#15803D; padding:6px 14px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block; border:1px solid #86EFAC;">
                        Prescription Verified &amp; Approved
                    </div>
                    <h2 style="color:#0F172A; margin-top:16px;">Optical Prescription Approved for Order #{$order['order_number']}</h2>
                    <p>Dear {$order['customer_name']},</p>
                    <p>Great news! Your prescription diopters and pupillary distance (PD) have been clinically verified by our optometry team. Your customized optical lenses have moved to <strong>Laboratory Lens Edging &amp; Cutting</strong>.</p>
                    
                    <div style="margin:16px 0; padding:14px; background:#F0FDF4; border-radius:8px; border:1px solid #BBF7D0;">
                        <p style="margin:0; font-weight:bold; color:#166534; font-size:13px;">Clinical Verification Details:</p>
                        <p style="margin:4px 0 0; color:#15803D; font-size:13px;">{$note}</p>
                    </div>
                    <p style="color:#64748B; font-size:12px; margin-top:16px;">You can track real-time optical cutting and assembly in your Netra Unnayan customer portal.</p>
HTML;
                Mailer::send($order['customer_email'], $order['customer_name'], "Prescription Approved for Lab Cutting - Order #{$order['order_number']} | Netra Unnayan", $emailBody);
            }
        }

        Response::success([
            'order_id'            => $orderId,
            'prescription_status' => $normalizedStatus,
            'order_status'        => $targetOrderStatus,
            'note'                => $note
        ], "Prescription status updated to '{$normalizedStatus}' successfully.");
        exit;
    }

    // 0.1 VERIFY PAYMENT WORKFLOW
    if ($action === 'verify_payment') {
        $paymentStatusVal = trim($input['payment_status'] ?? 'Paid');
        $pdo->prepare('UPDATE orders SET payment_status = ? WHERE id = ?')->execute([$paymentStatusVal, $orderId]);
        $pdo->prepare('UPDATE payments SET status = ?, verified_by_admin_id = ?, verified_at = NOW() WHERE order_id = ?')
            ->execute([$paymentStatusVal, $admin['id'], $orderId]);

        $pdo->prepare('
            INSERT INTO order_status_history (order_id, old_status, new_status, note, updated_by_admin_id)
            VALUES (?, ?, ?, ?, ?)
        ')->execute([$orderId, $oldStatus, $oldStatus, "Payment status marked as {$paymentStatusVal}", $admin['id']]);

        Response::success([
            'order_id'       => $orderId,
            'payment_status' => $paymentStatusVal
        ], "Payment status updated to '{$paymentStatusVal}' successfully.");
        exit;
    }

    $newStatus = trim($input['new_status'] ?? '');
    $note = trim($input['note'] ?? 'Status updated by staff');
    $paymentStatus = trim($input['payment_status'] ?? '');
    $prescriptionStatus = trim($input['prescription_status'] ?? '');

    if (empty($newStatus)) {
        Response::error('New order status is required.', 422);
    }

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
