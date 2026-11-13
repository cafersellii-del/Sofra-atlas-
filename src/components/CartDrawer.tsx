import { useEffect, useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { CITY_HUBS } from '../data/catalog';
import type {
  CartItem,
  CityId,
  CurrencyMode,
  Order,
  PaymentMethod,
} from '../types/food';
import { formatPrice } from '../utils/currency';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  currencyMode: CurrencyMode;
  selectedCity: CityId;
  onClose: () => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onPlaceOrder: (order: Order) => void;
}

export function CartDrawer({
  isOpen,
  items,
  currencyMode,
  selectedCity,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
}: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  const defaultCityId: Exclude<CityId, 'all'> =
    items[0]?.dish.cityId ??
    (selectedCity === 'all' ? 'istanbul' : selectedCity);

  const [deliveryCityId, setDeliveryCityId] =
    useState<Exclude<CityId, 'all'>>(defaultCityId);
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const hub =
      CITY_HUBS.find((c) => c.id === deliveryCityId) ?? CITY_HUBS[0];
    setNeighborhood(hub.neighborhoods[0]);
  }, [deliveryCityId]);

  useEffect(() => {
    if (items.length > 0) {
      setDeliveryCityId(items[0].dish.cityId);
    } else {
      setStep('cart');
    }
  }, [items]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeHub =
    CITY_HUBS.find((c) => c.id === deliveryCityId) ?? CITY_HUBS[0];
  const displayCityId = items[0]?.dish.cityId ?? deliveryCityId;

  const subtotalTry = items.reduce(
    (sum, item) => sum + item.unitPriceTry * item.quantity,
    0
  );
  const discountTry = promoApplied ? Math.round(subtotalTry * 0.15) : 0;
  const netSubtotalTry = Math.max(0, subtotalTry - discountTry);
  const freeDeliveryRemainingTry = Math.max(
    0,
    activeHub.freeDeliveryThresholdTry - netSubtotalTry
  );
  const deliveryFeeTry =
    items.length === 0 || freeDeliveryRemainingTry === 0
      ? 0
      : activeHub.deliveryFeeTry;
  const totalTry = netSubtotalTry + deliveryFeeTry;

  const handleApplyPromo = () => {
    const normalized = promoInput.trim().toUpperCase();
    if (normalized === 'ATLAS15') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoApplied(false);
      setPromoError('Geçersiz kod. İlk siparişinizde ATLAS15 kodunu kullanabilirsiniz.');
    }
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
      setFormError('Lütfen ad soyad, telefon ve açık teslimat adresini doldurun.');
      return;
    }

    const couriers = ['Emre K.', 'Kenji T.', 'Marco R.', 'Camille D.', 'Niran P.'];
    const randomCourier = couriers[Math.floor(Math.random() * couriers.length)];
    const orderNumber = `SA-${Math.floor(4800 + Math.random() * 5100)}`;

    const newOrder: Order = {
      id: orderNumber,
      createdAt: 'Az önce',
      cityId: activeHub.id,
      cityName: activeHub.name,
      neighborhood,
      address: address.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      paymentMethod,
      items: items.map((item) => ({
        dishName: item.dish.name,
        restaurantName: item.dish.restaurantName,
        portionLabel: item.portion.label,
        extrasLabels: item.extras.map((ex) => ex.label),
        quantity: item.quantity,
        lineTotalTry: item.unitPriceTry * item.quantity,
      })),
      subtotalTry,
      discountTry,
      deliveryFeeTry,
      totalTry,
      status: 'received',
      estimatedArrival: activeHub.avgDelivery,
      courierName: randomCourier,
    };

    setFormError('');
    setStep('cart');
    setPromoApplied(false);
    setPromoInput('');
    onPlaceOrder(newOrder);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sepet ve Ödeme"
    >
      <div
        className="w-full max-w-md h-full bg-white border-l border-[#E6E4DF] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('cart')}
                aria-label="Sepete dön"
                className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-display text-lg font-semibold text-[#141413]">
              {step === 'cart' ? 'Sipariş Sepetiniz' : 'Teslimat & Ödeme'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Sepeti kapat"
            className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <ShoppingBag
              className="w-10 h-10 text-[#575550]/60 mb-4"
              strokeWidth={1.5}
            />
            <p className="font-display text-xl font-medium text-[#141413] mb-2">
              Sepetiniz şu an boş
            </p>
            <p className="text-sm text-[#575550] mb-6">
              6 dünya başkentindeki seçkin restoranlardan dilediğiniz yemeği ekleyerek siparişinizi oluşturabilirsiniz.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 min-h-[42px] rounded-lg bg-[#1B4332] text-white text-sm font-medium hover:bg-[#143326] transition-colors cursor-pointer"
            >
              Menülere Göz At
            </button>
          </div>
        ) : step === 'cart' ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Free delivery threshold notice */}
              <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF]">
                <p className="text-xs text-[#141413] mb-2">
                  {freeDeliveryRemainingTry === 0 ? (
                    <span className="font-medium text-[#1B4332]">
                      {activeHub.name} teslimatında ücretsiz kurye hakkı kazandınız.
                    </span>
                  ) : (
                    <>
                      Ücretsiz kurye için{' '}
                      <strong className="font-mono tabular-nums">
                        {formatPrice(freeDeliveryRemainingTry, displayCityId, currencyMode)}
                      </strong>{' '}
                      daha ekleyin.
                    </>
                  )}
                </p>
                <div className="w-full h-1.5 bg-[#E6E4DF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1B4332] transition-all duration-200"
                    style={{
                      width: `${Math.min(
                        100,
                        (netSubtotalTry / activeHub.freeDeliveryThresholdTry) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Cart Items */}
              <div className="divide-y divide-[#E6E4DF]">
                {items.map((item) => (
                  <div key={item.cartItemId} className="py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] text-[#575550] mb-0.5">
                          {item.dish.cityName} · {item.dish.restaurantName}
                        </p>
                        <h3 className="text-sm font-semibold text-[#141413]">
                          {item.dish.name}
                        </h3>
                        <p className="text-xs text-[#575550] mt-0.5">
                          {item.portion.label}
                          {item.extras.length > 0 &&
                            ` · +${item.extras.map((ex) => ex.label).join(', ')}`}
                        </p>
                        {item.note && (
                          <p className="text-xs text-[#575550] italic mt-1">
                            Not: {item.note}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.cartItemId)}
                        aria-label={`${item.dish.name} ürününü kaldır`}
                        className="text-[#575550] hover:text-[#141413] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="inline-flex items-center border border-[#E6E4DF] rounded-lg bg-[#FAF9F7]">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                          aria-label="Adet azalt"
                          className="w-8 h-8 flex items-center justify-center text-[#141413] hover:bg-[#EFECE6] rounded-l-lg cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono tabular-nums text-xs font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                          aria-label="Adet artır"
                          className="w-8 h-8 flex items-center justify-center text-[#141413] hover:bg-[#EFECE6] rounded-r-lg cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="font-mono tabular-nums text-sm font-semibold text-[#141413]">
                        {formatPrice(
                          item.unitPriceTry * item.quantity,
                          item.dish.cityId,
                          currencyMode
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo code */}
              <div className="pt-2">
                <label
                  htmlFor="promo-code"
                  className="block text-xs font-medium text-[#575550] mb-1.5"
                >
                  İndirim Kodu{' '}
                  <button
                    type="button"
                    onClick={() => setPromoInput('ATLAS15')}
                    className="text-[#1B4332] underline cursor-pointer ml-1"
                  >
                    (ATLAS15 uygula)
                  </button>
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo-code"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="ATLAS15"
                    className="flex-1 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs font-medium text-[#141413] hover:bg-[#EFECE6] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Uygula
                  </button>
                </div>
                {promoApplied && (
                  <p className="text-xs text-[#1B4332] mt-1.5">
                    ATLAS15 kodu uygulandı: %15 indirim aktif.
                  </p>
                )}
                {promoError && (
                  <p className="text-xs text-red-700 mt-1.5">{promoError}</p>
                )}
              </div>
            </div>

            {/* Cart Summary Footer */}
            <div className="px-6 py-5 border-t border-[#E6E4DF] bg-[#FAF9F7] space-y-2.5">
              <div className="flex justify-between text-xs text-[#575550]">
                <span>Ara Toplam</span>
                <span className="font-mono tabular-nums text-[#141413]">
                  {formatPrice(subtotalTry, displayCityId, currencyMode)}
                </span>
              </div>
              {discountTry > 0 && (
                <div className="flex justify-between text-xs text-[#1B4332]">
                  <span>İndirim (%15)</span>
                  <span className="font-mono tabular-nums">
                    -{formatPrice(discountTry, displayCityId, currencyMode)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs text-[#575550]">
                <span>Kurye Teslimatı</span>
                <span className="font-mono tabular-nums text-[#141413]">
                  {deliveryFeeTry === 0
                    ? 'Ücretsiz'
                    : formatPrice(deliveryFeeTry, displayCityId, currencyMode)}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold text-[#141413] pt-2 border-t border-[#E6E4DF]">
                <span>Toplam</span>
                <span className="font-mono tabular-nums">
                  {formatPrice(totalTry, displayCityId, currencyMode)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full mt-2 min-h-[44px] py-3 px-4 rounded-lg bg-[#1B4332] text-white text-sm font-medium hover:bg-[#143326] transition-colors cursor-pointer"
              >
                Teslimat Bilgilerine Geç
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={handleConfirmOrder}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="checkout-city"
                    className="block text-xs font-medium text-[#575550] mb-1.5"
                  >
                    Teslimat Şehri
                  </label>
                  <select
                    id="checkout-city"
                    value={deliveryCityId}
                    onChange={(e) =>
                      setDeliveryCityId(
                        e.target.value as Exclude<CityId, 'all'>
                      )
                    }
                    className="w-full px-3 py-2 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                  >
                    {CITY_HUBS.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="checkout-district"
                    className="block text-xs font-medium text-[#575550] mb-1.5"
                  >
                    Semt / Bölge
                  </label>
                  <select
                    id="checkout-district"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                  >
                    {activeHub.neighborhoods.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="checkout-address"
                  className="block text-xs font-medium text-[#575550] mb-1.5"
                >
                  Açık Teslimat Adresi
                </label>
                <textarea
                  id="checkout-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Cadde, sokak, bina no ve daire bilgisi..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E6E4DF] text-sm resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="checkout-name"
                    className="block text-xs font-medium text-[#575550] mb-1.5"
                  >
                    Alıcı Ad Soyad
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Örn: Deniz Yılmaz"
                    className="w-full px-3 py-2 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="checkout-phone"
                    className="block text-xs font-medium text-[#575550] mb-1.5"
                  >
                    Telefon Numarası
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+90 5XX XXX XX XX"
                    className="w-full px-3 py-2 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[#575550] mb-2">
                  Ödeme Yöntemi
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`px-3 py-2.5 min-h-[42px] rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-[#1B4332] bg-[#FAF9F7] text-[#141413]'
                        : 'border-[#E6E4DF] bg-white text-[#575550]'
                    }`}
                  >
                    Çevrimiçi Kart
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash_on_delivery')}
                    className={`px-3 py-2.5 min-h-[42px] rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      paymentMethod === 'cash_on_delivery'
                        ? 'border-[#1B4332] bg-[#FAF9F7] text-[#141413]'
                        : 'border-[#E6E4DF] bg-white text-[#575550]'
                    }`}
                  >
                    Kapıda Ödeme
                  </button>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="px-6 py-5 border-t border-[#E6E4DF] bg-[#FAF9F7] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#575550]">
                  Ödenecek Tutar ({activeHub.avgDelivery})
                </span>
                <span className="font-mono tabular-nums text-lg font-semibold text-[#141413]">
                  {formatPrice(totalTry, displayCityId, currencyMode)}
                </span>
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] py-3 px-4 rounded-lg bg-[#1B4332] text-white text-sm font-medium hover:bg-[#143326] transition-colors cursor-pointer"
              >
                Siparişi Onayla ve Takibe Başla
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
