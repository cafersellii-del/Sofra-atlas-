import { ALL_COUNTRY_HUBS } from '../data/countries';

export type AppLanguage =
  | 'tr'
  | 'en'
  | 'de'
  | 'fr'
  | 'it'
  | 'es'
  | 'pt'
  | 'ru'
  | 'ar'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'th';

export interface LanguageMeta {
  code: AppLanguage;
  shortCode: string;
  nativeName: string;
  turkishName: string;
}

export const LANGUAGE_OPTIONS: LanguageMeta[] = [
  { code: 'tr', shortCode: 'TR', nativeName: 'Türkçe', turkishName: 'Türkçe' },
  { code: 'en', shortCode: 'EN', nativeName: 'English', turkishName: 'İngilizce' },
  { code: 'de', shortCode: 'DE', nativeName: 'Deutsch', turkishName: 'Almanca' },
  { code: 'fr', shortCode: 'FR', nativeName: 'Français', turkishName: 'Fransızca' },
  { code: 'it', shortCode: 'IT', nativeName: 'Italiano', turkishName: 'İtalyanca' },
  { code: 'es', shortCode: 'ES', nativeName: 'Español', turkishName: 'İspanyolca' },
  { code: 'pt', shortCode: 'PT', nativeName: 'Português', turkishName: 'Portekizce' },
  { code: 'ru', shortCode: 'RU', nativeName: 'Русский', turkishName: 'Rusça' },
  { code: 'ar', shortCode: 'AR', nativeName: 'العربية', turkishName: 'Arapça' },
  { code: 'ja', shortCode: 'JA', nativeName: '日本語', turkishName: 'Japonca' },
  { code: 'ko', shortCode: 'KO', nativeName: '한국어', turkishName: 'Korece' },
  { code: 'zh', shortCode: 'ZH', nativeName: '中文', turkishName: 'Çince' },
  { code: 'th', shortCode: 'TH', nativeName: 'ไทย', turkishName: 'Tayca' },
];

export const LANGUAGE_META_MAP: Record<AppLanguage, LanguageMeta> =
  Object.fromEntries(
    LANGUAGE_OPTIONS.map((opt) => [opt.code, opt])
  ) as Record<AppLanguage, LanguageMeta>;

const COUNTRY_TO_LANGUAGE: Record<string, AppLanguage> = {
  // Türkçe
  tr: 'tr',
  cy: 'tr',
  az: 'tr',
  tm: 'tr',
  uz: 'tr',
  // Almanca
  de: 'de',
  at: 'de',
  ch: 'de',
  li: 'de',
  lu: 'de',
  // Fransızca
  fr: 'fr',
  be: 'fr',
  mc: 'fr',
  ht: 'fr',
  sn: 'fr',
  ci: 'fr',
  cm: 'fr',
  ml: 'fr',
  ne: 'fr',
  bf: 'fr',
  td: 'fr',
  gn: 'fr',
  tg: 'fr',
  bj: 'fr',
  cg: 'fr',
  cd: 'fr',
  ga: 'fr',
  cf: 'fr',
  bi: 'fr',
  dj: 'fr',
  km: 'fr',
  mg: 'fr',
  // İtalyanca
  it: 'it',
  sm: 'it',
  va: 'it',
  // İspanyolca
  es: 'es',
  mx: 'es',
  ar: 'es',
  co: 'es',
  cl: 'es',
  pe: 'es',
  ec: 'es',
  uy: 'es',
  py: 'es',
  bo: 'es',
  ve: 'es',
  cu: 'es',
  do: 'es',
  cr: 'es',
  pa: 'es',
  gt: 'es',
  hn: 'es',
  sv: 'es',
  ni: 'es',
  gq: 'es',
  ad: 'es',
  // Portekizce
  pt: 'pt',
  br: 'pt',
  ao: 'pt',
  mz: 'pt',
  gw: 'pt',
  cv: 'pt',
  st: 'pt',
  tl: 'pt',
  // Rusça
  ru: 'ru',
  by: 'ru',
  kz: 'ru',
  kg: 'ru',
  tj: 'ru',
  // Arapça
  ae: 'ar',
  sa: 'ar',
  qa: 'ar',
  kw: 'ar',
  bh: 'ar',
  om: 'ar',
  jo: 'ar',
  lb: 'ar',
  ps: 'ar',
  iq: 'ar',
  sy: 'ar',
  ye: 'ar',
  eg: 'ar',
  ma: 'ar',
  tn: 'ar',
  dz: 'ar',
  ly: 'ar',
  sd: 'ar',
  mr: 'ar',
  so: 'ar',
  // Japonca, Korece, Çince, Tayca
  jp: 'ja',
  kr: 'ko',
  kp: 'ko',
  cn: 'zh',
  hk: 'zh',
  tw: 'zh',
  th: 'th',
  la: 'th',
};

export function getLanguageForCountryCode(countryCode: string): AppLanguage {
  const normalized = countryCode.trim().toLowerCase();
  return COUNTRY_TO_LANGUAGE[normalized] ?? 'en';
}

export function getLanguageForCityId(cityId: string): AppLanguage {
  if (cityId === 'all') return 'tr';
  const hub = ALL_COUNTRY_HUBS.find((h) => h.id === cityId);
  if (!hub) return 'tr';
  return getLanguageForCountryCode(hub.countryCode);
}

