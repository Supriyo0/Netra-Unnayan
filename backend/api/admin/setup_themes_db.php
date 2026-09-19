<?php
// Netra Unnayan - Database Setup & Seeder for Seasonal Theme Engine
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

try {
    $pdo = Database::getConnection();

    // 1. Create tables if not exist
    $schemaSql = file_get_contents(__DIR__ . '/../../../database/themes_schema.sql');
    if ($schemaSql) {
        $pdo->exec($schemaSql);
    }

    // 2. Define 10 Built-In Production Themes
    $builtInThemes = [
        [
            'slug' => 'default',
            'name' => 'Netra Unnayan (Sapphire & Cyan)',
            'description' => 'Official permanent theme. Minimal luxury optical white, midnight sapphire, and medical clarity.',
            'type' => 'default',
            'status' => 'ACTIVE',
            'is_system' => 1,
            'priority' => 0,
            'settings' => [
                'primary_color' => '#00B4D8',
                'secondary_color' => '#0A192F',
                'accent_color' => '#00F5D4',
                'bg_gradient_start' => '#FFFFFF',
                'bg_gradient_end' => '#F8FAFC',
                'surface_color' => '#FFFFFF',
                'text_primary' => '#0F172A',
                'text_secondary' => '#334155',
                'text_muted' => '#64748B',
                'heading_color' => '#0A192F',
                'border_color' => '#E2E8F0',
                'button_bg' => '#00B4D8',
                'button_text' => '#FFFFFF',
                'button_hover_bg' => '#0284C7',
                'particles_enabled' => 0,
                'decorations_enabled' => 0,
                'kash_flowers_enabled' => 0,
                'diyas_enabled' => 0,
                'snow_enabled' => 0,
                'petals_enabled' => 0,
                'rain_enabled' => 0,
                'santa_enabled' => 0,
                'chakra_enabled' => 0,
                'animation_intensity' => 'subtle',
                'animation_speed' => 1.0,
                'loading_duration_ms' => 1800
            ],
            'content_en' => [
                'announcement_badge' => 'OFFICIAL STORE',
                'announcement_text' => 'Welcome to Netra Unnayan • Precision Optical Eyewear & Clinic in Digha',
                'festival_greeting' => 'Clarity You Can Trust',
                'hero_title' => 'PRECISION OPTICAL EYEWEAR & CLINICAL EXCELLENCE',
                'hero_subtitle' => 'Japanese Titanium Frames, German Blue-Cut Lenses, and Digha Clinic Consultations.',
                'hero_cta_text' => 'Explore Optical Collection',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'ORIGINAL',
                'loading_greeting' => 'NETRA UNNAYAN',
                'loading_tagline' => 'CALIBRATING GERMAN OPTICAL APERTURE',
                'footer_message' => 'Crafted for Visionary Clarity • Digha, West Bengal'
            ],
            'content_bn' => [
                'announcement_badge' => 'অফিসিয়াল স্টোর',
                'announcement_text' => 'নেত্র উন্নয়ন — দিঘার বিশ্বস্ত অপটিক্যাল ও চক্ষু পরিচর্যা কেন্দ্র',
                'festival_greeting' => 'স্পষ্ট দৃষ্টি, বিশ্বস্ত প্রতিষ্ঠান',
                'hero_title' => 'স্পষ্ট দৃষ্টি ও নির্ভরযোগ্য চক্ষু সেবা',
                'hero_subtitle' => 'প্রিমিয়াম জাপানি টাইটানিয়াম ফ্রেম ও নিখুঁত জার্মান লেন্স কাটিং প্রযুক্তি।',
                'hero_cta_text' => 'চশমা কালেকশন দেখুন',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'অরিজিনাল',
                'loading_greeting' => 'নেত্র উন্নয়ন',
                'loading_tagline' => 'জার্মান প্রিসিশন অপটিক্স প্রস্তুত হচ্ছে',
                'footer_message' => 'বিশ্বস্ত দৃষ্টির অঙ্গীকার • দিঘা, পশ্চিমবঙ্গ'
            ]
        ],
        [
            'slug' => 'durga_puja',
            'name' => 'Durga Puja / Sharodotsav',
            'description' => 'Sophisticated Bengali Puja morning mood. Soft ivory, warm golden sunlight, swaying Kash flowers, and glowing diyas.',
            'type' => 'festival',
            'status' => 'DRAFT',
            'is_system' => 1,
            'priority' => 10,
            'settings' => [
                'primary_color' => '#DC2626',
                'secondary_color' => '#7F1D1D',
                'accent_color' => '#F59E0B',
                'bg_gradient_start' => '#FFFDF7',
                'bg_gradient_end' => '#FEF8EB',
                'surface_color' => '#FFFFFF',
                'text_primary' => '#1C1917',
                'text_secondary' => '#44403C',
                'text_muted' => '#78716C',
                'heading_color' => '#7F1D1D',
                'border_color' => '#FDE68A',
                'button_bg' => '#DC2626',
                'button_text' => '#FFFFFF',
                'button_hover_bg' => '#B91C1C',
                'particles_enabled' => 1,
                'decorations_enabled' => 1,
                'kash_flowers_enabled' => 1,
                'diyas_enabled' => 1,
                'snow_enabled' => 0,
                'petals_enabled' => 0,
                'rain_enabled' => 0,
                'santa_enabled' => 0,
                'chakra_enabled' => 0,
                'animation_intensity' => 'balanced',
                'animation_speed' => 1.0,
                'loading_duration_ms' => 2200
            ],
            'content_en' => [
                'announcement_badge' => 'PUJA SPECIAL',
                'announcement_text' => '✨ Shubho Sharodotsav! Celebrate with Festive Clarity & Free Home Eye Checkup in Digha',
                'festival_greeting' => 'Celebrating Sharodotsav with Festive Clarity',
                'hero_title' => 'CELEBRATE THE SEASON WITH CLEAR FESTIVE VISION',
                'hero_subtitle' => 'Discover elegant eyewear that complements your Sharodotsav celebration.',
                'hero_cta_text' => 'Explore Puja Collection',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'Pujo Special',
                'loading_greeting' => 'শুভ মহালয়া',
                'loading_tagline' => 'PREPARING YOUR FESTIVE PUJA EXPERIENCE...',
                'footer_message' => 'শুভ শারদীয়া ও শুভ বিজয়ার আন্তরিক প্রীতি ও শুভেচ্ছা • Netra Unnayan'
            ],
            'content_bn' => [
                'announcement_badge' => 'শুভ শারদীয়া',
                'announcement_text' => '✨ শুভ শারদীয়া! উৎসবের দিনগুলিতে পেয়ে যান স্পেশাল অফার ও ফ্রি আই চেকআপ • দিঘা স্টোর',
                'festival_greeting' => 'শুভ শারদীয়া ও শুভ বিজয়ার প্রীতি ও শুভেচ্ছা',
                'hero_title' => 'উৎসবের আনন্দে ভরে উঠুক দৃষ্টির স্বচ্ছতা',
                'hero_subtitle' => 'শরতের কাশফুল আর আলোর উৎসবে বেছে নিন আপনার মানানসই নতুন চশমা।',
                'hero_cta_text' => 'পুজো কালেকশন দেখুন',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'পুজো স্পেশাল',
                'loading_greeting' => 'শুভ মহালয়া',
                'loading_tagline' => 'শুভ শারদীয়া • পুজো স্পেশাল কালেকশন লোড হচ্ছে...',
                'footer_message' => 'শুভ শারদীয়া ও শুভ বিজয়ার আন্তরিক প্রীতি ও শুভেচ্ছা • নেত্র উন্নয়ন'
            ]
        ],
        [
            'slug' => 'diwali',
            'name' => 'Diwali & Festival of Lights',
            'description' => 'Luminous festival of lights. Deep midnight navy, warm shimmering gold, animated flickering diyas, and starlight particles.',
            'type' => 'festival',
            'status' => 'DRAFT',
            'is_system' => 1,
            'priority' => 10,
            'settings' => [
                'primary_color' => '#D97706',
                'secondary_color' => '#0F172A',
                'accent_color' => '#FBBF24',
                'bg_gradient_start' => '#0B1329',
                'bg_gradient_end' => '#060B18',
                'surface_color' => '#0F1E3D',
                'text_primary' => '#FFFBEB',
                'text_secondary' => '#FDE68A',
                'text_muted' => '#CBD5E1',
                'heading_color' => '#FBBF24',
                'border_color' => 'rgba(245, 158, 11, 0.35)',
                'button_bg' => '#D97706',
                'button_text' => '#0F172A',
                'button_hover_bg' => '#B45309',
                'particles_enabled' => 1,
                'decorations_enabled' => 1,
                'kash_flowers_enabled' => 0,
                'diyas_enabled' => 1,
                'snow_enabled' => 0,
                'petals_enabled' => 0,
                'rain_enabled' => 0,
                'santa_enabled' => 0,
                'chakra_enabled' => 0,
                'animation_intensity' => 'balanced',
                'animation_speed' => 1.0,
                'loading_duration_ms' => 2200
            ],
            'content_en' => [
                'announcement_badge' => 'HAPPY DIWALI',
                'announcement_text' => '🪔 Happy Diwali! Illuminate Your Life with Clear Vision & Exclusive Festive Offers',
                'festival_greeting' => 'Illuminate Your World with Perfect Vision',
                'hero_title' => 'ILLUMINATE EVERY MOMENT WITH PERFECT VISION',
                'hero_subtitle' => 'Radiant golden accents, anti-glare festive lenses, and luxury handcrafted eyewear.',
                'hero_cta_text' => 'Explore Diwali Glow',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'Diwali Edition',
                'loading_greeting' => 'HAPPY DIWALI',
                'loading_tagline' => 'LIGHTING FESTIVE DIYAS FOR RADIANT VISION...',
                'footer_message' => 'May the Festival of Lights Bring Health, Joy & Crystal-Clear Sight • Netra Unnayan'
            ],
            'content_bn' => [
                'announcement_badge' => 'শুভ দীপাবলি',
                'announcement_text' => '🪔 শুভ দীপাবলি! আলোর উৎসবে আপনার চোখ হোক আরও দীপ্তিময় ও সুরক্ষিত',
                'festival_greeting' => 'শুভ দীপাবলির আন্তরিক প্রীতি ও শুভেচ্ছা',
                'hero_title' => 'আলোর উৎসবে চোখের সুস্থতা ও নতুন রূপ',
                'hero_subtitle' => 'প্রদীপের আলোয় উজ্জ্বল দৃষ্টির জন্য অ্যান্টি-গ্লেয়ার প্রিমিয়াম লেন্স কালেকশন।',
                'hero_cta_text' => 'দীপাবলি অফার দেখুন',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'দীপাবলি স্পেশাল',
                'loading_greeting' => 'শুভ দীপাবলি',
                'loading_tagline' => 'দীপাবলির মঙ্গল প্রদীপ প্রজ্বলিত হচ্ছে...',
                'footer_message' => 'শুভ দীপাবলি ও ধনতেরাসের শুভকামনা • নেত্র উন্নয়ন দিঘা'
            ]
        ],
        [
            'slug' => 'christmas',
            'name' => 'Christmas & New Year',
            'description' => 'Magical winter wonderland. Soft falling snow, Santa in sleigh, holiday pine green, and celebratory berry red accents.',
            'type' => 'festival',
            'status' => 'DRAFT',
            'is_system' => 1,
            'priority' => 10,
            'settings' => [
                'primary_color' => '#E11D48',
                'secondary_color' => '#064E3B',
                'accent_color' => '#059669',
                'bg_gradient_start' => '#F0FDF4',
                'bg_gradient_end' => '#EFF6FF',
                'surface_color' => '#FFFFFF',
                'text_primary' => '#0F172A',
                'text_secondary' => '#334155',
                'text_muted' => '#64748B',
                'heading_color' => '#064E3B',
                'border_color' => '#CBD5E1',
                'button_bg' => '#E11D48',
                'button_text' => '#FFFFFF',
                'button_hover_bg' => '#BE123C',
                'particles_enabled' => 1,
                'decorations_enabled' => 1,
                'kash_flowers_enabled' => 0,
                'diyas_enabled' => 0,
                'snow_enabled' => 1,
                'petals_enabled' => 0,
                'rain_enabled' => 0,
                'santa_enabled' => 1,
                'chakra_enabled' => 0,
                'animation_intensity' => 'balanced',
                'animation_speed' => 1.0,
                'loading_duration_ms' => 2400
            ],
            'content_en' => [
                'announcement_badge' => 'MERRY CHRISTMAS',
                'announcement_text' => '🎄 Merry Christmas & Happy New Year! Discover Holiday Eyewear Gifts & Free Home Eye Visits',
                'festival_greeting' => 'See the Season More Clearly',
                'hero_title' => 'A SEASON OF GIVING, CLARITY & JOY',
                'hero_subtitle' => 'Celebrate the holidays with luxury winter-ready frames and crisp anti-fog optics.',
                'hero_cta_text' => 'Explore Holiday Collection',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'Holiday Gift',
                'loading_greeting' => 'MERRY CHRISTMAS',
                'loading_tagline' => 'SANTA IS DELIVERING YOUR HOLIDAY CLARITY...',
                'footer_message' => 'Merry Christmas & A Prosperous New Year from Netra Unnayan'
            ],
            'content_bn' => [
                'announcement_badge' => 'শুভ বড়দিন',
                'announcement_text' => '🎄 শুভ বড়দিন ও শুভ নববর্ষ! উৎসবের সেরা অফারে বেছে নিন পরিবারের নতুন চশমা',
                'festival_greeting' => 'শুভ বড়দিন ও আগামী নতুন বছরের শুভেচ্ছা',
                'hero_title' => 'নতুন বছরে নতুন দৃষ্টির সূচনা',
                'hero_subtitle' => 'শীতের কুয়াশামুক্ত দৃষ্টি ও প্রিমিয়াম স্টাইলিশ ফ্রেমের উৎসব উপহার।',
                'hero_cta_text' => 'হলিডে কালেকশন দেখুন',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'হলিডে স্পেশাল',
                'loading_greeting' => 'শুভ বড়দিন',
                'loading_tagline' => 'সান্তা ক্লজ আপনার অপটিক্যাল উপহার নিয়ে আসছে...',
                'footer_message' => 'শুভ বড়দিন ও সমৃদ্ধ নতুন বছরের আন্তরিক শুভেচ্ছা • নেত্র উন্নয়ন'
            ]
        ],
        [
            'slug' => 'summer',
            'name' => 'Summer Sunshine & Coastal UV400',
            'description' => 'Fresh, bright, cool and refreshing. Sky blue, warm sunlight, cyan coastal tones, and 100% UV400 polarized eye care.',
            'type' => 'seasonal',
            'status' => 'DRAFT',
            'is_system' => 1,
            'priority' => 5,
            'settings' => [
                'primary_color' => '#0284C7',
                'secondary_color' => '#0369A1',
                'accent_color' => '#F59E0B',
                'bg_gradient_start' => '#F0F9FF',
                'bg_gradient_end' => '#E0F2FE',
                'surface_color' => '#FFFFFF',
                'text_primary' => '#0C4A6E',
                'text_secondary' => '#0369A1',
                'text_muted' => '#38BDF8',
                'heading_color' => '#0369A1',
                'border_color' => '#BAE6FD',
                'button_bg' => '#0284C7',
                'button_text' => '#FFFFFF',
                'button_hover_bg' => '#0369A1',
                'particles_enabled' => 1,
                'decorations_enabled' => 1,
                'kash_flowers_enabled' => 0,
                'diyas_enabled' => 0,
                'snow_enabled' => 0,
                'petals_enabled' => 0,
                'rain_enabled' => 0,
                'santa_enabled' => 0,
                'chakra_enabled' => 0,
                'animation_intensity' => 'subtle',
                'animation_speed' => 0.9,
                'loading_duration_ms' => 1900
            ],
            'content_en' => [
                'announcement_badge' => 'SUMMER UV400',
                'announcement_text' => '☀️ Protect Your Eyes: 100% UV400 Polarized Sunglasses Active for Coastal Sun & Driving',
                'festival_greeting' => 'Cool, Refreshing & Maximum UV Protection',
                'hero_title' => 'SUMMER VISION: LIGHT FRAMES, CRYSTAL CLARITY',
                'hero_subtitle' => 'Shield your sight from intense coastal glare with high-grade Japanese polarized lenses.',
                'hero_cta_text' => 'Shop Summer Eyewear',
                'hero_cta_link' => '/catalog?category=sunglasses',
                'product_badge' => 'UV400 Polarized',
                'loading_greeting' => 'SUMMER RADIANCE',
                'loading_tagline' => 'CALIBRATING UV400 POLARIZATION FILTER...',
                'footer_message' => 'Summer Eyecare & Coastal Protection • Digha Beach Counter'
            ],
            'content_bn' => [
                'announcement_badge' => 'গ্রীষ্মের সুরক্ষা',
                'announcement_text' => '☀️ রোদে বেরোলে চোখ সুরক্ষিত রাখুন ১০০% UV400 পোলারাইজড সানগ্লাসে',
                'festival_greeting' => 'গ্রীষ্মের কড়া রোদে চোখের সম্পূর্ণ সুরক্ষা',
                'hero_title' => 'গ্রীষ্মের কড়া রোদেও চোখ থাকুক ঠান্ডা ও সুরক্ষিত',
                'hero_subtitle' => 'সমুদ্র সৈকতের তীব্র আলোর ঝলকানি থেকে চোখের সুরক্ষায় প্রিমিয়াম পোলারাইজড কালেকশন।',
                'hero_cta_text' => 'সানগ্লাস দেখুন',
                'hero_cta_link' => '/catalog?category=sunglasses',
                'product_badge' => 'পোলারাইজড UV',
                'loading_greeting' => 'সামার প্রোটেকশন',
                'loading_tagline' => 'UV400 অপটিক্যাল শিল্ড সক্রিয় করা হচ্ছে...',
                'footer_message' => 'গ্রীষ্মকালীন চক্ষু সুরক্ষা • নেত্র উন্নয়ন দিঘা'
            ]
        ],
        [
            'slug' => 'winter',
            'name' => 'Winter Frost & Mist',
            'description' => 'Cold, minimal, elegant frosted glass aesthetic. Icy blue, silver accents, subtle fog reduction, and anti-fog precision lenses.',
            'type' => 'seasonal',
            'status' => 'DRAFT',
            'is_system' => 1,
            'priority' => 5,
            'settings' => [
                'primary_color' => '#0284C7',
                'secondary_color' => '#0F172A',
                'accent_color' => '#38BDF8',
                'bg_gradient_start' => '#F8FAFC',
                'bg_gradient_end' => '#EFF6FF',
                'surface_color' => '#FFFFFF',
                'text_primary' => '#0F172A',
                'text_secondary' => '#334155',
                'text_muted' => '#64748B',
                'heading_color' => '#0C4A6E',
                'border_color' => '#E0F2FE',
                'button_bg' => '#0284C7',
                'button_text' => '#FFFFFF',
                'button_hover_bg' => '#0369A1',
                'particles_enabled' => 1,
                'decorations_enabled' => 1,
                'kash_flowers_enabled' => 0,
                'diyas_enabled' => 0,
                'snow_enabled' => 1,
                'petals_enabled' => 0,
                'rain_enabled' => 0,
                'santa_enabled' => 0,
                'chakra_enabled' => 0,
                'animation_intensity' => 'subtle',
                'animation_speed' => 0.8,
                'loading_duration_ms' => 1900
            ],
            'content_en' => [
                'announcement_badge' => 'WINTER FROST',
                'announcement_text' => '❄️ Winter Optical Care: Anti-Fog Single Vision & Progressive Lenses with Lifetime Alignment',
                'festival_greeting' => 'Crisp Winter Clarity & Fog-Free Vision',
                'hero_title' => 'WINTER PRECISION: FOG-FREE, EFFORTLESS SIGHT',
                'hero_subtitle' => 'Experience crystal-clear eyesight on chilly mornings with German anti-fog coatings.',
                'hero_cta_text' => 'Explore Anti-Fog Optics',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'Anti-Fog Coating',
                'loading_greeting' => 'WINTER VISION',
                'loading_tagline' => 'APPLYING ADVANCED ANTI-FOG GERMAN COATINGS...',
                'footer_message' => 'Winter Optical Precision • Netra Unnayan Eyewear'
            ],
            'content_bn' => [
                'announcement_badge' => 'শীতকালীন যত্ন',
                'announcement_text' => '❄️ শীতের কুয়াশায় ঝাপসা দৃষ্টি দূর করতে অ্যান্টি-ফগ জার্মান লেন্স এখন উপলব্ধ',
                'festival_greeting' => 'শীতের কুয়াশায় পরিষ্কার দৃষ্টির অঙ্গীকার',
                'hero_title' => 'কুয়াশামুক্ত পরিষ্কার দৃষ্টিতে শীতের আনন্দ',
                'hero_subtitle' => 'চা-কফি পান বা বাইক চালানোর সময় চশমায় কুয়াশা জমা রোধ করে আমাদের বিশেষ লেন্স।',
                'hero_cta_text' => 'অ্যান্টি-ফগ লেন্স দেখুন',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'অ্যান্টি-ফগ',
                'loading_greeting' => 'উইন্টার ভিশন',
                'loading_tagline' => 'অ্যান্টি-ফগ অপটিক্যাল কোটিং প্রস্তুত হচ্ছে...',
                'footer_message' => 'শীতের পরিষ্কার দৃষ্টির বিশ্বস্ত ঠিকানা • নেত্র উন্নয়ন দিঘা'
            ]
        ],
        [
            'slug' => 'independence',
            'name' => 'Independence Day (Tiranga)',
            'description' => 'Dignified patriotic atmosphere. Deep saffron, pure white, and India green surrounding UI with subtle Ashoka Chakra motion.',
            'type' => 'festival',
            'status' => 'DRAFT',
            'is_system' => 1,
            'priority' => 10,
            'settings' => [
                'primary_color' => '#EA580C',
                'secondary_color' => '#15803D',
                'accent_color' => '#1D4ED8',
                'bg_gradient_start' => '#FFFDF8',
                'bg_gradient_end' => '#F0FDF4',
                'surface_color' => '#FFFFFF',
                'text_primary' => '#0F172A',
                'text_secondary' => '#334155',
                'text_muted' => '#64748B',
                'heading_color' => '#C2410C',
                'border_color' => '#FED7AA',
                'button_bg' => '#EA580C',
                'button_text' => '#FFFFFF',
                'button_hover_bg' => '#C2410C',
                'particles_enabled' => 1,
                'decorations_enabled' => 1,
                'kash_flowers_enabled' => 0,
                'diyas_enabled' => 0,
                'snow_enabled' => 0,
                'petals_enabled' => 0,
                'rain_enabled' => 0,
                'santa_enabled' => 0,
                'chakra_enabled' => 1,
                'animation_intensity' => 'balanced',
                'animation_speed' => 1.0,
                'loading_duration_ms' => 2100
            ],
            'content_en' => [
                'announcement_badge' => 'INDEPENDENCE DAY',
                'announcement_text' => '🇮🇳 Happy Independence Day! Dedicated to Empowering Bengal with World-Class Eye Care',
                'festival_greeting' => 'Celebrating Freedom & Clear Vision',
                'hero_title' => 'HONORING FREEDOM WITH CLARITY & DIGNITY',
                'hero_subtitle' => 'Proudly serving Purba Medinipur and coastal Bengal with certified optical precision.',
                'hero_cta_text' => 'Explore National Edition',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'Tiranga Edition',
                'loading_greeting' => 'HAPPY INDEPENDENCE DAY',
                'loading_tagline' => 'VANDE MATARAM • PROUDLY SERVING BENGAL...',
                'footer_message' => 'Proudly Indian • Dedicated to Healthy Sight Across Bengal'
            ],
            'content_bn' => [
                'announcement_badge' => 'স্বাধীনতা দিবস',
                'announcement_text' => '🇮🇳 স্বাধীনতা দিবসের আন্তরিক প্রীতি ও শুভেচ্ছা • বন্দে মাতরম্',
                'festival_greeting' => 'স্বাধীনতা দিবসের আন্তরিক শুভেচ্ছা ও অভিনন্দন',
                'hero_title' => 'স্বাধীন ভারতের গর্বিত ও স্বচ্ছ দৃষ্টিভঙ্গি',
                'hero_subtitle' => 'পূর্ব মেদিনীপুর ও পশ্চিমবঙ্গের মানুষের চোখে পৌঁছে দিচ্ছি বিশ্বমানের চক্ষু সেবা।',
                'hero_cta_text' => 'কালেকশন দেখুন',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'তিরঙ্গা স্পেশাল',
                'loading_greeting' => 'স্বাধীনতা দিবস',
                'loading_tagline' => 'বন্দে মাতরম্ • বাংলাকে সেবা দেওয়ার অঙ্গীকার...',
                'footer_message' => 'ভারতের গর্ব • দৃষ্টির সার্বিক সুরক্ষা ও উন্নয়ন'
            ]
        ],
        [
            'slug' => 'republic',
            'name' => 'Republic Day (Ganatantra)',
            'description' => 'Patriotic navy, saffron, and green geometric elegance celebrating the Constitution and national unity.',
            'type' => 'festival',
            'status' => 'DRAFT',
            'is_system' => 1,
            'priority' => 10,
            'settings' => [
                'primary_color' => '#1D4ED8',
                'secondary_color' => '#EA580C',
                'accent_color' => '#16A34A',
                'bg_gradient_start' => '#F8FAFC',
                'bg_gradient_end' => '#EFF6FF',
                'surface_color' => '#FFFFFF',
                'text_primary' => '#0F172A',
                'text_secondary' => '#334155',
                'text_muted' => '#64748B',
                'heading_color' => '#1E3A8A',
                'border_color' => '#BFDBFE',
                'button_bg' => '#1D4ED8',
                'button_text' => '#FFFFFF',
                'button_hover_bg' => '#1E40AF',
                'particles_enabled' => 1,
                'decorations_enabled' => 1,
                'kash_flowers_enabled' => 0,
                'diyas_enabled' => 0,
                'snow_enabled' => 0,
                'petals_enabled' => 0,
                'rain_enabled' => 0,
                'santa_enabled' => 0,
                'chakra_enabled' => 1,
                'animation_intensity' => 'balanced',
                'animation_speed' => 1.0,
                'loading_duration_ms' => 2000
            ],
            'content_en' => [
                'announcement_badge' => 'REPUBLIC DAY',
                'announcement_text' => '🇮🇳 Happy Republic Day! Saluting the Spirit of Indian Unity & Constitutional Strength',
                'festival_greeting' => 'Celebrating Unity, Pride & Vision',
                'hero_title' => 'CELEBRATING DEMOCRACY & SIGHT',
                'hero_subtitle' => 'Building a healthier, sharper-sighted nation with ethical optical standards.',
                'hero_cta_text' => 'Discover Republic Drop',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'Republic Special',
                'loading_greeting' => 'HAPPY REPUBLIC DAY',
                'loading_tagline' => 'SALUTING THE CONSTITUTION & NATION...',
                'footer_message' => 'Republic Day Greetings • Netra Unnayan Eye Care'
            ],
            'content_bn' => [
                'announcement_badge' => 'প্রজাতন্ত্র দিবস',
                'announcement_text' => '🇮🇳 শুভ প্রজাতন্ত্র দিবস! সমৃদ্ধ জাতি গঠনে সুস্থ চোখের গুরুত্ব অপার',
                'festival_greeting' => 'প্রজাতন্ত্র দিবসের আন্তরিক অভিনন্দন ও শুভেচ্ছা',
                'hero_title' => 'সংবিধানের আদর্শে উজ্জীবিত দৃষ্টি ও নিষ্ঠা',
                'hero_subtitle' => 'সবার জন্য সহজলভ্য ও উন্নত মানের চক্ষু সেবায় আমরা বদ্ধপরিকর।',
                'hero_cta_text' => 'বিশেষ অফার দেখুন',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'প্রজাতন্ত্র স্পেশাল',
                'loading_greeting' => 'শুভ প্রজাতন্ত্র দিবস',
                'loading_tagline' => 'দেশের অগ্রযাত্রায় সুস্থ দৃষ্টির অবদান...',
                'footer_message' => 'শুভ প্রজাতন্ত্র দিবস • নেত্র উন্নয়ন'
            ]
        ],
        [
            'slug' => 'spring',
            'name' => 'Spring / Basanta Utsav',
            'description' => 'Fresh vibrant floral mood. Gentle flower petals floating softly, warm yellow, soft marigold, and youthful morning breeze.',
            'type' => 'seasonal',
            'status' => 'DRAFT',
            'is_system' => 1,
            'priority' => 5,
            'settings' => [
                'primary_color' => '#EAB308',
                'secondary_color' => '#D97706',
                'accent_color' => '#EC4899',
                'bg_gradient_start' => '#FEFCE8',
                'bg_gradient_end' => '#FFF7ED',
                'surface_color' => '#FFFFFF',
                'text_primary' => '#1C1917',
                'text_secondary' => '#44403C',
                'text_muted' => '#78716C',
                'heading_color' => '#B45309',
                'border_color' => '#FEF08A',
                'button_bg' => '#D97706',
                'button_text' => '#FFFFFF',
                'button_hover_bg' => '#B45309',
                'particles_enabled' => 1,
                'decorations_enabled' => 1,
                'kash_flowers_enabled' => 0,
                'diyas_enabled' => 0,
                'snow_enabled' => 0,
                'petals_enabled' => 1,
                'rain_enabled' => 0,
                'santa_enabled' => 0,
                'chakra_enabled' => 0,
                'animation_intensity' => 'balanced',
                'animation_speed' => 1.0,
                'loading_duration_ms' => 2000
            ],
            'content_en' => [
                'announcement_badge' => 'SPRING / BASANTA',
                'announcement_text' => '🌸 Basanta Utsav Special: Welcome Spring with Colorful Eyewear & Clear Vision Trials',
                'festival_greeting' => 'Fresh, Colorful & Vibrant Spring Vision',
                'hero_title' => 'WELCOME SPRING IN FULL VIBRANT COLOR',
                'hero_subtitle' => 'See nature bloom with enhanced optical clarity and lightweight pastel frames.',
                'hero_cta_text' => 'Shop Spring Collection',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'Spring Blossom',
                'loading_greeting' => 'BASANTA UTSAV',
                'loading_tagline' => 'BLOOMING WITH NATURAL SPRING VISION...',
                'footer_message' => 'Celebrate the Colors of Spring with Netra Unnayan'
            ],
            'content_bn' => [
                'announcement_badge' => 'বসন্ত উৎসব',
                'announcement_text' => '🌸 শুভ বসন্ত উৎসব! পলাশ আর আবিরের রঙে রঙিন হোক আপনার দৃষ্টি',
                'festival_greeting' => 'বসন্ত উৎসব ও দোলযাত্রার রঙিন শুভেচ্ছা',
                'hero_title' => 'ঋতুরাজের আগমনে চোখের রঙিন সাজ',
                'hero_subtitle' => 'রঙের উৎসবের আগেই বেছে নিন চোখ জুড়ানো হালকা ও টেকসই চশমা।',
                'hero_cta_text' => 'বসন্ত কালেকশন দেখুন',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'বসন্ত স্পেশাল',
                'loading_greeting' => 'বসন্ত উৎসব',
                'loading_tagline' => 'বসন্তের রঙিন অনুভূতি প্রস্তুত হচ্ছে...',
                'footer_message' => 'রঙিন বসন্তের আন্তরিক প্রীতি ও শুভেচ্ছা • নেত্র উন্নয়ন'
            ]
        ],
        [
            'slug' => 'monsoon',
            'name' => 'Monsoon & Rainy Petrichor',
            'description' => 'Fresh monsoon atmosphere. Soft rain droplets, gentle mist, deep ocean teals, and water-repellent hydrophobic lenses.',
            'type' => 'seasonal',
            'status' => 'DRAFT',
            'is_system' => 1,
            'priority' => 5,
            'settings' => [
                'primary_color' => '#0D9488',
                'secondary_color' => '#115E59',
                'accent_color' => '#0284C7',
                'bg_gradient_start' => '#F0FDFA',
                'bg_gradient_end' => '#F1F5F9',
                'surface_color' => '#FFFFFF',
                'text_primary' => '#0F172A',
                'text_secondary' => '#334155',
                'text_muted' => '#64748B',
                'heading_color' => '#115E59',
                'border_color' => '#99F6E4',
                'button_bg' => '#0D9488',
                'button_text' => '#FFFFFF',
                'button_hover_bg' => '#0F766E',
                'particles_enabled' => 1,
                'decorations_enabled' => 1,
                'kash_flowers_enabled' => 0,
                'diyas_enabled' => 0,
                'snow_enabled' => 0,
                'petals_enabled' => 0,
                'rain_enabled' => 1,
                'santa_enabled' => 0,
                'chakra_enabled' => 0,
                'animation_intensity' => 'subtle',
                'animation_speed' => 0.8,
                'loading_duration_ms' => 1900
            ],
            'content_en' => [
                'announcement_badge' => 'MONSOON CARE',
                'announcement_text' => '🌧️ Monsoon Clarity: Hydrophobic Water-Repellent Lenses Keep Your Vision Streak-Free',
                'festival_greeting' => 'Streak-Free Rainy Vision with Hydrophobic Glass',
                'hero_title' => 'CRYSTAL CLARITY THROUGH THE RAIN',
                'hero_subtitle' => 'Rain droplets slide right off with advanced water-repellent German hydrophobic optics.',
                'hero_cta_text' => 'Explore Hydrophobic Lenses',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'Water-Repellent',
                'loading_greeting' => 'MONSOON CLARITY',
                'loading_tagline' => 'CALIBRATING HYDROPHOBIC WATER-REPELLENT SURFACE...',
                'footer_message' => 'Monsoon Eyewear Care • Netra Unnayan Digha'
            ],
            'content_bn' => [
                'announcement_badge' => 'বর্ষার যত্ন',
                'announcement_text' => '🌧️ বৃষ্টির দিনে ঝাপসা কাচকে বিদায় জানান বিশেষ ওয়াটার-রিপেলেন্ট লেন্সে',
                'festival_greeting' => 'বর্ষার দিনেও স্বচ্ছ ও দাগহীন দৃষ্টির সুবিধা',
                'hero_title' => 'বৃষ্টির ফোঁটাতেও দৃষ্টি থাকবে পরিষ্কার ও স্পষ্ট',
                'hero_subtitle' => 'হাইড্রোকোটেড লেন্সে বৃষ্টির জল আটকে থাকে না, নিমেষেই গড়িয়ে যায়।',
                'hero_cta_text' => 'হাইড্রোফোবিক লেন্স দেখুন',
                'hero_cta_link' => '/catalog',
                'product_badge' => 'ওয়াটার-রিপেলেন্ট',
                'loading_greeting' => 'বর্ষার যত্ন',
                'loading_tagline' => 'ওয়াটার-রিপেলেন্ট লেন্স অপ্টিমাইজেশন...',
                'footer_message' => 'বর্ষাকালীন দৃষ্টি যত্ন ও সুরক্ষা • নেত্র উন্নয়ন দিঘা'
            ]
        ]
    ];

    // Seed themes into DB
    foreach ($builtInThemes as $t) {
        $stmt = $pdo->prepare("SELECT id FROM themes WHERE slug = ?");
        $stmt->execute([$t['slug']]);
        $existing = $stmt->fetch();

        if (!$existing) {
            $insertTheme = $pdo->prepare("
                INSERT INTO themes (slug, name, description, type, status, is_system, priority)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $insertTheme->execute([
                $t['slug'], $t['name'], $t['description'], $t['type'], $t['status'], $t['is_system'], $t['priority']
            ]);
            $themeId = (int)$pdo->lastInsertId();
        } else {
            $themeId = (int)$existing['id'];
        }

        // Insert / Update Settings
        $s = $t['settings'];
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
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            ) ON DUPLICATE KEY UPDATE
                primary_color = VALUES(primary_color),
                secondary_color = VALUES(secondary_color),
                accent_color = VALUES(accent_color),
                bg_gradient_start = VALUES(bg_gradient_start),
                bg_gradient_end = VALUES(bg_gradient_end),
                surface_color = VALUES(surface_color),
                text_primary = VALUES(text_primary),
                text_secondary = VALUES(text_secondary),
                text_muted = VALUES(text_muted),
                heading_color = VALUES(heading_color),
                border_color = VALUES(border_color),
                button_bg = VALUES(button_bg),
                button_text = VALUES(button_text),
                button_hover_bg = VALUES(button_hover_bg),
                particles_enabled = VALUES(particles_enabled),
                decorations_enabled = VALUES(decorations_enabled),
                kash_flowers_enabled = VALUES(kash_flowers_enabled),
                diyas_enabled = VALUES(diyas_enabled),
                snow_enabled = VALUES(snow_enabled),
                petals_enabled = VALUES(petals_enabled),
                rain_enabled = VALUES(rain_enabled),
                santa_enabled = VALUES(santa_enabled),
                chakra_enabled = VALUES(chakra_enabled),
                animation_intensity = VALUES(animation_intensity),
                animation_speed = VALUES(animation_speed),
                loading_duration_ms = VALUES(loading_duration_ms)
        ")->execute([
            $themeId, $s['primary_color'], $s['secondary_color'], $s['accent_color'],
            $s['bg_gradient_start'], $s['bg_gradient_end'], $s['surface_color'],
            $s['text_primary'], $s['text_secondary'], $s['text_muted'], $s['heading_color'],
            $s['border_color'], $s['button_bg'], $s['button_text'], $s['button_hover_bg'],
            $s['particles_enabled'], $s['decorations_enabled'], $s['kash_flowers_enabled'],
            $s['diyas_enabled'], $s['snow_enabled'], $s['petals_enabled'], $s['rain_enabled'],
            $s['santa_enabled'], $s['chakra_enabled'], $s['animation_intensity'],
            $s['animation_speed'], $s['loading_duration_ms']
        ]);

        // Insert / Update Multilingual Content (EN & BN)
        foreach (['en' => $t['content_en'], 'bn' => $t['content_bn']] as $lang => $c) {
            $pdo->prepare("
                INSERT INTO theme_content (
                    theme_id, lang, announcement_badge, announcement_text,
                    festival_greeting, hero_title, hero_subtitle, hero_cta_text,
                    hero_cta_link, product_badge, loading_greeting, loading_tagline, footer_message
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                ) ON DUPLICATE KEY UPDATE
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
                $themeId, $lang, $c['announcement_badge'], $c['announcement_text'],
                $c['festival_greeting'], $c['hero_title'], $c['hero_subtitle'], $c['hero_cta_text'],
                $c['hero_cta_link'], $c['product_badge'], $c['loading_greeting'], $c['loading_tagline'], $c['footer_message']
            ]);
        }
    }

    // Also ensure global settings exist
    $defaultSettings = [
        'active_theme' => 'default',
        'theme_force_safe_mode' => '0',
        'auto_theme_scheduling' => '1',
        'theme_language' => 'en'
    ];
    foreach ($defaultSettings as $key => $val) {
        $pdo->prepare("
            INSERT INTO settings (setting_key, setting_value, group_name)
            VALUES (?, ?, 'themes')
            ON DUPLICATE KEY UPDATE setting_value = IF(setting_value IS NULL, VALUES(setting_value), setting_value)
        ")->execute([$key, $val]);
    }

    // 3. Ensure netraunnayan@gmail.com is strictly the ONLY Super Admin
    try {
        $pdo->exec("UPDATE `admin_roles` SET `name` = 'Super Admin', `slug` = 'super_admin' WHERE `id` = 1");
        $checkSuper = $pdo->prepare("SELECT id FROM `admins` WHERE `email` = 'netraunnayan@gmail.com' OR `username` = 'admin' LIMIT 1");
        $checkSuper->execute();
        $superId = $checkSuper->fetchColumn();

        if ($superId) {
            $pdo->prepare("
                UPDATE `admins` 
                SET `email` = 'netraunnayan@gmail.com', 
                    `full_name` = 'Netra Unnayan Super Admin', 
                    `role_id` = 1, 
                    `is_active` = 1 
                WHERE `id` = ?
            ")->execute([$superId]);
        } else {
            $pdo->exec("
                INSERT INTO `admins` (`role_id`, `username`, `email`, `password_hash`, `full_name`, `phone`, `is_active`)
                VALUES (1, 'admin', 'netraunnayan@gmail.com', '$2y$10$4amYquQoEI0wMnPmadv9J.reAlDcuTvk6ovoMHVsRhKpECZCO9xrq', 'Netra Unnayan Super Admin', '9382293614', 1)
            ");
        }

        $pdo->exec("
            UPDATE `admins` 
            SET `role_id` = 2, `full_name` = 'Dr. S. K. Mahapatra (Consulting Doctor)' 
            WHERE (`full_name` LIKE '%Mahapatra%' OR `email` = 'admin@netraunnayan.com') 
              AND `email` != 'netraunnayan@gmail.com'
        ");
    } catch (Exception $e) {}

    Response::success(['seeded_themes' => count($builtInThemes)], 'Theme tables initialized and built-in themes seeded successfully');

} catch (Exception $e) {
    Response::error('Failed to setup themes database: ' . $e->getMessage(), 500);
}
