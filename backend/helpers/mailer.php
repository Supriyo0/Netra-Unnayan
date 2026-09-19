<?php
// Netra Unnayan - Enterprise SMTP Email Dispatcher & Notification Templates
require_once __DIR__ . '/../config/database.php';

class Mailer {

    /**
     * Send email using configured SMTP or PHP mail() fallback
     */
    public static function send(string $toEmail, string $toName, string $subject, string $htmlBody): bool {
        $toEmail = trim($toEmail);
        if (empty($toEmail) || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        // Avoid sending to synthetic dummy guest addresses
        if (str_starts_with(strtolower($toEmail), 'guest_') && str_ends_with(strtolower($toEmail), '@netraunnayan.com')) {
            return false;
        }

        $pdo = null;
        $settings = [];
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE group_name = 'smtp' OR setting_key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_encryption', 'smtp_from_email', 'smtp_from_name', 'contact_email', 'business_name')");
            $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        } catch (\Throwable $t) {
            // Non-blocking if table is temporarily unavailable or in CLI
        }

        $smtpHost = getenv('SMTP_HOST') ?: ($settings['smtp_host'] ?? 'smtp.gmail.com');
        $smtpPort = (int)(getenv('SMTP_PORT') ?: ($settings['smtp_port'] ?? 587));
        $smtpUser = getenv('SMTP_USER') ?: ($settings['smtp_user'] ?? 'netraunnayan@gmail.com');
        $smtpPass = getenv('SMTP_PASS') !== false && getenv('SMTP_PASS') !== '' ? getenv('SMTP_PASS') : ($settings['smtp_pass'] ?? '');
        $smtpEnc  = strtolower(getenv('SMTP_ENCRYPTION') ?: ($settings['smtp_encryption'] ?? ($smtpPort === 465 ? 'ssl' : 'tls')));
        $fromEmail = getenv('SMTP_FROM_EMAIL') ?: (!empty($settings['smtp_from_email']) ? $settings['smtp_from_email'] : $smtpUser);
        $fromName  = getenv('SMTP_FROM_NAME') ?: ($settings['smtp_from_name'] ?? ($settings['business_name'] ?? 'Netra Unnayan Eye Care'));

        $fullHtml = self::wrapWithBrandTemplate($subject, $htmlBody);
        $sent = false;
        $lastError = '';

        // Attempt direct socket SMTP if credentials are provided
        if (!empty($smtpPass) && !empty($smtpUser)) {
            $sent = self::sendViaSocketSmtp($smtpHost, $smtpPort, $smtpUser, $smtpPass, $smtpEnc, $fromEmail, $fromName, $toEmail, $toName, $subject, $fullHtml, $lastError);
        }

        // Fallback to PHP native mail() if socket SMTP wasn't used or failed
        if (!$sent) {
            $headers = [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=utf-8',
                "From: $fromName <$fromEmail>",
                "Reply-To: $fromEmail",
                'X-Mailer: NetraUnnayan/2.0'
            ];
            $sent = @mail($toEmail, $subject, $fullHtml, implode("\r\n", $headers));
            if (!$sent && empty($lastError)) {
                $lastError = 'PHP mail() fallback returned false (no local mail transfer agent configured or SMTP credentials unconfigured).';
            }
        }

        // Audit Log entry
        if ($pdo) {
            try {
                $logStmt = $pdo->prepare('
                    INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address)
                    VALUES (NULL, :action, :entity, :id, :details, :ip)
                ');
                $logStmt->execute([
                    ':action'  => $sent ? 'EMAIL_DISPATCHED' : 'EMAIL_FAILED',
                    ':entity'  => 'NOTIFICATION',
                    ':id'      => $toEmail,
                    ':details' => json_encode([
                        'subject'   => $subject,
                        'sent'      => $sent !== false,
                        'method'    => (!empty($smtpPass) ? 'SMTP' : 'MAIL_FALLBACK'),
                        'error'     => $lastError ?: null,
                        'timestamp' => date('Y-m-d H:i:s')
                    ]),
                    ':ip'      => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
                ]);
            } catch (Exception $e) {
                // Non-blocking log
            }
        }

        return $sent !== false;
    }