export interface UITranslations {
  navRestaurants: string;
  navMap: string;
  navOrders: string;
  navRestaurantPortal: string;
  navAdmin: string;
  memberLogin: string;
  myAccount: string;
  myCart: string;
  languageAutoShort: string;
  languageAutoLabel: string;
  languageSelectorAria: string;
  countryLangLabel: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubtitle: string;
  allCountries: string;
  provinceWait: string;
  allProvinces: string;
  districtWait: string;
  allDistricts: string;
  addressPlaceholder: string;
  exploreRestaurantsBtn: string;
  activeRegionLabel: string;
  allWorldSummary: string;
  pickOnMap: string;
  featuredHubsLabel: string;
  heroCardBadge: string;
  heroCardTitle: string;
  proofCountriesTitle: string;
  proofCountriesDesc: string;
  proofCartTitle: string;
  proofCartDesc: string;
  proofTimeTitle: string;
  proofTimeDesc: string;
  proofPromoDesc: string;
  marketEyebrow: string;
  marketTitle: string;
  restaurantsTab: string;
  dishesTab: string;
  localCurrencyBtn: string;
  allWorldBtn: string;
  searchPlaceholder: string;
  sortRecommended: string;
  sortRating: string;
  sortFastest: string;
  sortMinBasket: string;
  vegFilter: string;
  freeDeliveryFilter: string;
  campaignFilter: string;
  partnerFilter: string;
  openMenu: string;
  addToCart: string;
  addedToCart: string;
  minBasket: string;
  delivery: string;
  freeLabel: string;
  clearFilters: string;
  noResultsTitle: string;
  mapEyebrow: string;
  mapTitle: string;
  allContinents: string;
  mapPlacesLabel: string;
  mapPlacesPlaceholder: string;
  searchBtn: string;
  searchingBtn: string;
  partnerKitchens: string;
  goToMenu: string;
  craftEyebrow: string;
  craftTitle: string;
  craftExtensionBtn: string;
  craftPartnerBtn: string;
  step1Badge: string;
  step1Title: string;
  step2Badge: string;
  step2Title: string;
  step3Badge: string;
  step3Title: string;
  step4Badge: string;
  step4Title: string;
  trackLiveBtn: string;
  statusReceived: string;
  statusPreparing: string;
  statusOnTheWay: string;
  statusDelivered: string;
  installHeader: string;
  installFooter: string;
  installedLabel: string;
  offlineMessage: string;
  footerFeaturedTitle: string;
  footerPlatformTitle: string;
  footerLanguageTitle: string;
  footerRights: string;
  footerNote: string;
  footerMapLink: string;
  footerStandardsLink: string;
  footerOrdersLink: string;
  footerExtensionLink: string;
  liveSupportBtn: string;
  liveSupportTitle: string;
  liveSupportSubtitle: string;
  chatWithRestaurant: string;
  chatWithCourier: string;
  staffInboxBtn: string;
  staffInboxTitle: string;
  chatPlaceholder: string;
  sendMessageBtn: string;
  noMessagesYet: string;
  replyAsRestaurant: string;
  replyAsCourier: string;
}

