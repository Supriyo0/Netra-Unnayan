<?php
// Netra Unnayan - Public Order Tracking & Digital Invoice Verification API
// Allows instant QR verification for digital invoices without forcing phone login
// Supports lookup by order_number OR invoice_number

require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

$orderNumber = trim($_GET['order_number'] ?? $_GET['order'] ?? $_GET['invoice'] ?? '');
$phone = trim($_GET['phone'] ?? '');

$pdo = Database::getConnection();

if (empty($orderNumber)) {
    Response::error('Please provide an order number or invoice number.', 400);
}

// Clean order number input
$searchCode = strtoupper(trim($orderNumber));

// Query order by order_number OR invoice_number
$stmt = $pdo->prepare("
    SELECT 
        o.id, o.order_number, o.order_type, o.customer_name, o.customer_email, o.customer_phone,
        o.shipping_address_line1, o.shipping_address_line2, o.shipping_city, o.shipping_state, o.shipping_pincode,
        o.subtotal, o.discount_amount, o.shipping_fee, o.tax_amount, o.total_amount,
        o.payment_mode, o.payment_status, o.order_status, o.prescription_status,
        o.can_cancel_until, o.cancelled_at, o.cancel_reason, o.created_at,
        inv.invoice_number, inv.invoice_date, inv.invoice_type
    FROM orders o
    LEFT JOIN invoices inv ON inv.order_id = o.id
    WHERE UPPER(TRIM(o.order_number)) = ? OR UPPER(TRIM(COALESCE(inv.invoice_number, ''))) = ?
    LIMIT 1
");
$stmt->execute([$searchCode, $searchCode]);
$order = $stmt->fetch();

// If not found by exact string, try LIKE search (e.g. without prefix or partial)
if (!$order) {
    $likeTerm = '%' . $searchCode . '%';
    $stmt = $pdo->prepare("
        SELECT 
            o.id, o.order_number, o.order_type, o.customer_name, o.customer_email, o.customer_phone,
            o.shipping_address_line1, o.shipping_address_line2, o.shipping_city, o.shipping_state, o.shipping_pincode,
            o.subtotal, o.discount_amount, o.shipping_fee, o.tax_amount, o.total_amount,
            o.payment_mode, o.payment_status, o.order_status, o.prescription_status,
            o.can_cancel_until, o.cancelled_at, o.cancel_reason, o.created_at,
            inv.invoice_number, inv.invoice_date, inv.invoice_type
        FROM orders o
        LEFT JOIN invoices inv ON inv.order_id = o.id
        WHERE o.order_number LIKE ? OR inv.invoice_number LIKE ?
        ORDER BY o.id DESC
        LIMIT 1
    ");
    $stmt->execute([$likeTerm, $likeTerm]);
    $order = $stmt->fetch();
}

// 2. If not found in retail orders, check DOCTOR APPOINTMENTS
if (!$order) {
    // Check if input references appointment number, ticket number, or ID
    $cleanId = preg_replace('/[^0-9]/', '', $searchCode);
    $aptStmt = $pdo->prepare("
        SELECT a.*, d.name as doctor_name, d.specialization, d.qualification, d.consultation_fee as doc_fee
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE UPPER(TRIM(a.appointment_number)) = ?
           OR UPPER(TRIM(COALESCE(a.ticket_no, ''))) = ?
           OR (a.appointment_number LIKE ?)
           OR (? != '' AND (
                (a.id = ? AND (? LIKE '%DOC%' OR ? LIKE '%APT%'))
                OR (a.ticket_no LIKE ?)
           ))
        ORDER BY a.id DESC
        LIMIT 1
    ");
    $likeTerm = '%' . $searchCode . '%';
    $likeId = '%' . $cleanId . '%';
    $aptStmt->execute([
        $searchCode,
        $searchCode,
        $likeTerm,
        $cleanId,
        (int)$cleanId,
        $searchCode,
        $searchCode,
        $likeId
    ]);
    $apt = $aptStmt->fetch();

    if ($apt) {
        $createdAtTs = strtotime($apt['created_at'] ?? 'now');
        $docFee = (float)($apt['consultation_fee'] ?: ($apt['doc_fee'] ?? 500));
        $docInvNum = 'NU/DOC/' . date('Y', $createdAtTs) . '/' . str_pad($apt['id'], 4, '0', STR_PAD_LEFT);

        $docStages = [
            'Booking Requested' => ['key' => 'placed', 'desc' => 'Appointment slot requested by patient'],
            'Clinic Confirmed'  => ['key' => 'confirmed', 'desc' => 'Appointment confirmed by Netra Unnayan clinical desk'],
            'Token Issued'      => ['key' => 'token', 'desc' => 'Consultation token active for visiting surgeon'],
            'Consultation Done' => ['key' => 'completed', 'desc' => 'Consultation & ophthalmic evaluation completed']
        ];

        $orderData = [
            'id'                     => (int)$apt['id'],
            'order_number'           => $apt['appointment_number'],
            'orderNumber'            => $apt['appointment_number'],
            'order_type'             => 'DOCTOR',
            'type'                   => 'DOCTOR',
            'is_doctor'              => true,
            'customer_id'            => (int)($apt['customer_id'] ?? 0),
            'customer_name'          => $apt['patient_name'] ?: 'Valued Patient',
            'customer_phone'         => $apt['patient_phone'] ?: '',
            'customer_email'         => $apt['patient_email'] ?: '',
            'patient_name'           => $apt['patient_name'] ?: 'Valued Patient',
            'patient_phone'          => $apt['patient_phone'] ?: '',
            'patient_email'          => $apt['patient_email'] ?: '',
            'shipping_address_line1' => 'Netra Unnayan Eye Clinic, Digha Bypass Rd',
            'shipping_address_line2' => 'Jatimati',
            'shipping_city'          => 'Digha',
            'shipping_state'         => 'West Bengal',
            'shipping_pincode'       => '721428',
            'customerAddress'        => 'Netra Unnayan Eye Clinic, Digha Bypass Rd, Jatimati, Digha — 721428',
            'subtotal'               => $docFee,
            'discount_amount'        => 0.00,
            'discountAmount'         => 0.00,
            'shipping_fee'           => 0.00,
            'shippingFee'            => 0.00,
            'tax_amount'             => 0.00,
            'total_amount'           => $docFee,
            'totalAmount'            => $docFee,
            'payment_mode'           => ($apt['payment_status'] === 'Paid') ? 'UPI' : 'CLINIC_DESK',
            'paymentMode'            => ($apt['payment_status'] === 'Paid') ? 'UPI' : 'CLINIC_DESK',
            'payment_status'         => $apt['payment_status'] ?: 'Pay at Clinic',
            'paymentStatus'          => $apt['payment_status'] ?: 'Pay at Clinic',
            'order_status'           => $apt['status'] ?: 'Confirmed',
            'status'                 => $apt['status'] ?: 'Confirmed',
            'prescription_status'    => 'Doctor Consultation',
            'can_cancel_until'       => null,
            'can_cancel'             => false,
            'created_at'             => $apt['created_at'],
            'invoice_number'         => $docInvNum,
            'invoiceNumber'          => $docInvNum,
            'invoiceDate'            => date('d M Y', strtotime($apt['appointment_date'] ?: $apt['created_at'])),
            'invoiceTime'            => $apt['appointment_time'] ?: '11:00 AM',
            'appointmentDate'        => $apt['appointment_date'],
            'appointmentTime'        => $apt['appointment_time'],
            'ticket_no'              => $apt['ticket_no'] ?: ('TKT-' . str_pad($apt['id'], 3, '0', STR_PAD_LEFT)),
            'ticketNo'               => $apt['ticket_no'] ?: ('TKT-' . str_pad($apt['id'], 3, '0', STR_PAD_LEFT)),
            'doctor_name'            => $apt['doctor_name'] ?: 'Senior Eye Surgeon',
            'doctorName'             => $apt['doctor_name'] ?: 'Senior Eye Surgeon',
            'specialization'         => $apt['specialization'] ?: 'Cataract & Comprehensive Ophthalmology',
            'doctor_specialty'       => $apt['specialization'] ?: 'Cataract & Comprehensive Ophthalmology',
            'qualification'          => $apt['qualification'] ?: 'MBBS, MS (Ophthalmology)',
            'cashier'                => 'Clinical Reception Desk',
            'warrantyNote'           => 'Official Consultation Slip & Clinical Prescription Token',
            'notes'                  => $apt['notes'] ?: 'Please report 10 minutes prior to your scheduled consultation slot at our Digha clinical facility.',
            'items'                  => [
                [
                    'id'           => 1,
                    'product_name' => 'Doctor Consultation - ' . ($apt['doctor_name'] ?: 'Senior Eye Surgeon'),
                    'details'      => 'Doctor: ' . ($apt['doctor_name'] ?: 'Senior Eye Surgeon') . ' (' . ($apt['qualification'] ?? 'MBBS, MS') . ")\nSlot: " . ($apt['appointment_date'] ?? '') . ' at ' . ($apt['appointment_time'] ?? '') . "\nVenue: Netra Unnayan Eye Clinic, Digha",
                    'product_sku'  => $apt['ticket_no'] ?: $apt['appointment_number'],
                    'quantity'     => 1,
                    'unit_price'   => $docFee,
                    'discount'     => 0.00,
                    'total_price'  => $docFee,
                    'image_url'    => '/logo_symbol.png'
                ]
            ],
            'status_history'         => [
                ['status' => 'Requested', 'note' => 'Slot requested online', 'timestamp' => $apt['created_at']],
                ['status' => $apt['status'] ?: 'Confirmed', 'note' => 'Status verified by clinical desk', 'timestamp' => $apt['created_at']]
            ],
            'timeline_stages'        => $docStages
        ];

        Response::success($orderData, 'Doctor appointment details loaded successfully');
    }
}

// 3. If not found in retail or doctor, check HOME EYE TEST APPOINTMENTS
if (!$order) {
    $cleanId = preg_replace('/[^0-9]/', '', $searchCode);
    $homeStmt = $pdo->prepare("
        SELECT h.*
        FROM home_eye_appointments h
        WHERE UPPER(TRIM(h.booking_number)) = ?
           OR UPPER(TRIM(COALESCE(h.ticket_no, ''))) = ?
           OR (h.booking_number LIKE ?)
           OR (? != '' AND (
                (h.id = ? AND (? LIKE '%HET%' OR ? LIKE '%HOME%'))
                OR (h.ticket_no LIKE ?)
           ))
        ORDER BY h.id DESC
        LIMIT 1
    ");
    $likeTerm = '%' . $searchCode . '%';
    $likeId = '%' . $cleanId . '%';
    $homeStmt->execute([
        $searchCode,
        $searchCode,
        $likeTerm,
        $cleanId,
        (int)$cleanId,
        $searchCode,
        $searchCode,
        $likeId
    ]);
    $home = $homeStmt->fetch();

    if ($home) {
        $createdAtTs = strtotime($home['created_at'] ?? 'now');
        $homeFee = (float)($home['service_fee'] ?: 299.00);
        $homeInvNum = 'NU/HET/' . date('Y', $createdAtTs) . '/' . str_pad($home['id'], 4, '0', STR_PAD_LEFT);
        $custAddr = trim(($home['address_line1'] ?? '') . ' ' . ($home['address_line2'] ?? '') . ', ' . ($home['landmark'] ?? '') . ', PIN ' . ($home['pincode'] ?? ''));

        $homeStages = [
            'Booking Confirmed'   => ['key' => 'placed', 'desc' => 'Doorstep vision checkup requested'],
            'Optometrist Assigned'=> ['key' => 'assigned', 'desc' => 'Certified optometrist assigned with mobile kit'],
            'Kit Dispatched'      => ['key' => 'dispatched', 'desc' => 'Optometrist en route with 100+ frames & autorefractor'],
            'Checkup Completed'   => ['key' => 'completed', 'desc' => 'Vision test completed & prescription issued']
        ];

        $orderData = [
            'id'                     => (int)$home['id'],
            'order_number'           => $home['booking_number'],
            'orderNumber'            => $home['booking_number'],
            'order_type'             => 'HOME_EYE',
            'type'                   => 'HOME_EYE',
            'is_home_eye'            => true,
            'customer_id'            => (int)($home['customer_id'] ?? 0),
            'customer_name'          => $home['customer_name'] ?: 'Valued Customer',
            'customer_phone'         => $home['customer_phone'] ?: '',
            'customer_email'         => $home['customer_email'] ?: '',
            'shipping_address_line1' => $home['address_line1'] ?: '',
            'shipping_address_line2' => $home['address_line2'] ?: '',
            'shipping_city'          => $home['landmark'] ?: 'Digha Area',
            'shipping_state'         => 'West Bengal',
            'shipping_pincode'       => $home['pincode'] ?: '',
            'customerAddress'        => $custAddr ?: 'Doorstep Service Address',
            'subtotal'               => $homeFee,
            'discount_amount'        => 0.00,
            'discountAmount'         => 0.00,
            'shipping_fee'           => 0.00,
            'shippingFee'            => 0.00,
            'tax_amount'             => 0.00,
            'total_amount'           => $homeFee,
            'totalAmount'            => $homeFee,
            'payment_mode'           => ($home['payment_status'] === 'Paid') ? 'UPI' : 'DOORSTEP_COD',
            'paymentMode'            => ($home['payment_status'] === 'Paid') ? 'UPI' : 'DOORSTEP_COD',
            'payment_status'         => $home['payment_status'] ?: 'Pay on Visit',
            'paymentStatus'          => $home['payment_status'] ?: 'Pay on Visit',
            'order_status'           => $home['status'] ?: 'Confirmed',
            'status'                 => $home['status'] ?: 'Confirmed',
            'prescription_status'    => 'Doorstep Clinical Test',
            'can_cancel_until'       => $home['can_cancel_until'] ?? null,
            'can_cancel'             => !empty($home['can_cancel_until']) && (strtotime($home['can_cancel_until']) > time()),
            'created_at'             => $home['created_at'],
            'invoice_number'         => $homeInvNum,
            'invoiceNumber'          => $homeInvNum,
            'invoiceDate'            => date('d M Y', strtotime($home['service_date'] ?: $home['created_at'])),
            'invoiceTime'            => $home['service_slot'] ?: '10:00 AM - 01:00 PM',
            'service_date'           => $home['service_date'],
            'service_slot'           => $home['service_slot'],
            'time_slot'              => $home['service_slot'],
            'ticket_no'              => $home['ticket_no'] ?: ('HET-' . str_pad($home['id'], 3, '0', STR_PAD_LEFT)),
            'ticketNo'               => $home['ticket_no'] ?: ('HET-' . str_pad($home['id'], 3, '0', STR_PAD_LEFT)),
            'cashier'                => 'Mobile Dispatch Coordinator',
            'warrantyNote'           => 'Doorstep Optometry Exam & 100+ Frame Trial',
            'notes'                  => $home['notes'] ?: 'Our certified optometrist will bring 100+ trial frames and digital autorefractor directly to your doorstep.',
            'items'                  => [
                [
                    'id'           => 1,
                    'product_name' => 'Doorstep Home Eye Checkup Service',
                    'details'      => 'Scheduled Slot: ' . ($home['service_date'] ?? '') . ' (' . ($home['service_slot'] ?? '') . ")\nAddress: " . $custAddr,
                    'product_sku'  => $home['ticket_no'] ?: $home['booking_number'],
                    'quantity'     => 1,
                    'unit_price'   => $homeFee,
                    'discount'     => 0.00,
                    'total_price'  => $homeFee,
                    'image_url'    => '/logo_symbol.png'
                ]
            ],
            'status_history'         => [
                ['status' => 'Requested', 'note' => 'Doorstep visit requested', 'timestamp' => $home['created_at']],
                ['status' => $home['status'] ?: 'Confirmed', 'note' => 'Visit confirmed by dispatch desk', 'timestamp' => $home['created_at']]
            ],
            'timeline_stages'        => $homeStages
        ];

        Response::success($orderData, 'Home eye checkup details loaded successfully');
    }
}

if (!$order) {
    Response::notFound('Order or invoice not found. Please verify the order number.');
}

// Fetch order items
$itemStmt = $pdo->prepare('
    SELECT oi.*, p.slug as product_slug,
           COALESCE(
               (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC LIMIT 1),
               "/logo_symbol.png"
           ) as product_image
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
');
$itemStmt->execute([$order['id']]);
$rawItems = $itemStmt->fetchAll();

$formattedItems = [];
foreach ($rawItems as $it) {
    $formattedItems[] = [
        'id'           => (int)$it['id'],
        'product_id'   => (int)($it['product_id'] ?? 0),
        'product_name' => $it['product_name'] ?? 'Optical Eyewear',
        'product_sku'  => $it['product_sku'] ?? '',
        'unit_price'   => (float)($it['unit_price'] ?? 0.00),
        'quantity'     => (int)($it['quantity'] ?? 1),
        'lens_type'    => $it['lens_type'] ?? null,
        'lens_price'   => (float)($it['lens_price'] ?? 0.00),
        'total_price'  => (float)($it['total_price'] ?? 0.00),
        'discount'     => 0.00,
        'image_url'    => $it['product_image'] ?? '/logo_symbol.png'
    ];
}
$order['items'] = $formattedItems;

// Fetch prescription details if linked
$rxStmt = $pdo->prepare('
    SELECT id, status, submission_method, rx_image_url, admin_notes,
           right_sph, right_cyl, right_axis, right_add, right_pd,
           left_sph, left_cyl, left_axis, left_add, left_pd, single_pd
    FROM order_prescriptions
    WHERE order_id = ?
    ORDER BY id DESC LIMIT 1
');
$rxStmt->execute([$order['id']]);
$rxData = $rxStmt->fetch();
if ($rxData) {
    $order['rx'] = [
        'id'                => (int)$rxData['id'],
        'status'            => $rxData['status'] ?? 'Pending Review',
        'submission_method' => $rxData['submission_method'] ?? 'FORM',
        'rx_image_url'      => $rxData['rx_image_url'] ?? null,
        'admin_notes'       => $rxData['admin_notes'] ?? null,
        'right_sph'         => $rxData['right_sph'] !== null ? sprintf("%+.2f", $rxData['right_sph']) : '-1.50',
        'right_cyl'         => $rxData['right_cyl'] !== null ? sprintf("%+.2f", $rxData['right_cyl']) : '-0.75',
        'right_axis'        => $rxData['right_axis'] !== null ? (string)$rxData['right_axis'] : '180',
        'right_add'         => $rxData['right_add'] !== null ? sprintf("%+.2f", $rxData['right_add']) : '+1.00',
        'left_sph'          => $rxData['left_sph'] !== null ? sprintf("%+.2f", $rxData['left_sph']) : '-1.25',
        'left_cyl'          => $rxData['left_cyl'] !== null ? sprintf("%+.2f", $rxData['left_cyl']) : '-0.50',
        'left_axis'         => $rxData['left_axis'] !== null ? (string)$rxData['left_axis'] : '170',
        'left_add'          => $rxData['left_add'] !== null ? sprintf("%+.2f", $rxData['left_add']) : '+1.00',
        'pd'                => !empty($rxData['single_pd']) ? ($rxData['single_pd'] . ' mm') : '63 mm'
    ];
}

// Fetch status history
$historyStmt = $pdo->prepare('
    SELECT old_status, new_status, note, created_at
    FROM order_status_history
    WHERE order_id = ?
    ORDER BY id ASC
');
$historyStmt->execute([$order['id']]);
$rawHistory = $historyStmt->fetchAll();

$sanitizedHistory = [];
foreach ($rawHistory as $h) {
    $sanitizedHistory[] = [
        'status'    => $h['new_status'],
        'note'      => $h['note'],
        'timestamp' => $h['created_at']
    ];
}
$order['status_history'] = $sanitizedHistory;

// Standard Optical Lifecycle Pipeline
$stages = [
    'Order Placed'          => ['key' => 'placed', 'desc' => 'Order submitted by customer'],
    'Payment Confirmed'     => ['key' => 'payment', 'desc' => 'Payment processed and verified'],
    'Prescription Review'   => ['key' => 'rx_review', 'desc' => 'Prescription verified by clinical optometrist'],
    'Prescription Approved' => ['key' => 'rx_approved', 'desc' => 'Prescription passed optical tolerances'],
    'Lens Cutting'          => ['key' => 'cutting', 'desc' => 'Lens edging and laser surfacing in optical lab'],
    'Fitting'               => ['key' => 'fitting', 'desc' => 'Mounting lenses securely into frame chassis'],
    'Quality Check'         => ['key' => 'qc', 'desc' => 'Focimeter optical power and axis verification'],
    'Packed'                => ['key' => 'packed', 'desc' => 'Disinfected, sealed in hard case with microfiber cloth'],
    'Shipped'               => ['key' => 'shipped', 'desc' => 'Handed over for delivery'],
    'Out for Delivery'      => ['key' => 'out_for_delivery', 'desc' => 'Local courier en route to destination'],
    'Delivered'             => ['key' => 'delivered', 'desc' => 'Delivered to recipient']
];
$order['timeline_stages'] = $stages;

// Populate formatted fields for InvoiceModal direct rendering
$createdAtTs = strtotime($order['created_at'] ?? 'now');
$order['invoiceNumber']  = !empty($order['invoice_number']) ? $order['invoice_number'] : ('NU-INV-' . date('Ymd', $createdAtTs) . '-' . substr($order['order_number'], -6));
$order['orderNumber']    = $order['order_number'];
$order['invoiceDate']    = date('d M Y', $createdAtTs);
$order['invoiceTime']    = date('h:i A', $createdAtTs);
$order['type']           = ($order['order_type'] === 'POS_OFFLINE') ? 'POS' : 'ORDER';
$order['isGstInvoice']   = true;
$order['customerName']   = $order['customer_name'] ?: 'Valued Customer';
$order['customerPhone']  = $order['customer_phone'] ?: '';
$order['customerAddress'] = trim(($order['shipping_address_line1'] ?? '') . ' ' . ($order['shipping_address_line2'] ?? '') . ', ' . ($order['shipping_city'] ?? 'Digha') . ', ' . ($order['shipping_state'] ?? 'West Bengal') . ' ' . ($order['shipping_pincode'] ?? '721428'));
$order['paymentMode']    = strtoupper($order['payment_mode'] ?? 'UPI');
$order['paymentStatus']  = $order['payment_status'] ?? 'Paid';
$order['subtotal']       = (float)($order['subtotal'] ?? 0.00);
$order['discountAmount'] = (float)($order['discount_amount'] ?? 0.00);
$order['shippingFee']    = (float)($order['shipping_fee'] ?? 0.00);
$order['totalAmount']    = (float)($order['total_amount'] ?? 0.00);
$order['cashier']        = 'Sagar Shaoo';

// Cancellation eligibility flag
$isOffline = ($order['order_type'] === 'POS_OFFLINE' || !empty($order['is_offline_bill']));
$order['can_cancel'] = !$isOffline
    && ($order['can_cancel_until'] !== null) 
    && (strtotime($order['can_cancel_until']) > time()) 
    && !in_array($order['order_status'], ['Lens Cutting', 'Fitting', 'Quality Check', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']);

Response::success($order, 'Order details loaded successfully');
