import { useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Truck,
  Utensils,
  X,
} from 'lucide-react';
import {
  CITY_HUB_ANCHORS,
  DEFAULT_MAP_ID,
  GOOGLE_MAPS_ATTRIBUTION_IDS,
  notifyQuotaExceededIfNeeded,
} from '../lib/maps';
import type { CurrencyMode, Order, OrderStatus } from '../types/food';
import { formatPrice } from '../utils/currency';

interface OrdersPanelProps {
  isOpen: boolean;
  orders: Order[];
  currencyMode: CurrencyMode;
  isMapsProviderActive?: boolean;
  onClose: () => void;
  onAdvanceStatus: (orderId: string) => void;
}

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'received', label: 'Sipariş Alındı' },
  { key: 'preparing', label: 'Mutfakta Hazırlanıyor' },
  { key: 'on_the_way', label: 'Kurye Yola Çıktı' },
  { key: 'delivered', label: 'Teslim Edildi' },
];

interface OrderRouteStaticApi {
  computeRoutes: (req: {
    origin: google.maps.LatLngLiteral;
    destination: string;
    travelMode: string;
    fields: string[];
  }) => Promise<{
    routes?: Array<{
      distanceMeters?: number;
      durationMillis?: number;
      viewport?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
      legs?: Array<{
        endLocation?: google.maps.LatLng | google.maps.LatLngLiteral;
      }>;
      createPolylines?: () => google.maps.Polyline[];
    }>;
  }>;
}

function OrderRouteOverlay({
  mapIdKey,
  origin,
  destinationQuery,
  onSummary,
}: {
  mapIdKey: string;
  origin: google.maps.LatLngLiteral;
  destinationQuery: string;
  onSummary: (summary: string | null) => void;
}) {
  const map = useMap(mapIdKey);
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [destLatLng, setDestLatLng] =
    useState<google.maps.LatLngLiteral | null>(null);

  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    setDestLatLng(null);
    onSummary(null);

    if (!routesLib || !map || !destinationQuery) return;
    const RouteClass = routesLib.Route as unknown as
      | OrderRouteStaticApi
      | undefined;
    if (!RouteClass?.computeRoutes) return;

    let cancelled = false;

    RouteClass.computeRoutes({
      origin,
      destination: destinationQuery,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    })
      .then((res) => {
        if (cancelled) return;
        const route = res?.routes?.[0];
        if (!route) return;

        if (typeof route.createPolylines === 'function') {
          const lines = route.createPolylines();
          lines.forEach((line) => {
            line.setOptions({
              strokeColor: '#D9043D',
              strokeOpacity: 0.9,
              strokeWeight: 4,
            });
            line.setMap(map);
          });
          polylinesRef.current = lines;
        }

        const rawEnd = route.legs?.[0]?.endLocation;
        if (rawEnd) {
          const lit =
            typeof (rawEnd as google.maps.LatLng).lat === 'function'
              ? {
                  lat: (rawEnd as google.maps.LatLng).lat(),
                  lng: (rawEnd as google.maps.LatLng).lng(),
                }
              : (rawEnd as google.maps.LatLngLiteral);
          setDestLatLng(lit);
        }

        if (route.viewport) {
          map.fitBounds(route.viewport, 28);
        }

        const km = ((route.distanceMeters ?? 0) / 1000).toFixed(1);
        const mins = Math.max(
          1,
          Math.round((route.durationMillis ?? 0) / 60000)
        );
        onSummary(`${km} km · ~${mins} dk teslimat rotası`);
      })
      .catch((err) => {
        if (!cancelled) {
          notifyQuotaExceededIfNeeded(err);
        }
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin.lat, origin.lng, destinationQuery, onSummary]);

  if (!destLatLng) return null;

  return (
    <AdvancedMarker position={destLatLng} title="Teslimat Adresi">
      <Pin
        background="#B45309"
        borderColor="#78350F"
        glyphColor="#FFFBEB"
        scale={0.95}
      />
    </AdvancedMarker>
  );
}