const tr: UITranslations = {
  navRestaurants: 'Restoranlar',
  navMap: 'Harita',
  navOrders: 'Siparişlerim',
  navRestaurantPortal: 'Restoran İş Ortağı',
  navAdmin: 'Yönetici Paneli',
  memberLogin: 'Üye Girişi',
  myAccount: 'Hesabım',
  myCart: 'Sepetim',
  languageAutoShort: 'Oto',
  languageAutoLabel: 'Ülkeye Göre Otomatik',
  languageSelectorAria: 'Dil seçimi',
  countryLangLabel: 'Ülke Dili',
  heroEyebrow: 'Küresel Teslimat Ağı · 197 Ülke · Tüm Bölge, İl & Mahalleler',
  heroHeadline: 'Ülke, bölge, ilçe ve mahalleni seç — açık restoranlardan anında sipariş ver.',
  heroSubtitle:
    'Türkiye’nin 81 ili, ilçeleri ve mahallelerinden dünyanın 197 ülkesindeki tüm bölge, şehir ve semtlere kadar yerel mutfakların menülerini minimum sepet, teslimat süresi ve canlı Google Maps rotasıyla karşılaştırıp sipariş oluşturun.',
  allCountries: 'Tüm Ülkeler',
  provinceWait: 'Bölge / İl / Şehir (Önce ülke)',
  allProvinces: 'Tüm Bölgeler / İller',
  districtWait: 'İlçe / Semt / Mahalle (Önce bölge)',
  allDistricts: 'Tüm İlçe, Semt & Mahalleler',
  addressPlaceholder: 'Cadde, sokak veya açık teslimat adresinizi girin...',
  exploreRestaurantsBtn: 'Restoranları Listele',
  activeRegionLabel: 'Aktif Teslimat Bölgesi',
  allWorldSummary: 'Tüm Dünya',
  pickOnMap: 'Haritada Seç',
  featuredHubsLabel: 'Öne çıkan küresel gastronomi merkezlerine hızlı geçiş',
  heroCardBadge: 'Restoran Kuryesi ile Hızlı Teslimat · Canlı Takip',
  heroCardTitle: 'Minimum sepet avantajı ve ATLAS15 ile ilk siparişte %15 indirim.',
  proofCountriesTitle: '197 Ülke · 623 Bölge',
  proofCountriesDesc: '6 kıtada 197 ülke, 623 şehir/bölge ve 3.400+ semt, ilçe & mahalle ağı',
  proofCartTitle: 'Tek Sepet Modeli',
  proofCartDesc: 'Her restoranın kendi menüsü, min. sepet tutarı ve teslimat ücreti',
  proofTimeTitle: '19–30 dk',
  proofTimeDesc: 'Restoran kuryesi ile canlı Google Maps rotalı sıcak teslimat',
  proofPromoDesc: 'Kampanyalı restoranlarda sepette anında %15 indirim',
  marketEyebrow: 'Restoran Pazaryeri',
  marketTitle: 'Şehrinizdeki açık restoranları ve menüleri keşfedin',
  restaurantsTab: 'Restoranlar',
  dishesTab: 'Tüm Yemekler',
  localCurrencyBtn: 'Yerel Kur',
  allWorldBtn: 'Tüm Dünya',
  searchPlaceholder: 'Restoran, yemek, il veya ilçe ara...',
  sortRecommended: 'Önerilen Sıralama',
  sortRating: 'Restoran Puanı (Yüksek)',
  sortFastest: 'En Hızlı Teslimat',
  sortMinBasket: 'En Düşük Min. Sepet',
  vegFilter: 'Vejetaryen',
  freeDeliveryFilter: 'Ücretsiz Teslimat',
  campaignFilter: '%15 İndirimli',
  partnerFilter: 'Üye Restoran',
  openMenu: 'Menüyü Aç',
  addToCart: 'Sepete Ekle',
  addedToCart: 'Eklendi',
  minBasket: 'Min. Sepet',
  delivery: 'Teslimat',
  freeLabel: 'Ücretsiz',
  clearFilters: 'Filtreleri Temizle',
  noResultsTitle: 'Seçili filtrelere uygun restoran veya ürün bulunamadı.',
  mapEyebrow: 'Google Maps · Küresel Teslimat Ağı',
  mapTitle: '6 kıtada ülkeleri, illeri, ilçeleri ve teslimat rotasını haritada keşfedin',
  allContinents: 'Tüm Kıtalar',
  mapPlacesLabel: 'Google Haritalar ile Bölgedeki Mekanlar',
  mapPlacesPlaceholder: 'Örn: ramen, pizza, bistro...',
  searchBtn: 'Ara',
  searchingBtn: 'Aranıyor...',
  partnerKitchens: 'Üye Mutfaklar',
  goToMenu: 'Menüye Git',
  craftEyebrow: 'Küresel Teslimat Standardı',
  craftTitle: 'Restoran masası kalitesini şehirler arası standartla koruyoruz.',
  craftExtensionBtn: 'Web Sitesi Uzantısı',
  craftPartnerBtn: 'Restoran İş Ortağı Ol',
  step1Badge: 'Adım 1/4 · Onaylandı',
  step1Title: 'Siparişiniz Alındı',
  step2Badge: 'Adım 2/4 · Mutfakta',
  step2Title: 'Şef Mutfağında Hazırlanıyor',
  step3Badge: 'Adım 3/4 · Canlı Konum Aktif',
  step3Title: 'Restoran Kuryesi Yola Çıktı!',
  step4Badge: 'Adım 4/4 · Tamamlandı',
  step4Title: 'Siparişiniz Teslim Edildi',
  trackLiveBtn: 'Canlı Haritada Takip Et',
  statusReceived: 'Sipariş Alındı',
  statusPreparing: 'Mutfakta Hazırlanıyor',
  statusOnTheWay: 'Restoran Kuryesi Yolda',
  statusDelivered: 'Teslim Edildi',
  installHeader: 'Uygulamayı İndir',
  installFooter: 'Uygulamayı İndir (App)',
  installedLabel: 'Uygulama Yüklendi',
  offlineMessage: 'Çevrimdışı mod — önbelleğe alınan içerik gösteriliyor',
  footerFeaturedTitle: 'Öne Çıkan Teslimat Ülkeleri',
  footerPlatformTitle: 'Platform',
  footerLanguageTitle: 'Ülkelere Göre Dil',
  footerRights: '© 2026 Sofra Atlas. Tüm hakları saklıdır.',
  footerNote: 'Ücretsiz teslimat ve yerel para birimi desteği seçili şehir merkezlerinde geçerlidir.',
  footerMapLink: 'Küresel Harita (Google Maps)',
  footerStandardsLink: 'Teslimat Standardı',
  footerOrdersLink: 'Sipariş Takibi',
  footerExtensionLink: 'Web Sitesi Uzantısı',
  liveSupportBtn: 'Canlı Destek',
  liveSupportTitle: 'Sipariş Canlı Destek',
  liveSupportSubtitle: 'Restoran mutfağı veya restoran kuryesi ile anlık yazışın',
  chatWithRestaurant: 'Restoran ile Sohbet',
  chatWithCourier: 'Restoran Kuryesi ile Sohbet',
  staffInboxBtn: 'Restoran / Kurye Masası',
  staffInboxTitle: 'Restoran & Kurye Canlı Destek Masası',
  chatPlaceholder: 'Mesajınızı yazın...',
  sendMessageBtn: 'Gönder',
  noMessagesYet: 'Henüz mesaj yok. Aşağıdan anlık mesaj başlatabilirsiniz.',
  replyAsRestaurant: 'Restoran Olarak Yanıtla',
  replyAsCourier: 'Kurye Olarak Yanıtla',
};

