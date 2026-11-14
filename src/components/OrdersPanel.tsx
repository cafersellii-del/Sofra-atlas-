import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { motion } from 'motion/react';
import {
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Navigation,
  Radio,
  Truck,
  Utensils,
  X,
} from 'lucide-react';
import { getCenterForProvince } from '../data/locations';
import { useLanguage } from '../i18n/LanguageContext';
import {
  CITY_HUB_ANCHORS,
  DEFAULT_MAP_ID,
  GOOGLE_MAPS_ATTRIBUTION_IDS,
  notifyQuotaExceededIfNeeded,
} from '../lib/maps';
import type {
  CurrencyMode,
  Order,
  OrderStatus,
  SupportChatChannel,
} from '../types/food';
import { formatPrice } from '../utils/currency';

interface OrdersPanelProps {
  isOpen: boolean;
  orders: Order[];
  currencyMode: CurrencyMode;
  isMapsProviderActive?: boolean;
  focusedOrderId?: string | null;
  onClose: () => void;
  onAdvanceStatus: (orderId: string) => void;
  onOpenSupport?: (order: Order, channel?: SupportChatChannel) => void;
  onOpenStaffInbox?: () => void;
}

const STEPS: { key: OrderStatus; label: string; shortNote: string }[] = [
  { key: 'received', label: 'Sipariş Alındı', shortNote: 'Restorana iletildi' },
  {
    key: 'preparing',
    label: 'Mutfakta Hazırlanıyor',
    shortNote: 'Kurye teslim noktasında',
  },
  {
    key: 'on_the_way',
    label: 'Kurye Yola Çıktı',
    shortNote: 'Canlı konum paylaşılıyor',
  },
  { key: 'delivered', label: 'Teslim Edildi', shortNote: 'Afiyet olsun' },
];

interface LatLngPoint {
  lat: number;
  lng: number;
}

