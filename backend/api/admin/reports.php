<?php
// Netra Unnayan - Admin Financial, Optical & Staff Sales Intelligence Reports API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

$admin = requireAdminAuth();
$pdo = Database::getConnection();

// Gracefully ensure created_by_admin_id exists on invoices & orders tables
try {
    $pdo->exec("ALTER TABLE invoices ADD COLUMN created_by_admin_id INT NULL AFTER payment_status");
} catch (Exception $e) {}
try {
    $pdo->exec("ALTER TABLE orders ADD COLUMN created_by_admin_id INT NULL AFTER is_offline_bill");
} catch (Exception $e) {}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

$range = strtolower(trim($_GET['range'] ?? 'month')); // 'today', 'week', 'month', 'year', 'custom'
$startDate = trim($_GET['start_date'] ?? '');
$endDate = trim($_GET['end_date'] ?? '');

// Build date WHERE clause
$orderDateClause = '1=1';
$orderParams = [];

if ($range === 'today') {
    $orderDateClause = 'DATE(o.created_at) = CURDATE()';
} elseif ($range === 'week') {
    $orderDateClause = 'o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
} elseif ($range === 'month') {
    $orderDateClause = 'o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
} elseif ($range === 'year') {
    $orderDateClause = 'o.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
} elseif ($range === 'custom' && !empty($startDate) && !empty($endDate)) {
    $orderDateClause = 'DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?';
    $orderParams = [$startDate, $endDate];
} else {
    // Default 30 days
    $orderDateClause = 'o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
}