const en: UITranslations = {
  navRestaurants: 'Restaurants',
  navMap: 'Map',
  navOrders: 'My Orders',
  navRestaurantPortal: 'Partner Portal',
  navAdmin: 'Admin Panel',
  memberLogin: 'Sign In',
  myAccount: 'Account',
  myCart: 'Cart',
  languageAutoShort: 'Auto',
  languageAutoLabel: 'Auto by Country',
  languageSelectorAria: 'Select language',
  countryLangLabel: 'Country Language',
  heroEyebrow: 'Global Delivery Network · 197 Countries · Regions & Neighborhoods',
  heroHeadline: 'Pick your country, region, district & neighborhood — order fresh from open kitchens.',
  heroSubtitle:
    'Browse authentic local kitchens across 197 countries, 623 regions and 3,400+ districts & neighborhoods, compare minimum baskets and track live Google Maps routes.',
  allCountries: 'All Countries',
  provinceWait: 'Region / City / State (Pick country)',
  allProvinces: 'All Regions / Cities',
  districtWait: 'District / Neighborhood (Pick region)',
  allDistricts: 'All Districts & Neighborhoods',
  addressPlaceholder: 'Enter street, building or full delivery address...',
  exploreRestaurantsBtn: 'Browse Restaurants',
  activeRegionLabel: 'Active Delivery Zone',
  allWorldSummary: 'Worldwide',
  pickOnMap: 'Pick on Map',
  featuredHubsLabel: 'Quick jump to featured global culinary hubs',
  heroCardBadge: 'Restaurant Courier Express Delivery · Live Tracking',
  heroCardTitle: 'Transparent minimum baskets & 15% off first order with ATLAS15.',
  proofCountriesTitle: '197 Countries · 623 Regions',
  proofCountriesDesc: '6 continents, 197 countries, and 3,400+ districts & neighborhoods',
  proofCartTitle: 'Single-Cart Model',
  proofCartDesc: 'Dedicated kitchen menus, clear min. basket & transparent fees',
  proofTimeTitle: '19–30 min',
  proofTimeDesc: 'Hot restaurant courier delivery routed live via Google Maps',
  proofPromoDesc: 'Instant 15% basket discount at participating restaurants',
  marketEyebrow: 'Restaurant Marketplace',
  marketTitle: 'Explore open restaurants and menus in your area',
  restaurantsTab: 'Restaurants',
  dishesTab: 'All Dishes',
  localCurrencyBtn: 'Local Currency',
  allWorldBtn: 'Worldwide',
  searchPlaceholder: 'Search restaurant, dish, city or district...',
  sortRecommended: 'Recommended',
  sortRating: 'Top Rated',
  sortFastest: 'Fastest Delivery',
  sortMinBasket: 'Lowest Min. Basket',
  vegFilter: 'Vegetarian',
  freeDeliveryFilter: 'Free Delivery',
  campaignFilter: '15% Off',
  partnerFilter: 'Partner Kitchen',
  openMenu: 'Open Menu',
  addToCart: 'Add to Cart',
  addedToCart: 'Added',
  minBasket: 'Min. Basket',
  delivery: 'Delivery',
  freeLabel: 'Free',
  clearFilters: 'Clear Filters',
  noResultsTitle: 'No restaurants or dishes match your active filters.',
  mapEyebrow: 'Google Maps · Global Delivery Network',
  mapTitle: 'Explore countries, districts, and live delivery routes on the map',
  allContinents: 'All Continents',
  mapPlacesLabel: 'Nearby Places via Google Maps',
  mapPlacesPlaceholder: 'e.g. ramen, pizza, bistro...',
  searchBtn: 'Search',
  searchingBtn: 'Searching...',
  partnerKitchens: 'Partner Kitchens',
  goToMenu: 'Go to Menu',
  craftEyebrow: 'Global Delivery Standard',
  craftTitle: 'Preserving dine-in kitchen quality across every city delivery.',
  craftExtensionBtn: 'Website Extension',
  craftPartnerBtn: 'Join as Partner Restaurant',
  step1Badge: 'Step 1/4 · Confirmed',
  step1Title: 'Order Received',
  step2Badge: 'Step 2/4 · Cooking',
  step2Title: 'Preparing in Kitchen',
  step3Badge: 'Step 3/4 · Live GPS Active',
  step3Title: 'Restaurant Courier On the Way!',
  step4Badge: 'Step 4/4 · Completed',
  step4Title: 'Order Delivered',
  trackLiveBtn: 'Track Live on Map',
  statusReceived: 'Order Received',
  statusPreparing: 'Preparing',
  statusOnTheWay: 'On the Way',
  statusDelivered: 'Delivered',
  installHeader: 'Install App',
  installFooter: 'Download App (PWA)',
  installedLabel: 'App Installed',
  offlineMessage: 'Offline mode — showing cached content',
  footerFeaturedTitle: 'Featured Delivery Countries',
  footerPlatformTitle: 'Platform',
  footerLanguageTitle: 'Language by Country',
  footerRights: '© 2026 Sofra Atlas. All rights reserved.',
  footerNote: 'Free delivery and local currency support apply in participating city hubs.',
  footerMapLink: 'Global Map (Google Maps)',
  footerStandardsLink: 'Delivery Standards',
  footerOrdersLink: 'Order Tracking',
  footerExtensionLink: 'Website Extension',
  liveSupportBtn: 'Live Support',
  liveSupportTitle: 'Order Live Support',
  liveSupportSubtitle: 'Message the restaurant kitchen or delivery courier in real time',
  chatWithRestaurant: 'Chat with Restaurant',
  chatWithCourier: 'Chat with Courier',
  staffInboxBtn: 'Kitchen / Courier Desk',
  staffInboxTitle: 'Restaurant & Courier Live Support Desk',
  chatPlaceholder: 'Type your message...',
  sendMessageBtn: 'Send',
  noMessagesYet: 'No messages yet. Start a live conversation below.',
  replyAsRestaurant: 'Reply as Restaurant',
  replyAsCourier: 'Reply as Courier',
};

const de: UITranslations = {
  ...en,
  navRestaurants: 'Restaurants',
  navMap: 'Karte',
  navOrders: 'Bestellungen',
  navRestaurantPortal: 'Partner-Portal',
  navAdmin: 'Admin-Panel',
  memberLogin: 'Anmelden',
  myAccount: 'Konto',
  myCart: 'Warenkorb',
  languageAutoShort: 'Auto',
  languageAutoLabel: 'Automatisch nach Land',
  languageSelectorAria: 'Sprache wählen',
  countryLangLabel: 'Landessprache',
  heroEyebrow: 'Globales Liefernetz · 197 Länder · Städte & Bezirke',
  heroHeadline: 'Land, Stadt & Bezirk wählen — sofort bei offenen Küchen bestellen.',
  heroSubtitle:
    'Entdecke lokale Spitzenküchen in 197 Ländern, vergleiche Mindestbestellwert und Lieferzeit und verfolge deine Lieferung live auf Google Maps.',
  allCountries: 'Alle Länder',
  provinceWait: 'Stadt / Region (Erst Land)',
  allProvinces: 'Alle Städte / Regionen',
  districtWait: 'Bezirk (Erst Stadt)',
  allDistricts: 'Alle Bezirke',
  addressPlaceholder: 'Straße, Hausnummer oder Lieferadresse eingeben...',
  exploreRestaurantsBtn: 'Restaurants anzeigen',
  activeRegionLabel: 'Aktives Liefergebiet',
  allWorldSummary: 'Weltweit',
  pickOnMap: 'Auf Karte wählen',
  featuredHubsLabel: 'Schnellwahl beliebter globaler Genusszentren',
  heroCardBadge: 'Express-Lieferung · Live-Kurier-Tracking',
  heroCardTitle: 'Faire Mindestbestellwerte & 15 % Rabatt mit ATLAS15.',
  marketEyebrow: 'Restaurant-Marktplatz',
  marketTitle: 'Offene Restaurants und Menüs in deiner Nähe entdecken',
  restaurantsTab: 'Restaurants',
  dishesTab: 'Alle Gerichte',
  localCurrencyBtn: 'Landeswährung',
  allWorldBtn: 'Weltweit',
  searchPlaceholder: 'Restaurant, Gericht oder Bezirk suchen...',
  sortRecommended: 'Empfohlen',
  sortRating: 'Beste Bewertung',
  sortFastest: 'Schnellste Lieferung',
  sortMinBasket: 'Kleinster Mindestbestellwert',
  vegFilter: 'Vegetarisch',
  freeDeliveryFilter: 'Gratis Lieferung',
  campaignFilter: '15 % Rabatt',
  partnerFilter: 'Partner-Restaurant',
  openMenu: 'Menü öffnen',
  addToCart: 'In den Warenkorb',
  addedToCart: 'Hinzugefügt',
  minBasket: 'Mindestwert',
  delivery: 'Lieferung',
  freeLabel: 'Gratis',
  clearFilters: 'Filter zurücksetzen',
  noResultsTitle: 'Keine passenden Restaurants oder Gerichte gefunden.',
  mapEyebrow: 'Google Maps · Globales Liefernetz',
  mapTitle: 'Länder, Bezirke und Live-Lieferrouten auf der Karte erkunden',
  allContinents: 'Alle Kontinente',
  searchBtn: 'Suchen',
  searchingBtn: 'Suche...',
  goToMenu: 'Zum Menü',
  step1Title: 'Bestellung eingegangen',
  step2Title: 'Wird frisch zubereitet',
  step3Title: 'Kurier ist unterwegs!',
  step4Title: 'Geliefert',
  trackLiveBtn: 'Live auf Karte verfolgen',
  installHeader: 'App laden',
  installFooter: 'App herunterladen (PWA)',
  footerLanguageTitle: 'Sprache nach Land',
};

