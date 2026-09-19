<?php
// Netra Unnayan - Admin Theme Management Suite API
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

try {
    $admin = requireAdminAuth(['super_admin', 'manager', 'admin']);
    $pdo = Database::getConnection();

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'list';

        if ($action === 'list') {
            // Retrieve all themes with settings and active schedules
            $stmt = $pdo->query("
                SELECT t.*, 
                       ts.primary_color, ts.secondary_color, ts.accent_color, ts.bg_gradient_start, ts.bg_gradient_end,
                       ts.surface_color, ts.text_primary, ts.text_secondary, ts.button_bg, ts.button_text,
                       ts.particles_enabled, ts.decorations_enabled, ts.kash_flowers_enabled, ts.diyas_enabled,
                       ts.snow_enabled, ts.petals_enabled, ts.rain_enabled, ts.santa_enabled, ts.chakra_enabled,
                       s.start_date as schedule_start, s.end_date as schedule_end, s.auto_activate as schedule_auto
                FROM themes t
                LEFT JOIN theme_settings ts ON t.id = ts.theme_id
                LEFT JOIN theme_schedules s ON t.id = s.theme_id AND s.end_date >= NOW()
                ORDER BY t.priority DESC, t.id ASC
            ");
            $themes = $stmt->fetchAll();

            // Also get global settings
            $globStmt = $pdo->query("
                SELECT setting_key, setting_value 
                FROM settings 
                WHERE setting_key IN ('active_theme', 'theme_force_safe_mode', 'auto_theme_scheduling')
            ");
            $globals = [];
            while ($r = $globStmt->fetch()) {
                $globals[$r['setting_key']] = $r['setting_value'];
            }

            Response::success([
                'themes' => $themes,
                'active_theme' => $globals['active_theme'] ?? 'default',
                'safe_mode' => ($globals['theme_force_safe_mode'] ?? '0') === '1',
                'auto_scheduling' => ($globals['auto_theme_scheduling'] ?? '1') === '1'
            ], 'All themes retrieved');

        } elseif ($action === 'detail') {
            $id = (int)($_GET['id'] ?? 0);
            $slug = trim($_GET['slug'] ?? '');

            if ($id > 0) {
                $stmt = $pdo->prepare("SELECT * FROM themes WHERE id = ?");
                $stmt->execute([$id]);
            } else {
                $stmt = $pdo->prepare("SELECT * FROM themes WHERE slug = ?");
                $stmt->execute([$slug]);
            }
            $theme = $stmt->fetch();
            if (!$theme) {
                Response::error('Theme not found', 404);
            }

            $themeId = (int)$theme['id'];

            // Settings
            $sStmt = $pdo->prepare("SELECT * FROM theme_settings WHERE theme_id = ?");
            $sStmt->execute([$themeId]);
            $settings = $sStmt->fetch() ?: [];

            // Content
            $cStmt = $pdo->prepare("SELECT * FROM theme_content WHERE theme_id = ?");
            $cStmt->execute([$themeId]);
            $contentRows = $cStmt->fetchAll();
            $content = ['en' => [], 'bn' => []];
            foreach ($contentRows as $cr) {
                $content[$cr['lang']] = $cr;
            }

            // Schedule
            $scStmt = $pdo->prepare("SELECT * FROM theme_schedules WHERE theme_id = ? ORDER BY id DESC LIMIT 1");
            $scStmt->execute([$themeId]);
            $schedule = $scStmt->fetch() ?: null;

            Response::success([
                'theme' => $theme,
                'settings' => $settings,
                'content' => $content,
                'schedule' => $schedule
            ], 'Theme details retrieved');
        }

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $input['action'] ?? '';

        if ($action === 'activate') {
            $slug = trim($input['slug'] ?? '');
            if (!$slug) Response::error('Theme slug required', 400);

            // 1. Update settings table unconditionally
            try {
                $pdo->prepare("
                    INSERT INTO settings (setting_key, setting_value, group_name)
                    VALUES ('active_theme', ?, 'themes')
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
                ")->execute([$slug]);
            } catch (\Throwable $e) {
                try {
                    $check = $pdo->prepare("SELECT id FROM settings WHERE setting_key = 'active_theme'");
                    $check->execute();
                    if ($check->fetch()) {
                        $pdo->prepare("UPDATE settings SET setting_value = ? WHERE setting_key = 'active_theme'")->execute([$slug]);
                    } else {
                        $pdo->prepare("INSERT INTO settings (setting_key, setting_value, group_name) VALUES ('active_theme', ?, 'themes')")->execute([$slug]);
                    }
                } catch (\Throwable $e2) {}
            }

            // 2. Update themes table if it exists
            try {
                $pdo->query("UPDATE themes SET status = 'DRAFT' WHERE status = 'ACTIVE'");
                $stmt = $pdo->prepare("UPDATE themes SET status = 'ACTIVE' WHERE slug = ?");
                $stmt->execute([$slug]);
            } catch (\Throwable $e) {}

            Response::success(['active_theme' => $slug], "Theme '{$slug}' is now live on all user devices and storefront!");

        } elseif ($action === 'toggle_safe_mode') {
            $enabled = !empty($input['enabled']) ? '1' : '0';
            $pdo->prepare("
                INSERT INTO settings (setting_key, setting_value, group_name)
                VALUES ('theme_force_safe_mode', ?, 'themes')
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            ")->execute([$enabled]);

            Response::success(['safe_mode' => $enabled === '1'], $enabled === '1' ? 'Emergency Safe Mode ENABLED: All animations and festive overlays disabled' : 'Safe Mode disabled: Standard visual effects restored');

        } elseif ($action === 'toggle_auto_scheduling') {
            $enabled = !empty($input['enabled']) ? '1' : '0';
            $pdo->prepare("
                INSERT INTO settings (setting_key, setting_value, group_name)
                VALUES ('auto_theme_scheduling', ?, 'themes')
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            ")->execute([$enabled]);

            Response::success(['auto_scheduling' => $enabled === '1'], $enabled === '1' ? 'Automated Theme Scheduling ENABLED' : 'Automated Theme Scheduling DISABLED');

        } elseif ($action === 'create') {
            $name = trim($input['name'] ?? 'New Theme');
            $slug = trim($input['slug'] ?? ('custom_' . time()));
            $desc = trim($input['description'] ?? '');
            $status = in_array($input['status'] ?? '', ['DRAFT', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED']) ? $input['status'] : 'DRAFT';

            // Insert theme
            $stmt = $pdo->prepare("INSERT INTO themes (slug, name, description, type, status, is_system, priority) VALUES (?, ?, ?, 'custom', ?, 0, 0)");
            $stmt->execute([$slug, $name, $desc, $status]);
            $themeId = (int)$pdo->lastInsertId();

            // Insert default settings
            $s = $input['settings'] ?? [];
            $pdo->prepare("
                INSERT INTO theme_settings (
                    theme_id, primary_color, secondary_color, accent_color,
                    bg_gradient_start, bg_gradient_end, surface_color,
                    text_primary, text_secondary, text_muted, heading_color,
                    border_color, button_bg, button_text, button_hover_bg,
                    particles_enabled, decorations_enabled, kash_flowers_enabled,
                    diyas_enabled, snow_enabled, petals_enabled, rain_enabled,
                    santa_enabled, chakra_enabled, animation_intensity,
                    animation_speed, loading_duration_ms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                $themeId,
                $s['primary_color'] ?? '#00B4D8',
                $s['secondary_color'] ?? '#0A192F',
                $s['accent_color'] ?? '#00F5D4',
                $s['bg_gradient_start'] ?? '#FFFFFF',
                $s['bg_gradient_end'] ?? '#F8FAFC',
                $s['surface_color'] ?? '#FFFFFF',
                $s['text_primary'] ?? '#0F172A',
                $s['text_secondary'] ?? '#334155',
                $s['text_muted'] ?? '#64748B',
                $s['heading_color'] ?? '#0F172A',
                $s['border_color'] ?? '#E2E8F0',
                $s['button_bg'] ?? '#00B4D8',
                $s['button_text'] ?? '#FFFFFF',
                $s['button_hover_bg'] ?? '#0284C7',
                !empty($s['particles_enabled']) ? 1 : 0,
                !empty($s['decorations_enabled']) ? 1 : 0,
                !empty($s['kash_flowers_enabled']) ? 1 : 0,
                !empty($s['diyas_enabled']) ? 1 : 0,
                !empty($s['snow_enabled']) ? 1 : 0,
                !empty($s['petals_enabled']) ? 1 : 0,
                !empty($s['rain_enabled']) ? 1 : 0,
                !empty($s['santa_enabled']) ? 1 : 0,
                !empty($s['chakra_enabled']) ? 1 : 0,
                $s['animation_intensity'] ?? 'balanced',
                floatval($s['animation_speed'] ?? 1.0),
                intval($s['loading_duration_ms'] ?? 2000)
            ]);

            // Insert content
            $content = $input['content'] ?? [];
            foreach (['en', 'bn'] as $lang) {
                $c = $content[$lang] ?? [];
                $pdo->prepare("
                    INSERT INTO theme_content (
                        theme_id, lang, announcement_badge, announcement_text,
                        festival_greeting, hero_title, hero_subtitle, hero_cta_text,
                        hero_cta_link, product_badge, loading_greeting, loading_tagline, footer_message
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ")->execute([
                    $themeId, $lang,
                    $c['announcement_badge'] ?? '',
                    $c['announcement_text'] ?? '',
                    $c['festival_greeting'] ?? '',
                    $c['hero_title'] ?? '',
                    $c['hero_subtitle'] ?? '',
                    $c['hero_cta_text'] ?? '',
                    $c['hero_cta_link'] ?? '/catalog',
                    $c['product_badge'] ?? '',
                    $c['loading_greeting'] ?? '',
                    $c['loading_tagline'] ?? '',
                    $c['footer_message'] ?? ''
                ]);
            }

            Response::success(['theme_id' => $themeId, 'slug' => $slug], "Theme '{$name}' created successfully!");

        } elseif ($action === 'update') {
            $themeId = (int)($input['theme_id'] ?? 0);
            if (!$themeId) Response::error('Theme ID is required for update', 400);

            // Update Theme Meta
            if (isset($input['name'])) {
                $name = trim($input['name']);
                $desc = trim($input['description'] ?? '');
                $status = in_array($input['status'] ?? '', ['DRAFT', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED']) ? $input['status'] : 'DRAFT';
                $pdo->prepare("UPDATE themes SET name = ?, description = ?, status = ? WHERE id = ?")
                    ->execute([$name, $desc, $status, $themeId]);
            }

            // Update Settings
            if (!empty($input['settings'])) {
                $s = $input['settings'];
                $pdo->prepare("
                    UPDATE theme_settings SET
                        primary_color = ?, secondary_color = ?, accent_color = ?,
                        bg_gradient_start = ?, bg_gradient_end = ?, surface_color = ?,
                        text_primary = ?, text_secondary = ?, text_muted = ?,
                        heading_color = ?, border_color = ?, button_bg = ?,
                        button_text = ?, button_hover_bg = ?, particles_enabled = ?,
                        decorations_enabled = ?, kash_flowers_enabled = ?, diyas_enabled = ?,
                        snow_enabled = ?, petals_enabled = ?, rain_enabled = ?,
                        santa_enabled = ?, chakra_enabled = ?, animation_intensity = ?,
                        animation_speed = ?, loading_duration_ms = ?
                    WHERE theme_id = ?
                ")->execute([
                    $s['primary_color'] ?? '#00B4D8',
                    $s['secondary_color'] ?? '#0A192F',
                    $s['accent_color'] ?? '#00F5D4',
                    $s['bg_gradient_start'] ?? '#FFFFFF',
                    $s['bg_gradient_end'] ?? '#F8FAFC',
                    $s['surface_color'] ?? '#FFFFFF',
                    $s['text_primary'] ?? '#0F172A',
                    $s['text_secondary'] ?? '#334155',
                    $s['text_muted'] ?? '#64748B',
                    $s['heading_color'] ?? '#0F172A',
                    $s['border_color'] ?? '#E2E8F0',
                    $s['button_bg'] ?? '#00B4D8',
                    $s['button_text'] ?? '#FFFFFF',
                    $s['button_hover_bg'] ?? '#0284C7',
                    !empty($s['particles_enabled']) ? 1 : 0,
                    !empty($s['decorations_enabled']) ? 1 : 0,
                    !empty($s['kash_flowers_enabled']) ? 1 : 0,
                    !empty($s['diyas_enabled']) ? 1 : 0,
                    !empty($s['snow_enabled']) ? 1 : 0,
                    !empty($s['petals_enabled']) ? 1 : 0,
                    !empty($s['rain_enabled']) ? 1 : 0,
                    !empty($s['santa_enabled']) ? 1 : 0,
                    !empty($s['chakra_enabled']) ? 1 : 0,
                    $s['animation_intensity'] ?? 'balanced',
                    floatval($s['animation_speed'] ?? 1.0),
                    intval($s['loading_duration_ms'] ?? 2000),
                    $themeId
                ]);
            }

            // Update Multilingual Content
            if (!empty($input['content'])) {
                foreach (['en', 'bn'] as $lang) {
                    if (isset($input['content'][$lang])) {
                        $c = $input['content'][$lang];
                        $pdo->prepare("
                            INSERT INTO theme_content (
                                theme_id, lang, announcement_badge, announcement_text,
                                festival_greeting, hero_title, hero_subtitle, hero_cta_text,
                                hero_cta_link, product_badge, loading_greeting, loading_tagline, footer_message
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                announcement_badge = VALUES(announcement_badge),
                                announcement_text = VALUES(announcement_text),
                                festival_greeting = VALUES(festival_greeting),
                                hero_title = VALUES(hero_title),
                                hero_subtitle = VALUES(hero_subtitle),
                                hero_cta_text = VALUES(hero_cta_text),
                                hero_cta_link = VALUES(hero_cta_link),
                                product_badge = VALUES(product_badge),
                                loading_greeting = VALUES(loading_greeting),
                                loading_tagline = VALUES(loading_tagline),
                                footer_message = VALUES(footer_message)
                        ")->execute([
                            $themeId, $lang,
                            $c['announcement_badge'] ?? '',
                            $c['announcement_text'] ?? '',
                            $c['festival_greeting'] ?? '',
                            $c['hero_title'] ?? '',
                            $c['hero_subtitle'] ?? '',
                            $c['hero_cta_text'] ?? '',
                            $c['hero_cta_link'] ?? '/catalog',
                            $c['product_badge'] ?? '',
                            $c['loading_greeting'] ?? '',
                            $c['loading_tagline'] ?? '',
                            $c['footer_message'] ?? ''
                        ]);
                    }
                }
            }

            // Update Schedule if provided
            if (isset($input['schedule']) && is_array($input['schedule'])) {
                $sc = $input['schedule'];
                if (!empty($sc['start_date']) && !empty($sc['end_date'])) {
                    $pdo->prepare("
                        INSERT INTO theme_schedules (theme_id, start_date, end_date, auto_activate)
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            start_date = VALUES(start_date),
                            end_date = VALUES(end_date),
                            auto_activate = VALUES(auto_activate)
                    ")->execute([
                        $themeId,
                        $sc['start_date'],
                        $sc['end_date'],
                        !empty($sc['auto_activate']) ? 1 : 0
                    ]);
                }
            }

            Response::success(['theme_id' => $themeId], 'Theme configuration updated successfully');

        } elseif ($action === 'duplicate') {
            $sourceId = (int)($input['theme_id'] ?? 0);
            if (!$sourceId) Response::error('Source Theme ID required', 400);

            $stmt = $pdo->prepare("SELECT * FROM themes WHERE id = ?");
            $stmt->execute([$sourceId]);
            $src = $stmt->fetch();
            if (!$src) Response::error('Source theme not found', 404);

            $newSlug = $src['slug'] . '_copy_' . substr(bin2hex(random_bytes(2)), 0, 4);
            $newName = $src['name'] . ' (Copy)';

            $ins = $pdo->prepare("
                INSERT INTO themes (slug, name, description, type, status, is_system, priority)
                VALUES (?, ?, ?, 'custom', 'DRAFT', 0, ?)
            ");
            $ins->execute([$newSlug, $newName, $src['description'], $src['priority']]);
            $newThemeId = (int)$pdo->lastInsertId();

            // Copy Settings
            $pdo->prepare("
                INSERT INTO theme_settings (
                    theme_id, primary_color, secondary_color, accent_color,
                    bg_gradient_start, bg_gradient_end, surface_color,
                    text_primary, text_secondary, text_muted, heading_color,
                    border_color, button_bg, button_text, button_hover_bg,
                    particles_enabled, decorations_enabled, kash_flowers_enabled,
                    diyas_enabled, snow_enabled, petals_enabled, rain_enabled,
                    santa_enabled, chakra_enabled, animation_intensity,
                    animation_speed, loading_duration_ms
                )
                SELECT ?, primary_color, secondary_color, accent_color,
                       bg_gradient_start, bg_gradient_end, surface_color,
                       text_primary, text_secondary, text_muted, heading_color,
                       border_color, button_bg, button_text, button_hover_bg,
                       particles_enabled, decorations_enabled, kash_flowers_enabled,
                       diyas_enabled, snow_enabled, petals_enabled, rain_enabled,
                       santa_enabled, chakra_enabled, animation_intensity,
                       animation_speed, loading_duration_ms
                FROM theme_settings WHERE theme_id = ?
            ")->execute([$newThemeId, $sourceId]);

            // Copy Content
            $pdo->prepare("
                INSERT INTO theme_content (
                    theme_id, lang, announcement_badge, announcement_text,
                    festival_greeting, hero_title, hero_subtitle, hero_cta_text,
                    hero_cta_link, product_badge, loading_greeting, loading_tagline, footer_message
                )
                SELECT ?, lang, announcement_badge, announcement_text,
                       festival_greeting, hero_title, hero_subtitle, hero_cta_text,
                       hero_cta_link, product_badge, loading_greeting, loading_tagline, footer_message
                FROM theme_content WHERE theme_id = ?
            ")->execute([$newThemeId, $sourceId]);

            Response::success(['new_theme_id' => $newThemeId, 'slug' => $newSlug], "Theme duplicated successfully as '{$newName}'");

        } elseif ($action === 'delete') {
            $themeId = (int)($input['theme_id'] ?? 0);
            if (!$themeId) Response::error('Theme ID required', 400);

            $stmt = $pdo->prepare("SELECT is_system, name, slug FROM themes WHERE id = ?");
            $stmt->execute([$themeId]);
            $t = $stmt->fetch();
            if (!$t) Response::error('Theme not found', 404);
            if (!empty($t['is_system'])) {
                Response::error('Built-in system themes cannot be deleted. You can deactivate or schedule them instead.', 400);
            }

            $pdo->prepare("DELETE FROM themes WHERE id = ?")->execute([$themeId]);
            Response::success(null, "Theme '{$t['name']}' deleted");
        }
    }

} catch (Exception $e) {
    Response::error('Theme API error: ' . $e->getMessage(), 500);
}
