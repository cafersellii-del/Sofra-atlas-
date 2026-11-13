import { useState } from 'react';
import { Check, Plus, Search, Star, X } from 'lucide-react';
import { CITY_HUBS, CUISINE_CATEGORIES } from '../data/catalog';
import type { CityId, CuisineCategory, CurrencyMode, Dish } from '../types/food';
import { formatPrice } from '../utils/currency';
import { DishImage } from './DishImage';

interface MenuCatalogProps {
  dishes: Dish[];
  selectedCity: CityId;
  onSelectCity: (cityId: CityId) => void;
  selectedCategory: CuisineCategory;
  onSelectCategory: (cat: CuisineCategory) => void;
  currencyMode: CurrencyMode;
  onChangeCurrencyMode: (mode: CurrencyMode) => void;
  vegetarianOnly: boolean;
  onToggleVegetarian: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectDish: (dish: Dish) => void;
  onQuickAdd: (dish: Dish) => void;
  onResetFilters: () => void;
}

export function MenuCatalog({
  dishes,
  selectedCity,
  onSelectCity,
  selectedCategory,
  onSelectCategory,
  currencyMode,
  onChangeCurrencyMode,
  vegetarianOnly,
  onToggleVegetarian,
  searchQuery,
  onSearchChange,
  onSelectDish,
  onQuickAdd,
  onResetFilters,
}: MenuCatalogProps) {
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const handleQuickAddClick = (e: React.MouseEvent, dish: Dish) => {
    e.stopPropagation();
    onQuickAdd(dish);
    setRecentlyAddedId(dish.id);
    window.setTimeout(() => {
      setRecentlyAddedId((prev) => (prev === dish.id ? null : prev));
    }, 1100);
  };

  return (
    <section id="menu-katalog" className="py-14 lg:py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Section header + Currency mode switcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-2">
              Dünya Mutfakları Kataloğu
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl font-semibold text-[#141413] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Şehre ve mutfağa göre günün menüleri
            </h2>
          </div>

          <div
            className="inline-flex items-center p-1 bg-[#EFECE6] rounded-lg self-start md:self-auto"
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
              Yerel Para Birimi
            </button>
          </div>
        </div>

        {/* Workspace filter toolbar */}
        <div className="space-y-4 pb-8 mb-8 border-b border-[#E6E4DF]">
          {/* Row 1: City filter buttons + Search + Vegetarian toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <button
                type="button"
                onClick={() => onSelectCity('all')}
                className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCity === 'all'
                    ? 'bg-[#141413] text-white'
                    : 'bg-white border border-[#E6E4DF] text-[#575550] hover:text-[#141413]'
                }`}
              >
                Tüm Şehirler
              </button>
              {CITY_HUBS.map((hub) => (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => onSelectCity(hub.id)}
                  className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCity === hub.id
                      ? 'bg-[#141413] text-white'
                      : 'bg-white border border-[#E6E4DF] text-[#575550] hover:text-[#141413]'
                  }`}
                >
                  {hub.name}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[#575550] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Yemek, restoran veya malzeme..."
                  aria-label="Yemek veya restoran ara"
                  className="w-full pl-9 pr-8 py-2 min-h-[40px] rounded-lg bg-white border border-[#E6E4DF] text-sm text-[#141413] placeholder:text-[#8A8780] focus:border-[#1B4332]"
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

              <button
                type="button"
                onClick={onToggleVegetarian}
                aria-pressed={vegetarianOnly}
                className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  vegetarianOnly
                    ? 'bg-[#1B4332] text-white border-[#1B4332]'
                    : 'bg-white text-[#141413] border-[#E6E4DF] hover:border-[#1B4332]/50'
                }`}
              >
                Sadece Vejetaryen
              </button>
            </div>
          </div>

          {/* Row 2: Cuisine category tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1">
            {CUISINE_CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onSelectCategory(category)}
                  className={`px-3.5 py-1.5 min-h-[38px] rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#EFECE6] text-[#141413] font-semibold'
                      : 'text-[#575550] hover:text-[#141413] hover:bg-[#EFECE6]/60'
                  }`}
                >
                  {category}
                </button>
              );
            })}
            <span className="ml-auto text-xs text-[#575550] tabular-nums whitespace-nowrap shrink-0 pl-4">
              {dishes.length} tabak listeleniyor
            </span>
          </div>
        </div>

        {/* Product Grid */}
        {dishes.length === 0 ? (
          <div className="bg-white border border-[#E6E4DF] rounded-xl py-16 px-6 text-center">
            <p className="font-display text-xl font-medium text-[#141413] mb-2">
              Seçili kriterlere uygun yemek bulunamadı
            </p>
            <p className="text-sm text-[#575550] mb-6 max-w-md mx-auto">
              Arama terimini değiştirebilir veya tüm dünya şehirlerindeki menüleri tekrar görüntüleyebilirsiniz.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="px-5 py-2.5 min-h-[40px] rounded-lg bg-[#1B4332] text-white text-sm font-medium hover:bg-[#143326] transition-colors cursor-pointer"
            >
              Filtreleri Sıfırla
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {dishes.map((dish) => {
              const isJustAdded = recentlyAddedId === dish.id;
              const subtleNote = dish.isVegetarian
                ? 'Vejetaryen'
                : dish.isChefSignature
                ? 'Şefin İmza Tabağı'
                : dish.isSpicy
                ? 'Baharatlı'
                : null;

              return (
                <article
                  key={dish.id}
                  onClick={() => onSelectDish(dish)}
                  className="group bg-white border border-[#E6E4DF] rounded-xl overflow-hidden flex flex-col cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
                >
                  {/* 4:3 Image container */}
                  <div className="aspect-[4/3] w-full bg-[#EFECE6] overflow-hidden">
                    <DishImage
                      src={dish.image}
                      alt={`${dish.name} — ${dish.restaurantName}, ${dish.cityName}`}
                      title={dish.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>

                  {/* Card body with identical field order across every card */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Unboxed clean metadata line */}
                      <div className="flex items-center justify-between gap-2 text-xs text-[#575550] mb-2">
                        <span className="truncate">
                          {dish.cityName} · {dish.district} · {dish.prepMinutes}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#141413] font-medium shrink-0">
                          <Star className="w-3.5 h-3.5 fill-[#B45309] text-[#B45309]" />
                          {dish.rating.toFixed(1)}
                        </span>
                      </div>

                      {/* Restaurant label */}
                      <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-1 truncate">
                        {dish.restaurantName}
                      </p>

                      {/* Dish title */}
                      <h3 className="font-display text-lg font-semibold text-[#141413] leading-snug mb-2 group-hover:text-[#1B4332] transition-colors">
                        {dish.name}
                      </h3>

                      {/* Concise description */}
                      <p className="text-sm text-[#575550] leading-relaxed line-clamp-2 mb-4">
                        {dish.description}
                      </p>
                    </div>

                    {/* Footer row: Price + subtle tag + Quick add */}
                    <div className="pt-4 border-t border-[#E6E4DF]/80 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono tabular-nums text-base font-semibold text-[#141413]">
                          {formatPrice(dish.priceTry, dish.cityId, currencyMode)}
                        </p>
                        {subtleNote && (
                          <p className="text-[11px] text-[#575550] mt-0.5">
                            {subtleNote}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleQuickAddClick(e, dish)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                          isJustAdded
                            ? 'bg-[#143326] text-white'
                            : 'bg-[#FAF9F7] text-[#141413] border border-[#E6E4DF] hover:bg-[#1B4332] hover:text-white hover:border-[#1B4332]'
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Eklendi</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Sepete Ekle</span>
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
    </section>
  );
}