const fr: UITranslations = {
  ...en,
  navRestaurants: 'Restaurants',
  navMap: 'Carte',
  navOrders: 'Mes Commandes',
  navRestaurantPortal: 'Espace Partenaire',
  navAdmin: 'Administration',
  memberLogin: 'Connexion',
  myAccount: 'Mon Compte',
  myCart: 'Panier',
  languageAutoShort: 'Auto',
  languageAutoLabel: 'Automatique selon le pays',
  languageSelectorAria: 'Choisir la langue',
  countryLangLabel: 'Langue du pays',
  heroEyebrow: 'Réseau Mondial · 197 Pays · Villes & Quartiers',
  heroHeadline: 'Choisissez pays, ville et quartier — commandez instantanément.',
  heroSubtitle:
    'Parcourez les cuisines locales de 197 pays, comparez les paniers minimums et suivez votre livreur en direct sur Google Maps.',
  allCountries: 'Tous les pays',
  provinceWait: 'Ville / Région',
  allProvinces: 'Toutes les villes',
  districtWait: 'Quartier / Arrondissement',
  allDistricts: 'Tous les quartiers',
  addressPlaceholder: 'Entrez votre rue ou adresse de livraison...',
  exploreRestaurantsBtn: 'Voir les restaurants',
  activeRegionLabel: 'Zone de livraison active',
  allWorldSummary: 'Monde entier',
  pickOnMap: 'Choisir sur la carte',
  featuredHubsLabel: 'Accès rapide aux capitales gastronomiques',
  heroCardBadge: 'Livraison Express · Suivi Livreur en Direct',
  heroCardTitle: 'Panier minimum clair et -15 % avec le code ATLAS15.',
  marketEyebrow: 'Marché des Restaurants',
  marketTitle: 'Découvrez les restaurants ouverts et leurs cartes',
  restaurantsTab: 'Restaurants',
  dishesTab: 'Tous les plats',
  localCurrencyBtn: 'Devise locale',
  allWorldBtn: 'Monde entier',
  searchPlaceholder: 'Rechercher restaurant, plat ou quartier...',
  sortRecommended: 'Recommandés',
  sortRating: 'Mieux notés',
  sortFastest: 'Livraison rapide',
  sortMinBasket: 'Panier minimum bas',
  vegFilter: 'Végétarien',
  freeDeliveryFilter: 'Livraison gratuite',
  campaignFilter: '-15 % Promo',
  partnerFilter: 'Partenaire',
  openMenu: 'Voir la carte',
  addToCart: 'Ajouter',
  addedToCart: 'Ajouté',
  minBasket: 'Minimum',
  delivery: 'Livraison',
  freeLabel: 'Gratuite',
  clearFilters: 'Réinitialiser',
  noResultsTitle: 'Aucun restaurant ou plat trouvé pour ces filtres.',
  mapEyebrow: 'Google Maps · Réseau Mondial',
  mapTitle: 'Explorez pays, quartiers et itinéraires en direct sur la carte',
  allContinents: 'Tous les continents',
  searchBtn: 'Chercher',
  searchingBtn: 'Recherche...',
  goToMenu: 'Voir le menu',
  step1Title: 'Commande reçue',
  step2Title: 'En préparation',
  step3Title: 'Livreur en route !',
  step4Title: 'Commande livrée',
  trackLiveBtn: 'Suivre en direct',
  installHeader: 'Installer',
  installFooter: 'Télécharger l’application',
  footerLanguageTitle: 'Langue par pays',
};

