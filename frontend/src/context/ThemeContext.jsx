import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/client';

/**
 * 10 Production Built-In Themes Specification
 * Preserves Netra Unnayan brand aesthetics, optical healthcare trust, and WCAG contrast.
 */
export const BUILT_IN_THEMES = {
  default: {
    id: 'default',
    slug: 'default',
    name: 'Netra Unnayan (Sapphire & Cyan)',
    description: 'Official permanent theme. Minimal luxury optical white, midnight sapphire, and medical clarity.',
    type: 'default',
    palette: {
      primary: '#00B4D8',
      secondary: '#0A192F',
      accent: '#00F5D4',
      bgStart: '#FFFFFF',
      bgEnd: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.88)',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#64748B',
      heading: '#0A192F',
      border: '#E2E8F0',
      button: '#00B4D8',
      buttonText: '#FFFFFF',
      buttonHover: '#0284C7',
      shadow: '0 8px 30px rgba(0, 0, 0, 0.06)'
    },
    decorations: {
      particles: false,
      decorations: false,
      kashFlowers: false,
      diyas: false,
      snow: false,
      petals: false,
      rain: false,
      santa: false,
      chakra: false,
      intensity: 'subtle',
      speed: 1.0,
      loadingDuration: 1800
    },
    content: {
      en: {
        announcementBadge: 'OFFICIAL STORE',
        announcementText: 'Welcome to Netra Unnayan • Precision Optical Eyewear & Clinic in Digha',
        festivalGreeting: 'Clarity You Can Trust',
        heroTitle: 'PRECISION OPTICAL EYEWEAR & CLINICAL EXCELLENCE',
        heroSubtitle: 'Japanese Titanium Frames, German Blue-Cut Lenses, and Digha Clinic Consultations.',
        heroCtaText: 'Explore Optical Collection',
        heroCtaLink: '/catalog',
        productBadge: 'ORIGINAL',
        loadingGreeting: 'NETRA UNNAYAN',
        loadingTagline: 'CALIBRATING GERMAN OPTICAL APERTURE',
        footerMessage: 'Crafted for Visionary Clarity • Digha, West Bengal'
      },
      bn: {
        announcementBadge: 'অফিসিয়াল স্টোর',
        announcementText: 'নেত্র উন্নয়ন — দিঘার বিশ্বস্ত অপটিক্যাল ও চক্ষু পরিচর্যা কেন্দ্র',
        festivalGreeting: 'স্পষ্ট দৃষ্টি, বিশ্বস্ত প্রতিষ্ঠান',
        heroTitle: 'স্পষ্ট দৃষ্টি ও নির্ভরযোগ্য চক্ষু সেবা',
        heroSubtitle: 'প্রিমিয়াম জাপানি টাইটানিয়াম ফ্রেম ও নিখুঁত জার্মান লেন্স কাটিং প্রযুক্তি।',
        heroCtaText: 'চশমা কালেকশন দেখুন',
        heroCtaLink: '/catalog',
        productBadge: 'অরিজিনাল',
        loadingGreeting: 'নেত্র উন্নয়ন',
        loadingTagline: 'জার্মান প্রিসিশন অপটিক্স প্রস্তুত হচ্ছে',
        footerMessage: 'বিশ্বস্ত দৃষ্টির অঙ্গীকার • দিঘা, পশ্চিমবঙ্গ'
      }
    }
  },

  durga_puja: {
    id: 'durga_puja',
    slug: 'durga_puja',
    name: 'Durga Puja / Sharodotsav',
    description: 'Sophisticated Bengali Puja morning mood. Soft ivory, warm golden sunlight, swaying Kash flowers, and glowing diyas.',
    type: 'festival',
    palette: {
      primary: '#DC2626',
      secondary: '#7F1D1D',
      accent: '#F59E0B',
      bgStart: '#FFFDF7',
      bgEnd: '#FEF8EB',
      surface: '#FFFFFF',
      surfaceGlass: 'rgba(255, 253, 247, 0.92)',
      textPrimary: '#1C1917',
      textSecondary: '#44403C',
      textMuted: '#78716C',
      heading: '#7F1D1D',
      border: '#FDE68A',
      button: '#DC2626',
      buttonText: '#FFFFFF',
      buttonHover: '#B91C1C',
      shadow: '0 10px 30px -5px rgba(220, 38, 38, 0.12)'
    },
    decorations: {
      particles: true,
      decorations: true,
      kashFlowers: true,
      diyas: true,
      snow: false,
      petals: false,
      rain: false,
      santa: false,
      chakra: false,
      intensity: 'balanced',
      speed: 1.0,
      loadingDuration: 2200
    },
    content: {
      en: {
        announcementBadge: 'PUJA SPECIAL',
        announcementText: '✨ Shubho Sharodotsav! Celebrate with Festive Clarity & Free Home Eye Checkup in Digha',
        festivalGreeting: 'Celebrating Sharodotsav with Festive Clarity',
        heroTitle: 'CELEBRATE THE SEASON WITH CLEAR FESTIVE VISION',
        heroSubtitle: 'Discover elegant eyewear that complements your Sharodotsav celebration.',
        heroCtaText: 'Explore Puja Collection',
        heroCtaLink: '/catalog',
        productBadge: 'Pujo Special',
        loadingGreeting: 'শুভ মহালয়া',
        loadingTagline: 'PREPARING YOUR FESTIVE PUJA EXPERIENCE...',
        footerMessage: 'শুভ শারদীয়া ও শুভ বিজয়ার আন্তরিক প্রীতি ও শুভেচ্ছা • Netra Unnayan'
      },
      bn: {
        announcementBadge: 'শুভ শারদীয়া',
        announcementText: '✨ শুভ শারদীয়া! উৎসবের দিনগুলিতে পেয়ে যান স্পেশাল অফার ও ফ্রি আই চেকআপ • দিঘা স্টোর',
        festivalGreeting: 'শুভ শারদীয়া ও শুভ বিজয়ার প্রীতি ও শুভেচ্ছা',
        heroTitle: 'উৎসবের আনন্দে ভরে উঠুক দৃষ্টির স্বচ্ছতা',
        heroSubtitle: 'শরতের কাশফুল আর আলোর উৎসবে বেছে নিন আপনার মানানসই নতুন চশমা।',
        heroCtaText: 'পুজো কালেকশন দেখুন',
        heroCtaLink: '/catalog',
        productBadge: 'পুজো স্পেশাল',
        loadingGreeting: 'শুভ মহালয়া',
        loadingTagline: 'শুভ শারদীয়া • পুজো স্পেশাল কালেকশন লোড হচ্ছে...',
        footerMessage: 'শুভ শারদীয়া ও শুভ বিজয়ার আন্তরিক প্রীতি ও শুভেচ্ছা • নেত্র উন্নয়ন'
      }
    }
  },

  diwali: {
    id: 'diwali',
    slug: 'diwali',
    name: 'Diwali & Festival of Lights',
    description: 'Luminous festival of lights. Deep midnight navy, warm shimmering gold, animated flickering diyas, and starlight particles.',
    type: 'festival',
    palette: {
      primary: '#D97706',
      secondary: '#0F172A',
      accent: '#FBBF24',
      bgStart: '#0B1329',
      bgEnd: '#060B18',
      surface: '#0F1E3D',
      surfaceGlass: 'rgba(15, 30, 61, 0.90)',
      textPrimary: '#FFFBEB',
      textSecondary: '#FDE68A',
      textMuted: '#CBD5E1',
      heading: '#FBBF24',
      border: 'rgba(245, 158, 11, 0.35)',
      button: '#D97706',
      buttonText: '#0F172A',
      buttonHover: '#B45309',
      shadow: '0 10px 35px -5px rgba(245, 158, 11, 0.25)'
    },
    decorations: {
      particles: true,
      decorations: true,
      kashFlowers: false,
      diyas: true,
      snow: false,
      petals: false,
      rain: false,
      santa: false,
      chakra: false,
      intensity: 'balanced',
      speed: 1.0,
      loadingDuration: 2200
    },
    content: {
      en: {
        announcementBadge: 'HAPPY DIWALI',
        announcementText: '🪔 Happy Diwali! Illuminate Your Life with Clear Vision & Exclusive Festive Offers',
        festivalGreeting: 'Illuminate Your World with Perfect Vision',
        heroTitle: 'ILLUMINATE EVERY MOMENT WITH PERFECT VISION',
        heroSubtitle: 'Radiant golden accents, anti-glare festive lenses, and luxury handcrafted eyewear.',
        heroCtaText: 'Explore Diwali Glow',
        heroCtaLink: '/catalog',
        productBadge: 'Diwali Edition',
        loadingGreeting: 'HAPPY DIWALI',
        loadingTagline: 'LIGHTING FESTIVE DIYAS FOR RADIANT VISION...',
        footerMessage: 'May the Festival of Lights Bring Health, Joy & Crystal-Clear Sight • Netra Unnayan'
      },
      bn: {
        announcementBadge: 'শুভ দীপাবলি',
        announcementText: '🪔 শুভ দীপাবলি! আলোর উৎসবে আপনার চোখ হোক আরও দীপ্তিময় ও সুরক্ষিত',
        festivalGreeting: 'শুভ দীপাবলির আন্তরিক প্রীতি ও শুভেচ্ছা',
        heroTitle: 'আলোর উৎসবে চোখের সুস্থতা ও নতুন রূপ',
        heroSubtitle: 'প্রদীপের আলোয় উজ্জ্বল দৃষ্টির জন্য অ্যান্টি-গ্লেয়ার প্রিমিয়াম লেন্স কালেকশন।',
        heroCtaText: 'দীপাবলি অফার দেখুন',
        heroCtaLink: '/catalog',
        productBadge: 'দীপাবলি স্পেশাল',
        loadingGreeting: 'শুভ দীপাবলি',
        loadingTagline: 'দীপাবলির মঙ্গল প্রদীপ প্রজ্বলিত হচ্ছে...',
        footerMessage: 'শুভ দীপাবলি ও ধনতেরাসের শুভকামনা • নেত্র উন্নয়ন দিঘা'
      }
    }
  },

  christmas: {
    id: 'christmas',
    slug: 'christmas',
    name: 'Christmas & New Year',
    description: 'Magical winter wonderland. Soft falling snow, Santa in sleigh, holiday pine green, and celebratory berry red accents.',
    type: 'festival',
    palette: {
      primary: '#E11D48',
      secondary: '#064E3B',
      accent: '#059669',
      bgStart: '#F0FDF4',
      bgEnd: '#EFF6FF',
      surface: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.92)',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#64748B',
      heading: '#064E3B',
      border: '#CBD5E1',
      button: '#E11D48',
      buttonText: '#FFFFFF',
      buttonHover: '#BE123C',
      shadow: '0 10px 30px -5px rgba(225, 29, 72, 0.15)'
    },
    decorations: {
      particles: true,
      decorations: true,
      kashFlowers: false,
      diyas: false,
      snow: true,
      petals: false,
      rain: false,
      santa: true,
      chakra: false,
      intensity: 'balanced',
      speed: 1.0,
      loadingDuration: 2400
    },
    content: {
      en: {
        announcementBadge: 'MERRY CHRISTMAS',
        announcementText: '🎄 Merry Christmas & Happy New Year! Discover Holiday Eyewear Gifts & Free Home Eye Visits',
        festivalGreeting: 'See the Season More Clearly',
        heroTitle: 'A SEASON OF GIVING, CLARITY & JOY',
        heroSubtitle: 'Celebrate the holidays with luxury winter-ready frames and crisp anti-fog optics.',
        heroCtaText: 'Explore Holiday Collection',
        heroCtaLink: '/catalog',
        productBadge: 'Holiday Gift',
        loadingGreeting: 'MERRY CHRISTMAS',
        loadingTagline: 'SANTA IS DELIVERING YOUR HOLIDAY CLARITY...',
        footerMessage: 'Merry Christmas & A Prosperous New Year from Netra Unnayan'
      },
      bn: {
        announcementBadge: 'শুভ বড়দিন',
        announcementText: '🎄 শুভ বড়দিন ও শুভ নববর্ষ! উৎসবের সেরা অফারে বেছে নিন পরিবারের নতুন চশমা',
        festivalGreeting: 'শুভ বড়দিন ও আগামী নতুন বছরের শুভেচ্ছা',
        heroTitle: 'নতুন বছরে নতুন দৃষ্টির সূচনা',
        heroSubtitle: 'শীতের কুয়াশামুক্ত দৃষ্টি ও প্রিমিয়াম স্টাইলিশ ফ্রেমের উৎসব উপহার।',
        heroCtaText: 'হলিডে কালেকশন দেখুন',
        heroCtaLink: '/catalog',
        productBadge: 'হলিডে স্পেশাল',
        loadingGreeting: 'শুভ বড়দিন',
        loadingTagline: 'সান্তা ক্লজ আপনার অপটিক্যাল উপহার নিয়ে আসছে...',
        footerMessage: 'শুভ বড়দিন ও সমৃদ্ধ নতুন বছরের আন্তরিক শুভেচ্ছা • নেত্র উন্নয়ন'
      }
    }
  },

  summer: {
    id: 'summer',
    slug: 'summer',
    name: 'Summer Sunshine & Coastal UV400',
    description: 'Fresh, bright, cool and refreshing. Sky blue, warm sunlight, cyan coastal tones, and 100% UV400 polarized eye care.',
    type: 'seasonal',
    palette: {
      primary: '#0284C7',
      secondary: '#0369A1',
      accent: '#F59E0B',
      bgStart: '#F0F9FF',
      bgEnd: '#E0F2FE',
      surface: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.92)',
      textPrimary: '#0C4A6E',
      textSecondary: '#0369A1',
      textMuted: '#0284C7',
      heading: '#0369A1',
      border: '#BAE6FD',
      button: '#0284C7',
      buttonText: '#FFFFFF',
      buttonHover: '#0369A1',
      shadow: '0 10px 30px -5px rgba(2, 132, 199, 0.15)'
    },
    decorations: {
      particles: true,
      decorations: true,
      kashFlowers: false,
      diyas: false,
      snow: false,
      petals: false,
      rain: false,
      santa: false,
      chakra: false,
      intensity: 'subtle',
      speed: 0.9,
      loadingDuration: 1900
    },
    content: {
      en: {
        announcementBadge: 'SUMMER UV400',
        announcementText: '☀️ Protect Your Eyes: 100% UV400 Polarized Sunglasses Active for Coastal Sun & Driving',
        festivalGreeting: 'Cool, Refreshing & Maximum UV Protection',
        heroTitle: 'SUMMER VISION: LIGHT FRAMES, CRYSTAL CLARITY',
        heroSubtitle: 'Shield your sight from intense coastal glare with high-grade Japanese polarized lenses.',
        heroCtaText: 'Shop Summer Eyewear',
        heroCtaLink: '/catalog?category=sunglasses',
        productBadge: 'UV400 Polarized',
        loadingGreeting: 'SUMMER RADIANCE',
        loadingTagline: 'CALIBRATING UV400 POLARIZATION FILTER...',
        footerMessage: 'Summer Eyecare & Coastal Protection • Digha Beach Counter'
      },
      bn: {
        announcementBadge: 'গ্রীষ্মের সুরক্ষা',
        announcementText: '☀️ রোদে বেরোলে চোখ সুরক্ষিত রাখুন ১০০% UV400 পোলারাইজড সানগ্লাসে',
        festivalGreeting: 'গ্রীষ্মের কড়া রোদে চোখের সম্পূর্ণ সুরক্ষা',
        heroTitle: 'গ্রীষ্মের কড়া রোদেও চোখ থাকুক ঠান্ডা ও সুরক্ষিত',
        heroSubtitle: 'সমুদ্র সৈকতের তীব্র আলোর ঝলকানি থেকে চোখের সুরক্ষায় প্রিমিয়াম পোলারাইজড কালেকশন।',
        heroCtaText: 'সানগ্লাস দেখুন',
        heroCtaLink: '/catalog?category=sunglasses',
        productBadge: 'পোলারাইজড UV',
        loadingGreeting: 'সামার প্রোটেকশন',
        loadingTagline: 'UV400 অপটিক্যাল শিল্ড সক্রিয় করা হচ্ছে...',
        footerMessage: 'গ্রীষ্মকালীন চক্ষু সুরক্ষা • নেত্র উন্নয়ন দিঘা'
      }
    }
  },

  winter: {
    id: 'winter',
    slug: 'winter',
    name: 'Winter Frost & Mist',
    description: 'Cold, minimal, elegant frosted glass aesthetic. Icy blue, silver accents, subtle fog reduction, and anti-fog precision lenses.',
    type: 'seasonal',
    palette: {
      primary: '#0284C7',
      secondary: '#0F172A',
      accent: '#38BDF8',
      bgStart: '#F8FAFC',
      bgEnd: '#EFF6FF',
      surface: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.90)',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#64748B',
      heading: '#0C4A6E',
      border: '#E0F2FE',
      button: '#0284C7',
      buttonText: '#FFFFFF',
      buttonHover: '#0369A1',
      shadow: '0 10px 30px -5px rgba(2, 132, 199, 0.12)'
    },
    decorations: {
      particles: true,
      decorations: true,
      kashFlowers: false,
      diyas: false,
      snow: true,
      petals: false,
      rain: false,
      santa: false,
      chakra: false,
      intensity: 'subtle',
      speed: 0.8,
      loadingDuration: 1900
    },
    content: {
      en: {
        announcementBadge: 'WINTER FROST',
        announcementText: '❄️ Winter Optical Care: Anti-Fog Single Vision & Progressive Lenses with Lifetime Alignment',
        festivalGreeting: 'Crisp Winter Clarity & Fog-Free Vision',
        heroTitle: 'WINTER PRECISION: FOG-FREE, EFFORTLESS SIGHT',
        heroSubtitle: 'Experience crystal-clear eyesight on chilly mornings with German anti-fog coatings.',
        heroCtaText: 'Explore Anti-Fog Optics',
        heroCtaLink: '/catalog',
        productBadge: 'Anti-Fog Coating',
        loadingGreeting: 'WINTER VISION',
        loadingTagline: 'APPLYING ADVANCED ANTI-FOG GERMAN COATINGS...',
        footerMessage: 'Winter Optical Precision • Netra Unnayan Eyewear'
      },
      bn: {
        announcementBadge: 'শীতকালীন যত্ন',
        announcementText: '❄️ শীতের কুয়াশায় ঝাপসা দৃষ্টি দূর করতে অ্যান্টি-ফগ জার্মান লেন্স এখন উপলব্ধ',
        festivalGreeting: 'শীতের কুয়াশায় পরিষ্কার দৃষ্টির অঙ্গীকার',
        heroTitle: 'কুয়াশামুক্ত পরিষ্কার দৃষ্টিতে শীতের আনন্দ',
        heroSubtitle: 'চা-কফি পান বা বাইক চালানোর সময় চশমায় কুয়াশা জমা রোধ করে আমাদের বিশেষ লেন্স।',
        heroCtaText: 'অ্যান্টি-ফগ লেন্স দেখুন',
        heroCtaLink: '/catalog',
        productBadge: 'অ্যান্টি-ফগ',
        loadingGreeting: 'উইন্টার ভিশন',
        loadingTagline: 'অ্যান্টি-ফগ অপটিক্যাল কোটিং প্রস্তুত হচ্ছে...',
        footerMessage: 'শীতের পরিষ্কার দৃষ্টির বিশ্বস্ত ঠিকানা • নেত্র উন্নয়ন দিঘা'
      }
    }
  },

  independence: {
    id: 'independence',
    slug: 'independence',
    name: 'Independence Day (Tiranga)',
    description: 'Dignified patriotic atmosphere. Deep saffron, pure white, and India green surrounding UI with subtle Ashoka Chakra motion.',
    type: 'festival',
    palette: {
      primary: '#EA580C',
      secondary: '#15803D',
      accent: '#1D4ED8',
      bgStart: '#FFFDF8',
      bgEnd: '#F0FDF4',
      surface: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.92)',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#64748B',
      heading: '#C2410C',
      border: '#FED7AA',
      button: '#EA580C',
      buttonText: '#FFFFFF',
      buttonHover: '#C2410C',
      shadow: '0 10px 30px -5px rgba(234, 88, 12, 0.15)'
    },
    decorations: {
      particles: true,
      decorations: true,
      kashFlowers: false,
      diyas: false,
      snow: false,
      petals: false,
      rain: false,
      santa: false,
      chakra: true,
      intensity: 'balanced',
      speed: 1.0,
      loadingDuration: 2100
    },
    content: {
      en: {
        announcementBadge: 'INDEPENDENCE DAY',
        announcementText: '🇮🇳 Happy Independence Day! Dedicated to Empowering Bengal with World-Class Eye Care',
        festivalGreeting: 'Celebrating Freedom & Clear Vision',
        heroTitle: 'HONORING FREEDOM WITH CLARITY & DIGNITY',
        heroSubtitle: 'Proudly serving Purba Medinipur and coastal Bengal with certified optical precision.',
        heroCtaText: 'Explore National Edition',
        heroCtaLink: '/catalog',
        productBadge: 'Tiranga Edition',
        loadingGreeting: 'HAPPY INDEPENDENCE DAY',
        loadingTagline: 'VANDE MATARAM • PROUDLY SERVING BENGAL...',
        footerMessage: 'Proudly Indian • Dedicated to Healthy Sight Across Bengal'
      },
      bn: {
        announcementBadge: 'স্বাধীনতা দিবস',
        announcementText: '🇮🇳 স্বাধীনতা দিবসের আন্তরিক প্রীতি ও শুভেচ্ছা • বন্দে মাতরম্',
        festivalGreeting: 'স্বাধীনতা দিবসের আন্তরিক শুভেচ্ছা ও অভিনন্দন',
        heroTitle: 'স্বাধীন ভারতের গর্বিত ও স্বচ্ছ দৃষ্টিভঙ্গি',
        heroSubtitle: 'পূর্ব মেদিনীপুর ও পশ্চিমবঙ্গের মানুষের চোখে পৌঁছে দিচ্ছি বিশ্বমানের চক্ষু সেবা।',
        heroCtaText: 'কালেকশন দেখুন',
        heroCtaLink: '/catalog',
        productBadge: 'তিরঙ্গা স্পেশাল',
        loadingGreeting: 'স্বাধীনতা দিবস',
        loadingTagline: 'বন্দে মাতরম্ • বাংলাকে সেবা দেওয়ার অঙ্গীকার...',
        footerMessage: 'ভারতের গর্ব • দৃষ্টির সার্বিক সুরক্ষা ও উন্নয়ন'
      }
    }
  },

  republic: {
    id: 'republic',
    slug: 'republic',
    name: 'Republic Day (Ganatantra)',
    description: 'Patriotic navy, saffron, and green geometric elegance celebrating the Constitution and national unity.',
    type: 'festival',
    palette: {
      primary: '#1D4ED8',
      secondary: '#EA580C',
      accent: '#16A34A',
      bgStart: '#F8FAFC',
      bgEnd: '#EFF6FF',
      surface: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.92)',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#64748B',
      heading: '#1E3A8A',
      border: '#BFDBFE',
      button: '#1D4ED8',
      buttonText: '#FFFFFF',
      buttonHover: '#1E40AF',
      shadow: '0 10px 30px -5px rgba(29, 78, 216, 0.15)'
    },
    decorations: {
      particles: true,
      decorations: true,
      kashFlowers: false,
      diyas: false,
      snow: false,
      petals: false,
      rain: false,
      santa: false,
      chakra: true,
      intensity: 'balanced',
      speed: 1.0,
      loadingDuration: 2000
    },
    content: {
      en: {
        announcementBadge: 'REPUBLIC DAY',
        announcementText: '🇮🇳 Happy Republic Day! Saluting the Spirit of Indian Unity & Constitutional Strength',
        festivalGreeting: 'Celebrating Unity, Pride & Vision',
        heroTitle: 'CELEBRATING DEMOCRACY & SIGHT',
        heroSubtitle: 'Building a healthier, sharper-sighted nation with ethical optical standards.',
        heroCtaText: 'Discover Republic Drop',
        heroCtaLink: '/catalog',
        productBadge: 'Republic Special',
        loadingGreeting: 'HAPPY REPUBLIC DAY',
        loadingTagline: 'SALUTING THE CONSTITUTION & NATION...',
        footerMessage: 'Republic Day Greetings • Netra Unnayan Eye Care'
      },
      bn: {
        announcementBadge: 'প্রজাতন্ত্র দিবস',
        announcementText: '🇮🇳 শুভ প্রজাতন্ত্র দিবস! সমৃদ্ধ জাতি গঠনে সুস্থ চোখের গুরুত্ব অপার',
        festivalGreeting: 'প্রজাতন্ত্র দিবসের আন্তরিক অভিনন্দন ও শুভেচ্ছা',
        heroTitle: 'সংবিধানের আদর্শে উজ্জীবিত দৃষ্টি ও নিষ্ঠা',
        heroSubtitle: 'সবার জন্য সহজলভ্য ও উন্নত মানের চক্ষু সেবায় আমরা বদ্ধপরিকর।',
        heroCtaText: 'বিশেষ অফার দেখুন',
        heroCtaLink: '/catalog',
        productBadge: 'প্রজাতন্ত্র স্পেশাল',
        loadingGreeting: 'শুভ প্রজাতন্ত্র দিবস',
        loadingTagline: 'দেশের অগ্রযাত্রায় সুস্থ দৃষ্টির অবদান...',
        footerMessage: 'শুভ প্রজাতন্ত্র দিবস • নেত্র উন্নয়ন'
      }
    }
  },

  spring: {
    id: 'spring',
    slug: 'spring',
    name: 'Spring / Basanta Utsav',
    description: 'Fresh vibrant floral mood. Gentle flower petals floating softly, warm yellow, soft marigold, and youthful morning breeze.',
    type: 'seasonal',
    palette: {
      primary: '#EAB308',
      secondary: '#D97706',
      accent: '#EC4899',
      bgStart: '#FEFCE8',
      bgEnd: '#FFF7ED',
      surface: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.92)',
      textPrimary: '#1C1917',
      textSecondary: '#44403C',
      textMuted: '#78716C',
      heading: '#B45309',
      border: '#FEF08A',
      button: '#D97706',
      buttonText: '#FFFFFF',
      buttonHover: '#B45309',
      shadow: '0 10px 30px -5px rgba(234, 179, 8, 0.15)'
    },
    decorations: {
      particles: true,
      decorations: true,
      kashFlowers: false,
      diyas: false,
      snow: false,
      petals: true,
      rain: false,
      santa: false,
      chakra: false,
      intensity: 'balanced',
      speed: 1.0,
      loadingDuration: 2000
    },
    content: {
      en: {
        announcementBadge: 'SPRING / BASANTA',
        announcementText: '🌸 Basanta Utsav Special: Welcome Spring with Colorful Eyewear & Clear Vision Trials',
        festivalGreeting: 'Fresh, Colorful & Vibrant Spring Vision',
        heroTitle: 'WELCOME SPRING IN FULL VIBRANT COLOR',
        heroSubtitle: 'See nature bloom with enhanced optical clarity and lightweight pastel frames.',
        heroCtaText: 'Shop Spring Collection',
        heroCtaLink: '/catalog',
        productBadge: 'Spring Blossom',
        loadingGreeting: 'BASANTA UTSAV',
        loadingTagline: 'BLOOMING WITH NATURAL SPRING VISION...',
        footerMessage: 'Celebrate the Colors of Spring with Netra Unnayan'
      },
      bn: {
        announcementBadge: 'বসন্ত উৎসব',
        announcementText: '🌸 শুভ বসন্ত উৎসব! পলাশ আর আবিরের রঙে রঙিন হোক আপনার দৃষ্টি',
        festivalGreeting: 'বসন্ত উৎসব ও দোলযাত্রার রঙিন শুভেচ্ছা',
        heroTitle: 'ঋতুরাজের আগমনে চোখের রঙিন সাজ',
        heroSubtitle: 'রঙের উৎসবের আগেই বেছে নিন চোখ জুড়ানো হালকা ও টেকসই চশমা।',
        heroCtaText: 'বসন্ত কালেকশন দেখুন',
        heroCtaLink: '/catalog',
        productBadge: 'বসন্ত স্পেশাল',
        loadingGreeting: 'বসন্ত উৎসব',
        loadingTagline: 'বসন্তের রঙিন অনুভূতি প্রস্তুত হচ্ছে...',
        footerMessage: 'রঙিন বসন্তের আন্তরিক প্রীতি ও শুভেচ্ছা • নেত্র উন্নয়ন'
      }
    }
  },

  monsoon: {
    id: 'monsoon',
    slug: 'monsoon',
    name: 'Monsoon & Rainy Petrichor',
    description: 'Fresh monsoon atmosphere. Soft rain droplets, gentle mist, deep ocean teals, and water-repellent hydrophobic lenses.',
    type: 'seasonal',
    palette: {
      primary: '#0D9488',
      secondary: '#115E59',
      accent: '#0284C7',
      bgStart: '#F0FDFA',
      bgEnd: '#F1F5F9',
      surface: '#FFFFFF',
      surfaceGlass: 'rgba(255, 255, 255, 0.92)',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#64748B',
      heading: '#115E59',
      border: '#99F6E4',
      button: '#0D9488',
      buttonText: '#FFFFFF',
      buttonHover: '#0F766E',
      shadow: '0 10px 30px -5px rgba(13, 148, 136, 0.15)'
    },
    decorations: {
      particles: true,
      decorations: true,
      kashFlowers: false,
      diyas: false,
      snow: false,
      petals: false,
      rain: true,
      santa: false,
      chakra: false,
      intensity: 'subtle',
      speed: 0.8,
      loadingDuration: 1900
    },
    content: {
      en: {
        announcementBadge: 'MONSOON CARE',
        announcementText: '🌧️ Monsoon Clarity: Hydrophobic Water-Repellent Lenses Keep Your Vision Streak-Free',
        festivalGreeting: 'Streak-Free Rainy Vision with Hydrophobic Glass',
        heroTitle: 'CRYSTAL CLARITY THROUGH THE RAIN',
        heroSubtitle: 'Rain droplets slide right off with advanced water-repellent German hydrophobic optics.',
        heroCtaText: 'Explore Hydrophobic Lenses',
        heroCtaLink: '/catalog',
        productBadge: 'Water-Repellent',
        loadingGreeting: 'MONSOON CLARITY',
        loadingTagline: 'CALIBRATING HYDROPHOBIC WATER-REPELLENT SURFACE...',
        footerMessage: 'Monsoon Eyewear Care • Netra Unnayan Digha'
      },
      bn: {
        announcementBadge: 'বর্ষার যত্ন',
        announcementText: '🌧️ বৃষ্টির দিনে ঝাপসা কাচকে বিদায় জানান বিশেষ ওয়াটার-রিপেলেন্ট লেন্সে',
        festivalGreeting: 'বর্ষার দিনেও স্বচ্ছ ও দাগহীন দৃষ্টির সুবিধা',
        heroTitle: 'বৃষ্টির ফোঁটাতেও দৃষ্টি থাকবে পরিষ্কার ও স্পষ্ট',
        heroSubtitle: 'হাইড্রোকোটেড লেন্সে বৃষ্টির জল আটকে থাকে না, নিমেষেই গড়িয়ে যায়।',
        heroCtaText: 'হাইড্রোফোবিক লেন্স দেখুন',
        heroCtaLink: '/catalog',
        productBadge: 'ওয়াটার-রিপেলেন্ট',
        loadingGreeting: 'বর্ষার যত্ন',
        loadingTagline: 'ওয়াটার-রিপেলেন্ট লেন্স অপ্টিমাইজেশন...',
        footerMessage: 'বর্ষাকালীন দৃষ্টি যত্ন ও সুরক্ষা • নেত্র উন্নয়ন দিঘা'
      }
    }
  }
};

