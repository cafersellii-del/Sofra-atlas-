import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Clock,
  Globe,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  CITY_HUBS,
  CONTINENTS,
  CUISINE_CATEGORIES,
  FEATURED_GLOBAL_HUBS,
} from '../data/catalog';
import {
  getDistrictsForProvince,
  getProvincesForCountry,
} from '../data/locations';
import type {
  CityId,
  ContinentId,
  CuisineCategory,
  CurrencyMode,
  Dish,
  RestaurantSortOption,
  RestaurantStorefront,
} from '../types/food';
import { useLanguage } from '../i18n/LanguageContext';
import { formatPrice } from '../utils/currency';
import { CountrySelectOptions } from './CountrySelectOptions';
import { DishImage } from './DishImage';

interface RestaurantMarketplaceProps {
  restaurants: RestaurantStorefront[];
  dishes: Dish[];
  selectedCity: CityId;
  onSelectCity: (cityId: CityId) => void;
  selectedProvince: 'all' | string;
  onSelectProvince: (province: 'all' | string) => void;
  selectedDistrict: 'all' | string;
  onSelectDistrict: (district: 'all' | string) => void;
  selectedContinent: 'all' | ContinentId;
  onSelectContinent: (continent: 'all' | ContinentId) => void;
  selectedCategory: CuisineCategory;
  onSelectCategory: (cat: CuisineCategory) => void;
  currencyMode: CurrencyMode;
  onChangeCurrencyMode: (mode: CurrencyMode) => void;
  vegetarianOnly: boolean;
  onToggleVegetarian: () => void;
  freeDeliveryOnly: boolean;
  onToggleFreeDelivery: () => void;
  campaignOnly: boolean;
  onToggleCampaign: () => void;
  partnerOnly: boolean;
  onTogglePartnerOnly: () => void;
  sortBy: RestaurantSortOption;
  onChangeSortBy: (sort: RestaurantSortOption) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedRestaurantFilter: string | null;
  onClearRestaurantFilter: () => void;
  onOpenRestaurant: (restaurant: RestaurantStorefront) => void;
  onSelectDish: (dish: Dish) => void;
  onQuickAdd: (dish: Dish) => void;
  onResetFilters: () => void;
  onOpenRestaurantPortal?: () => void;
}

const SORT_OPTIONS: { id: RestaurantSortOption; label: string }[] = [
  { id: 'recommended', label: 'Önerilen Sıralama' },
  { id: 'rating', label: 'Restoran Puanı (Yüksek)' },
  { id: 'fastest', label: 'En Hızlı Teslimat' },
  { id: 'min_basket', label: 'En Düşük Min. Sepet' },
];

