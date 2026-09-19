<?php
// Netra Unnayan - Public Active Theme API
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

try {
    $pdo = Database::getConnection();

    // 1. Fetch global theme controls from settings
    $settingsStmt = $pdo->query("
        SELECT setting_key, setting_value 
        FROM settings 
        WHERE setting_key IN ('active_theme', 'theme_force_safe_mode', 'auto_theme_scheduling')
    ");
    $globalSettings = [];
    while ($row = $settingsStmt->fetch()) {
        $globalSettings[$row['setting_key']] = $row['setting_value'];
    }

    $activeSlug = $globalSettings['active_theme'] ?? 'default';
    $safeMode = ($globalSettings['theme_force_safe_mode'] ?? '0') === '1';
    $autoScheduling = ($globalSettings['auto_theme_scheduling'] ?? '1') === '1';
    $scheduledThemeSlug = null;

    // 2. Check automated theme scheduling if enabled
    if ($autoScheduling) {
        $now = date('Y-m-d H:i:s');
        $schedStmt = $pdo->prepare("
            SELECT t.slug 
            FROM theme_schedules s
            JOIN themes t ON s.theme_id = t.id
            WHERE s.auto_activate = 1 
              AND s.start_date <= ? 
              AND s.end_date >= ?
              AND t.status != 'DISABLED'
            ORDER BY t.priority DESC, s.start_date DESC
            LIMIT 1
        ");
        $schedStmt->execute([$now, $now]);
        $scheduledRow = $schedStmt->fetch();
        if ($scheduledRow && !empty($scheduledRow['slug'])) {
            $scheduledThemeSlug = $scheduledRow['slug'];
            // If active_theme is default or scheduled, let schedule decide
            if ($activeSlug === 'default' || empty($activeSlug)) {
                $activeSlug = $scheduledThemeSlug;
            }
        }
    }

    // 3. Fetch active theme full profile
    $themeStmt = $pdo->prepare("
        SELECT id, slug, name, description, type, status, is_system, priority
        FROM themes
        WHERE slug = ?
    ");
    $themeStmt->execute([$activeSlug]);
    $theme = $themeStmt->fetch();

    // Fallback to default if not found
    if (!$theme) {
        $themeStmt->execute(['default']);
        $theme = $themeStmt->fetch();
        $activeSlug = 'default';
    }

    if (!$theme) {
        Response::error('No theme configured', 404);
    }

    $themeId = (int)$theme['id'];

    // 4. Fetch theme visual settings
    $setStmt = $pdo->prepare("SELECT * FROM theme_settings WHERE theme_id = ?");
    $setStmt->execute([$themeId]);
    $themeSettings = $setStmt->fetch() ?: [];

    // If Safe Mode is enabled, force-disable all decorative animations & particles
    if ($safeMode) {
        $themeSettings['particles_enabled'] = 0;
        $themeSettings['decorations_enabled'] = 0;
        $themeSettings['kash_flowers_enabled'] = 0;
        $themeSettings['diyas_enabled'] = 0;
        $themeSettings['snow_enabled'] = 0;
        $themeSettings['petals_enabled'] = 0;
        $themeSettings['rain_enabled'] = 0;
        $themeSettings['santa_enabled'] = 0;
        $themeSettings['chakra_enabled'] = 0;
        $themeSettings['animation_intensity'] = 'subtle';
        $themeSettings['animation_speed'] = 0.5;
    }

    // 5. Fetch multilingual content (both 'en' and 'bn')
    $contentStmt = $pdo->prepare("SELECT * FROM theme_content WHERE theme_id = ?");
    $contentStmt->execute([$themeId]);
    $contentRows = $contentStmt->fetchAll();
    $content = ['en' => [], 'bn' => []];
    foreach ($contentRows as $row) {
        $lang = $row['lang'];
        unset($row['id'], $row['theme_id'], $row['lang']);
        $content[$lang] = $row;
    }

    Response::success([
        'theme' => $theme,
        'settings' => $themeSettings,
        'content' => $content,
        'safe_mode' => $safeMode,
        'is_scheduled' => !empty($scheduledThemeSlug) && $activeSlug === $scheduledThemeSlug,
        'auto_scheduling' => $autoScheduling
    ], 'Active theme loaded');

} catch (Exception $e) {
    // Fail-safe graceful fallback for public storefront
    Response::error('Theme engine fallback: ' . $e->getMessage(), 500);
}
