<?php
// Netra Unnayan - Public Active Theme API (Delivered to all customer & visitor devices)
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

try {
    $pdo = Database::getConnection();

    // 1. Fetch global theme controls from settings
    $activeSlug = 'default';
    $safeMode = false;
    $autoScheduling = true;
    $scheduledThemeSlug = null;

    try {
        $settingsStmt = $pdo->query("
            SELECT setting_key, setting_value 
            FROM settings 
            WHERE setting_key IN ('active_theme', 'theme_force_safe_mode', 'auto_theme_scheduling')
        ");
        if ($settingsStmt) {
            while ($row = $settingsStmt->fetch(PDO::FETCH_ASSOC)) {
                if ($row['setting_key'] === 'active_theme' && !empty($row['setting_value'])) {
                    $activeSlug = trim($row['setting_value']);
                } elseif ($row['setting_key'] === 'theme_force_safe_mode') {
                    $safeMode = ($row['setting_value'] === '1');
                } elseif ($row['setting_key'] === 'auto_theme_scheduling') {
                    $autoScheduling = ($row['setting_value'] === '1');
                }
            }
        }
    } catch (\Throwable $e) {}

    // 2. Check automated theme scheduling if enabled
    if ($autoScheduling) {
        try {
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
            $scheduledRow = $schedStmt->fetch(PDO::FETCH_ASSOC);
            if ($scheduledRow && !empty($scheduledRow['slug'])) {
                $scheduledThemeSlug = $scheduledRow['slug'];
                // If active_theme is default, let schedule decide
                if ($activeSlug === 'default' || empty($activeSlug)) {
                    $activeSlug = $scheduledThemeSlug;
                }
            }
        } catch (\Throwable $e) {}
    }

    // 3. Fetch active theme full profile if themes table exists
    $theme = null;
    $themeSettings = [];
    $content = ['en' => [], 'bn' => []];

    try {
        $themeStmt = $pdo->prepare("
            SELECT id, slug, name, description, type, status, is_system, priority
            FROM themes
            WHERE slug = ?
            LIMIT 1
        ");
        $themeStmt->execute([$activeSlug]);
        $theme = $themeStmt->fetch(PDO::FETCH_ASSOC);

        if (!$theme) {
            $themeStmt->execute(['default']);
            $theme = $themeStmt->fetch(PDO::FETCH_ASSOC);
        }

        if ($theme && !empty($theme['id'])) {
            $themeId = (int)$theme['id'];

            // Fetch theme visual settings
            $setStmt = $pdo->prepare("SELECT * FROM theme_settings WHERE theme_id = ?");
            $setStmt->execute([$themeId]);
            $themeSettings = $setStmt->fetch(PDO::FETCH_ASSOC) ?: [];

            // Fetch multilingual content (both 'en' and 'bn')
            $contentStmt = $pdo->prepare("SELECT * FROM theme_content WHERE theme_id = ?");
            $contentStmt->execute([$themeId]);
            $contentRows = $contentStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($contentRows as $row) {
                $lang = $row['lang'];
                unset($row['id'], $row['theme_id'], $row['lang']);
                $content[$lang] = $row;
            }
        }
    } catch (\Throwable $e) {}

    // Default theme profile fallback if DB rows missing
    if (!$theme) {
        $theme = [
            'slug' => $activeSlug,
            'name' => ucwords(str_replace('_', ' ', $activeSlug)),
            'description' => 'Active Theme on Netra Unnayan Eyewear & Clinic',
            'type' => 'built-in',
            'status' => 'ACTIVE',
            'is_system' => 1,
            'priority' => 0
        ];
    }

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

    Response::success([
        'active_theme'    => $activeSlug,
        'theme'           => $theme,
        'settings'        => $themeSettings,
        'content'         => $content,
        'safe_mode'       => $safeMode,
        'is_scheduled'    => !empty($scheduledThemeSlug) && $activeSlug === $scheduledThemeSlug,
        'auto_scheduling' => $autoScheduling
    ], 'Active theme loaded');

} catch (\Throwable $e) {
    // Fail-safe graceful fallback for public storefront
    Response::success([
        'active_theme'    => 'default',
        'theme'           => ['slug' => 'default', 'name' => 'Netra Unnayan Default'],
        'settings'        => [],
        'content'         => ['en' => [], 'bn' => []],
        'safe_mode'       => false,
        'is_scheduled'    => false,
        'auto_scheduling' => false
    ], 'Active theme loaded in safe mode');
}