function OrderTrackingMap({ order }: { order: Order }) {
  const anchor = CITY_HUB_ANCHORS[order.cityId];
  const mapInstanceId = `order-map-${order.id}`;
  const [routeSummary, setRouteSummary] = useState<string | null>(null);
  const destinationQuery = `${order.address}, ${order.neighborhood}, ${order.cityName}`;

  return (
    <div className="space-y-2 pt-2">
      <div className="h-[220px] w-full rounded-lg overflow-hidden border border-[#E6E4DF] bg-[#EFECE6]">
        <GoogleMap
          id={mapInstanceId}
          mapId={DEFAULT_MAP_ID}
          defaultCenter={anchor.center}
          defaultZoom={13}
          disableDefaultUI={true}
          gestureHandling="cooperative"
          internalUsageAttributionIds={GOOGLE_MAPS_ATTRIBUTION_IDS}
          style={{ width: '100%', height: '100%' }}
        >
          <AdvancedMarker position={anchor.center} title={anchor.name}>
            <Pin
              background="#D9043D"
              borderColor="#9A032B"
              glyphColor="#FAF9F7"
              scale={0.95}
            />
          </AdvancedMarker>
          <OrderRouteOverlay
            mapIdKey={mapInstanceId}
            origin={anchor.center}
            destinationQuery={destinationQuery}
            onSummary={setRouteSummary}
          />
        </GoogleMap>
      </div>
      <p className="font-mono tabular-nums text-[11px] text-[#575550]">
        {routeSummary
          ? `Rota: ${anchor.name} → ${order.neighborhood} (${routeSummary})`
          : `Çıkış Merkezi: ${anchor.name}`}
      </p>
    </div>
  );
}

export function OrdersPanel({
  isOpen,
  orders,
  currencyMode,
  isMapsProviderActive = false,
  onClose,
  onAdvanceStatus,
}: OrdersPanelProps) {
  const [expandedMapOrderId, setExpandedMapOrderId] = useState<string | null>(
    null
  );

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
              Aktif teslimat durumları, canlı harita rotası ve sipariş fişleriniz
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
              const isMapOpen = expandedMapOrderId === order.id;

              return (
                <article
                  key={order.id}
                  className="bg-white border border-[#E6E4DF] rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono tabular-nums text-xs font-semibold text-[#D9043D]">
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
                                completed ? 'bg-[#D9043D]' : 'bg-[#E6E4DF]'
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
                      <Clock className="w-3.5 h-3.5 text-[#D9043D] shrink-0" />
                      <span>Tahmini: {order.estimatedArrival}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-[#D9043D] shrink-0" />
                      <span>Kurye: {order.courierName}</span>
                    </div>
                    <div className="col-span-2 flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#D9043D] shrink-0 mt-0.5" />
                      <span>
                        {order.customerName} · {order.address}
                      </span>
                    </div>
                    {order.deliveryPreferences &&
                      order.deliveryPreferences.length > 0 && (
                        <div className="col-span-2 text-[11px] text-[#575550]">
                          Teslimat Tercihi:{' '}
                          <span className="font-medium text-[#141413]">
                            {order.deliveryPreferences.join(' · ')}
                          </span>
                        </div>
                      )}
                    {isMapsProviderActive && (
                      <div className="col-span-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMapOrderId(isMapOpen ? null : order.id)
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D9043D] hover:underline cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>
                            {isMapOpen
                              ? 'Teslimat Haritasını Gizle'
                              : 'Haritada Kurye Rotasını Gör'}
                          </span>
                        </button>
                        {isMapOpen && <OrderTrackingMap order={order} />}
                      </div>
                    )}
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
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#575550]">
                        {order.paymentStatus === 'refunded'
                          ? 'Ödeme İade Edildi'
                          : order.paymentMethod === 'cash_on_delivery'
                            ? 'Kapıda Ödeme'
                            : order.paymentMethod === 'digital_wallet'
                              ? 'Dijital Cüzdan ile Ödendi'
                              : 'Online Kart ile Ödendi'}
                        {order.paymentDetails?.maskedCard
                          ? ` · ${order.paymentDetails.maskedCard}`
                          : ''}
                      </p>
                      {order.paymentDetails?.transactionId && (
                        <p className="font-mono tabular-nums text-[10px] text-[#575550] truncate">
                          İşlem: {order.paymentDetails.transactionId}
                          {order.paymentDetails.authCode
                            ? ` · Onay: ${order.paymentDetails.authCode}`
                            : ''}
                          {order.paymentDetails.refundId
                            ? ` · İade: ${order.paymentDetails.refundId}`
                            : ''}
                        </p>
                      )}
                      <p className="font-mono tabular-nums text-sm font-semibold text-[#141413] mt-0.5">
                        Toplam:{' '}
                        {formatPrice(order.totalTry, order.cityId, currencyMode)}
                      </p>
                    </div>

                    {!isDelivered ? (
                      <button
                        type="button"
                        onClick={() => onAdvanceStatus(order.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-[#D9043D] text-[#D9043D] text-xs font-medium hover:bg-[#D9043D] hover:text-white transition-colors cursor-pointer"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>Aşamayı İlerlet</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D9043D]">
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