const it: UITranslations = {
  ...en,
  navRestaurants: 'Ristoranti',
  navMap: 'Mappa',
  navOrders: 'I Miei Ordini',
  navRestaurantPortal: 'Area Partner',
  navAdmin: 'Pannello Admin',
  memberLogin: 'Accedi',
  myAccount: 'Account',
  myCart: 'Carrello',
  languageAutoShort: 'Auto',
  languageAutoLabel: 'Automatico per paese',
  languageSelectorAria: 'Seleziona lingua',
  countryLangLabel: 'Lingua del paese',
  heroEyebrow: 'Rete Globale · 197 Paesi · Città e Quartieri',
  heroHeadline: 'Scegli paese, città e quartiere — ordina subito dai locali aperti.',
  heroSubtitle:
    'Scopri le cucine locali in 197 paesi, confronta ordine minimo e tempi di consegna e segui il corriere in tempo reale su Google Maps.',
  allCountries: 'Tutti i paesi',
  allProvinces: 'Tutte le città',
  allDistricts: 'Tutti i quartieri',
  addressPlaceholder: 'Inserisci via, numero civico o indirizzo di consegna...',
  exploreRestaurantsBtn: 'Mostra Ristoranti',
  activeRegionLabel: 'Zona di consegna attiva',
  allWorldSummary: 'Tutto il mondo',
  pickOnMap: 'Scegli su mappa',
  featuredHubsLabel: 'Accesso rapido alle capitali gastronomiche',
  marketEyebrow: 'Mercato Ristoranti',
  marketTitle: 'Scopri ristoranti aperti e menu nella tua zona',
  restaurantsTab: 'Ristoranti',
  dishesTab: 'Tutti i piatti',
  localCurrencyBtn: 'Valuta locale',
  allWorldBtn: 'Tutto il mondo',
  searchPlaceholder: 'Cerca ristorante, piatto o quartiere...',
  vegFilter: 'Vegetariano',
  freeDeliveryFilter: 'Consegna gratuita',
  openMenu: 'Apri Menu',
  addToCart: 'Aggiungi',
  addedToCart: 'Aggiunto',
  minBasket: 'Ordine min.',
  delivery: 'Consegna',
  freeLabel: 'Gratis',
  clearFilters: 'Reimposta filtri',
  trackLiveBtn: 'Segui su mappa',
  installHeader: 'Installa App',
  footerLanguageTitle: 'Lingua per paese',
};

const es: UITranslations = {
  ...en,
  navRestaurants: 'Restaurantes',
  navMap: 'Mapa',
  navOrders: 'Mis Pedidos',
  navRestaurantPortal: 'Portal Socio',
  navAdmin: 'Panel Admin',
  memberLogin: 'Iniciar Sesión',
  myAccount: 'Mi Cuenta',
  myCart: 'Carrito',
  languageAutoShort: 'Auto',
  languageAutoLabel: 'Automático según país',
  languageSelectorAria: 'Seleccionar idioma',
  countryLangLabel: 'Idioma del país',
  heroEyebrow: 'Red Global · 197 Países · Ciudades y Distritos',
  heroHeadline: 'Elige país, ciudad y distrito — pide al instante en locales abiertos.',
  heroSubtitle:
    'Explora cocinas locales en 197 países, compara pedido mínimo y tiempos de entrega, y sigue tu pedido en vivo por Google Maps.',
  allCountries: 'Todos los países',
  allProvinces: 'Todas las ciudades',
  allDistricts: 'Todos los distritos',
  addressPlaceholder: 'Ingresa calle, número o dirección de entrega...',
  exploreRestaurantsBtn: 'Ver Restaurantes',
  activeRegionLabel: 'Zona de entrega activa',
  allWorldSummary: 'Todo el mundo',
  pickOnMap: 'Elegir en mapa',
  featuredHubsLabel: 'Acceso rápido a destinos gastronómicos globales',
  marketEyebrow: 'Mercado de Restaurantes',
  marketTitle: 'Descubre restaurantes abiertos y menús en tu zona',
  restaurantsTab: 'Restaurantes',
  dishesTab: 'Todos los platos',
  localCurrencyBtn: 'Moneda local',
  allWorldBtn: 'Todo el mundo',
  searchPlaceholder: 'Buscar restaurante, plato o distrito...',
  vegFilter: 'Vegetariano',
  freeDeliveryFilter: 'Envío gratis',
  openMenu: 'Ver Menú',
  addToCart: 'Añadir',
  addedToCart: 'Añadido',
  minBasket: 'Pedido mín.',
  delivery: 'Envío',
  freeLabel: 'Gratis',
  clearFilters: 'Limpiar filtros',
  trackLiveBtn: 'Seguir en mapa',
  installHeader: 'Instalar App',
  footerLanguageTitle: 'Idioma por país',
};

const pt: UITranslations = {
  ...en,
  navRestaurants: 'Restaurantes',
  navMap: 'Mapa',
  navOrders: 'Meus Pedidos',
  memberLogin: 'Entrar',
  myAccount: 'Minha Conta',
  myCart: 'Carrinho',
  languageAutoLabel: 'Automático por país',
  countryLangLabel: 'Idioma do país',
  heroHeadline: 'Escolha país, cidade e bairro — peça na hora dos locais abertos.',
  allCountries: 'Todos os países',
  exploreRestaurantsBtn: 'Ver Restaurantes',
  activeRegionLabel: 'Área de entrega ativa',
  openMenu: 'Ver Cardápio',
  addToCart: 'Adicionar',
  addedToCart: 'Adicionado',
  freeLabel: 'Grátis',
  trackLiveBtn: 'Rastrear no mapa',
  installHeader: 'Instalar App',
  footerLanguageTitle: 'Idioma por país',
};

const ru: UITranslations = {
  ...en,
  navRestaurants: 'Рестораны',
  navMap: 'Карта',
  navOrders: 'Мои заказы',
  navRestaurantPortal: 'Для ресторанов',
  navAdmin: 'Админ-панель',
  memberLogin: 'Войти',
  myAccount: 'Аккаунт',
  myCart: 'Корзина',
  languageAutoShort: 'Авто',
  languageAutoLabel: 'Авто по стране',
  languageSelectorAria: 'Выбор языка',
  countryLangLabel: 'Язык страны',
  heroEyebrow: 'Глобальная доставка · 197 стран · Города и районы',
  heroHeadline: 'Выберите страну, город и район — заказывайте из открытых кухонь.',
  heroSubtitle:
    'Изучайте меню ресторанов в 197 странах, сравнивайте минимальный заказ и отслеживайте курьера на карте Google Maps.',
  allCountries: 'Все страны',
  allProvinces: 'Все города',
  allDistricts: 'Все районы',
  addressPlaceholder: 'Введите улицу, дом или адрес доставки...',
  exploreRestaurantsBtn: 'Показать рестораны',
  activeRegionLabel: 'Активная зона доставки',
  allWorldSummary: 'Весь мир',
  pickOnMap: 'На карте',
  marketEyebrow: 'Маркетплейс ресторанов',
  marketTitle: 'Откройте доступные рестораны и меню рядом с вами',
  restaurantsTab: 'Рестораны',
  dishesTab: 'Все блюда',
  localCurrencyBtn: 'Местная валюта',
  allWorldBtn: 'Весь мир',
  searchPlaceholder: 'Поиск ресторана, блюда или района...',
  vegFilter: 'Вегетарианское',
  freeDeliveryFilter: 'Бесплатная доставка',
  openMenu: 'Открыть меню',
  addToCart: 'В корзину',
  addedToCart: 'Добавлено',
  minBasket: 'Мин. заказ',
  delivery: 'Доставка',
  freeLabel: 'Бесплатно',
  clearFilters: 'Сбросить фильтры',
  trackLiveBtn: 'Отследить на карте',
  installHeader: 'Установить',
  footerLanguageTitle: 'Язык по стране',
};

