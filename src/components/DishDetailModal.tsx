import { useEffect, useState } from 'react';
import { Minus, Plus, Star, X } from 'lucide-react';
import type { CurrencyMode, Dish, DishExtra, DishPortion } from '../types/food';
import { formatPrice } from '../utils/currency';
import { DishImage } from './DishImage';

interface DishDetailModalProps {
  dish: Dish | null;
  currencyMode: CurrencyMode;
  onClose: () => void;
  onAddToCart: (payload: {
    dish: Dish;
    portion: DishPortion;
    extras: DishExtra[];
    note: string;
    quantity: number;
  }) => void;
}

export function DishDetailModal({
  dish,
  currencyMode,
  onClose,
  onAddToCart,
}: DishDetailModalProps) {
  const [selectedPortionId, setSelectedPortionId] = useState<string>('');
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (dish) {
      setSelectedPortionId(dish.portions[0]?.id ?? '');
      setSelectedExtraIds([]);
      setNote('');
      setQuantity(1);
    }
  }, [dish]);

  useEffect(() => {
    if (!dish) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dish, onClose]);

  if (!dish) return null;

  const activePortion =
    dish.portions.find((p) => p.id === selectedPortionId) ?? dish.portions[0];
  const activeExtras = dish.extras.filter((ex) =>
    selectedExtraIds.includes(ex.id)
  );
  const extrasSumTry = activeExtras.reduce((acc, ex) => acc + ex.priceTry, 0);
  const unitPriceTry =
    dish.priceTry + (activePortion?.priceDeltaTry ?? 0) + extrasSumTry;
  const lineTotalTry = unitPriceTry * quantity;

  const toggleExtra = (extraId: string) => {
    setSelectedExtraIds((prev) =>
      prev.includes(extraId)
        ? prev.filter((id) => id !== extraId)
        : [...prev, extraId]
    );
  };

  const handleSubmit = () => {
    if (!activePortion) return;
    onAddToCart({
      dish,
      portion: activePortion,
      extras: activeExtras,
      note: note.trim(),
      quantity,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-modal-title"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-[#E6E4DF] grid grid-cols-1 lg:grid-cols-12"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Detayı kapat"
          className="absolute right-4 top-4 z-10 w-10 h-10 rounded-lg bg-white/95 border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Photo + Story + Ingredients */}
        <div className="lg:col-span-6 bg-[#FAF9F7] p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E6E4DF]">
          <div>
            <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-[#EFECE6] mb-5">
              <DishImage
                src={dish.image}
                alt={dish.name}
                title={dish.name}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-1.5">
              Mutfak Hikâyesi & İçerik
            </p>
            <p className="text-sm text-[#141413] leading-relaxed mb-5">
              {dish.story}
            </p>
          </div>

          <div className="pt-4 border-t border-[#E6E4DF]">
            <p className="text-xs text-[#575550] mb-1.5">
              Temel Malzemeler
            </p>
            <p className="text-xs text-[#141413] leading-relaxed mb-3">
              {dish.ingredients.join(' · ')}
            </p>
            <p className="font-mono tabular-nums text-xs text-[#575550]">
              {dish.calories} kcal · Ortalama hazırlık {dish.prepMinutes}
            </p>
          </div>
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-6 p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#575550] mb-2 pr-10">
              <span>{dish.cityName}</span>
              <span aria-hidden="true">·</span>
              <span>{dish.district}</span>
              <span aria-hidden="true">·</span>
              <span>{dish.restaurantName}</span>
            </div>

            <h2
              id="dish-modal-title"
              className="font-display text-2xl font-semibold text-[#141413] leading-tight mb-2"
            >
              {dish.name}
            </h2>

            <div className="flex items-center gap-3 text-xs text-[#575550] mb-6">
              <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#141413] font-medium">
                <Star className="w-3.5 h-3.5 fill-[#B45309] text-[#B45309]" />
                {dish.rating.toFixed(1)} ({dish.reviewCount} değerlendirme)
              </span>
              <span aria-hidden="true">·</span>
              <span>{dish.category}</span>
            </div>

            {/* Portion Selection */}
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#575550] mb-2.5">
                Porsiyon Seçimi
              </p>
              <div className="space-y-2">
                {dish.portions.map((portion) => {
                  const selected = portion.id === activePortion?.id;
                  return (
                    <button
                      key={portion.id}
                      type="button"
                      onClick={() => setSelectedPortionId(portion.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 min-h-[44px] rounded-lg border text-sm transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#1B4332] bg-[#FAF9F7] text-[#141413] font-medium'
                          : 'border-[#E6E4DF] bg-white text-[#575550] hover:border-[#141413]/30'
                      }`}
                    >
                      <span>{portion.label}</span>
                      <span className="font-mono tabular-nums text-xs text-[#141413]">
                        {portion.priceDeltaTry === 0
                          ? formatPrice(dish.priceTry, dish.cityId, currencyMode)
                          : `${portion.priceDeltaTry > 0 ? '+' : ''}${formatPrice(
                              portion.priceDeltaTry,
                              dish.cityId,
                              currencyMode
                            )}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extras */}
            {dish.extras.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#575550] mb-2.5">
                  Eşlikçi & Ekstralar
                </p>
                <div className="space-y-2">
                  {dish.extras.map((extra) => {
                    const checked = selectedExtraIds.includes(extra.id);
                    return (
                      <label
                        key={extra.id}
                        className={`flex items-center justify-between px-4 py-2.5 min-h-[42px] rounded-lg border text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#1B4332] bg-[#FAF9F7] text-[#141413]'
                            : 'border-[#E6E4DF] bg-white text-[#575550]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleExtra(extra.id)}
                            className="w-4 h-4 accent-[#1B4332]"
                          />
                          <span>{extra.label}</span>
                        </span>
                        <span className="font-mono tabular-nums text-xs text-[#141413]">
                          +{formatPrice(extra.priceTry, dish.cityId, currencyMode)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Kitchen note */}
            <div className="mb-6">
              <label
                htmlFor="kitchen-note"
                className="block text-xs font-semibold uppercase tracking-wider text-[#575550] mb-2"
              >
                Mutfak Notu (İsteğe Bağlı)
              </label>
              <input
                id="kitchen-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Örn: Acı sos ayrı gönderilsin, zili çalmayın..."
                className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm text-[#141413] placeholder:text-[#8A8780]"
              />
            </div>
          </div>

          {/* Sticky purchase bar */}
          <div className="pt-4 border-t border-[#E6E4DF] flex items-center gap-3">
            <div className="inline-flex items-center border border-[#E6E4DF] rounded-lg bg-[#FAF9F7]">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Adedi azalt"
                className="w-10 h-11 flex items-center justify-center text-[#141413] hover:bg-[#EFECE6] rounded-l-lg cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-9 text-center font-mono tabular-nums text-sm font-medium text-[#141413]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Adedi artır"
                className="w-10 h-11 flex items-center justify-center text-[#141413] hover:bg-[#EFECE6] rounded-r-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#1B4332] text-white text-sm font-medium hover:bg-[#143326] transition-colors flex items-center justify-between gap-3 cursor-pointer"
            >
              <span>Sepete Ekle</span>
              <span className="font-mono tabular-nums">
                {formatPrice(lineTotalTry, dish.cityId, currencyMode)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