    /**
     * Resolve the true customer email for an order, falling back to registered account and phone lookups
     */
    public static function resolveCustomerEmail(PDO $pdo, array $order): string {
        $custEmail = !empty($order['customer_email']) ? trim($order['customer_email']) : '';
        if ((empty($custEmail) || str_ends_with(strtolower($custEmail), '@netraunnayan.com')) && !empty($order['customer_id'])) {
            $cStmt = $pdo->prepare('SELECT email FROM customers WHERE id = ?');
            $cStmt->execute([$order['customer_id']]);
            $realEmail = trim((string)$cStmt->fetchColumn());
            if (!empty($realEmail) && !str_ends_with(strtolower($realEmail), '@netraunnayan.com')) {
                return $realEmail;
            }
        }
        if ((empty($custEmail) || str_ends_with(strtolower($custEmail), '@netraunnayan.com')) && !empty($order['customer_phone'])) {
            $cleanPhone = preg_replace('/[^0-9]/', '', $order['customer_phone']);
            if (strlen($cleanPhone) >= 10) {
                $last10 = substr($cleanPhone, -10);
                $cStmt = $pdo->prepare('SELECT email FROM customers WHERE phone LIKE ? AND email IS NOT NULL AND email != "" ORDER BY id DESC LIMIT 1');
                $cStmt->execute(['%' . $last10]);
                $realEmail = trim((string)$cStmt->fetchColumn());
                if (!empty($realEmail) && !str_ends_with(strtolower($realEmail), '@netraunnayan.com')) {
                    return $realEmail;
                }
            }
        }
        return $custEmail;
    }

    /**
     * Native Socket SMTP Implementation
     */
    private static function sendViaSocketSmtp(string $host, int $port, string $user, string $pass, string $enc, string $fromEmail, string $fromName, string $toEmail, string $toName, string $subject, string $html, string &$errorOut = ''): bool {
        $timeout = 12;
        $isSsl = ($enc === 'ssl' || $port === 465);
        $connectionPrefix = $isSsl ? 'ssl://' : '';
        $context = stream_context_create([
            'ssl' => [
                'verify_peer'       => false,
                'verify_peer_name'  => false,
                'allow_self_signed' => true
            ]
        ]);

        $socket = @stream_socket_client($connectionPrefix . $host . ':' . $port, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) {
            $errorOut = "Could not connect to SMTP host {$host}:{$port} ($errstr [$errno])";
            return false;
        }

        stream_set_timeout($socket, $timeout);

        $read = function() use ($socket) {
            $response = '';
            while (!feof($socket) && ($str = fgets($socket, 515))) {
                $response .= $str;
                if (isset($str[3]) && $str[3] === ' ') break;
                if (strlen($str) < 4) break;
            }
            return $response;
        };

        $write = function(string $cmd) use ($socket) {
            fputs($socket, $cmd . "\r\n");
        };

        $res = $read();

        // EHLO
        $write('EHLO netraunnayan.local');
        $res = $read();

        // STARTTLS (for TLS mode on port 587)
        if (!$isSsl && ($enc === 'tls' || strpos($res, 'STARTTLS') !== false)) {
            $write('STARTTLS');
            $res = $read();
            if (substr($res, 0, 3) !== '220') {
                $errorOut = "STARTTLS failed: " . trim($res);
                fclose($socket);
                return false;
            }

            $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
            }
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
                $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
            }

            if (!stream_socket_enable_crypto($socket, true, $cryptoMethod)) {
                $errorOut = "TLS handshake negotiation failed.";
                fclose($socket);
                return false;
            }

