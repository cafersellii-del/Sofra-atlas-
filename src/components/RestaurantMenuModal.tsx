import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  Star,
  X,
} from 'lucide-react';
import type {
  CartItem,
  CurrencyMode,
  Dish,
  RestaurantStorefront,
} from '../types/food';
import { formatPrice } from '../utils/currency';
import { DishImage } from './DishImage';

interface RestaurantMenuModalProps {
  restaurant: RestaurantStorefront | null;
  currencyMode: CurrencyMode;
  cartItems: CartItem[];
  onClose: () => void;
  onSelectDish: (dish: Dish) => void;
  onQuickAdd: (dish: Dish) => void;
  onOpenCart: () => void;
  onShowOnMap: (restaurant: RestaurantStorefront) => void;
}

export function RestaurantMenuModal({
  restaurant,
  currencyMode,
  cartItems,
  onClose,
  onSelectDish,
  onQuickAdd,
  onOpenCart,
  onShowOnMap,
}: RestaurantMenuModalProps) {
  const [menuSearch, setMenuSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Tümü');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setMenuSearch('');
      setActiveCategory('Tümü');
    }
  }, [restaurant?.id]);

  useEffect(() => {
    if (!restaurant) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [restaurant, onClose]);

  const categories = useMemo(() => {
    if (!restaurant) return ['Tümü'];
    const set = new Set<string>(['Tümü']);
    for (const d of restaurant.dishes) {
      set.add(d.category);
    }
    return Array.from(set);
  }, [restaurant]);

  const filteredDishes = useMemo(() => {
    if (!restaurant) return [];
    const q = menuSearch.trim().toLocaleLowerCase('tr');
    return restaurant.dishes.filter((dish) => {
      if (activeCategory !== 'Tümü' && dish.category !== activeCategory) {
        return false;
      }
      if (q) {
        const hay = `${dish.name} ${dish.description} ${dish.ingredients.join(' ')}`.toLocaleLowerCase('tr');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [restaurant, activeCategory, menuSearch]);

  if (!restaurant) return null;

  const sameRestaurantCartItems = cartItems.filter(
    (item) =>
      item.dish.restaurantName.toLocaleLowerCase('tr') ===
      restaurant.name.toLocaleLowerCase('tr')
  );
  const basketCount = sameRestaurantCartItems.reduce(
    (s, i) => s + i.quantity,
    0
  );
  const basketTotalTry = sameRestaurantCartItems.reduce(
    (s, i) => s + i.unitPriceTry * i.quantity,
    0
  );

  const handleQuickAddRow = (e: React.MouseEvent, dish: Dish) => {
    e.stopPropagation();
    onQuickAdd(dish);
    setJustAddedId(dish.id);
    window.setTimeout(() => {
      setJustAddedId((prev) => (prev === dish.id ? null : prev));
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="restaurant-storefront-title"
    >
      <div
        className="relative w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] bg-white sm:rounded-xl border border-[#E6E4DF] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Restaurant Cover Header */}
        <div className="relative h-44 sm:h-52 bg-[#EFECE6] shrink-0">
          <DishImage
            src={restaurant.coverImage}
            alt={restaurant.name}
            title={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Restoran menüsünü kapat"
            className="absolute right-4 top-4 w-10 h-10 rounded-lg bg-white/95 border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-xs text-white/80 mb-1">
                {restaurant.cityName} · {restaurant.district} ·{' '}
                {restaurant.cuisineCategory}
              </p>
              <h2
                id="restaurant-storefront-title"
                className="font-display text-2xl sm:text-3xl font-semibold leading-tight"
              >
                {restaurant.name}
              </h2>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Star className="w-4 h-4 fill-[#D9043D] text-[#D9043D]" />
                {restaurant.rating.toFixed(1)} ({restaurant.reviewCount})
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {restaurant.avgDeliveryMinutes}
              </span>
            </div>
          </div>
        </div>

        {/* Storefront Delivery Info Bar */}
        <div className="px-6 py-3.5 bg-[#FAF9F7] border-b border-[#E6E4DF] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-[#575550] font-mono tabular-nums">
            <span>
              Min. Sepet:{' '}
              <strong className="text-[#141413]">
                {formatPrice(
                  restaurant.minBasketTry,
                  restaurant.cityId,
                  currencyMode
                )}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Getirme:{' '}
              <strong
                className={
                  restaurant.deliveryFeeTry === 0
                    ? 'text-[#D9043D]'
                    : 'text-[#141413]'
                }
              >
                {restaurant.deliveryFeeTry === 0
                  ? 'Ücretsiz'
                  : formatPrice(
                      restaurant.deliveryFeeTry,
                      restaurant.cityId,
                      currencyMode
                    )}
              </strong>
            </span>
            {restaurant.hasCampaign && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-sans font-semibold text-[#D9043D]">
                  ATLAS15 koduyla %15 indirim
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onShowOnMap(restaurant)}
            className="inline-flex items-center gap-1.5 font-medium text-[#D9043D] hover:underline cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Haritada Konumu Gör</span>
          </button>
        </div>

        {/* In-menu Search & Category Filter */}
        <div className="px-6 py-3.5 border-b border-[#E6E4DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 min-h-[34px] rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#D9043D] text-white'
                    : 'bg-[#FAF9F7] text-[#575550] hover:text-[#141413]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#575550] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Menüde ara..."
              className="w-full pl-8 pr-3 py-1.5 min-h-[36px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs text-[#141413]"
            />
          </div>
        </div>

        {/* Yemeksepeti Menu Rows */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#FAF9F7] space-y-3">
          <p className="text-xs text-[#575550] mb-2">{restaurant.tagline}</p>

          {filteredDishes.length === 0 ? (
            <div className="bg-white border border-[#E6E4DF] rounded-xl p-8 text-center text-sm text-[#575550]">
              Bu kategoride veya aramada ürün bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDishes.map((dish) => {
                const isAdded = justAddedId === dish.id;
                return (
                  <div
                    key={dish.id}
                    onClick={() => onSelectDish(dish)}
                    className="bg-white border border-[#E6E4DF] rounded-xl p-4 flex items-stretch justify-between gap-4 cursor-pointer hover:border-[#D9043D]/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] text-[#575550] mb-0.5">
                          {dish.category} · {dish.calories} kcal
                          {dish.isVegetarian ? ' · Vejetaryen' : ''}
                        </p>
                        <h3 className="font-display text-base font-semibold text-[#141413] leading-snug">
                          {dish.name}
                        </h3>
                        <p className="text-xs text-[#575550] line-clamp-2 mt-1">
                          {dish.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 mt-2">
                        <span className="font-mono tabular-nums text-sm font-semibold text-[#141413]">
                          {formatPrice(dish.priceTry, dish.cityId, currencyMode)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleQuickAddRow(e, dish)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            isAdded
                              ? 'bg-[#B80032] text-white'
                              : 'bg-[#FAF9F7] border border-[#E6E4DF] text-[#141413] hover:bg-[#D9043D] hover:text-white hover:border-[#D9043D]'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Eklendi</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Ekle</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-[#EFECE6] shrink-0 self-center">
                      <DishImage
                        src={dish.image}
                        alt={dish.name}
                        title={dish.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Sticky Basket Strip inside Storefront */}
        {basketCount > 0 && (
          <div className="px-6 py-3.5 bg-white border-t border-[#E6E4DF] flex items-center justify-between gap-4 shrink-0">
            <div className="text-xs">
              <p className="font-semibold text-[#141413]">
                Sepetinizde {basketCount} ürün var ({restaurant.name})
              </p>
              <p className="font-mono tabular-nums text-[#575550]">
                Toplam:{' '}
                <strong className="text-[#141413]">
                  {formatPrice(basketTotalTry, restaurant.cityId, currencyMode)}
                </strong>
                {basketTotalTry < restaurant.minBasketTry && (
                  <span className="ml-2 text-[#D9043D]">
                    (Min. sepet için{' '}
                    {formatPrice(
                      restaurant.minBasketTry - basketTotalTry,
                      restaurant.cityId,
                      currencyMode
                    )}{' '}
                    kaldı)
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCart();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Sepete Git</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