export function RestaurantMarketplace({
  restaurants,
  dishes,
  selectedCity,
  onSelectCity,
  selectedProvince,
  onSelectProvince,
  selectedDistrict,
  onSelectDistrict,
  selectedContinent,
  onSelectContinent,
  selectedCategory,
  onSelectCategory,
  currencyMode,
  onChangeCurrencyMode,
  vegetarianOnly,
  onToggleVegetarian,
  freeDeliveryOnly,
  onToggleFreeDelivery,
  campaignOnly,
  onToggleCampaign,
  partnerOnly,
  onTogglePartnerOnly,
  sortBy,
  onChangeSortBy,
  searchQuery,
  onSearchChange,
  selectedRestaurantFilter,
  onClearRestaurantFilter,
  onOpenRestaurant,
  onSelectDish,
  onQuickAdd,
  onResetFilters,
  onOpenRestaurantPortal,
}: RestaurantMarketplaceProps) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'restaurants' | 'dishes'>(
    'restaurants'
  );
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const sortOptions: { id: RestaurantSortOption; label: string }[] = [
    { id: 'recommended', label: t.sortRecommended },
    { id: 'rating', label: t.sortRating },
    { id: 'fastest', label: t.sortFastest },
    { id: 'min_basket', label: t.sortMinBasket },
  ];

  const provinces = useMemo(
    () => (selectedCity === 'all' ? [] : getProvincesForCountry(selectedCity)),
    [selectedCity]
  );

  const districts = useMemo(() => {
    if (selectedCity === 'all' || selectedProvince === 'all') return [];
    return getDistrictsForProvince(selectedCity, selectedProvince);
  }, [selectedCity, selectedProvince]);

  const activeHub = useMemo(
    () => CITY_HUBS.find((h) => h.id === selectedCity),
    [selectedCity]
  );

  const activeLocationLabel = useMemo(() => {
    if (selectedCity === 'all') return 'Seçili Bölge';
    return [
      activeHub?.country ?? selectedCity,
      selectedProvince !== 'all' ? selectedProvince : null,
      selectedDistrict !== 'all' ? selectedDistrict : null,
    ]
      .filter(Boolean)
      .join(' / ');
  }, [selectedCity, activeHub, selectedProvince, selectedDistrict]);

  const handleQuickAddClick = (e: React.MouseEvent, dish: Dish) => {
    e.stopPropagation();
    onQuickAdd(dish);
    setRecentlyAddedId(dish.id);
    window.setTimeout(() => {
      setRecentlyAddedId((prev) => (prev === dish.id ? null : prev));
    }, 1100);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCity !== 'all') count += 1;
    if (selectedProvince !== 'all') count += 1;
    if (selectedDistrict !== 'all') count += 1;
    if (selectedContinent !== 'all') count += 1;
    if (selectedCategory !== 'Tümü') count += 1;
    if (vegetarianOnly) count += 1;
    if (freeDeliveryOnly) count += 1;
    if (campaignOnly) count += 1;
    if (partnerOnly) count += 1;
    if (searchQuery.trim()) count += 1;
    return count;
  }, [
    selectedCity,
    selectedProvince,
    selectedDistrict,
    selectedContinent,
    selectedCategory,
    vegetarianOnly,
    freeDeliveryOnly,
    campaignOnly,
    partnerOnly,
    searchQuery,
  ]);

  return (
    <section id="restoranlar" className="py-12 lg:py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        {selectedRestaurantFilter && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-white border border-[#D9043D]/40 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#141413]">
              Özel restoran görünümü aktif:{' '}
              <strong className="font-semibold">
                {restaurants[0]?.name ?? selectedRestaurantFilter}
              </strong>
            </p>
            <button
              type="button"
              onClick={onClearRestaurantFilter}
              className="text-xs font-medium text-[#D9043D] hover:underline cursor-pointer"
            >
              Tüm Restoranları Göster
            </button>
          </div>
        )}

        {/* Section Header + Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-2">
              {t.marketEyebrow}
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl font-semibold text-[#141413] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              {t.marketTitle}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            {/* Restoranlar / Tabaklar View Toggle */}
            <div
              className="inline-flex items-center p-1 bg-[#EFECE6] rounded-lg"
              role="group"
              aria-label="Görünüm modu"
            >
              <button
                type="button"
                onClick={() => setViewMode('restaurants')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'restaurants'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#575550] hover:text-[#141413]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>{t.restaurantsTab} ({restaurants.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('dishes')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'dishes'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#575550] hover:text-[#141413]'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>{t.dishesTab} ({dishes.length})</span>
              </button>
            </div>

            {/* Currency Toggle */}
            <div
              className="inline-flex items-center p-1 bg-[#EFECE6] rounded-lg"
              role="group"
              aria-label="Para birimi seçimi"
            >
              <button
                type="button"
                onClick={() => onChangeCurrencyMode('TRY')}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currencyMode === 'TRY'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#575550] hover:text-[#141413]'
                }`}
              >
                TRY (₺)
              </button>
              <button
                type="button"
                onClick={() => onChangeCurrencyMode('LOCAL')}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currencyMode === 'LOCAL'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#575550] hover:text-[#141413]'
                }`}
              >
                {t.localCurrencyBtn}
              </button>
            </div>
          </div>
        </div>

        {/* City / Country Tabs, All-Countries + Province/District Selectors & Search Row */}
        <div className="space-y-3 pb-6 mb-8 border-b border-[#E6E4DF]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <button
                type="button"
                onClick={() => {
                  onSelectCity('all');
                  onSelectContinent('all');
                }}
                className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCity === 'all' && selectedContinent === 'all'
                    ? 'bg-[#D9043D] text-white'
                    : 'bg-white border border-[#E6E4DF] text-[#575550] hover:text-[#141413]'
                }`}
              >
                {t.allWorldBtn} ({CITY_HUBS.length})
              </button>
              {FEATURED_GLOBAL_HUBS.slice(0, 6).map((hub) => (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => onSelectCity(hub.id)}
                  className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCity === hub.id
                      ? 'bg-[#D9043D] text-white'
                      : 'bg-white border border-[#E6E4DF] text-[#575550] hover:text-[#141413]'
                  }`}
                >
                  {hub.country} ({hub.name})
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="w-4 h-4 text-[#575550] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 min-h-[40px] rounded-lg bg-white border border-[#E6E4DF] text-sm text-[#141413] placeholder:text-[#8A8780] focus:border-[#D9043D]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Aramayı temizle"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#575550] hover:text-[#141413] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative">
              <Globe className="w-4 h-4 text-[#D9043D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCity}
                onChange={(e) => onSelectCity(e.target.value as CityId)}
                aria-label="Tüm ülkelerden seç"
                className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg bg-white border border-[#E6E4DF] text-xs font-medium text-[#141413] focus:border-[#D9043D]"
              >
                <CountrySelectOptions
                  includeAllOption
                  allLabel={`${t.allCountries} (${CITY_HUBS.length})`}
                />
              </select>
            </div>

            <select
              value={selectedProvince}
              disabled={selectedCity === 'all'}
              onChange={(e) => onSelectProvince(e.target.value)}
              aria-label="İl veya şehir seç"
              className="w-full px-3 py-2 min-h-[40px] rounded-lg bg-white border border-[#E6E4DF] text-xs font-medium text-[#141413] focus:border-[#D9043D] disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <option value="all">
                {selectedCity === 'all'
                  ? 'İl / Şehir (Önce ülke seçin)'
                  : `Tüm İller / Şehirler (${provinces.length})`}
              </option>
              {provinces.map((prov) => (
                <option key={prov.name} value={prov.name}>
                  {prov.name}
                </option>
              ))}
            </select>

            <select
              value={selectedDistrict}
              disabled={selectedCity === 'all' || selectedProvince === 'all'}
              onChange={(e) => onSelectDistrict(e.target.value)}
              aria-label="İlçe veya semt seç"
              className="w-full px-3 py-2 min-h-[40px] rounded-lg bg-white border border-[#E6E4DF] text-xs font-medium text-[#141413] focus:border-[#D9043D] disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <option value="all">
                {selectedProvince === 'all'
                  ? 'İlçe / Semt (Önce il seçin)'
                  : `Tüm İlçeler / Semtler (${districts.length})`}
              </option>
              {districts.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Yemeksepeti Sidebar + Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Filter Sidebar (3 cols) */}
          <aside className="lg:col-span-3 bg-white border border-[#E6E4DF] rounded-xl p-5 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DF]">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#141413]">
                <SlidersHorizontal className="w-4 h-4 text-[#D9043D]" />
                <span>Filtreler</span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-xs font-medium text-[#D9043D] hover:underline cursor-pointer"
                >
                  Temizle ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* Sort Options */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#575550] mb-2.5">
                Sıralama
              </p>
              <div className="space-y-1.5">
                {sortOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 py-1 text-sm text-[#141413] cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="restaurant-sort"
                      checked={sortBy === opt.id}
                      onChange={() => onChangeSortBy(opt.id)}
                      className="w-4 h-4 accent-[#D9043D]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quick Marketplace Filters */}
            <div className="pt-4 border-t border-[#E6E4DF]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#575550] mb-2.5">
                Hızlı Seçimler
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-sm text-[#141413] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeDeliveryOnly}
                    onChange={onToggleFreeDelivery}
                    className="w-4 h-4 accent-[#D9043D]"
                  />
                  <span>{t.freeDeliveryFilter}</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm text-[#141413] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={campaignOnly}
                    onChange={onToggleCampaign}
                    className="w-4 h-4 accent-[#D9043D]"
                  />
                  <span>{t.campaignFilter}</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm text-[#141413] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vegetarianOnly}
                    onChange={onToggleVegetarian}
                    className="w-4 h-4 accent-[#D9043D]"
                  />
                  <span>{t.vegFilter}</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm text-[#141413] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={partnerOnly}
                    onChange={onTogglePartnerOnly}
                    className="w-4 h-4 accent-[#D9043D]"
                  />
                  <span>{t.partnerFilter}</span>
                </label>
              </div>
            </div>

            {/* Continent Filter */}
            <div className="pt-4 border-t border-[#E6E4DF]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#575550] mb-2.5">
                Kıtalar
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelectContinent('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    selectedContinent === 'all'
                      ? 'bg-[#141413] text-white'
                      : 'text-[#575550] hover:text-[#141413] hover:bg-[#FAF9F7]'
                  }`}
                >
                  Tüm Kıtalar ({CITY_HUBS.length} Ülke)
                </button>
                {CONTINENTS.map((cont) => {
                  const active = selectedContinent === cont.id;
                  return (
                    <button
                      key={cont.id}
                      type="button"
                      onClick={() => {
                        onSelectContinent(cont.id);
                        onSelectCity('all');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#141413] text-white'
                          : 'text-[#575550] hover:text-[#141413] hover:bg-[#FAF9F7]'
                      }`}
                    >
                      {cont.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cuisine Filter */}
            <div className="pt-4 border-t border-[#E6E4DF]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#575550] mb-2.5">
                Mutfaklar
              </p>
              <div className="space-y-1">
                {CUISINE_CATEGORIES.map((category) => {
                  const active = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => onSelectCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#D9043D] text-white'
                          : 'text-[#575550] hover:text-[#141413] hover:bg-[#FAF9F7]'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Right Main Grid (9 cols) */}
          <div className="lg:col-span-9">
            {viewMode === 'restaurants' ? (
              restaurants.length === 0 ? (
                <div className="bg-white border border-[#E6E4DF] rounded-xl py-16 px-6 text-center">
                  <p className="font-display text-xl font-medium text-[#141413] mb-2">
                    {activeLocationLabel} bölgesinde henüz aktif restoran listelenmiyor
                  </p>
                  <p className="text-sm text-[#575550] mb-6 max-w-md mx-auto">
                    Seçili il ve ilçe teslimat ağımızda aktif! İlk yerel mutfak olarak kayıt olabilir veya filtreleri sıfırlayıp tüm küresel restoranları görüntüleyebilirsiniz.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {onOpenRestaurantPortal && (
                      <button
                        type="button"
                        onClick={onOpenRestaurantPortal}
                        className="px-5 py-2.5 min-h-[40px] rounded-lg border border-[#D9043D] text-[#D9043D] text-sm font-medium hover:bg-[#D9043D] hover:text-white transition-colors cursor-pointer"
                      >
                        Bu Bölgeden Restoran Üye Et
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onResetFilters}
                      className="px-5 py-2.5 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-sm font-medium hover:bg-[#B80032] transition-colors cursor-pointer"
                    >
                      Tüm Dünyayı Göster
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {restaurants.map((rest) => {
                    const deliveryLabel =
                      rest.deliveryFeeTry === 0
                        ? t.freeLabel
                        : `${t.delivery} ${formatPrice(
                            rest.deliveryFeeTry,
                            rest.cityId,
                            currencyMode
                          )}`;

                    return (
                      <article
                        key={rest.id}
                        onClick={() => onOpenRestaurant(rest)}
                        className="group bg-white border border-[#E6E4DF] rounded-xl overflow-hidden flex flex-col cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
                      >
                        {/* 16:10 / 4:3 Restaurant Cover */}
                        <div className="aspect-[16/10] w-full bg-[#EFECE6] overflow-hidden relative">
                          <DishImage
                            src={rest.coverImage}
                            alt={`${rest.name} — ${rest.cityName}`}
                            title={rest.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/75 via-black/30 to-transparent flex items-end justify-between gap-2 text-white">
                            <span className="font-mono tabular-nums text-xs font-medium">
                              {rest.avgDeliveryMinutes} teslimat
                            </span>
                            {rest.hasCampaign && (
                              <span className="text-[11px] font-semibold tracking-wide">
                                ATLAS15 · %15 İndirim
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            {/* Unboxed clean metadata line */}
                            <div className="flex items-center justify-between gap-2 text-xs text-[#575550] mb-1.5">
                              <span className="truncate">
                                {rest.cityName} · {rest.district} ·{' '}
                                {rest.cuisineCategory}
                              </span>
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#141413] font-semibold shrink-0">
                                <Star className="w-3.5 h-3.5 fill-[#D9043D] text-[#D9043D]" />
                                {rest.rating.toFixed(1)}
                                <span className="text-[#8A8780] font-normal">
                                  ({rest.reviewCount})
                                </span>
                              </span>
                            </div>

                            <h3 className="font-display text-xl font-semibold text-[#141413] group-hover:text-[#D9043D] transition-colors">
                              {rest.name}
                            </h3>

                            <p className="text-sm text-[#575550] leading-relaxed line-clamp-2 mt-1.5">
                              {rest.tagline}
                            </p>
                          </div>

                          <div className="pt-3.5 border-t border-[#E6E4DF]/80 flex items-center justify-between gap-3">
                            <div className="text-xs text-[#575550] font-mono tabular-nums">
                              <span>
                                Min.{' '}
                                <strong className="text-[#141413]">
                                  {formatPrice(
                                    rest.minBasketTry,
                                    rest.cityId,
                                    currencyMode
                                  )}
                                </strong>
                              </span>
                              <span className="mx-1.5" aria-hidden="true">
                                ·
                              </span>
                              <span
                                className={
                                  rest.deliveryFeeTry === 0
                                    ? 'text-[#D9043D] font-medium'
                                    : ''
                                }
                              >
                                {deliveryLabel}
                              </span>
                            </div>

                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#D9043D] whitespace-nowrap shrink-0">
                              <span>{t.openMenu} ({rest.dishes.length})</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            ) : dishes.length === 0 ? (
              <div className="bg-white border border-[#E6E4DF] rounded-xl py-16 px-6 text-center">
                <p className="font-display text-xl font-medium text-[#141413] mb-2">
                  Seçili kriterlere uygun yemek bulunamadı
                </p>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="px-5 py-2.5 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-sm font-medium hover:bg-[#B80032] transition-colors cursor-pointer"
                >
                  Filtreleri Sıfırla
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dishes.map((dish) => {
                  const isJustAdded = recentlyAddedId === dish.id;
                  return (
                    <article
                      key={dish.id}
                      onClick={() => onSelectDish(dish)}
                      className="group bg-white border border-[#E6E4DF] rounded-xl overflow-hidden flex flex-col cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
                    >
                      <div className="aspect-[4/3] w-full bg-[#EFECE6] overflow-hidden">
                        <DishImage
                          src={dish.image}
                          alt={`${dish.name} — ${dish.restaurantName}`}
                          title={dish.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 text-xs text-[#575550] mb-1.5">
                            <span className="truncate">
                              {dish.cityName} · {dish.district} ·{' '}
                              <Clock className="w-3 h-3 inline mr-0.5" />
                              {dish.prepMinutes}
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#141413] font-medium shrink-0">
                              <Star className="w-3.5 h-3.5 fill-[#D9043D] text-[#D9043D]" />
                              {dish.rating.toFixed(1)}
                            </span>
                          </div>

                          <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-1 truncate">
                            {dish.restaurantName}
                          </p>

                          <h3 className="font-display text-lg font-semibold text-[#141413] leading-snug mb-2 group-hover:text-[#D9043D] transition-colors">
                            {dish.name}
                          </h3>

                          <p className="text-sm text-[#575550] leading-relaxed line-clamp-2 mb-4">
                            {dish.description}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-[#E6E4DF]/80 flex items-center justify-between gap-3">
                          <p className="font-mono tabular-nums text-base font-semibold text-[#141413]">
                            {formatPrice(dish.priceTry, dish.cityId, currencyMode)}
                          </p>

                          <button
                            type="button"
                            onClick={(e) => handleQuickAddClick(e, dish)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                              isJustAdded
                                ? 'bg-[#B80032] text-white'
                                : 'bg-[#FAF9F7] text-[#141413] border border-[#E6E4DF] hover:bg-[#D9043D] hover:text-white hover:border-[#D9043D]'
                            }`}
                          >
                            {isJustAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{t.addedToCart}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t.addToCart}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
