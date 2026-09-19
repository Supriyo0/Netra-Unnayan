<?php
// Netra Unnayan - Admin SaaS Dashboard Metrics & Analytics API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth();
$pdo = Database::getConnection();

// 1. Metric Cards
$todaySales = (float)$pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE DATE(created_at) = CURDATE() AND payment_status = 'Paid'")->fetchColumn();
$todayOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()")->fetchColumn();
$pendingOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE order_status IN ('Pending', 'Payment Pending', 'Order Confirmed', 'Prescription Review')")->fetchColumn();
$pendingPayments = (int)$pdo->query("SELECT COUNT(*) FROM payments WHERE status IN ('Pending', 'Under Verification')")->fetchColumn();
$lowStockCount = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock_quantity <= low_stock_threshold AND is_active = 1")->fetchColumn();
$todayAppointments = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE appointment_date = CURDATE() AND status != 'Cancelled'")->fetchColumn();
$todayHomeVisits = (int)$pdo->query("SELECT COUNT(*) FROM home_eye_appointments WHERE service_date = CURDATE() AND status != 'Cancelled'")->fetchColumn();
$pendingDoctorAppointments = (int)$pdo->query("SELECT COUNT(*) FROM appointments WHERE status = 'Pending'")->fetchColumn();
$pendingHomeEyeVisits = (int)$pdo->query("SELECT COUNT(*) FROM home_eye_appointments WHERE status = 'Pending'")->fetchColumn();
$pendingBookingsTotal = $pendingDoctorAppointments + $pendingHomeEyeVisits;
$pendingRefunds = (int)$pdo->query("SELECT COUNT(*) FROM refunds WHERE status = 'Pending'")->fetchColumn();
$returnRequests = (int)$pdo->query("SELECT COUNT(*) FROM returns WHERE status = 'Requested'")->fetchColumn();
$unreadMessages = 0;
try {
    $unreadMessages = (int)$pdo->query("SELECT COALESCE(SUM(unread_admin_count), 0) FROM support_conversations")->fetchColumn();
} catch (Exception $e) {}

// 2. Recent 7 Days Sales Trend
$trendStmt = $pdo->query("
    SELECT 
        DATE(created_at) as sale_date,
        COUNT(id) as total_orders,
        COALESCE(SUM(total_amount), 0) as daily_revenue
    FROM orders
    WHERE created_at >= CURDATE() - INTERVAL 7 DAY
    GROUP BY DATE(created_at)
    ORDER BY sale_date ASC
");
$salesTrend = $trendStmt->fetchAll();

// 3. Payment Methods Breakdown
$payStmt = $pdo->query("
    SELECT payment_mode, COUNT(id) as count, COALESCE(SUM(total_amount), 0) as total
    FROM orders
    GROUP BY payment_mode
");
$paymentBreakdown = $payStmt->fetchAll();

// 4. Low Stock Products
$lowStockStmt = $pdo->query("
    SELECT id, name, sku, stock_quantity, low_stock_threshold, price, discount_price
    FROM products
    WHERE stock_quantity <= low_stock_threshold AND is_active = 1
    ORDER BY stock_quantity ASC
    LIMIT 6
");
$lowStockProducts = $lowStockStmt->fetchAll();

// 5. Recent Orders
$recentOrders = [];
try {
    $recentOrdersStmt = $pdo->query("
        SELECT id, order_number, order_type, customer_name, customer_phone, total_amount, payment_mode, payment_status, order_status, created_at
        FROM orders
        ORDER BY id DESC
        LIMIT 8
    ");
    $recentOrders = $recentOrdersStmt->fetchAll();
} catch (Exception $e) {
    $recentOrders = [];
}

// 6. Today's Appointments
$todayAptStmt = $pdo->query("
    SELECT a.*, d.name as doctor_name, d.specialization
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.appointment_date = CURDATE() AND a.status != 'Cancelled'
    ORDER BY a.appointment_time ASC
    LIMIT 6
");
$todayAppointmentsList = $todayAptStmt->fetchAll();

// 7. Pending Payment Approvals Queue (UPI / UTR)
$pendingPaymentsStmt = $pdo->query("
    SELECT p.*, o.order_number, o.customer_name, o.customer_phone
    FROM payments p
    LEFT JOIN orders o ON p.order_id = o.id
    WHERE p.status IN ('Pending', 'Under Verification')
    ORDER BY p.id DESC
    LIMIT 5
");
$pendingPaymentsQueue = $pendingPaymentsStmt->fetchAll();

// 8. Pending Bookings Queue (Doctor Appointments + Home Visits)
$pendingBookingsStmt = $pdo->query("
    SELECT 'doctor' as booking_type, a.id, a.appointment_number as reference_number, a.patient_name as customer_name, a.patient_phone as customer_phone, a.appointment_date as scheduled_date, a.appointment_time as scheduled_slot, a.status, d.name as title_info
    FROM appointments a
    LEFT JOIN doctors d ON a.doctor_id = d.id
    WHERE a.status = 'Pending'
    UNION ALL
    SELECT 'home_eye' as booking_type, h.id, h.booking_number as reference_number, h.customer_name, h.customer_phone, h.service_date as scheduled_date, h.service_slot as scheduled_slot, h.status, CONCAT(h.address_line1, ', PIN: ', h.pincode) as title_info
    FROM home_eye_appointments h
    WHERE h.status = 'Pending'
    ORDER BY scheduled_date ASC
    LIMIT 6
");
$pendingBookingsQueue = $pendingBookingsStmt->fetchAll();

Response::success([
    'metrics' => [
        'today_sales'                => $todaySales,
        'today_orders'               => $todayOrders,
        'pending_orders'             => $pendingOrders,
        'pending_payments'           => $pendingPayments,
        'low_stock_count'            => $lowStockCount,
        'today_appointments'         => $todayAppointments,
        'today_home_visits'          => $todayHomeVisits,
        'pending_doctor_appointments'=> $pendingDoctorAppointments,
        'pending_home_visits'        => $pendingHomeEyeVisits,
        'pending_bookings_total'     => $pendingBookingsTotal,
        'pending_refunds'            => $pendingRefunds,
        'return_requests'            => $returnRequests,
        'unread_messages'            => $unreadMessages
    ],
    'sales_trend'            => $salesTrend,
    'payment_breakdown'      => $paymentBreakdown,
    'low_stock_products'     => $lowStockProducts,
    'recent_orders'          => $recentOrders,
    'today_appointments'     => $todayAppointmentsList,
    'pending_payments_queue' => $pendingPaymentsQueue,
    'pending_bookings_queue' => $pendingBookingsQueue
], 'Dashboard data loaded');
