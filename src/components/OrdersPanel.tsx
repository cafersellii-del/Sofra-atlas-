import { useEffect } from 'react';
import { CheckCircle2, Clock, MapPin, Truck, Utensils, X } from 'lucide-react';
import type { CurrencyMode, Order, OrderStatus } from '../types/food';
import { formatPrice } from '../utils/currency';

interface OrdersPanelProps {
  isOpen: boolean;
  orders: Order[];
  currencyMode: CurrencyMode;
  onClose: () => void;
  onAdvanceStatus: (orderId: string) => void;
}

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'received', label: 'Sipariş Alındı' },
  { key: 'preparing', label: 'Mutfakta Hazırlanıyor' },
  { key: 'on_the_way', label: 'Kurye Yola Çıktı' },
  { key: 'delivered', label: 'Teslim Edildi' },
];

export function OrdersPanel({
  isOpen,
  orders,
  currencyMode,
  onClose,
  onAdvanceStatus,
}: OrdersPanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sipariş Takibi ve Geçmişi"
    >
      <div
        className="w-full max-w-lg h-full bg-white border-l border-[#E6E4DF] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#141413]">
              Siparişlerim & Canlı Takip
            </h2>
            <p className="text-xs text-[#575550]">
              Aktif teslimat durumları ve sipariş fişleriniz
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Siparişler panelini kapat"
            className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#FAF9F7]">
          {orders.length === 0 ? (
            <div className="bg-white border border-[#E6E4DF] rounded-xl p-8 text-center">
              <p className="font-display text-lg font-medium text-[#141413] mb-1">
                Henüz bir siparişiniz yok
              </p>
              <p className="text-sm text-[#575550]">
                İlk siparişinizi oluşturduğunuzda mutfak hazırlığı ve kurye rotası burada anlık görüntülenir.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const currentIndex = STEPS.findIndex(
                (s) => s.key === order.status
              );
              const isDelivered = order.status === 'delivered';

              return (
                <article
                  key={order.id}
                  className="bg-white border border-[#E6E4DF] rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono tabular-nums text-xs font-semibold text-[#1B4332]">
                        Sipariş #{order.id} · {order.createdAt}
                      </p>
                      <h3 className="font-display text-base font-semibold text-[#141413] mt-0.5">
                        {order.cityName} — {order.neighborhood}
                      </h3>
                    </div>
                    <span className="text-xs font-medium text-[#141413] bg-[#FAF9F7] border border-[#E6E4DF] px-2.5 py-1 rounded-md whitespace-nowrap">
                      {STEPS[currentIndex]?.label}
                    </span>
                  </div>

                  {/* 4-step progress tracker */}
                  <div className="pt-2">
                    <div className="grid grid-cols-4 gap-2">
                      {STEPS.map((step, idx) => {
                        const completed = idx <= currentIndex;
                        return (
                          <div key={step.key} className="space-y-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-colors ${
                                completed ? 'bg-[#1B4332]' : 'bg-[#E6E4DF]'
                              }`}
                            />
                            <p
                              className={`text-[11px] leading-tight ${
                                completed
                                  ? 'text-[#141413] font-medium'
                                  : 'text-[#8A8780]'
                              }`}
                            >
                              {step.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Meta details */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-[#575550] py-3 border-y border-[#E6E4DF]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
                      <span>Tahmini: {order.estimatedArrival}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
                      <span>Kurye: {order.courierName}</span>
                    </div>
                    <div className="col-span-2 flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#1B4332] shrink-0 mt-0.5" />
                      <span>
                        {order.customerName} · {order.address}
                      </span>
                    </div>
                  </div>

                  {/* Receipt items */}
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div
                        key={`${order.id}-${idx}`}
                        className="flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="text-[#141413]">
                          <span className="font-mono tabular-nums font-semibold mr-1.5">
                            {item.quantity}×
                          </span>
                          <span className="font-medium">{item.dishName}</span>
                          <p className="text-[#575550] text-[11px]">
                            {item.restaurantName} · {item.portionLabel}
                            {item.extrasLabels.length > 0 &&
                              ` · ${item.extrasLabels.join(', ')}`}
                          </p>
                        </div>
                        <span className="font-mono tabular-nums text-[#141413] shrink-0">
                          {formatPrice(
                            item.lineTotalTry,
                            order.cityId,
                            currencyMode
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[#E6E4DF] flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-[#575550]">
                        {order.paymentMethod === 'card'
                          ? 'Çevrimiçi Kart ile Ödendi'
                          : 'Kapıda Ödeme'}
                      </p>
                      <p className="font-mono tabular-nums text-sm font-semibold text-[#141413]">
                        Toplam:{' '}
                        {formatPrice(order.totalTry, order.cityId, currencyMode)}
                      </p>
                    </div>

                    {!isDelivered ? (
                      <button
                        type="button"
                        onClick={() => onAdvanceStatus(order.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-[#1B4332] text-[#1B4332] text-xs font-medium hover:bg-[#1B4332] hover:text-white transition-colors cursor-pointer"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>Aşamayı İlerlet</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B4332]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tamamlandı</span>
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