            $write('EHLO netraunnayan.local');
            $res = $read();
        }

        // AUTH LOGIN
        $write('AUTH LOGIN');
        $res = $read();
        if (substr($res, 0, 3) !== '334') {
            $errorOut = "AUTH LOGIN rejected: " . trim($res);
            fclose($socket);
            return false;
        }

        $write(base64_encode($user));
        $res = $read();
        if (substr($res, 0, 3) !== '334') {
            $errorOut = "Username rejected: " . trim($res);
            fclose($socket);
            return false;
        }

        $write(base64_encode($pass));
        $res = $read();
        if (substr($res, 0, 3) !== '235') {
            $errorOut = "Authentication credentials failed: " . trim($res);
            fclose($socket);
            return false;
        }

        // MAIL FROM & RCPT TO
        $write("MAIL FROM: <$fromEmail>");
        $res = $read();
        if (substr($res, 0, 3) !== '250') {
            $errorOut = "MAIL FROM rejected: " . trim($res);
            fclose($socket);
            return false;
        }

        $write("RCPT TO: <$toEmail>");
        $res = $read();
        if (substr($res, 0, 3) !== '250') {
            $errorOut = "RCPT TO rejected: " . trim($res);
            fclose($socket);
            return false;
        }

        // DATA
        $write('DATA');
        $res = $read();
        if (substr($res, 0, 3) !== '354') {
            $errorOut = "DATA command rejected: " . trim($res);
            fclose($socket);
            return false;
        }

        $headers = [
            "From: $fromName <$fromEmail>",
            "To: $toName <$toEmail>",
            "Subject: $subject",
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'X-Mailer: NetraUnnayan/2.0'
        ];

        $payload = implode("\r\n", $headers) . "\r\n\r\n" . $html . "\r\n.";
        $write($payload);
        $res = $read();

        $write('QUIT');
        fclose($socket);

        $ok = (substr($res, 0, 3) === '250');
        if (!$ok) {
            $errorOut = "Email transmission error: " . trim($res);
        }
        return $ok;
    }

    // ==========================================
    // NOTIFICATION TEMPLATES
    // ==========================================

    /**
     * 1. Doctor Appointment Booking Confirmation
     */
    public static function sendAppointmentConfirmation(string $toEmail, string $toName, string $doctorName, string $date, string $time, string $customNote = ''): bool {
        $subject = "Clinic Appointment Confirmed — $doctorName";
        $customSection = !empty($customNote) ? "<div style='margin-top:20px;padding:15px;background:#E0F2FE;border-left:4px solid #00B4D8;border-radius:8px;font-size:13px;color:#0369A1;'><strong>Message from Clinic Desk:</strong><br>{$customNote}</div>" : "";

        $body = <<<HTML
        <span class="badge" style="background:#E0F2FE;color:#0369A1;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">CLINIC APPOINTMENT CONFIRMED</span>
        <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Hello {$toName},</h2>
        <p>Your ophthalmic consultation has been confirmed at our <strong>Netra Unnayan Digha Eye Care Clinic</strong>.</p>
        
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin:20px 0;">
            <div style="margin-bottom:8px;"><strong>Consulting Specialist:</strong> {$doctorName}</div>
            <div style="margin-bottom:8px;"><strong>Appointment Date:</strong> {$date}</div>
            <div style="margin-bottom:8px;"><strong>Time Slot:</strong> {$time}</div>
            <div><strong>Location:</strong> Digha Bypass Rd, Jatimati, Digha (Opp. Sea Beach bypass)</div>
        </div>

        {$customSection}

        <p style="font-size:12px;color:#64748B;margin-top:20px;">
            Please report 10 minutes prior to your slot. If you have previous spectacles or eye drops, please bring them along.
        </p>
HTML;
        return self::send($toEmail, $toName, $subject, $body);
    }

    /**
     * 2. Doctor Appointment Cancellation
     */
    public static function sendAppointmentCancellation(string $toEmail, string $toName, string $doctorName, string $date, string $reason = ''): bool {
        $subject = "Clinic Appointment Cancellation Notice — $doctorName";
        $body = <<<HTML
        <span class="badge" style="background:#FEE2E2;color:#991B1B;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">APPOINTMENT CANCELLED</span>
        <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Dear {$toName},</h2>
        <p>We regret to inform you that your appointment with <strong>{$doctorName}</strong> on <strong>{$date}</strong> has been cancelled.</p>
        
        <div style="background:#FFF5F5;border:1px solid #FED7D7;border-radius:12px;padding:15px;margin:15px 0;font-size:13px;color:#9B2C2C;">
            <strong>Reason / Remarks:</strong> {$reason}
        </div>

        <p>To reschedule your consultation or speak with our optometrist desk, please call us at <strong>+91 9382293614</strong> or rebook online.</p>
HTML;
        return self::send($toEmail, $toName, $subject, $body);
    }

    /**
     * 3. Home Eye Checkup Booking Confirmation
     */
    public static function sendHomeEyeBookingConfirmation(string $toEmail, string $toName, string $bookingNum, string $date, string $slot, string $fee, string $customNote = ''): bool {
        $subject = "Doorstep Home Eye Test Confirmed — Booking #$bookingNum";
        $customSection = !empty($customNote) ? "<div style='margin-top:15px;padding:12px;background:#F0FDF4;border-left:4px solid #10B981;border-radius:6px;font-size:13px;color:#065F46;'><strong>Staff Note:</strong> {$customNote}</div>" : "";

        $body = <<<HTML
        <span class="badge" style="background:#DCFCE7;color:#166534;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">HOME EYE TEST CONFIRMED</span>
        <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Hello {$toName},</h2>
        <p>Your certified optometrist doorstep visit is confirmed. Our specialist will arrive with diagnostic equipment and 100+ optical frames for live trial.</p>
        
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin:15px 0;">
            <div style="margin-bottom:8px;"><strong>Booking Reference:</strong> {$bookingNum}</div>
            <div style="margin-bottom:8px;"><strong>Visit Date:</strong> {$date}</div>
            <div style="margin-bottom:8px;"><strong>Arrival Slot:</strong> {$slot}</div>
            <div><strong>Fee:</strong> ₹{$fee} (Pay on visit via Cash or UPI)</div>
        </div>

        {$customSection}
HTML;
        return self::send($toEmail, $toName, $subject, $body);
    }

    /**
     * 4. Courier Shipping & Logistics Update
     */
    public static function sendOrderShippingUpdate(string $toEmail, string $toName, string $orderNum, string $courierName, string $awbTracking, string $trackingUrl): bool {
        $subject = "Eyewear Dispatched via $courierName — Order #$orderNum";
        $body = <<<HTML
        <span class="badge" style="background:#E0F2FE;color:#0369A1;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">ORDER DISPATCHED</span>
        <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Hello {$toName},</h2>
        <p>Great news! Your custom optical frame and lenses have passed optical lab quality inspection and have been handed over to our courier partner.</p>
        
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin:20px 0;">
            <div style="margin-bottom:8px;"><strong>Order ID:</strong> #{$orderNum}</div>
            <div style="margin-bottom:8px;"><strong>Courier Partner:</strong> {$courierName}</div>
            <div style="margin-bottom:8px;"><strong>AWB Tracking Number:</strong> <code style="font-size:14px;color:#0077B6;">{$awbTracking}</code></div>
        </div>

        <a href="{$trackingUrl}" target="_blank" style="display:inline-block;background:#00B4D8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:13px;">
            Track Consignment Live &rarr;
        </a>
HTML;
        return self::send($toEmail, $toName, $subject, $body);
    }

    /**
     * 5. Password Reset OTP / Link
     */
    public static function sendPasswordReset(string $toEmail, string $toName, string $otp, string $resetUrl): bool {
        $subject = "Netra Unnayan Password Reset OTP: $otp";
        $body = <<<HTML
        <span class="badge" style="background:#FEF3C7;color:#92400E;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">PASSWORD RESET REQUEST</span>
        <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Hello {$toName},</h2>
        <p>We received a request to reset your password for your Netra Unnayan optical account.</p>
        
        <div style="text-align:center;margin:25px 0;">
            <div style="display:inline-block;font-size:28px;font-weight:800;letter-spacing:6px;background:#0F2A4A;color:#00B4D8;padding:12px 30px;border-radius:12px;">
                {$otp}
            </div>
            <div style="font-size:11px;color:#64748B;margin-top:8px;">Valid for 15 minutes. Do not share this code.</div>
        </div>

        <p style="font-size:12px;color:#64748B;">If you did not request a password reset, you can safely ignore this email.</p>
HTML;
        return self::send($toEmail, $toName, $subject, $body);
    }

    /**
     * 6. Order Placement & Invoice Summary Confirmation
     */
    public static function sendOrderConfirmation(string $toEmail, string $toName, string $orderNum, array $orderItems, float $totalAmount, string $paymentMethod, string $shippingAddress): bool {
        $subject = "Order Confirmed & Invoice Summary — #$orderNum";
        
        $itemRows = '';
        foreach ($orderItems as $item) {
            $name = htmlspecialchars($item['name'] ?? 'Optical Eyewear');
            $qty = (int)($item['quantity'] ?? 1);
            $price = number_format((float)($item['price'] ?? 0), 2);
            $sub = number_format($qty * (float)($item['price'] ?? 0), 2);
            $itemRows .= "<tr>
                <td style='padding:8px;border-bottom:1px solid #E2E8F0;font-size:13px;'><strong>{$name}</strong></td>
                <td style='padding:8px;border-bottom:1px solid #E2E8F0;font-size:13px;text-align:center;'>{$qty}</td>
                <td style='padding:8px;border-bottom:1px solid #E2E8F0;font-size:13px;text-align:right;'>₹{$price}</td>
                <td style='padding:8px;border-bottom:1px solid #E2E8F0;font-size:13px;text-align:right;'>₹{$sub}</td>
            </tr>";
        }
        $formattedTotal = number_format($totalAmount, 2);

        $body = <<<HTML
        <span class="badge" style="background:#DCFCE7;color:#166534;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">ORDER PLACED &bull; INVOICE CONFIRMED</span>
        <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Thank you for your order, {$toName}!</h2>
        <p>Your order <strong>#{$orderNum}</strong> has been received and is being processed in our certified optical lab.</p>
        
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <thead>
                <tr style="background:#F1F5F9;color:#334155;font-size:12px;text-transform:uppercase;">
                    <th style="padding:8px;text-align:left;">Item</th>
                    <th style="padding:8px;text-align:center;">Qty</th>
                    <th style="padding:8px;text-align:right;">Price</th>
                    <th style="padding:8px;text-align:right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                {$itemRows}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="padding:12px 8px;font-weight:bold;text-align:right;font-size:14px;">Total Paid / Payable:</td>
                    <td style="padding:12px 8px;font-weight:bold;text-align:right;color:#00B4D8;font-size:16px;">₹{$formattedTotal}</td>
                </tr>
            </tfoot>
        </table>

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:15px;margin-bottom:15px;font-size:13px;">
            <div style="margin-bottom:6px;"><strong>Payment Method:</strong> {$paymentMethod}</div>
            <div><strong>Delivery Address:</strong> {$shippingAddress}</div>
        </div>
        <p style="font-size:12px;color:#64748B;">You can track your prescription frame assembly and dispatch live at <a href="https://netraunnayan.com/track-order" style="color:#00B4D8;">netraunnayan.com/track-order</a>.</p>
HTML;
        return self::send($toEmail, $toName, $subject, $body);
    }

    /**
     * 7. Order Cancellation Notice
     */
    public static function sendOrderCancellation(string $toEmail, string $toName, string $orderNum, string $reason, float $refundAmount = 0): bool {
        $subject = "Order #$orderNum Cancelled — Netra Unnayan";
        $refundNotice = $refundAmount > 0 ? "<div style='margin-top:12px;padding:12px;background:#F0FDF4;border-radius:8px;font-size:13px;color:#166534;'><strong>Refund Initiated:</strong> ₹" . number_format($refundAmount, 2) . " will be credited back to your original payment method within 3-5 business days.</div>" : "";

        $body = <<<HTML
        <span class="badge" style="background:#FEE2E2;color:#991B1B;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">ORDER CANCELLED</span>
        <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Hello {$toName},</h2>
        <p>This is to confirm that your order <strong>#{$orderNum}</strong> has been cancelled.</p>
        
        <div style="background:#FFF5F5;border:1px solid #FED7D7;border-radius:12px;padding:15px;margin:15px 0;font-size:13px;color:#9B2C2C;">
            <strong>Reason for Cancellation:</strong> {$reason}
        </div>
        {$refundNotice}
        <p style="font-size:12px;color:#64748B;margin-top:15px;">If you have any questions or cancelled by mistake, our support desk is available on WhatsApp at <strong>+91 9382293614</strong>.</p>
HTML;
        return self::send($toEmail, $toName, $subject, $body);
    }

    /**
     * 8. Order Return & Refund Status Update
     */
    public static function sendOrderReturn(string $toEmail, string $toName, string $orderNum, string $reason, string $returnStatus): bool {
        $subject = "Return Request Update for Order #$orderNum — $returnStatus";
        $body = <<<HTML
        <span class="badge" style="background:#FEF3C7;color:#92400E;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">RETURN STATUS: {$returnStatus}</span>
        <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Hello {$toName},</h2>
        <p>Your return request for order <strong>#{$orderNum}</strong> has been updated to: <strong>{$returnStatus}</strong>.</p>
        
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:15px;margin:15px 0;font-size:13px;">
            <div style="margin-bottom:6px;"><strong>Order Reference:</strong> #{$orderNum}</div>
            <div style="margin-bottom:6px;"><strong>Status:</strong> {$returnStatus}</div>
            <div><strong>Reason Stated:</strong> {$reason}</div>
        </div>
        <p style="font-size:12px;color:#64748B;">Our quality inspection team ensures hassle-free replacements or refunds as per our 14-day frame policy.</p>
HTML;
        return self::send($toEmail, $toName, $subject, $body);
    }

    /**
     * 9. Home Eye Test Cancellation Notice
     */
    public static function sendHomeEyeCancellation(string $toEmail, string $toName, string $bookingNum, string $reason): bool {
        $subject = "Home Eye Test Cancelled — Booking #$bookingNum";
        $body = <<<HTML
        <span class="badge" style="background:#FEE2E2;color:#991B1B;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">HOME VISIT CANCELLED</span>
        <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Hello {$toName},</h2>
        <p>Your doorstep home eye checkup appointment <strong>#{$bookingNum}</strong> has been cancelled.</p>
        
        <div style="background:#FFF5F5;border:1px solid #FED7D7;border-radius:12px;padding:15px;margin:15px 0;font-size:13px;color:#9B2C2C;">
            <strong>Cancellation Reason:</strong> {$reason}
        </div>
        <p>You may reschedule another home visit slot anytime at <a href="https://netraunnayan.com/home-eye-checkup" style="color:#00B4D8;">netraunnayan.com/home-eye-checkup</a>.</p>
HTML;
        return self::send($toEmail, $toName, $subject, $body);
    }

    /**
     * 10. Custom Staff Message
     */
    public static function sendCustomStaffMessage(string $toEmail, string $toName, string $subject, string $messageText, string $staffName = 'Netra Unnayan Clinical Desk'): bool {
        $body = <<<HTML
        <span class="badge" style="background:#E0F2FE;color:#0369A1;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;">CLINIC COMMUNICATION</span>
        <h2 style="color:#0A192F;font-size:20px;margin-top:10px;">Hello {$toName},</h2>
        
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin:20px 0;line-height:1.7;color:#334155;font-size:14px;white-space:pre-wrap;">{$messageText}</div>

        <p style="font-size:12px;color:#64748B;margin-top:20px;">
            Sent by: <strong>{$staffName}</strong> &bull; Netra Unnayan Digha Eye Care Clinic
        </p>
HTML;
        return self::send($toEmail, $toName, $subject, $body);
    }

    private static function wrapWithBrandTemplate(string $title, string $contentHtml): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{$title}</title>
    <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F6F9; margin: 0; padding: 20px; color: #1E293B; }
        .wrapper { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(11,25,44,0.08); border: 1px solid #E2E8F0; }
        .header { background: linear-gradient(135deg, #0A192F 0%, #0F2A4A 100%); padding: 30px 20px; text-align: center; border-bottom: 3px solid #00B4D8; }
        .logo-text { font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: 1.5px; margin: 0; }
        .tagline { color: #00B4D8; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; margin-top: 5px; }
        .body-card { padding: 35px 30px; line-height: 1.6; }
        .footer { background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px; text-align: center; font-size: 12px; color: #64748B; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1 class="logo-text">NETRA UNNAYAN</h1>
            <div class="tagline">Clarity You Can Trust &bull; Optical &amp; Eye Care</div>
        </div>
        <div class="body-card">
            {$contentHtml}
        </div>
        <div class="footer">
            <strong>Netra Unnayan Opticals</strong> &bull; Digha Bypass Rd, Jatimati, Digha, West Bengal 721428<br>
            Phone / WhatsApp: +91 9382293614 &bull; Email: netraunnayan7@gmail.com
        </div>
    </div>
</body>
</html>
HTML;
    }
}