// 1. Core Summary Metrics
$summaryStmt = $pdo->prepare("
    SELECT 
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as gross_revenue,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value,
        SUM(CASE WHEN o.is_offline_bill = 1 OR o.order_type = 'POS' OR o.payment_mode IN ('CASH', 'CARD') THEN 1 ELSE 0 END) as pos_orders_count,
        COALESCE(SUM(CASE WHEN o.is_offline_bill = 1 OR o.order_type = 'POS' OR o.payment_mode IN ('CASH', 'CARD') THEN o.total_amount ELSE 0 END), 0) as pos_revenue,
        SUM(CASE WHEN o.is_offline_bill = 0 AND o.payment_mode = 'UPI' THEN 1 ELSE 0 END) as online_upi_orders_count,
        COALESCE(SUM(CASE WHEN o.is_offline_bill = 0 AND o.payment_mode = 'UPI' THEN o.total_amount ELSE 0 END), 0) as online_upi_revenue,
        SUM(CASE WHEN o.is_offline_bill = 0 AND o.payment_mode = 'COD' THEN 1 ELSE 0 END) as cod_orders_count,
        COALESCE(SUM(CASE WHEN o.is_offline_bill = 0 AND o.payment_mode = 'COD' THEN o.total_amount ELSE 0 END), 0) as cod_revenue
    FROM orders o
    WHERE {$orderDateClause} AND o.order_status != 'Cancelled'
");
$summaryStmt->execute($orderParams);
$summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

// Units sold count
$unitsStmt = $pdo->prepare("
    SELECT COALESCE(SUM(oi.quantity), 0) as total_units_sold
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE {$orderDateClause} AND o.order_status != 'Cancelled'
");
$unitsStmt->execute($orderParams);
$totalUnitsSold = (int)($unitsStmt->fetchColumn() ?: 0);

// Clinical Appointments Count in Period
$aptDateClause = str_replace('o.created_at', 'appointment_date', $orderDateClause);
$aptStmt = $pdo->prepare("SELECT COUNT(*) FROM appointments WHERE status != 'Cancelled' AND ({$aptDateClause})");
$aptStmt->execute($orderParams);
$doctorAppointmentsCount = (int)($aptStmt->fetchColumn() ?: 0);

// Home Visits Count in Period
$homeDateClause = str_replace('o.created_at', 'service_date', $orderDateClause);
$homeStmt = $pdo->prepare("SELECT COUNT(*) FROM home_eye_appointments WHERE status != 'Cancelled' AND ({$homeDateClause})");
$homeStmt->execute($orderParams);
$homeTestsCount = (int)($homeStmt->fetchColumn() ?: 0);

// 2. Channel Breakdown
$grossRev = (float)$summary['gross_revenue'];
$channelBreakdown = [
    [
        'channel' => 'In-Store POS Counter',
        'count'   => (int)$summary['pos_orders_count'],
        'amount'  => (float)$summary['pos_revenue'],
        'percent' => $grossRev > 0 ? round(((float)$summary['pos_revenue'] / $grossRev) * 100, 1) : 0,
        'color'   => 'bg-emerald-500'
    ],
    [
        'channel' => 'Online Pre-paid UPI',
        'count'   => (int)$summary['online_upi_orders_count'],
        'amount'  => (float)$summary['online_upi_revenue'],
        'percent' => $grossRev > 0 ? round(((float)$summary['online_upi_revenue'] / $grossRev) * 100, 1) : 0,
        'color'   => 'bg-sky-500'
    ],
    [
        'channel' => 'Cash On Delivery (COD)',
        'count'   => (int)$summary['cod_orders_count'],
        'amount'  => (float)$summary['cod_revenue'],
        'percent' => $grossRev > 0 ? round(((float)$summary['cod_revenue'] / $grossRev) * 100, 1) : 0,
        'color'   => 'bg-purple-500'
    ]
];

// 3. Category Performance
$catStmt = $pdo->prepare("
    SELECT 
        COALESCE(c.name, 'Eyewear Frames') as category,
        SUM(oi.quantity) as units,
        COALESCE(SUM(oi.total_price), 0) as revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE {$orderDateClause} AND o.order_status != 'Cancelled'
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
");
$catStmt->execute($orderParams);
$categories = $catStmt->fetchAll(PDO::FETCH_ASSOC);

$categoryPerformance = [];
foreach ($categories as $cat) {
    $rev = (float)$cat['revenue'];
    $categoryPerformance[] = [
        'category' => $cat['category'],
        'units'    => (int)$cat['units'],
        'revenue'  => $rev,
        'share'    => $grossRev > 0 ? round(($rev / $grossRev) * 100, 1) : 0
    ];
}

// 4. Staff Sales & Billing Performance Ledger
$staffListStmt = $pdo->query("
    SELECT 
        a.id,
        a.full_name,
        a.username,
        a.email,
        a.phone,
        a.is_active,
        r.name as role_name,
        r.slug as role_slug
    FROM admins a
    LEFT JOIN admin_roles r ON a.role_id = r.id
    WHERE a.is_active = 1
    ORDER BY a.id ASC
");
$allStaff = $staffListStmt->fetchAll(PDO::FETCH_ASSOC);

$staffPerformance = [];

foreach ($allStaff as $stf) {
    $staffId = (int)$stf['id'];

    // Find orders created / fulfilled by this staff member
    // Fallback: If no explicit staff attached to legacy demo order, assign to primary Super Admin (ID 1)
    $staffOrderClause = "
        (
            o.created_by_admin_id = {$staffId}
            OR EXISTS (SELECT 1 FROM invoices inv WHERE inv.order_id = o.id AND inv.created_by_admin_id = {$staffId})
            OR EXISTS (SELECT 1 FROM order_status_history osh WHERE osh.order_id = o.id AND osh.updated_by_admin_id = {$staffId})
            OR EXISTS (SELECT 1 FROM payments pmt WHERE pmt.order_id = o.id AND pmt.verified_by_admin_id = {$staffId})
            " . ($staffId === 1 ? "OR (o.created_by_admin_id IS NULL AND NOT EXISTS (SELECT 1 FROM order_status_history osh2 WHERE osh2.order_id = o.id AND osh2.updated_by_admin_id IS NOT NULL AND osh2.updated_by_admin_id != 1))" : "") . "
        )
    ";

    // Staff Summary
    $staffSumStmt = $pdo->prepare("
        SELECT 
            COUNT(DISTINCT o.id) as total_bills,
            COALESCE(SUM(o.total_amount), 0) as total_sales,
            COALESCE(SUM(CASE WHEN o.payment_mode = 'CASH' THEN o.total_amount ELSE 0 END), 0) as cash_sales,
            COALESCE(SUM(CASE WHEN o.payment_mode = 'UPI' THEN o.total_amount ELSE 0 END), 0) as upi_sales,
            COALESCE(SUM(CASE WHEN o.payment_mode = 'CARD' THEN o.total_amount ELSE 0 END), 0) as card_sales,
            COALESCE(SUM(CASE WHEN o.payment_mode = 'COD' THEN o.total_amount ELSE 0 END), 0) as cod_sales
        FROM orders o
        WHERE {$orderDateClause} AND o.order_status != 'Cancelled' AND {$staffOrderClause}
    ");
    $staffSumStmt->execute($orderParams);
    $staffSum = $staffSumStmt->fetch(PDO::FETCH_ASSOC);

    // Staff Units Sold & Product Details Breakdown
    $staffProdStmt = $pdo->prepare("
        SELECT 
            COALESCE(oi.product_id, 0) as product_id,
            oi.product_name,
            COALESCE(oi.product_sku, 'NU-OPT') as product_sku,
            COALESCE(c.name, 'Eyewear') as category_name,
            SUM(oi.quantity) as units_sold,
            AVG(oi.unit_price) as avg_unit_price,
            SUM(oi.total_price) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE {$orderDateClause} AND o.order_status != 'Cancelled' AND {$staffOrderClause}
        GROUP BY oi.product_name, oi.product_sku, oi.product_id, c.name
        ORDER BY total_revenue DESC
    ");
    $staffProdStmt->execute($orderParams);
    $productsSold = $staffProdStmt->fetchAll(PDO::FETCH_ASSOC);

    $staffTotalUnits = 0;
    foreach ($productsSold as $ps) {
        $staffTotalUnits += (int)$ps['units_sold'];
    }

    // Recent Bills generated by this staff member
    $staffBillsStmt = $pdo->prepare("
        SELECT 
            o.id as order_id,
            o.order_number,
            o.customer_name,
            o.customer_phone,
            o.total_amount,
            o.payment_mode,
            o.payment_status,
            o.order_status,
            o.is_offline_bill,
            o.created_at,
            COALESCE(inv.invoice_number, CONCAT('NU-INV-', o.order_number)) as invoice_number
        FROM orders o
        LEFT JOIN invoices inv ON o.id = inv.order_id
        WHERE {$orderDateClause} AND o.order_status != 'Cancelled' AND {$staffOrderClause}
        ORDER BY o.id DESC
        LIMIT 150
    ");
    $staffBillsStmt->execute($orderParams);
    $recentBills = $staffBillsStmt->fetchAll(PDO::FETCH_ASSOC);

    $staffPerformance[] = [
        'staff_id'        => $staffId,
        'full_name'       => $stf['full_name'],
        'username'        => $stf['username'],
        'email'           => $stf['email'],
        'phone'           => $stf['phone'] ?: 'N/A',
        'role_name'       => $stf['role_name'] ?: 'Store Staff',
        'role_slug'       => $stf['role_slug'] ?: 'staff',
        'total_bills'     => (int)$staffSum['total_bills'],
        'total_sales'     => (float)$staffSum['total_sales'],
        'total_units'     => $staffTotalUnits,
        'payment_breakdown' => [
            'CASH' => (float)$staffSum['cash_sales'],
            'UPI'  => (float)$staffSum['upi_sales'],
            'CARD' => (float)$staffSum['card_sales'],
            'COD'  => (float)$staffSum['cod_sales']
        ],
        'products_sold'   => $productsSold,
        'recent_bills'    => $recentBills
    ];
}

// 5. Recent Ledger Transactions
$txStmt = $pdo->prepare("
    SELECT 
        o.id,
        o.order_number as txn_id,
        o.customer_name as customer,
        CASE 
            WHEN o.is_offline_bill = 1 THEN 'In-Store POS'
            WHEN o.payment_mode = 'UPI' THEN 'Online UPI'
            WHEN o.payment_mode = 'COD' THEN 'COD Delivery'
            ELSE o.payment_mode 
        END as mode,
        o.total_amount as amount,
        o.created_at as date,
        o.payment_status as status,
        o.order_status
    FROM orders o
    WHERE {$orderDateClause}
    ORDER BY o.id DESC
    LIMIT 20
");
$txStmt->execute($orderParams);
$recentTransactions = $txStmt->fetchAll(PDO::FETCH_ASSOC);

// 6. Daily Sales Trend (for chart)
$trendStmt = $pdo->prepare("
    SELECT 
        DATE_FORMAT(o.created_at, '%Y-%m-%d') as day_date,
        DATE_FORMAT(o.created_at, '%d %b') as day_label,
        COUNT(o.id) as orders_count,
        COALESCE(SUM(o.total_amount), 0) as daily_revenue
    FROM orders o
    WHERE {$orderDateClause} AND o.order_status != 'Cancelled'
    GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d'), DATE_FORMAT(o.created_at, '%d %b')
    ORDER BY day_date ASC
    LIMIT 30
");
$trendStmt->execute($orderParams);
$salesTrend = $trendStmt->fetchAll(PDO::FETCH_ASSOC);

Response::success([
    'time_range'           => $range,
    'start_date'           => $startDate,
    'end_date'             => $endDate,
    'stats'                => [
        'grossRevenue'        => (float)$summary['gross_revenue'],
        'totalOrders'         => (int)$summary['total_orders'],
        'avgOrderValue'       => round((float)$summary['avg_order_value'], 2),
        'totalUnitsSold'      => $totalUnitsSold,
        'doctorAppointments'  => $doctorAppointmentsCount,
        'homeTestsConducted'  => $homeTestsCount,
        'posRevenue'          => (float)$summary['pos_revenue'],
        'posOrders'           => (int)$summary['pos_orders_count']
    ],
    'channel_breakdown'    => $channelBreakdown,
    'category_performance' => $categoryPerformance,
    'staff_performance'    => $staffPerformance,
    'recent_transactions'  => $recentTransactions,
    'sales_trend'          => $salesTrend
], 'Financial intelligence and staff sales performance loaded');
