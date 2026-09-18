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

        // Dispatch Email to Customer (non-blocking)
        try {
            $custEmail = !empty($order['customer_email']) ? trim($order['customer_email']) : '';
            if (empty($custEmail) && !empty($order['customer_id'])) {
                $cStmt = $pdo->prepare('SELECT email FROM customers WHERE id = ?');
                $cStmt->execute([$order['customer_id']]);
                $custEmail = (string)$cStmt->fetchColumn();
            }

            if (!empty($custEmail)) {
                $custName = $order['customer_name'] ?: 'Valued Customer';
                if ($normalizedStatus === 'Needs Clarification') {
                    $emailBody = <<<HTML
                        <div style="background:#FEE2E2; color:#B91C1C; padding:6px 14px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block; border:1px solid #F87171;">
                            Action Required: Prescription Needs Clarification
                        </div>
                        <h2 style="color:#0F172A; margin-top:16px;">Prescription Clarification Required for Order #{$order['order_number']}</h2>
                        <p>Dear {$custName},</p>
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
                    Mailer::send($custEmail, $custName, "Action Required: Prescription Clarification - Order #{$order['order_number']} | Netra Unnayan", $emailBody);
                } elseif ($normalizedStatus === 'Approved') {
                    $emailBody = <<<HTML
                        <div style="background:#DCFCE7; color:#15803D; padding:6px 14px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block; border:1px solid #86EFAC;">
                            Prescription Verified &amp; Approved
                        </div>
                        <h2 style="color:#0F172A; margin-top:16px;">Optical Prescription Approved for Order #{$order['order_number']}</h2>
                        <p>Dear {$custName},</p>
                        <p>Great news! Your prescription diopters and pupillary distance (PD) have been clinically verified by our optometry team. Your customized optical lenses have moved to <strong>Laboratory Lens Edging &amp; Cutting</strong>.</p>
                        
                        <div style="margin:16px 0; padding:14px; background:#F0FDF4; border-radius:8px; border:1px solid #BBF7D0;">
                            <p style="margin:0; font-weight:bold; color:#166534; font-size:13px;">Clinical Verification Details:</p>
                            <p style="margin:4px 0 0; color:#15803D; font-size:13px;">{$note}</p>
                        </div>
                        <p style="color:#64748B; font-size:12px; margin-top:16px;">You can track real-time optical cutting and assembly in your Netra Unnayan customer portal.</p>
HTML;
                    Mailer::send($custEmail, $custName, "Prescription Approved for Lab Cutting - Order #{$order['order_number']} | Netra Unnayan", $emailBody);
                }
            }
        } catch (\Throwable $mailErr) {
            error_log('Prescription email notification non-fatal error: ' . $mailErr->getMessage());
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
        try {
            $custEmail = Mailer::resolveCustomerEmail($pdo, $order);
            if (!empty($custEmail)) {
                $custName = !empty($order['customer_name']) ? $order['customer_name'] : 'Valued Customer';
                $emailHtml = <<<HTML
                    <div class="badge" style="background:#FEF3C7; color:#92400E; padding:4px 10px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block;">Cancellation Request Update</div>
                    <h2 style="color:#0F172A; margin-top:14px;">Order #{$order['order_number']} Cancellation Notice</h2>
                    <p>Dear {$custName},</p>
                    <p>Your cancellation request for order <strong>#{$order['order_number']}</strong> could not be processed at this time.</p>
                    <div style="margin:16px 0; padding:14px; background:#FFFBEB; border-left:4px solid #F59E0B; border-radius:6px;">
                        <p style="margin:0; font-weight:bold; color:#92400E; font-size:12px; text-transform:uppercase;">Reason from Optical Lab Team:</p>
                        <p style="margin:6px 0 0; color:#78350F; font-size:14px; line-height:1.5;">{$rejectionReason}</p>
                    </div>
                    <div style="margin-top:20px; padding:16px; background:#F8FAFC; border-radius:8px; border:1px solid #E2E8F0; text-align:center;">
                        <p style="margin:0 0 12px; font-size:13px; color:#334155;"><strong>Current Status:</strong> {$targetStatus}</p>
                        <a href="https://netraunnayan.com/order-tracking?order={$order['order_number']}" style="display:inline-block; background:#0284C7; color:#FFFFFF; text-decoration:none; padding:10px 18px; border-radius:6px; font-weight:bold; font-size:13px; margin:4px 6px;">Track Eyewear Live &rarr;</a>
                        <a href="https://netraunnayan.com/order-tracking?order={$order['order_number']}&view=invoice" style="display:inline-block; background:#0F172A; color:#FFFFFF; text-decoration:none; padding:10px 18px; border-radius:6px; font-weight:bold; font-size:13px; margin:4px 6px;">View Official Invoice</a>
                    </div>
                    <p style="color:#64748B; font-size:12px; margin-top:20px;">If you have any questions or wish to modify optical parameters, please message our clinical support desk on WhatsApp at <a href="https://wa.me/919382293614?text=Hi%20Netra%20Unnayan,%20I%20have%20a%20query%20about%20Order%20{$order['order_number']}" style="color:#059669; font-weight:bold;">+91 9382293614</a>.</p>
HTML;
                Mailer::send($custEmail, $custName, "Cancellation Update - Order #{$order['order_number']} | Netra Unnayan", $emailHtml);
            }
        } catch (\Throwable $mailErr) {
            error_log('Cancellation rejection email error: ' . $mailErr->getMessage());
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
        $refundNumber = null;
        if ($order['payment_status'] === 'Paid') {
            $refundNumber = 'NU-REF-' . strtoupper(bin2hex(random_bytes(4)));
            $pdo->prepare('
                INSERT INTO refunds (order_id, refund_number, amount, reason, status)
                VALUES (?, ?, ?, ?, "Pending")
            ')->execute([$orderId, $refundNumber, $order['total_amount'], "Cancellation refund: " . $cancelReason]);
        }

        // Send email
        try {
            $custEmail = Mailer::resolveCustomerEmail($pdo, $order);
            if (!empty($custEmail)) {
                $custName = !empty($order['customer_name']) ? $order['customer_name'] : 'Valued Customer';
                $refundNote = ($order['payment_status'] === 'Paid')
                    ? "<div style='margin-top:14px; padding:12px; background:#ECFDF5; border-radius:6px; border:1px solid #A7F3D0;'><p style='margin:0; color:#065F46; font-size:13px;'><strong>Refund Status:</strong> A full refund of <strong>₹" . number_format((float)$order['total_amount'], 2) . "</strong> has been initiated under reference <strong>" . ($refundNumber ?? 'NU-REF') . "</strong>. It will be credited back to your original payment method in 3–5 business days.</p></div>"
                    : "<div style='margin-top:14px; padding:12px; background:#F8FAFC; border-radius:6px; border:1px solid #E2E8F0;'><p style='margin:0; color:#64748B; font-size:13px;'><strong>Payment Status:</strong> Cash on Delivery / Unpaid — No payment was captured.</p></div>";

                $emailBody = <<<HTML
                    <div class="badge" style="background:#FEE2E2; color:#B91C1C; padding:4px 10px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block;">Order Cancelled</div>
                    <h2 style="color:#0F172A; margin-top:14px;">Order #{$order['order_number']} Cancelled</h2>
                    <p>Dear {$custName},</p>
                    <p>Your order <strong>#{$order['order_number']}</strong> has been cancelled.</p>
                    <div style="margin:16px 0; padding:14px; background:#FFF1F2; border-left:4px solid #F43F5E; border-radius:6px;">
                        <p style="margin:0; font-weight:bold; color:#9F1239; font-size:13px;">Reason:</p>
                        <p style="margin:4px 0 0; color:#881337; font-size:13px;">{$cancelReason}</p>
                    </div>
                    {$refundNote}
                    <p style="color:#64748B; font-size:12px; margin-top:20px;">If you cancelled by mistake or wish to choose an alternative optical frame or lens, feel free to reach out to our team at <a href="https://wa.me/919382293614" style="color:#059669; font-weight:bold;">+91 9382293614</a> or explore new collections at <a href="https://netraunnayan.com" style="color:#0284C7; font-weight:bold;">netraunnayan.com</a>.</p>
HTML;
                Mailer::send($custEmail, $custName, "Order Cancelled - #{$order['order_number']} | Netra Unnayan", $emailBody);
            }
        } catch (\Throwable $mailErr) {
            error_log('Order cancellation email error: ' . $mailErr->getMessage());
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
    try {
        $custEmail = Mailer::resolveCustomerEmail($pdo, $order);
        if (!empty($custEmail) && ($oldStatus !== $newStatus || !empty($trackingNumber))) {
            $custName = !empty($order['customer_name']) ? $order['customer_name'] : 'Valued Customer';

            // Stage-specific details & styling
            $stageDetails = [
                'Order Confirmed' => [
                    'badge_bg' => '#E0F2FE', 'badge_color' => '#0369A1',
                    'title' => 'Order Confirmed & Optical Job Queued',
                    'desc' => 'Your optical order and payment have been verified. Our clinical lab has received your frame and lens specifications.'
                ],
                'Prescription Review' => [
                    'badge_bg' => '#FEF3C7', 'badge_color' => '#92400E',
                    'title' => 'Optometrist Reviewing Prescription',
                    'desc' => 'Our clinical optometrist is verifying your diopters, cylinder axes, and pupillary distance (PD) for optical perfection.'
                ],
                'Prescription Approved' => [
                    'badge_bg' => '#DCFCE7', 'badge_color' => '#15803D',
                    'title' => 'Prescription Clinically Certified',
                    'desc' => 'Your prescription has passed optical tolerance standards and the lenses are queued for computerized edging.'
                ],
                'Lens Cutting' => [
                    'badge_bg' => '#F3E8FF', 'badge_color' => '#7E22CE',
                    'title' => 'Laboratory Lens Edging & Cutting in Progress',
                    'desc' => 'Your optical lenses are undergoing precision CNC diamond-wheel bevel edging and surface coating.'
                ],
                'Fitting' => [
                    'badge_bg' => '#E0E7FF', 'badge_color' => '#4338CA',
                    'title' => 'Frame Assembly & Lens Mounting',
                    'desc' => 'Our optical technicians are mounting your lenses into the frame, aligning optical centers, and tensioning hinges.'
                ],
                'Quality Check' => [
                    'badge_bg' => '#CCFBF1', 'badge_color' => '#0F766E',
                    'title' => 'Final Optical & Structural Inspection',
                    'desc' => 'Your eyewear is undergoing digital lensometer verification for diopter accuracy, scratch inspection, and alignment.'
                ],
                'Packed' => [
                    'badge_bg' => '#FEF9C3', 'badge_color' => '#854D0E',
                    'title' => 'Eyewear Boxed & Sanitized for Dispatch',
                    'desc' => 'Your custom glasses have been ultrasonically cleaned, boxed with premium hard protective case and microfiber cloth.'
                ],
                'Shipped' => [
                    'badge_bg' => '#DBEAFE', 'badge_color' => '#1E40AF',
                    'title' => 'Package Dispatched & In Transit',
                    'desc' => 'Your eyewear has been handed over to our courier partner and is on its way to your delivery address.'
                ],
                'Out for Delivery' => [
                    'badge_bg' => '#FFEDD5', 'badge_color' => '#C2410C',
                    'title' => 'Out for Delivery Today',
                    'desc' => 'Your package has arrived at your local delivery hub and our courier partner will attempt delivery today.'
                ],
                'Delivered' => [
                    'badge_bg' => '#DCFCE7', 'badge_color' => '#166534',
                    'title' => 'Eyewear Successfully Delivered',
                    'desc' => 'Your Netra Unnayan eyewear package has been delivered! We hope you enjoy clear, comfortable vision.'
                ],
            ];

            $stageInfo = $stageDetails[$newStatus] ?? [
                'badge_bg' => '#F1F5F9', 'badge_color' => '#334155',
                'title' => "Order Status: {$newStatus}",
                'desc' => "Your eyewear order has progressed to stage: {$newStatus}."
            ];

            $shippingInfoHtml = '';
            if (!empty($courierName) || !empty($trackingNumber)) {
                $shippingInfoHtml = "<div style='margin-top:16px; padding:14px; background:#F8FAFC; border-radius:8px; border:1px solid #CBD5E1;'>";
                $shippingInfoHtml .= "<p style='margin:0 0 6px; font-weight:bold; color:#0F172A; font-size:13px;'>Shipping & Tracking Details:</p>";
                if (!empty($courierName)) $shippingInfoHtml .= "<p style='margin:0 0 4px; font-size:13px; color:#334155;'><strong>Courier Partner:</strong> {$courierName}</p>";
                if (!empty($trackingNumber)) $shippingInfoHtml .= "<p style='margin:0 0 6px; font-size:13px; color:#334155;'><strong>AWB / Tracking #:</strong> <code style='background:#E2E8F0; padding:2px 6px; border-radius:4px; font-weight:bold;'>{$trackingNumber}</code></p>";
                if (!empty($trackingUrl)) {
                    $shippingInfoHtml .= "<p style='margin:6px 0 0;'><a href='{$trackingUrl}' target='_blank' style='display:inline-block; background:#0284C7; color:#FFFFFF; text-decoration:none; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:bold;'>Track on Courier Website &rarr;</a></p>";
                }
                $shippingInfoHtml .= "</div>";
            }

            $noteHtml = '';
            if (!empty($note) && $note !== 'Status updated by staff') {
                $noteHtml = "<div style='margin-top:14px; padding:12px; background:#FFFBEB; border-left:3px solid #F59E0B; border-radius:4px;'><p style='margin:0; font-size:12px; color:#92400E;'><strong>Staff Update Note:</strong> {$note}</p></div>";
            }

            $emailHtml = <<<HTML
                <div class="badge" style="background:{$stageInfo['badge_bg']}; color:{$stageInfo['badge_color']}; padding:5px 12px; border-radius:9999px; font-weight:bold; font-size:12px; display:inline-block;">{$newStatus}</div>
                <h2 style="color:#0F172A; margin-top:14px; margin-bottom:6px;">{$stageInfo['title']}</h2>
                <p style="color:#64748B; font-size:13px; margin:0 0 16px;">Order #<strong>{$order['order_number']}</strong></p>
                <p>Dear {$custName},</p>
                <p>{$stageInfo['desc']}</p>
                {$shippingInfoHtml}
                {$noteHtml}
                
                <div style="margin-top:22px; padding:16px; background:#F8FAFC; border-radius:8px; border:1px solid #E2E8F0; text-align:center;">
                    <a href="https://netraunnayan.com/order-tracking?order={$order['order_number']}" style="display:inline-block; background:#0284C7; color:#FFFFFF; text-decoration:none; padding:11px 20px; border-radius:6px; font-weight:bold; font-size:13px; margin:4px 6px;">Track Eyewear Live &rarr;</a>
                    <a href="https://netraunnayan.com/order-tracking?order={$order['order_number']}&view=invoice" style="display:inline-block; background:#0F172A; color:#FFFFFF; text-decoration:none; padding:11px 20px; border-radius:6px; font-weight:bold; font-size:13px; margin:4px 6px;">Official Tax Invoice</a>
                </div>
                
                <p style="color:#64748B; font-size:12px; margin-top:22px; line-height:1.5;">
                    Need help? Connect with our optical clinic directly on WhatsApp at <a href="https://wa.me/919382293614?text=Hi%20Netra%20Unnayan,%20I%20have%20a%20query%20about%20Order%20{$order['order_number']}" style="color:#059669; font-weight:bold;">+91 9382293614</a>.
                </p>
HTML;
            Mailer::send($custEmail, $custName, "Order Update: {$newStatus} - #{$order['order_number']} | Netra Unnayan", $emailHtml);
        }
    } catch (\Throwable $mailErr) {
        error_log('Status update email non-fatal error: ' . $mailErr->getMessage());
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
