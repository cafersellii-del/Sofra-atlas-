import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bike,
  CheckCircle2,
  ChefHat,
  Navigation,
  Receipt,
  X,
} from 'lucide-react';
import type { OrderStatus } from '../types/food';

export interface OrderStepNotification {
  uid: string;
  orderId: string;
  status: OrderStatus;
  cityName: string;
  neighborhood: string;
  courierName: string;
  estimatedArrival: string;
}

interface OrderStepNotificationsProps {
  notifications: OrderStepNotification[];
  onDismiss: (uid: string) => void;
  onTrackOrder: (orderId: string) => void;
}

const STEP_INDEX: Record<OrderStatus, number> = {
  received: 0,
  preparing: 1,
  on_the_way: 2,
  delivered: 3,
};

function getStepCopy(item: OrderStepNotification): {
  title: string;
  subtitle: string;
  badge: string;
} {
  switch (item.status) {
    case 'received':
      return {
        badge: 'Adım 1/4 · Onaylandı',
        title: 'Siparişiniz Alındı',
        subtitle: `#${item.orderId} numaralı siparişiniz ${item.cityName} mutfağına iletildi.`,
      };
    case 'preparing':
      return {
        badge: 'Adım 2/4 · Mutfakta',
        title: 'Şef Mutfağında Hazırlanıyor',
        subtitle: `Siparişiniz ${item.neighborhood} teslimatı için taze hazırlanıyor. Kurye ${item.courierName} atandı.`,
      };
    case 'on_the_way':
      return {
        badge: 'Adım 3/4 · Canlı Konum Aktif',
        title: 'Kurye Yola Çıktı!',
        subtitle: `${item.courierName} rotada ilerliyor (${item.neighborhood}). Tahmini varış: ${item.estimatedArrival}.`,
      };
    case 'delivered':
      return {
        badge: 'Adım 4/4 · Tamamlandı',
        title: 'Siparişiniz Teslim Edildi',
        subtitle: `#${item.orderId} adresinize ulaştırıldı. Afiyet olsun!`,
      };
  }
}

function StepIcon({ status }: { status: OrderStatus }) {
  if (status === 'received') {
    return <Receipt className="w-4 h-4 text-[#D9043D]" />;
  }
  if (status === 'preparing') {
    return <ChefHat className="w-4 h-4 text-[#D9043D]" />;
  }
  if (status === 'on_the_way') {
    return <Bike className="w-4 h-4 text-white" />;
  }
  return <CheckCircle2 className="w-4 h-4 text-white" />;
}

function AutoDismissTimer({
  uid,
  onDismiss,
}: {
  uid: string;
  onDismiss: (uid: string) => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(uid), 6800);
    return () => window.clearTimeout(t);
  }, [uid, onDismiss]);
  return null;
}

export function OrderStepNotifications({
  notifications,
  onDismiss,
  onTrackOrder,
}: OrderStepNotificationsProps) {
  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-20 right-4 sm:right-6 z-[55] w-[calc(100%-2rem)] max-w-sm flex flex-col gap-3 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((item) => {
          const copy = getStepCopy(item);
          const currentIdx = STEP_INDEX[item.status];
          const isHighlighted =
            item.status === 'on_the_way' || item.status === 'delivered';

          return (
            <motion.div
              key={item.uid}
              layout
              initial={{ opacity: 0, y: -22, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="pointer-events-auto relative overflow-hidden rounded-xl border border-[#E6E4DF] bg-white shadow-xl p-4"
            >
              <AutoDismissTimer uid={item.uid} onDismiss={onDismiss} />

              <div className="flex items-start gap-3">
                <div className="relative shrink-0 mt-0.5">
                  {item.status === 'on_the_way' && (
                    <span className="absolute inset-0 rounded-full bg-[#D9043D]/40 animate-ping" />
                  )}
                  <div
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center ${
                      isHighlighted
                        ? 'bg-[#D9043D]'
                        : 'bg-[#FAF9F7] border border-[#E6E4DF]'
                    }`}
                  >
                    <StepIcon status={item.status} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#D9043D]">
                      {copy.badge}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDismiss(item.uid)}
                      aria-label="Bildirimi kapat"
                      className="text-[#8A8780] hover:text-[#141413] p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="font-display text-sm font-semibold text-[#141413] mt-0.5">
                    {copy.title}
                  </p>
                  <p className="text-xs text-[#575550] mt-0.5 leading-relaxed">
                    {copy.subtitle}
                  </p>

                  {/* 4-step animated indicator */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                    {[0, 1, 2, 3].map((step) => (
                      <div
                        key={step}
                        className="h-1 rounded-full bg-[#E6E4DF] overflow-hidden"
                      >
                        <motion.div
                          initial={{ width: step < currentIdx ? '100%' : '0%' }}
                          animate={{
                            width: step <= currentIdx ? '100%' : '0%',
                          }}
                          transition={{ duration: 0.45, ease: 'easeOut' }}
                          className="h-full bg-[#D9043D]"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onTrackOrder(item.orderId);
                        onDismiss(item.uid);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D9043D] text-white text-[11px] font-semibold hover:bg-[#B80032] transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Canlı Haritada Takip Et</span>
                    </button>
                    <span className="font-mono text-[10px] text-[#8A8780]">
                      #{item.orderId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Animated auto-dismiss bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 6.8, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D9043D]/70"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