const ar: UITranslations = {
  ...en,
  navRestaurants: 'المطاعم',
  navMap: 'الخريطة',
  navOrders: 'طلباتي',
  navRestaurantPortal: 'بوابة المطاعم',
  navAdmin: 'لوحة التحكم',
  memberLogin: 'تسجيل الدخول',
  myAccount: 'حسابي',
  myCart: 'السلة',
  languageAutoShort: 'تلقائي',
  languageAutoLabel: 'تلقائي حسب الدولة',
  languageSelectorAria: 'اختيار اللغة',
  countryLangLabel: 'لغة الدولة',
  heroEyebrow: 'شبكة توصيل عالمية · 197 دولة · مدن وأحياء',
  heroHeadline: 'اختر الدولة والمدينة والحي واطلب فوراً من المطاعم المفتوحة.',
  heroSubtitle:
    'تصفح قوائم المطاعم المحلية في 197 دولة وقارن الحد الأدنى للطلب ووقت التوصيل مع تتبع مباشر عبر خرائط Google.',
  allCountries: 'جميع الدول',
  allProvinces: 'جميع المدن',
  allDistricts: 'جميع الأحياء',
  addressPlaceholder: 'أدخل الشارع أو عنوان التوصيل الكامل...',
  exploreRestaurantsBtn: 'عرض المطاعم',
  activeRegionLabel: 'منطقة التوصيل النشطة',
  allWorldSummary: 'كل العالم',
  pickOnMap: 'اختر من الخريطة',
  marketEyebrow: 'سوق المطاعم',
  marketTitle: 'اكتشف المطاعم المفتوحة وقوائم الطعام في مدينتك',
  restaurantsTab: 'المطاعم',
  dishesTab: 'كل الأطباق',
  localCurrencyBtn: 'العملة المحلية',
  allWorldBtn: 'كل العالم',
  searchPlaceholder: 'ابحث عن مطعم أو طبق أو حي...',
  vegFilter: 'نباتي',
  freeDeliveryFilter: 'توصيل مجاني',
  openMenu: 'عرض القائمة',
  addToCart: 'أضف للسلة',
  addedToCart: 'تمت الإضافة',
  minBasket: 'الحد الأدنى',
  delivery: 'التوصيل',
  freeLabel: 'مجاني',
  clearFilters: 'مسح الفلاتر',
  trackLiveBtn: 'تتبع على الخريطة',
  installHeader: 'تثبيت التطبيق',
  footerLanguageTitle: 'اللغة حسب الدولة',
};

const ja: UITranslations = {
  ...en,
  navRestaurants: 'レストラン',
  navMap: 'マップ',
  navOrders: '注文履歴',
  navRestaurantPortal: '加盟店ポータル',
  navAdmin: '管理パネル',
  memberLogin: 'ログイン',
  myAccount: 'アカウント',
  myCart: 'カート',
  languageAutoShort: '自動',
  languageAutoLabel: '国別自動設定',
  languageSelectorAria: '言語を選択',
  countryLangLabel: '選択中の国の言語',
  heroEyebrow: '世界配送ネットワーク · 197カ国 · 都市・エリア対応',
  heroHeadline: '国・都市・エリアを選んで、営業中のレストランからすぐ注文。',
  heroSubtitle:
    '世界197カ国のローカル名店メニューを比較し、Googleマップのリアルタイムルート追跡で出来たてをお届けします。',
  allCountries: 'すべての国',
  allProvinces: 'すべての都市',
  allDistricts: 'すべてのエリア',
  addressPlaceholder: '住所・建物名・お届け先を入力...',
  exploreRestaurantsBtn: 'レストランを探す',
  activeRegionLabel: 'お届け先エリア',
  allWorldSummary: '全世界',
  pickOnMap: '地図で選ぶ',
  featuredHubsLabel: '世界の人気グルメ都市へクイック移動',
  marketEyebrow: 'レストランマーケット',
  marketTitle: 'エリア内の営業中レストランとメニューを探す',
  restaurantsTab: 'レストラン',
  dishesTab: 'すべての料理',
  localCurrencyBtn: '現地通貨',
  allWorldBtn: '全世界',
  searchPlaceholder: '店名・料理・エリアで検索...',
  sortRecommended: 'おすすめ順',
  sortRating: '評価が高い順',
  sortFastest: '配達が早い順',
  sortMinBasket: '最低注文額が低い順',
  vegFilter: 'ベジタリアン',
  freeDeliveryFilter: '配送料無料',
  campaignFilter: '15% OFF',
  partnerFilter: '加盟店',
  openMenu: 'メニューを開く',
  addToCart: 'カートに追加',
  addedToCart: '追加済み',
  minBasket: '最低注文額',
  delivery: '配達料',
  freeLabel: '無料',
  clearFilters: 'フィルター解除',
  noResultsTitle: '条件に一致するレストランや料理が見つかりません。',
  mapEyebrow: 'Google Maps · グローバル配送網',
  mapTitle: '地図上で国・エリア・リアルタイム配送ルートを確認',
  allContinents: 'すべての大陸',
  searchBtn: '検索',
  searchingBtn: '検索中...',
  goToMenu: 'メニューへ',
  step1Title: '注文を受け付けました',
  step2Title: 'キッチンで調理中',
  step3Title: '配達員が向かっています！',
  step4Title: '配達が完了しました',
  trackLiveBtn: '地図でリアルタイム追跡',
  installHeader: 'アプリ入手',
  footerLanguageTitle: '国別の言語設定',
};