interface OrderRouteStaticApi {
  computeRoutes: (req: {
    origin: google.maps.LatLngLiteral;
    destination: string | google.maps.LatLngLiteral;
    travelMode: string;
    fields: string[];
  }) => Promise<{
    routes?: Array<{
      path?: Array<google.maps.LatLng | google.maps.LatLngLiteral>;
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

function toLatLngLiteral(
  pt: google.maps.LatLng | google.maps.LatLngLiteral
): LatLngPoint {
  if (typeof (pt as google.maps.LatLng).lat === 'function') {
    return {
      lat: (pt as google.maps.LatLng).lat(),
      lng: (pt as google.maps.LatLng).lng(),
    };
  }
  return pt as LatLngPoint;
}

function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function interpolateAlongPath(
  path: LatLngPoint[],
  progress: number
): {
  position: LatLngPoint;
  traveledPath: LatLngPoint[];
  remainingMeters: number;
  totalMeters: number;
} {
  if (path.length === 0) {
    return {
      position: { lat: 41.0082, lng: 28.9784 },
      traveledPath: [],
      remainingMeters: 0,
      totalMeters: 0,
    };
  }
  if (path.length === 1) {
    return {
      position: path[0],
      traveledPath: [path[0]],
      remainingMeters: 0,
      totalMeters: 0,
    };
  }

  const clamped = Math.max(0, Math.min(1, progress));
  const segLengths: number[] = [];
  let totalMeters = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const len = haversineMeters(path[i], path[i + 1]);
    segLengths.push(len);
    totalMeters += len;
  }

  if (totalMeters <= 0) {
    return {
      position: path[0],
      traveledPath: [path[0]],
      remainingMeters: 0,
      totalMeters: 0,
    };
  }

  const targetDist = totalMeters * clamped;
  let acc = 0;
  const traveledPath: LatLngPoint[] = [path[0]];

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (acc + segLen >= targetDist) {
      const ratio = segLen > 0 ? (targetDist - acc) / segLen : 0;
      const a = path[i];
      const b = path[i + 1];
      const interp: LatLngPoint = {
        lat: a.lat + (b.lat - a.lat) * ratio,
        lng: a.lng + (b.lng - a.lng) * ratio,
      };
      traveledPath.push(interp);
      return {
        position: interp,
        traveledPath,
        remainingMeters: Math.max(0, totalMeters - targetDist),
        totalMeters,
      };
    }
    acc += segLen;
    traveledPath.push(path[i + 1]);
  }

  return {
    position: path[path.length - 1],
    traveledPath: path,
    remainingMeters: 0,
    totalMeters,
  };
}

function useLiveCourierProgress(status: OrderStatus, orderId: string): number {
  const [transitProgress, setTransitProgress] = useState<number>(() => {
    if (status === 'delivered') return 1;
    if (status === 'on_the_way') return 0.22;
    if (status === 'preparing') return 0.08;
    return 0.02;
  });

  useEffect(() => {
    if (status === 'received') {
      setTransitProgress(0.02);
      return;
    }
    if (status === 'preparing') {
      setTransitProgress(0.08);
      return;
    }
    if (status === 'delivered') {
      setTransitProgress(1);
      return;
    }

    // Active transit ('on_the_way'): glide smoothly along the delivery path
    setTransitProgress((prev) => (prev < 0.14 || prev >= 0.96 ? 0.16 : prev));
    const timer = window.setInterval(() => {
      setTransitProgress((prev) => {
        if (prev >= 0.95) return 0.95;
        return Math.min(0.95, prev + 0.0045);
      });
    }, 90);

    return () => window.clearInterval(timer);
  }, [status, orderId]);

  return transitProgress;
}

interface RouteTelemetry {
  distanceMeters: number;
  durationMillis: number;
}

function OrderRouteOverlay({
  mapIdKey,
  origin,
  destinationQuery,
  courierName,
  status,
  progress,
  onTelemetry,
}: {
  mapIdKey: string;
  origin: LatLngPoint;
  destinationQuery: string;
  courierName: string;
  status: OrderStatus;
  progress: number;
  onTelemetry: (telemetry: RouteTelemetry | null) => void;
}) {
  const map = useMap(mapIdKey);
  const routesLib = useMapsLibrary('routes');
  const basePolylinesRef = useRef<google.maps.Polyline[]>([]);
  const traveledPolylineRef = useRef<google.maps.Polyline | null>(null);
  const [destLatLng, setDestLatLng] = useState<LatLngPoint | null>(null);
  const [routePath, setRoutePath] = useState<LatLngPoint[]>([]);

  useEffect(() => {
    basePolylinesRef.current.forEach((p) => p.setMap(null));
    basePolylinesRef.current = [];
    if (traveledPolylineRef.current) {
      traveledPolylineRef.current.setMap(null);
      traveledPolylineRef.current = null;
    }
    setDestLatLng(null);
    setRoutePath([]);
    onTelemetry(null);

    if (!routesLib || !map || !destinationQuery) return;
    const RouteClass = routesLib.Route as unknown as
      | OrderRouteStaticApi
      | undefined;
    if (!RouteClass?.computeRoutes) return;

    let cancelled = false;

    const fallbackDestination: LatLngPoint = {
      lat: origin.lat + 0.014,
      lng: origin.lng + 0.019,
    };

    const applyFallbackRoute = () => {
      const midA: LatLngPoint = {
        lat: origin.lat + 0.006,
        lng: origin.lng + 0.005,
      };
      const midB: LatLngPoint = {
        lat: origin.lat + 0.011,
        lng: origin.lng + 0.013,
      };
      const fallbackPts = [origin, midA, midB, fallbackDestination];
      const baseLine = new google.maps.Polyline({
        path: fallbackPts,
        strokeColor: '#141413',
        strokeOpacity: 0.25,
        strokeWeight: 4,
        map,
      });
      basePolylinesRef.current = [baseLine];
      setRoutePath(fallbackPts);
      setDestLatLng(fallbackDestination);
      const bounds = new google.maps.LatLngBounds();
      fallbackPts.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, 32);
      onTelemetry({
        distanceMeters: 2800,
        durationMillis: 12 * 60 * 1000,
      });
    };

    RouteClass.computeRoutes({
      origin,
      destination: destinationQuery,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    })
      .then((res) => {
        if (cancelled) return;
        const route = res?.routes?.[0];
        if (!route) {
          applyFallbackRoute();
          return;
        }

        const extractedPts: LatLngPoint[] = [];

        if (typeof route.createPolylines === 'function') {
          const lines = route.createPolylines();
          lines.forEach((line) => {
            line.setOptions({
              strokeColor: '#141413',
              strokeOpacity: 0.24,
              strokeWeight: 4,
            });
            line.setMap(map);
            const pathArr = line.getPath()?.getArray?.() ?? [];
            pathArr.forEach((pt) => extractedPts.push(toLatLngLiteral(pt)));
          });
          basePolylinesRef.current = lines;
        }

        if (extractedPts.length < 2 && Array.isArray(route.path)) {
          route.path.forEach((pt) => extractedPts.push(toLatLngLiteral(pt)));
        }

        const rawEnd = route.legs?.[0]?.endLocation;
        const resolvedEnd = rawEnd
          ? toLatLngLiteral(rawEnd)
          : extractedPts[extractedPts.length - 1] ?? fallbackDestination;

        setDestLatLng(resolvedEnd);
        setRoutePath(
          extractedPts.length >= 2 ? extractedPts : [origin, resolvedEnd]
        );

        if (route.viewport) {
          map.fitBounds(route.viewport, 32);
        }

        onTelemetry({
          distanceMeters: route.distanceMeters ?? 3200,
          durationMillis: route.durationMillis ?? 14 * 60 * 1000,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const wasQuota = notifyQuotaExceededIfNeeded(err);
        if (!wasQuota) {
          applyFallbackRoute();
        }
      });

    return () => {
      cancelled = true;
      basePolylinesRef.current.forEach((p) => p.setMap(null));
      basePolylinesRef.current = [];
      if (traveledPolylineRef.current) {
        traveledPolylineRef.current.setMap(null);
        traveledPolylineRef.current = null;
      }
    };
  }, [routesLib, map, origin.lat, origin.lng, destinationQuery, onTelemetry]);

  const interpolated = useMemo(() => {
    const pts =
      routePath.length >= 2
        ? routePath
        : destLatLng
          ? [origin, destLatLng]
          : [origin];
    return interpolateAlongPath(pts, progress);
  }, [routePath, destLatLng, origin, progress]);

  // Draw live crimson traveled path behind courier
  useEffect(() => {
    if (!map || interpolated.traveledPath.length < 2) return;
    if (!traveledPolylineRef.current) {
      traveledPolylineRef.current = new google.maps.Polyline({
        path: interpolated.traveledPath,
        strokeColor: '#D9043D',
        strokeOpacity: 0.95,
        strokeWeight: 5,
        zIndex: 4,
        map,
      });
    } else {
      traveledPolylineRef.current.setPath(interpolated.traveledPath);
    }
  }, [map, interpolated.traveledPath]);

  return (
    <>
      {destLatLng && (
        <AdvancedMarker position={destLatLng} title="Teslimat Adresi">
          <Pin
            background="#141413"
            borderColor="#000000"
            glyphColor="#FAF9F7"
            scale={0.95}
          />
        </AdvancedMarker>
      )}

      {/* Live Moving Courier Marker */}
      <AdvancedMarker
        position={interpolated.position}
        title={`Canlı Kurye: ${courierName}`}
        zIndex={30}
      >
        <div className="relative flex flex-col items-center -translate-y-1">
          <div className="mb-1 px-2 py-0.5 rounded-md bg-[#141413] text-white text-[10px] font-semibold whitespace-nowrap shadow-md border border-white/20">
            {status === 'delivered'
              ? 'Teslim Edildi'
              : `${courierName} · Canlı`}
          </div>
          <div className="relative flex items-center justify-center">
            {status === 'on_the_way' && (
              <span className="absolute w-10 h-10 rounded-full bg-[#D9043D]/40 animate-ping" />
            )}
            <div className="relative w-8 h-8 rounded-full bg-[#D9043D] text-white border-2 border-white shadow-lg flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </div>
          </div>
        </div>
      </AdvancedMarker>
    </>
  );
}

function OrderTrackingMap({
  order,
  isMapsProviderActive,
}: {
  order: Order;
  isMapsProviderActive: boolean;
}) {
  const anchor = CITY_HUB_ANCHORS[order.cityId] ?? CITY_HUB_ANCHORS.istanbul;
  const originCenter = useMemo(
    () => getCenterForProvince(order.cityId, order.cityName),
    [order.cityId, order.cityName]
  );
  const mapInstanceId = `order-map-${order.id}`;
  const [telemetry, setTelemetry] = useState<RouteTelemetry | null>(null);
  const handleTelemetry = useCallback((t: RouteTelemetry | null) => {
    setTelemetry(t);
  }, []);

  const progress = useLiveCourierProgress(order.status, order.id);
  const destinationQuery = `${order.address}, ${order.neighborhood}, ${order.cityName}`;

  const pct = Math.round(progress * 100);
  const totalKm = telemetry ? telemetry.distanceMeters / 1000 : 3.2;
  const remainingKm = Math.max(0, totalKm * (1 - progress)).toFixed(1);
  const totalMins = telemetry
    ? Math.max(4, Math.round(telemetry.durationMillis / 60000))
    : 14;
  const remainingMins =
    order.status === 'delivered'
      ? 0
      : Math.max(1, Math.round(totalMins * (1 - progress)));

  const statusText =
    order.status === 'received'
      ? 'Kurye restoran çıkışında bekleniyor'
      : order.status === 'preparing'
        ? 'Kurye mutfak noktasında paketi bekliyor'
        : order.status === 'on_the_way'
          ? `Kurye ${order.neighborhood} yönüne canlı ilerliyor`
          : 'Kurye teslimat adresine ulaştı';

  return (
    <div className="space-y-2.5 pt-2">
      {isMapsProviderActive ? (
        <div className="relative h-[230px] w-full rounded-lg overflow-hidden border border-[#E6E4DF] bg-[#EFECE6]">
          <GoogleMap
            id={mapInstanceId}
            mapId={DEFAULT_MAP_ID}
            defaultCenter={originCenter}
            defaultZoom={13}
            disableDefaultUI={true}
            gestureHandling="cooperative"
            internalUsageAttributionIds={GOOGLE_MAPS_ATTRIBUTION_IDS}
            style={{ width: '100%', height: '100%' }}
          >
            <AdvancedMarker
              position={originCenter}
              title={`${order.cityName} Çıkış Mutfağı`}
            >
              <Pin
                background="#B45309"
                borderColor="#78350F"
                glyphColor="#FFFBEB"
                scale={0.85}
              />
            </AdvancedMarker>
            <OrderRouteOverlay
              mapIdKey={mapInstanceId}
              origin={originCenter}
              destinationQuery={destinationQuery}
              courierName={order.courierName}
              status={order.status}
              progress={progress}
              onTelemetry={handleTelemetry}
            />
          </GoogleMap>

          {/* Live status overlay pill inside map corner */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-sm border border-[#E6E4DF] text-[11px] font-semibold text-[#141413] shadow-sm">
              <Radio
                className={`w-3.5 h-3.5 text-[#D9043D] ${
                  order.status === 'on_the_way' ? 'animate-pulse' : ''
                }`}
              />
              <span>{statusText}</span>
            </div>
            <span className="font-mono tabular-nums px-2 py-1 rounded-md bg-[#141413]/90 text-white text-[11px] font-semibold shadow-sm">
              %{pct}
            </span>
          </div>
        </div>
      ) : (
        /* Graceful Live Radar Fallback when Maps API is not active */
        <div className="rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#141413]">
              <Radio className="w-3.5 h-3.5 text-[#D9043D] animate-pulse" />
              {statusText}
            </span>
            <span className="font-mono tabular-nums font-semibold text-[#D9043D]">
              %{pct}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-[#E6E4DF] overflow-hidden">
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.25 }}
              className="h-full bg-[#D9043D] rounded-full"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#575550]">
            <span>{order.cityName} Mutfak</span>
            <span>{order.neighborhood} Teslimat</span>
          </div>
        </div>
      )}

      {/* Live Telemetry Bar */}
      <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] px-3 py-2 text-[11px]">
        <div>
          <span className="text-[#8A8780] block">Kalan Mesafe</span>
          <span className="font-mono tabular-nums font-semibold text-[#141413]">
            {order.status === 'delivered' ? '0.0 km' : `${remainingKm} km`}
          </span>
        </div>
        <div>
          <span className="text-[#8A8780] block">Canlı Varış</span>
          <span className="font-mono tabular-nums font-semibold text-[#D9043D]">
            {order.status === 'delivered'
              ? 'Teslim Edildi'
              : `~${remainingMins} dk`}
          </span>
        </div>
        <div>
          <span className="text-[#8A8780] block">Çıkış Bölgesi</span>
          <span className="font-medium text-[#141413] truncate block">
            {order.cityName || anchor.name}
          </span>
        </div>
      </div>
    </div>
  );
}

export function OrdersPanel({
  isOpen,
  orders,
  currencyMode,
  isMapsProviderActive = false,
  focusedOrderId = null,
  onClose,
  onAdvanceStatus,
  onOpenSupport,
  onOpenStaffInbox,
}: OrdersPanelProps) {
  const { t } = useLanguage();
  const [expandedMapOrderId, setExpandedMapOrderId] = useState<string | null>(
    null
  );

  // Auto-open live courier tracking map for focusedOrderId or latest active order
  useEffect(() => {
    if (!isOpen) return;
    if (focusedOrderId) {
      setExpandedMapOrderId(focusedOrderId);
      window.setTimeout(() => {
        const el = document.querySelector(`[data-order-id="${focusedOrderId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
      return;
    }
    const newestActive = orders.find((o) => o.status !== 'delivered');
    setExpandedMapOrderId(newestActive?.id ?? orders[0]?.id ?? null);
  }, [isOpen, focusedOrderId, orders.length]);

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
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-[#141413]">
              Siparişlerim & Canlı Kurye Takibi
            </h2>
            <p className="text-xs text-[#575550]">
              Haritada anlık kurye konumu, adım bildirimleri ve canlı destek
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenStaffInbox && (
              <button
                type="button"
                onClick={onOpenStaffInbox}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-[11px] font-medium text-[#141413] hover:border-[#D9043D] hover:text-[#D9043D] transition-colors cursor-pointer whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#D9043D]" />
                <span className="hidden sm:inline">{t.staffInboxBtn}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Siparişler panelini kapat"
              className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#FAF9F7]">
          {orders.length === 0 ? (
            <div className="bg-white border border-[#E6E4DF] rounded-xl p-8 text-center">
              <p className="font-display text-lg font-medium text-[#141413] mb-1">
                Henüz bir siparişiniz yok
              </p>
              <p className="text-sm text-[#575550]">
                İlk siparişinizi oluşturduğunuzda mutfak hazırlığı ve canlı kurye rotası burada anlık görüntülenir.
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
                  data-order-id={order.id}
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
                    <motion.span
                      key={`${order.id}-${order.status}`}
                      initial={{ scale: 0.9, opacity: 0.6 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md whitespace-nowrap border ${
                        order.status === 'on_the_way'
                          ? 'bg-[#D9043D] text-white border-[#D9043D]'
                          : 'bg-[#FAF9F7] text-[#141413] border-[#E6E4DF]'
                      }`}
                    >
                      {order.status === 'on_the_way' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                      {STEPS[currentIndex]?.label}
                    </motion.span>
                  </div>

                  {/* Animated 4-step progress tracker */}
                  <div className="pt-1">
                    <div className="grid grid-cols-4 gap-2">
                      {STEPS.map((step, idx) => {
                        const completed = idx <= currentIndex;
                        const isActiveStep = idx === currentIndex && !isDelivered;
                        return (
                          <div key={step.key} className="space-y-1.5">
                            <div className="h-1.5 rounded-full bg-[#E6E4DF] overflow-hidden">
                              <motion.div
                                initial={false}
                                animate={{ width: completed ? '100%' : '0%' }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                  isActiveStep
                                    ? 'bg-[#D9043D] animate-pulse'
                                    : 'bg-[#D9043D]'
                                }`}
                              />
                            </div>
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

                  {/* Meta details & Live Courier Map */}
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
                    <div className="col-span-2 pt-1 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMapOrderId(isMapOpen ? null : order.id)
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D9043D] hover:underline cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>
                            {isMapOpen
                              ? 'Canlı Kurye Haritasını Gizle'
                              : 'Canlı Kurye Takibini Aç'}
                          </span>
                        </button>

                        {onOpenSupport && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenSupport(order, 'restaurant')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-[11px] font-semibold text-[#141413] hover:border-[#D9043D] hover:text-[#D9043D] transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#D9043D]" />
                              <span>{t.liveSupportBtn}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenSupport(order, 'courier')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-lg border border-[#D9043D]/30 bg-white text-[11px] font-semibold text-[#D9043D] hover:bg-[#D9043D] hover:text-white transition-colors cursor-pointer"
                            >
                              <Bike className="w-3.5 h-3.5" />
                              <span>Kuryeye Yaz</span>
                            </button>
                          </div>
                        )}
                      </div>
                      {isMapOpen && (
                        <OrderTrackingMap
                          order={order}
                          isMapsProviderActive={isMapsProviderActive}
                        />
                      )}
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

