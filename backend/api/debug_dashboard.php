<?php
// Debug script for dashboard & banners
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

$pdo = Database::getConnection();

$result = [
    'hero_banners_exists' => false,
    'dashboard_steps' => []
];

// Check hero_banners
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM hero_banners");
    $result['hero_banners_exists'] = true;
    $result['hero_banners_count'] = (int)$stmt->fetchColumn();
} catch (Exception $e) {
    $result['hero_banners_error'] = $e->getMessage();
}

// Test dashboard queries one by one
$queries = [
    'todaySales' => "SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE DATE(created_at) = CURDATE() AND payment_status = 'Paid'",
    'todayOrders' => "SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()",
    'pendingOrders' => "SELECT COUNT(*) FROM orders WHERE order_status IN ('Pending', 'Payment Pending', 'Order Confirmed', 'Prescription Review')",
    'pendingPayments' => "SELECT COUNT(*) FROM payments WHERE status IN ('Pending', 'Under Verification')",
    'lowStockCount' => "SELECT COUNT(*) FROM products WHERE stock_quantity <= low_stock_threshold AND is_active = 1",
    'todayAppointments' => "SELECT COUNT(*) FROM appointments WHERE appointment_date = CURDATE() AND status != 'Cancelled'",
    'todayHomeVisits' => "SELECT COUNT(*) FROM home_eye_appointments WHERE service_date = CURDATE() AND status != 'Cancelled'",
    'salesTrend' => "SELECT DATE(created_at) as sale_date, COUNT(id) as total_orders, COALESCE(SUM(total_amount), 0) as daily_revenue FROM orders WHERE created_at >= CURDATE() - INTERVAL 7 DAY GROUP BY DATE(created_at) ORDER BY sale_date ASC",
    'paymentBreakdown' => "SELECT payment_mode, COUNT(id) as count, COALESCE(SUM(total_amount), 0) as total FROM orders GROUP BY payment_mode",
    'lowStockProducts' => "SELECT id, name, sku, stock_quantity, low_stock_threshold, price, discount_price FROM products WHERE stock_quantity <= low_stock_threshold AND is_active = 1 ORDER BY stock_quantity ASC LIMIT 6",
    'recentOrders' => "SELECT id, order_number, order_type, customer_name, customer_phone, total_amount, payment_mode, payment_status, order_status, created_at, courier_name, tracking_number FROM orders ORDER BY id DESC LIMIT 8",
    'todayAppointmentsList' => "SELECT a.*, d.name as doctor_name, d.specialization FROM appointments a JOIN doctors d ON a.doctor_id = d.id WHERE a.appointment_date = CURDATE() AND a.status != 'Cancelled' ORDER BY a.appointment_time ASC LIMIT 6",
    'pendingPaymentsQueue' => "SELECT p.*, o.order_number, o.customer_name, o.customer_phone FROM payments p LEFT JOIN orders o ON p.order_id = o.id WHERE p.status IN ('Pending', 'Under Verification') ORDER BY p.id DESC LIMIT 5",
    'pendingBookingsQueue' => "SELECT 'doctor' as booking_type, a.id, a.appointment_number as reference_number, a.patient_name as customer_name, a.patient_phone as customer_phone, a.appointment_date as scheduled_date, a.appointment_time as scheduled_slot, a.status, d.name as title_info FROM appointments a LEFT JOIN doctors d ON a.doctor_id = d.id WHERE a.status = 'Pending' UNION ALL SELECT 'home_eye' as booking_type, h.id, h.booking_number as reference_number, h.customer_name, h.customer_phone, h.service_date as scheduled_date, h.service_slot as scheduled_slot, h.status, CONCAT(h.address_line1, ', PIN: ', h.pincode) as title_info FROM home_eye_appointments h WHERE h.status = 'Pending' ORDER BY scheduled_date ASC LIMIT 6"
];

foreach ($queries as $name => $sql) {
    try {
        $stmt = $pdo->query($sql);
        $result['dashboard_steps'][$name] = 'OK: ' . count($stmt->fetchAll());
    } catch (Exception $e) {
        $result['dashboard_steps'][$name] = 'ERROR: ' . $e->getMessage();
    }
}

Response::json($result);