const ko: UITranslations = {
  ...en,
  navRestaurants: '레스토랑',
  navMap: '지도',
  navOrders: '주문 내역',
  navRestaurantPortal: '파트너 포털',
  navAdmin: '관리자',
  memberLogin: '로그인',
  myAccount: '내 계정',
  myCart: '장바구니',
  languageAutoShort: '자동',
  languageAutoLabel: '국가별 자동',
  languageSelectorAria: '언어 선택',
  countryLangLabel: '국가 언어',
  heroEyebrow: '글로벌 배달 네트워크 · 197개국 · 도시 및 지역',
  heroHeadline: '국가, 도시, 지역을 선택하고 영업 중인 레스토랑에서 바로 주문하세요.',
  heroSubtitle:
    '전 세계 197개국 로컬 맛집의 메뉴와 최소 주문 금액을 비교하고 Google 지도 실시간 경로로 배달 현황을 확인하세요.',
  allCountries: '전체 국가',
  allProvinces: '전체 도시',
  allDistricts: '전체 지역',
  addressPlaceholder: '배달받으실 도로명 또는 상세 주소를 입력하세요...',
  exploreRestaurantsBtn: '레스토랑 보기',
  activeRegionLabel: '활성 배달 지역',
  allWorldSummary: '전 세계',
  pickOnMap: '지도에서 선택',
  marketEyebrow: '레스토랑 마켓플레이스',
  marketTitle: '주변의 오픈된 레스토랑과 메뉴를 둘러보세요',
  restaurantsTab: '레스토랑',
  dishesTab: '전체 메뉴',
  localCurrencyBtn: '현지 통화',
  allWorldBtn: '전 세계',
  searchPlaceholder: '레스토랑, 요리 또는 지역 검색...',
  vegFilter: '채식',
  freeDeliveryFilter: '무료 배달',
  openMenu: '메뉴 보기',
  addToCart: '담기',
  addedToCart: '담김',
  minBasket: '최소 주문',
  delivery: '배달비',
  freeLabel: '무료',
  clearFilters: '필터 초기화',
  trackLiveBtn: '지도에서 실시간 추적',
  installHeader: '앱 설치',
  footerLanguageTitle: '국가별 언어 설정',
};

const zh: UITranslations = {
  ...en,
  navRestaurants: '餐厅',
  navMap: '地图',
  navOrders: '我的订单',
  navRestaurantPortal: '商家入驻',
  navAdmin: '管理后台',
  memberLogin: '登录',
  myAccount: '我的账户',
  myCart: '购物车',
  languageAutoShort: '自动',
  languageAutoLabel: '按国家自动切换',
  languageSelectorAria: '选择语言',
  countryLangLabel: '国家语言',
  heroEyebrow: '全球配送网络 · 197个国家 · 城市与区县',
  heroHeadline: '选择国家、城市与区域，立即从营业中的精选餐厅下单。',
  heroSubtitle:
    '浏览全球197个国家本地主厨餐厅菜单，对比起送价与配送时间，并通过 Google Maps 实时追踪骑手路线。',
  allCountries: '全部国家',
  allProvinces: '全部城市',
  allDistricts: '全部区域',
  addressPlaceholder: '输入街道、门牌号或详细配送地址...',
  exploreRestaurantsBtn: '查看餐厅',
  activeRegionLabel: '当前配送区域',
  allWorldSummary: '全球',
  pickOnMap: '地图选点',
  marketEyebrow: '精选餐厅市场',
  marketTitle: '探索您所在区域的营业餐厅与菜单',
  restaurantsTab: '餐厅',
  dishesTab: '全部菜品',
  localCurrencyBtn: '当地货币',
  allWorldBtn: '全球',
  searchPlaceholder: '搜索餐厅、菜品或区域...',
  vegFilter: '素食',
  freeDeliveryFilter: '免配送费',
  openMenu: '查看菜单',
  addToCart: '加入购物车',
  addedToCart: '已加入',
  minBasket: '起送价',
  delivery: '配送费',
  freeLabel: '免费',
  clearFilters: '清除筛选',
  trackLiveBtn: '地图实时追踪',
  installHeader: '下载应用',
  footerLanguageTitle: '按国家选择语言',
};

const th: UITranslations = {
  ...en,
  navRestaurants: 'ร้านอาหาร',
  navMap: 'แผนที่',
  navOrders: 'คำสั่งซื้อของฉัน',
  memberLogin: 'เข้าสู่ระบบ',
  myAccount: 'บัญชีของฉัน',
  myCart: 'ตะกร้า',
  languageAutoShort: 'อัตโนมัติ',
  languageAutoLabel: 'อัตโนมัติตามประเทศ',
  countryLangLabel: 'ภาษาของประเทศ',
  heroHeadline: 'เลือกประเทศ เมือง และเขต — สั่งอาหารสดใหม่จากร้านที่เปิดบริการทันที',
  allCountries: 'ทุกประเทศ',
  exploreRestaurantsBtn: 'ดูร้านอาหาร',
  activeRegionLabel: 'พื้นที่จัดส่งที่เลือก',
  openMenu: 'เปิดเมนู',
  addToCart: 'เพิ่มลงตะกร้า',
  addedToCart: 'เพิ่มแล้ว',
  freeLabel: 'ฟรี',
  trackLiveBtn: 'ติดตามบนแผนที่สด',
  installHeader: 'ติดตั้งแอป',
  footerLanguageTitle: 'ภาษาตามประเทศ',
};

export const TRANSLATIONS: Record<AppLanguage, UITranslations> = {
  tr,
  en,
  de,
  fr,
  it,
  es,
  pt,
  ru,
  ar,
  ja,
  ko,
  zh,
  th,
};