// Legacy backwards compatibility alias
export const THEME_CONFIGS = BUILT_IN_THEMES;

/**
 * WCAG-Compliant Contrast Helper
 * Calculates relative luminance to ensure text is never invisible
 */
export const calculateLuminance = (hexColor) => {
  if (!hexColor || typeof hexColor !== 'string') return 0.5;
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return 0.5;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const [aR, aG, aB] = [r, g, b].map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
};

export const getContrastText = (bgHex) => {
  const lum = calculateLuminance(bgHex);
  return lum > 0.45 ? '#0F172A' : '#FFFFFF';
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Light / Dark mode
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('nu_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const isDark = theme === 'dark';
  const isLight = theme === 'light';

  // Active theme slug (default to 'default')
  const [activeThemeSlug, setActiveThemeSlug] = useState(() => {
    try {
      const saved = localStorage.getItem('nu_seasonal_theme');
      return saved || 'default';
    } catch {
      return 'default';
    }
  });

  // Dynamic overrides from server (DB)
  const [serverThemeData, setServerThemeData] = useState(null);

  // Preview override for Admin Theme Visual Studio
  const [previewThemeSlug, setPreviewThemeSlug] = useState(null);
  const [previewOverrides, setPreviewOverrides] = useState(null);

  // Global Safe Mode (disables all animations/decorations instantly)
  const [safeMode, setSafeMode] = useState(false);

  // Language: 'en' | 'bn'
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('nu_theme_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  // Sync with remote active theme on mount & across all devices
  const syncThemeFromServer = useCallback(async () => {
    try {
      const res = await api.get('/themes.php');
      if (res.success && res.data) {
        setServerThemeData(res.data);
        const serverSlug = res.data.active_theme || res.data.theme?.slug;
        if (serverSlug) {
          setActiveThemeSlug(serverSlug);
          try { localStorage.setItem('nu_seasonal_theme', serverSlug); } catch {}
        }
        if (res.data.safe_mode !== undefined) {
          setSafeMode(Boolean(res.data.safe_mode));
        }
      }
    } catch (err) {
      // Secondary fallback: read from public settings
      try {
        const sRes = await api.get('/settings.php');
        if (sRes.success && sRes.data?.active_theme) {
          setActiveThemeSlug(sRes.data.active_theme);
          try { localStorage.setItem('nu_seasonal_theme', sRes.data.active_theme); } catch {}
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    syncThemeFromServer();
    // Auto re-sync theme every 30 seconds and on window focus so all visitor devices update live
    const interval = setInterval(syncThemeFromServer, 30000);
    const handleFocus = () => syncThemeFromServer();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncThemeFromServer]);

  // Live theme text overrides from Admin Settings
  const [themeTextOverrides, setThemeTextOverrides] = useState({
    badge: '',
    greetingBengali: '',
    greetingEnglish: '',
    loadingTagline: ''
  });

  // Determine current effective theme slug & base config
  const effectiveSlug = previewThemeSlug || activeThemeSlug;
  const baseTheme = BUILT_IN_THEMES[effectiveSlug] || BUILT_IN_THEMES.default;

  // Merge server customizations / preview overrides on top of base
  const effectiveTheme = useMemo(() => {
    const custom = previewOverrides || (serverThemeData?.theme?.slug === effectiveSlug ? serverThemeData : serverThemeData);
    const pub = serverThemeData?.public_settings || {};
    if (!custom && !Object.keys(pub).length && !themeTextOverrides.badge) return baseTheme;

    const s = custom?.settings || {};
    const palette = {
      primary: s.primary_color || s.primary || baseTheme.palette.primary || '#00B4D8',
      secondary: s.secondary_color || s.secondary || baseTheme.palette.secondary || '#0A192F',
      accent: s.accent_color || s.accent || baseTheme.palette.accent || '#00F5D4',
      bgStart: s.bg_gradient_start || s.bgStart || baseTheme.palette.bgStart || '#FFFFFF',
      bgEnd: s.bg_gradient_end || s.bgEnd || baseTheme.palette.bgEnd || '#F8FAFC',
      surface: s.surface_color || s.surface || baseTheme.palette.surface || '#FFFFFF',
      surfaceGlass: s.surface_glass || s.surfaceGlass || baseTheme.palette.surfaceGlass || 'rgba(255, 255, 255, 0.92)',
      textPrimary: s.text_primary || s.textPrimary || baseTheme.palette.textPrimary || '#0F172A',
      textSecondary: s.text_secondary || s.textSecondary || baseTheme.palette.textSecondary || '#334155',
      textMuted: s.text_muted || s.textMuted || baseTheme.palette.textMuted || '#64748B',
      heading: s.heading_color || s.heading || baseTheme.palette.heading || '#0A192F',
      border: s.border_color || s.border || baseTheme.palette.border || '#E2E8F0',
      button: s.button_bg || s.button || baseTheme.palette.button || '#00B4D8',
      buttonText: s.button_text || s.buttonText || baseTheme.palette.buttonText || '#FFFFFF',
      buttonHover: s.button_hover_bg || s.buttonHover || baseTheme.palette.buttonHover || '#0284C7',
      shadow: s.shadow || baseTheme.palette.shadow || '0 10px 30px -5px rgba(0, 0, 0, 0.1)'
    };

    const decorations = {
      particles: s.particles_enabled !== undefined ? Boolean(s.particles_enabled) : baseTheme.decorations.particles,
      decorations: s.decorations_enabled !== undefined ? Boolean(s.decorations_enabled) : baseTheme.decorations.decorations,
      kashFlowers: s.kash_flowers_enabled !== undefined ? Boolean(s.kash_flowers_enabled) : baseTheme.decorations.kashFlowers,
      diyas: s.diyas_enabled !== undefined ? Boolean(s.diyas_enabled) : baseTheme.decorations.diyas,
      snow: s.snow_enabled !== undefined ? Boolean(s.snow_enabled) : baseTheme.decorations.snow,
      petals: s.petals_enabled !== undefined ? Boolean(s.petals_enabled) : baseTheme.decorations.petals,
      rain: s.rain_enabled !== undefined ? Boolean(s.rain_enabled) : baseTheme.decorations.rain,
      santa: s.santa_enabled !== undefined ? Boolean(s.santa_enabled) : baseTheme.decorations.santa,
      chakra: s.chakra_enabled !== undefined ? Boolean(s.chakra_enabled) : baseTheme.decorations.chakra,
      intensity: s.animation_intensity || baseTheme.decorations.intensity || 'subtle',
      speed: s.animation_speed !== undefined ? parseFloat(s.animation_speed) : baseTheme.decorations.speed,
      loadingDuration: s.loading_duration_ms ? parseInt(s.loading_duration_ms) : baseTheme.decorations.loadingDuration
    };

    const normalizeLang = (raw, base, langKey) => {
      const activeBadge = themeTextOverrides.badge || pub.theme_badge_text || raw?.announcement_badge || raw?.announcementBadge || raw?.badge || base.announcementBadge || 'OFFICIAL STORE';
      const activeBannerText = themeTextOverrides.festive_banner_text || pub.festive_banner_text || raw?.announcement_text || raw?.announcementText || base.announcementText || '';
      const activeGreeting = (langKey === 'bn' ? (themeTextOverrides.greetingBengali || pub.theme_greeting_bengali) : (themeTextOverrides.greetingEnglish || pub.theme_greeting_english)) || raw?.festival_greeting || raw?.festivalGreeting || base.festivalGreeting || '';
      const activeTagline = themeTextOverrides.loadingTagline || pub.theme_loading_tagline || raw?.loading_tagline || raw?.loadingTagline || base.loadingTagline || 'CLARITY YOU CAN TRUST';

      return {
        announcementBadge: activeBadge,
        badge: activeBadge,
        announcementText: activeBannerText,
        festivalGreeting: activeGreeting,
        heroTitle: raw?.hero_title || raw?.heroTitle || base.heroTitle || '',
        heroSubtitle: raw?.hero_subtitle || raw?.heroSubtitle || base.heroSubtitle || '',
        heroCtaText: raw?.hero_cta_text || raw?.heroCtaText || base.heroCtaText || 'Explore Collection',
        heroCtaLink: raw?.hero_cta_link || raw?.heroCtaLink || base.heroCtaLink || '/catalog',
        productBadge: raw?.product_badge || raw?.productBadge || base.productBadge || '',
        loadingGreeting: raw?.loading_greeting || raw?.loadingGreeting || base.loadingGreeting || 'NETRA UNNAYAN',
        loadingTagline: activeTagline,
        footerMessage: raw?.footer_message || raw?.footerMessage || base.footerMessage || ''
      };
    };

    const content = {
      en: normalizeLang(custom?.content?.en, baseTheme.content.en, 'en'),
      bn: normalizeLang(custom?.content?.bn, baseTheme.content.bn, 'bn')
    };

    return {
      ...baseTheme,
      slug: effectiveSlug,
      ...(custom?.name && { name: custom.name }),
      ...(custom?.description && { description: custom.description }),
      palette,
      decorations,
      content
    };
  }, [baseTheme, effectiveSlug, previewOverrides, serverThemeData, themeTextOverrides]);

  // Current language content
  const activeContent = useMemo(() => {
    return effectiveTheme.content?.[language] || effectiveTheme.content?.en || baseTheme.content.en;
  }, [effectiveTheme, language, baseTheme]);

  // Apply CSS custom properties and theme attributes onto <html>
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // 1. Dark/Light class
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      body.classList.remove('dark');
      body.classList.add('light');
    }

    // 2. Seasonal Theme Data Attribute
    root.setAttribute('data-season-theme', effectiveTheme.slug || 'default');
    body.setAttribute('data-season-theme', effectiveTheme.slug || 'default');

    // 3. Inject Central Semantic CSS Tokens
    const p = effectiveTheme.palette;
    root.style.setProperty('--theme-primary', p.primary || '#00B4D8');
    root.style.setProperty('--theme-secondary', p.secondary || '#0A192F');
    root.style.setProperty('--theme-accent', p.accent || '#00F5D4');
    root.style.setProperty('--theme-accent-secondary', p.secondary || '#0A192F');
    root.style.setProperty('--theme-bg', p.bgStart || '#FFFFFF');
    root.style.setProperty('--theme-bg-secondary', p.bgEnd || '#F8FAFC');
    root.style.setProperty('--theme-surface', p.surface || '#FFFFFF');
    root.style.setProperty('--theme-surface-glass', p.surfaceGlass || 'rgba(255, 255, 255, 0.92)');
    root.style.setProperty('--theme-text-primary', p.textPrimary || '#0F172A');
    root.style.setProperty('--theme-text-secondary', p.textSecondary || '#334155');
    root.style.setProperty('--theme-text-muted', p.textMuted || '#64748B');
    root.style.setProperty('--theme-heading', p.heading || '#0A192F');
    root.style.setProperty('--theme-border', p.border || '#E2E8F0');
    root.style.setProperty('--theme-button', p.button || '#00B4D8');
    root.style.setProperty('--theme-button-text', p.buttonText || '#FFFFFF');
    root.style.setProperty('--theme-button-hover', p.buttonHover || '#0284C7');
    root.style.setProperty('--theme-shadow', p.shadow || '0 10px 30px -5px rgba(0, 0, 0, 0.1)');
    root.style.setProperty('--theme-badge-bg', p.primary || '#00B4D8');
    root.style.setProperty('--theme-badge-text', p.buttonText || '#FFFFFF');
    root.style.setProperty('--theme-overlay', isDark ? 'rgba(5, 10, 20, 0.75)' : 'rgba(255, 255, 255, 0.75)');

    try {
      localStorage.setItem('nu_theme', theme);
      if (!previewThemeSlug) {
        localStorage.setItem('nu_seasonal_theme', effectiveTheme.slug);
      }
    } catch {}
  }, [theme, effectiveTheme, previewThemeSlug, isDark]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setSeasonalTheme = (slug) => {
    if (slug) {
      setActiveThemeSlug(slug);
      try { localStorage.setItem('nu_seasonal_theme', slug); } catch {}
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => {
      const next = prev === 'en' ? 'bn' : 'en';
      try { localStorage.setItem('nu_theme_lang', next); } catch {}
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{
      // Core state
      theme,
      toggleTheme,
      isDark: theme === 'dark',
      isLight: theme === 'light',

      // Theme engine
      activeTheme: effectiveTheme,
      seasonalTheme: effectiveTheme.slug,
      setSeasonalTheme,
      themeConfigs: BUILT_IN_THEMES,
      activeThemeDetails: {
        ...effectiveTheme,
        bannerText: activeContent.announcementText,
        badge: activeContent.announcementBadge,
        greetingBengali: effectiveTheme.content.bn.festivalGreeting,
        greetingEnglish: effectiveTheme.content.en.festivalGreeting,
        loadingTagline: activeContent.loadingTagline,
        primaryColor: effectiveTheme.palette.primary,
        accentColor: effectiveTheme.palette.accent
      },

      // Content & Language
      content: activeContent,
      language,
      setLanguage,
      toggleLanguage,

      // Live text overrides & toggles
      themeTextOverrides,
      setThemeTextOverrides,
      festiveBannerEnabled: (serverThemeData?.public_settings?.festive_banner_enabled !== undefined)
        ? (serverThemeData.public_settings.festive_banner_enabled === '1' || serverThemeData.public_settings.festive_banner_enabled === true)
        : true,
      festiveEffectsEnabled: (serverThemeData?.public_settings?.festive_effects_enabled !== undefined)
        ? (serverThemeData.public_settings.festive_effects_enabled === '1' || serverThemeData.public_settings.festive_effects_enabled === true)
        : true,

      // Decorations & Safety
      decorations: safeMode ? {
        particles: false,
        decorations: false,
        kashFlowers: false,
        diyas: false,
        snow: false,
        petals: false,
        rain: false,
        santa: false,
        chakra: false,
        intensity: 'subtle',
        speed: 0.5,
        loadingDuration: 1800
      } : effectiveTheme.decorations,
      safeMode,
      setSafeMode,

      // Preview mode for Admin
      previewThemeSlug,
      setPreviewThemeSlug,
      setPreviewOverrides,

      // Refresh from server
      refreshTheme: syncThemeFromServer
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const def = BUILT_IN_THEMES.default;
    return {
      theme: 'light',
      toggleTheme: () => {},
      isDark: false,
      isLight: true,
      activeTheme: def,
      seasonalTheme: 'default',
      setSeasonalTheme: () => {},
      themeConfigs: BUILT_IN_THEMES,
      activeThemeDetails: {
        ...def,
        bannerText: def.content.en.announcementText,
        badge: def.content.en.announcementBadge,
        greetingBengali: def.content.bn.festivalGreeting,
        greetingEnglish: def.content.en.festivalGreeting,
        loadingTagline: def.content.en.loadingTagline,
        primaryColor: def.palette.primary,
        accentColor: def.palette.accent
      },
      content: def.content.en,
      themeTextOverrides: { badge: '', greetingBengali: '', greetingEnglish: '', loadingTagline: '' },
      setThemeTextOverrides: () => {},
      festiveBannerEnabled: true,
      festiveEffectsEnabled: true,
      language: 'en',
      setLanguage: () => {},
      toggleLanguage: () => {},
      decorations: def.decorations,
      safeMode: false,
      setSafeMode: () => {},
      previewThemeSlug: null,
      setPreviewThemeSlug: () => {},
      setPreviewOverrides: () => {},
      refreshTheme: () => {}
    };
  }
  return ctx;
};
