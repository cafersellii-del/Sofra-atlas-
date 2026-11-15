import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AdminPanelModal } from './components/AdminPanelModal';
import { CartDrawer } from './components/CartDrawer';
import { CraftsmanshipSection } from './components/CraftsmanshipSection';
import { DishDetailModal } from './components/DishDetailModal';
import { ExtensionStudioModal } from './components/ExtensionStudioModal';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { LiveSupportChatModal } from './components/LiveSupportChatModal';
import { MemberAuthModal } from './components/MemberAuthModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  type OrderStepNotification,
  OrderStepNotifications,
} from './components/OrderStepNotifications';
import { OrdersPanel } from './components/OrdersPanel';
import { RestaurantMarketplace } from './components/RestaurantMarketplace';
import { RestaurantMenuModal } from './components/RestaurantMenuModal';
import { RestaurantPortalModal } from './components/RestaurantPortalModal';
import { SupportStaffInboxModal } from './components/SupportStaffInbox';
import { WorldMapSection } from './components/WorldMapSection';
import {
  CITY_HUBS,
  CURATED_RESTAURANT_META,
  DISHES,
  EXTRA_RESTAURANT_DISHES,
  INITIAL_ORDERS,
  resolveImagePreset,
} from './data/catalog';
import {
  getDistrictsForProvince,
  getProvincesForCountry,
} from './data/locations';
import { registerOrderSupportMetadata } from './hooks/useSupportChat';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { GOOGLE_MAPS_API_KEY } from './lib/maps';
import { LanguageProvider } from './i18n/LanguageContext';
import {
  isBootstrappedSuperAdmin,
  isHardcodedNonTurkeyAdmin,
  isTurkeyCityId,
  resolveAdminDocScope,
} from './utils/adminScope';
import {
  calculateOrderCommissionBreakdown,
  COMMISSION_STORAGE_KEY,
  DEFAULT_COMMISSION_CONFIG,
  sanitizeCommissionConfig,
} from './utils/commission';
import { refundOnlinePayment } from './utils/payment';
import { sanitizeText, VALIDATION_BOUNDS } from './utils/validation';
import type {
  AdminUserRecord,
  CartItem,
  CityId,
  CommissionConfig,
  ContinentId,
  CuisineCategory,
  CurrencyMode,
  Dish,
  DishExtra,
  DishPortion,
  MemberProfile,
  Order,
  OrderStatus,
  PartnerDishRecord,
  PaymentMethod,
  PaymentStatus,
  RestaurantProfile,
  RestaurantSortOption,
  RestaurantStorefront,
  SavedCardRecord,
  SupportChatChannel,
} from './types/food';

const STATUS_SEQUENCE: OrderStatus[] = [
  'received',
  'preparing',
  'on_the_way',
  'delivered',
];

function getNextStatus(current: OrderStatus): OrderStatus {
  const idx = STATUS_SEQUENCE.indexOf(current);
  if (idx === -1 || idx >= STATUS_SEQUENCE.length - 1) return 'delivered';
  return STATUS_SEQUENCE[idx + 1];
}

function mapFirestoreOrderDoc(
  docId: string,
  rawData: Record<string, unknown>
): Order {
  const data = rawData as {
    ownerId: string;
    orderNumber: string;
    cityId: Exclude<CityId, 'all'>;
    cityName: string;
    neighborhood: string;
    address: string;
    customerName: string;
    customerPhone: string;
    restaurantName: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    gatewayLabel: string;
    transactionId: string;
    authCode: string;
    cardBrand: SavedCardRecord['brand'] | '';
    cardLast4: string;
    refundId: string;
    deliveryPreferences: string[];
    itemsSummary: string[];
    subtotalTry: number;
    discountTry: number;
    deliveryFeeTry: number;
    serviceFeeTry?: number;
    commissionRatePct?: number;
    commissionTry?: number;
    restaurantNetTry?: number;
    totalTry: number;
    status: OrderStatus;
    estimatedArrival: string;
    courierName: string;
    courierId?: string;
    courierStatus?: Order['courierStatus'];
  };
  const normalizedCourierName =
    !data.courierName || data.courierName === 'Kurye Bekleniyor'
      ? data.restaurantName
        ? `${data.restaurantName} Kuryesi`
        : 'Restoran Kuryesi'
      : data.courierName;
  return {
    id: data.orderNumber,
    firestoreId: docId,
    ownerId: data.ownerId,
    createdAt: 'Kayıtlı Sipariş',
    cityId: data.cityId,
    cityName: data.cityName,
    neighborhood: data.neighborhood,
    address: data.address,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    paymentDetails: data.transactionId
      ? {
          transactionId: data.transactionId,
          authCode: data.authCode,
          gatewayLabel: data.gatewayLabel,
          paidAt: '',
          cardBrand: data.cardBrand,
          last4: data.cardLast4,
          maskedCard:
            data.cardBrand && data.cardLast4
              ? `${data.cardBrand} •••• ${data.cardLast4}`
              : data.gatewayLabel,
          refundId: data.refundId || undefined,
        }
      : undefined,
    deliveryPreferences: data.deliveryPreferences,
    items: (data.itemsSummary ?? []).map((summary) => ({
      dishName: summary,
      restaurantName: data.restaurantName,
      portionLabel: 'Standart',
      extrasLabels: [],
      quantity: 1,
      lineTotalTry: 0,
    })),
    subtotalTry: data.subtotalTry,
    discountTry: data.discountTry,
    deliveryFeeTry: data.deliveryFeeTry,
    serviceFeeTry: data.serviceFeeTry,
    commissionRatePct: data.commissionRatePct,
    commissionTry: data.commissionTry,
    restaurantNetTry: data.restaurantNetTry,
    totalTry: data.totalTry,
    status: data.status,
    estimatedArrival: data.estimatedArrival,
    courierName: normalizedCourierName,
    courierId: data.courierId ?? '',
    courierStatus: data.courierStatus,
  };
}

interface PendingCartAddition {
  dish: Dish;
  portion: DishPortion;
  extras: DishExtra[];
  note: string;
  quantity: number;
}

export default function App() {
  const [initialUrlParams] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        city: 'all' as CityId,
        restaurant: null as string | null,
        dishId: null as string | null,
        embed: false,
      };
    }
    const params = new URLSearchParams(window.location.search);
    const rawCity = params.get('sehir') as CityId | null;
    const city: CityId =
      rawCity && CITY_HUBS.some((h) => h.id === rawCity) ? rawCity : 'all';
    const restaurant = params.get('mutfak');
    const dishId = params.get('yemek');
    const embed = params.get('embed') === '1';
    return { city, restaurant, dishId, embed };
  });

  const [selectedCity, setSelectedCity] = useState<CityId>(
    initialUrlParams.city
  );
  const [selectedProvince, setSelectedProvince] = useState<'all' | string>(
    'all'
  );
  const [selectedDistrict, setSelectedDistrict] = useState<'all' | string>(
    'all'
  );
  const [selectedContinent, setSelectedContinent] = useState<
    'all' | ContinentId
  >('all');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const handleSelectCity = (nextCity: CityId) => {
    setSelectedCity(nextCity);
    setSelectedProvince('all');
    setSelectedDistrict('all');
  };

  const handleSelectProvince = (nextProvince: 'all' | string) => {
    setSelectedProvince(nextProvince);
    setSelectedDistrict('all');
  };
  const [selectedRestaurantFilter, setSelectedRestaurantFilter] = useState<
    string | null
  >(initialUrlParams.restaurant);
  const [selectedCategory, setSelectedCategory] =
    useState<CuisineCategory>('Tümü');
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('TRY');
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [freeDeliveryOnly, setFreeDeliveryOnly] = useState(false);
  const [campaignOnly, setCampaignOnly] = useState(false);
  const [partnerOnly, setPartnerOnly] = useState(false);
  const [sortBy, setSortBy] = useState<RestaurantSortOption>('recommended');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeRestaurantModal, setActiveRestaurantModal] =
    useState<RestaurantStorefront | null>(null);
  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  const [pendingCartConflict, setPendingCartConflict] =
    useState<PendingCartAddition | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [stepNotifications, setStepNotifications] = useState<
    OrderStepNotification[]
  >([]);
  const [isRestaurantPortalOpen, setIsRestaurantPortalOpen] = useState(false);
  const [isExtensionStudioOpen, setIsExtensionStudioOpen] = useState(false);
  const [supportChatState, setSupportChatState] = useState<{
    orderId: string;
    channel: SupportChatChannel;
  } | null>(null);
  const [isStaffInboxOpen, setIsStaffInboxOpen] = useState(false);
  const [staffInboxOrderId, setStaffInboxOrderId] = useState<string | null>(
    null
  );
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('yonetici') === '1';
  });
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCardRecord[]>([]);
  const autoProvisionedMemberUidRef = useRef<string | null>(null);
  const backfilledMemberEmailUidRef = useRef<string | null>(null);
  const selectedCityRef = useRef<CityId>(selectedCity);
  const deliveryAddressRef = useRef<string>(deliveryAddress);
  selectedCityRef.current = selectedCity;
  deliveryAddressRef.current = deliveryAddress;
  const [activeRestaurants, setActiveRestaurants] = useState<
    RestaurantProfile[]
  >([]);
  const [partnerDishes, setPartnerDishes] = useState<PartnerDishRecord[]>([]);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sofra_atlas_cart');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('sofra_atlas_orders');
      return saved ? (JSON.parse(saved) as Order[]) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig>(() => {
    try {
      const saved = localStorage.getItem(COMMISSION_STORAGE_KEY);
      return saved
        ? sanitizeCommissionConfig(JSON.parse(saved) as Partial<CommissionConfig>)
        : { ...DEFAULT_COMMISSION_CONFIG };
    } catch {
      return { ...DEFAULT_COMMISSION_CONFIG };
    }
  });

  const [nonTurkeyCommissionConfig, setNonTurkeyCommissionConfig] =
    useState<CommissionConfig | null>(null);
  const [adminFirestoreOrders, setAdminFirestoreOrders] = useState<Order[]>([]);
  const [isNonTurkeyRegionalAdmin, setIsNonTurkeyRegionalAdmin] =
    useState(false);

  const handleCommissionConfigUpdated = useCallback((next: CommissionConfig) => {
    const clean = sanitizeCommissionConfig(next);
    setCommissionConfig(clean);
    try {
      localStorage.setItem(COMMISSION_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const handleNonTurkeyCommissionConfigUpdated = useCallback(
    (next: CommissionConfig) => {
      setNonTurkeyCommissionConfig(sanitizeCommissionConfig(next));
    },
    []
  );

  const prevOrderStatusesRef = useRef<Record<string, OrderStatus>>(
    Object.fromEntries(orders.map((o) => [o.id, o.status]))
  );

  const pushStepNotification = useCallback((order: Order) => {
    const uid = `${order.id}-${order.status}-${Date.now()}`;
    setStepNotifications((prev) => [
      {
        uid,
        orderId: order.id,
        status: order.status,
        cityName: order.cityName,
        neighborhood: order.neighborhood,
        courierName: order.courierName,
        estimatedArrival: order.estimatedArrival,
      },
      ...prev.slice(0, 2),
    ]);
  }, []);

  const dismissStepNotification = useCallback((uid: string) => {
    setStepNotifications((prev) => prev.filter((n) => n.uid !== uid));
  }, []);

  useEffect(() => {
    const prevMap = prevOrderStatusesRef.current;
    for (const order of orders) {
      const prevStatus = prevMap[order.id];
      if (prevStatus && prevStatus !== order.status) {
        pushStepNotification(order);
      }
      prevMap[order.id] = order.status;
    }
  }, [orders, pushStepNotification]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setCurrentUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Detect non-Turkey regional admin (hardcoded or delegated) to apply English UI across the app
  useEffect(() => {
    let active = true;
    async function checkRegionalScope() {
      if (!authReady || !currentUser || !currentUser.emailVerified) {
        if (active) setIsNonTurkeyRegionalAdmin(false);
        return;
      }
      if (isBootstrappedSuperAdmin(currentUser)) {
        if (active) setIsNonTurkeyRegionalAdmin(false);
        return;
      }
      if (isHardcodedNonTurkeyAdmin(currentUser)) {
        if (active) setIsNonTurkeyRegionalAdmin(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'admins', currentUser.uid));
        if (active) {
          setIsNonTurkeyRegionalAdmin(
            snap.exists() &&
              resolveAdminDocScope(snap.data() as AdminUserRecord) ===
                'non_turkey'
          );
        }
      } catch (error) {
        if (active) setIsNonTurkeyRegionalAdmin(false);
        handleFirestoreError(
          error,
          OperationType.GET,
          `admins/${currentUser.uid}`
        );
      }
    }
    void checkRegionalScope();
    return () => {
      active = false;
    };
  }, [authReady, currentUser]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const baseUrl = window.location.origin + window.location.pathname;
    const canonicalUrl =
      selectedCity !== 'all'
        ? `${baseUrl}?sehir=${encodeURIComponent(selectedCity)}`
        : baseUrl;

    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    const setMeta = (attrName: 'property' | 'name', attrVal: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrVal}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attrName, attrVal);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const ogImageAbs = `${window.location.origin}/og-cover.jpg`;
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', ogImageAbs);
    setMeta('name', 'twitter:image', ogImageAbs);

    const activeHub =
      selectedCity !== 'all'
        ? CITY_HUBS.find((h) => h.id === selectedCity)
        : undefined;
    if (isNonTurkeyRegionalAdmin) {
      document.title = activeHub
        ? `${activeHub.country} (${activeHub.name}) Restaurants — Sofra Atlas`
        : 'Sofra Atlas — Global Restaurants & Online Food Delivery';
    } else {
      document.title = activeHub
        ? `${activeHub.country} (${activeHub.name}) Restoranları — Sofra Atlas`
        : 'Sofra Atlas — Küresel Restoran ve Online Yemek Siparişi';
    }
  }, [selectedCity, isNonTurkeyRegionalAdmin]);

  // Subscribe to owner's member profile, saved tokenized cards, and persisted Firestore orders when verified
  useEffect(() => {
    if (!authReady || !currentUser || !currentUser.emailVerified) {
      setMemberProfile(null);
      setSavedCards([]);
      return;
    }

    const profilePath = `users/${currentUser.uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snap) => {
        if (!snap.exists()) {
          setMemberProfile(null);
          if (autoProvisionedMemberUidRef.current !== currentUser.uid) {
            autoProvisionedMemberUidRef.current = currentUser.uid;
            const rawCity = selectedCityRef.current;
            const defaultCityId: Exclude<CityId, 'all'> =
              rawCity === 'all' ? 'istanbul' : rawCity;
            const provinces = getProvincesForCountry(defaultCityId);
            const rawProvince = provinces[0]?.name ?? 'İstanbul';
            const districts = getDistrictsForProvince(defaultCityId, rawProvince);
            const rawDistrict = districts[0] ?? 'Merkez';
            const rawName = sanitizeText(
              currentUser.displayName ||
                currentUser.email?.split('@')[0] ||
                'Sofra Atlas Üyesi',
              VALIDATION_BOUNDS.nameMax
            );
            const safeDisplayName =
              rawName.length >= VALIDATION_BOUNDS.nameMin
                ? rawName
                : 'Sofra Atlas Üyesi';
            const safeProvince =
              sanitizeText(rawProvince, VALIDATION_BOUNDS.cityNameMax).length >= 2
                ? sanitizeText(rawProvince, VALIDATION_BOUNDS.cityNameMax)
                : 'Merkez';
            const safeDistrict =
              sanitizeText(rawDistrict, VALIDATION_BOUNDS.districtMax).length >= 2
                ? sanitizeText(rawDistrict, VALIDATION_BOUNDS.districtMax)
                : 'Merkez';

            void setDoc(doc(db, 'users', currentUser.uid), {
              ownerId: currentUser.uid,
              displayName: safeDisplayName,
              email: sanitizeText(
                currentUser.email ?? '',
                VALIDATION_BOUNDS.emailMax
              ),
              phone: '',
              defaultCityId,
              defaultProvince: safeProvince,
              defaultDistrict: safeDistrict,
              defaultAddress: sanitizeText(
                deliveryAddressRef.current || '',
                VALIDATION_BOUNDS.addressMax
              ),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }).catch((error) => {
              handleFirestoreError(error, OperationType.CREATE, profilePath);
            });
          }
          return;
        }
        const data = snap.data() as MemberProfile;
        setMemberProfile(data);
        if (data.defaultAddress && !deliveryAddressRef.current.trim()) {
          setDeliveryAddress(data.defaultAddress);
        }
        if (
          data.email === undefined &&
          currentUser.email &&
          backfilledMemberEmailUidRef.current !== currentUser.uid
        ) {
          backfilledMemberEmailUidRef.current = currentUser.uid;
          void updateDoc(doc(db, 'users', currentUser.uid), {
            email: sanitizeText(currentUser.email, VALIDATION_BOUNDS.emailMax),
            updatedAt: serverTimestamp(),
          }).catch((error) => {
            handleFirestoreError(error, OperationType.UPDATE, profilePath);
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, profilePath);
      }
    );

    const cardsPath = `users/${currentUser.uid}/savedCards`;
    const cardsQuery = query(
      collection(db, 'users', currentUser.uid, 'savedCards'),
      where('ownerId', '==', currentUser.uid)
    );
    const unsubCards = onSnapshot(
      cardsQuery,
      (snap) => {
        setSavedCards(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SavedCardRecord, 'id'>),
          }))
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, cardsPath);
      }
    );

    const ordersQuery = query(
      collection(db, 'orders'),
      where('ownerId', '==', currentUser.uid)
    );
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const cloudOrders: Order[] = snap.docs.map((d) => {
          const data = d.data() as {
            ownerId: string;
            orderNumber: string;
            cityId: Exclude<CityId, 'all'>;
            cityName: string;
            neighborhood: string;
            address: string;
            customerName: string;
            customerPhone: string;
            restaurantName: string;
            paymentMethod: PaymentMethod;
            paymentStatus: PaymentStatus;
            gatewayLabel: string;
            transactionId: string;
            authCode: string;
            cardBrand: SavedCardRecord['brand'] | '';
            cardLast4: string;
            refundId: string;
            deliveryPreferences: string[];
            itemsSummary: string[];
            subtotalTry: number;
            discountTry: number;
            deliveryFeeTry: number;
            serviceFeeTry?: number;
            commissionRatePct?: number;
            commissionTry?: number;
            restaurantNetTry?: number;
            totalTry: number;
            status: OrderStatus;
            estimatedArrival: string;
            courierName: string;
            courierId?: string;
            courierStatus?: Order['courierStatus'];
          };
          const normalizedCourierName =
            !data.courierName || data.courierName === 'Kurye Bekleniyor'
              ? data.restaurantName
                ? `${data.restaurantName} Kuryesi`
                : 'Restoran Kuryesi'
              : data.courierName;
          return {
            id: data.orderNumber,
            firestoreId: d.id,
            ownerId: data.ownerId,
            createdAt: 'Kayıtlı Sipariş',
            cityId: data.cityId,
            cityName: data.cityName,
            neighborhood: data.neighborhood,
            address: data.address,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            paymentMethod: data.paymentMethod,
            paymentStatus: data.paymentStatus,
            paymentDetails: data.transactionId
              ? {
                  transactionId: data.transactionId,
                  authCode: data.authCode,
                  gatewayLabel: data.gatewayLabel,
                  paidAt: '',
                  cardBrand: data.cardBrand,
                  last4: data.cardLast4,
                  maskedCard:
                    data.cardBrand && data.cardLast4
                      ? `${data.cardBrand} •••• ${data.cardLast4}`
                      : data.gatewayLabel,
                  refundId: data.refundId || undefined,
                }
              : undefined,
            deliveryPreferences: data.deliveryPreferences,
            items: (data.itemsSummary ?? []).map((summary) => ({
              dishName: summary,
              restaurantName: data.restaurantName,
              portionLabel: 'Standart',
              extrasLabels: [],
              quantity: 1,
              lineTotalTry: 0,
            })),
            subtotalTry: data.subtotalTry,
            discountTry: data.discountTry,
            deliveryFeeTry: data.deliveryFeeTry,
            serviceFeeTry: data.serviceFeeTry,
            commissionRatePct: data.commissionRatePct,
            commissionTry: data.commissionTry,
            restaurantNetTry: data.restaurantNetTry,
            totalTry: data.totalTry,
            status: data.status,
            estimatedArrival: data.estimatedArrival,
            courierName: normalizedCourierName,
            courierId: data.courierId ?? '',
            courierStatus: data.courierStatus,
          };
        });

        if (cloudOrders.length > 0) {
          for (const co of cloudOrders) {
            if (!prevOrderStatusesRef.current[co.id]) {
              prevOrderStatusesRef.current[co.id] = co.status;
            }
          }
          setOrders((prev) => {
            const byId = new Map(prev.map((o) => [o.id, o]));
            for (const co of cloudOrders) {
              const existing = byId.get(co.id);
              byId.set(co.id, {
                ...co,
                createdAt: existing?.createdAt ?? co.createdAt,
                items: existing?.items?.length ? existing.items : co.items,
              });
            }
            return Array.from(byId.values());
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => {
      unsubProfile();
      unsubCards();
      unsubOrders();
    };
  }, [authReady, currentUser]);

  // Subscribe to all (or non-Turkey) customer orders for verified admin identities
  useEffect(() => {
    if (!authReady || !currentUser || !currentUser.emailVerified) {
      setAdminFirestoreOrders([]);
      return;
    }

    const isSuper = isBootstrappedSuperAdmin(currentUser);
    const isIntl = isHardcodedNonTurkeyAdmin(currentUser);
    if (!isSuper && !isIntl) {
      setAdminFirestoreOrders([]);
      return;
    }

    const adminOrdersQuery = isSuper
      ? collection(db, 'orders')
      : query(collection(db, 'orders'), where('cityId', '!=', 'istanbul'));

    const unsub = onSnapshot(
      adminOrdersQuery,
      (snap) => {
        setAdminFirestoreOrders(
          snap.docs.map((d) =>
            mapFirestoreOrderDoc(d.id, d.data() as Record<string, unknown>)
          )
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => unsub();
  }, [authReady, currentUser]);

  // Subscribe to active registered partner restaurants
  useEffect(() => {
    const restQuery = query(
      collection(db, 'restaurants'),
      where('status', '==', 'active')
    );
    const unsub = onSnapshot(
      restQuery,
      (snap) => {
        const list: RestaurantProfile[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<RestaurantProfile, 'id'>),
        }));
        setActiveRestaurants(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'restaurants');
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to published partner dishes
  useEffect(() => {
    const dishesQuery = query(
      collection(db, 'dishes'),
      where('isPublished', '==', true)
    );
    const unsub = onSnapshot(
      dishesQuery,
      (snap) => {
        const list: PartnerDishRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PartnerDishRecord, 'id'>),
        }));
        setPartnerDishes(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'dishes');
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to platform-wide and non-Turkey regional commission policies
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'platformSettings', 'commission'),
      (snap) => {
        if (!snap.exists()) return;
        const clean = sanitizeCommissionConfig(
          snap.data() as Partial<CommissionConfig>
        );
        setCommissionConfig(clean);
        try {
          localStorage.setItem(COMMISSION_STORAGE_KEY, JSON.stringify(clean));
        } catch {
          // Ignore storage quota errors
        }
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.GET,
          'platformSettings/commission'
        );
      }
    );

    const unsubNonTurkey = onSnapshot(
      doc(db, 'platformSettings', 'commission_non_turkey'),
      (snap) => {
        if (!snap.exists()) {
          setNonTurkeyCommissionConfig(null);
          return;
        }
        setNonTurkeyCommissionConfig(
          sanitizeCommissionConfig(snap.data() as Partial<CommissionConfig>)
        );
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.GET,
          'platformSettings/commission_non_turkey'
        );
      }
    );

    return () => {
      unsub();
      unsubNonTurkey();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sofra_atlas_cart', JSON.stringify(cartItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem('sofra_atlas_orders', JSON.stringify(orders));
    } catch {
      // Ignore storage quota errors
    }
  }, [orders]);

  // Automatic progression for restaurant-fulfilled orders until delivered
  useEffect(() => {
    const hasAutoAdvancing = orders.some((o) => o.status !== 'delivered');
    if (!hasAutoAdvancing) return;

    const timer = window.setInterval(() => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.status === 'delivered') {
            return order;
          }
          return { ...order, status: getNextStatus(order.status) };
        })
      );
    }, 10000);

    return () => window.clearInterval(timer);
  }, [orders]);

  const allCatalogDishes = useMemo<Dish[]>(() => {
    const activeRestaurantIds = new Set(activeRestaurants.map((r) => r.id));
    const convertedPartnerDishes: Dish[] = partnerDishes
      .filter((pd) => activeRestaurantIds.has(pd.restaurantId))
      .map((pd) => ({
        id: pd.id,
        cityId: pd.cityId,
        cityName: pd.cityName,
        district: pd.district,
        restaurantName: pd.restaurantName,
        name: pd.name,
        category: pd.category,
        description: pd.description,
        story: pd.story,
        ingredients: pd.ingredients,
        priceTry: pd.priceTry,
        prepMinutes: pd.prepMinutes,
        rating: 5.0,
        reviewCount: 1,
        calories: pd.calories,
        isVegetarian: pd.isVegetarian,
        isSpicy: pd.isSpicy,
        isChefSignature: pd.isChefSignature,
        image: resolveImagePreset(pd.imagePreset),
        portions: [
          { id: 'std', label: 'Standart Porsiyon', priceDeltaTry: 0 },
          { id: 'lrg', label: 'Büyük Porsiyon', priceDeltaTry: 120 },
        ],
        extras: [
          { id: 'drink', label: 'Soğuk İçecek Eşlikçisi', priceTry: 75 },
          { id: 'side', label: 'Ekstra Sos / Garnitür', priceTry: 45 },
        ],
        isPartnerDish: true,
      }));

    return [...convertedPartnerDishes, ...DISHES, ...EXTRA_RESTAURANT_DISHES];
  }, [activeRestaurants, partnerDishes]);

  // Derive Yemeksepeti-style RestaurantStorefront cards from dishes & Firestore partners
  const allStorefronts = useMemo<RestaurantStorefront[]>(() => {
    const partnerByName: Record<string, RestaurantProfile> = {};
    for (const pr of activeRestaurants) {
      partnerByName[pr.name.toLocaleLowerCase('tr')] = pr;
    }

    const grouped: Record<string, Dish[]> = {};
    for (const dish of allCatalogDishes) {
      const key = dish.restaurantName;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(dish);
    }

    const storefronts: RestaurantStorefront[] = Object.entries(grouped).map(
      ([restName, restDishes]) => {
        const primaryDish = restDishes[0];
        const hub =
          CITY_HUBS.find((h) => h.id === primaryDish.cityId) ?? CITY_HUBS[0];
        const meta = CURATED_RESTAURANT_META[restName];
        const partner = partnerByName[restName.toLocaleLowerCase('tr')];

        const avgRating =
          restDishes.reduce((s, d) => s + d.rating, 0) / restDishes.length;
        const totalReviews = restDishes.reduce((s, d) => s + d.reviewCount, 0);

        return {
          id: partner?.id ?? restName.toLowerCase().replace(/\s+/g, '-'),
          name: restName,
          cityId: primaryDish.cityId,
          cityName: primaryDish.cityName,
          district: partner?.district ?? primaryDish.district,
          cuisineCategory: partner?.cuisineCategory ?? primaryDish.category,
          avgDeliveryMinutes:
            partner?.avgPrepMinutes ?? primaryDish.prepMinutes,
          estimatedMinutesNumeric: meta?.estimatedMinutesNumeric ?? 25,
          minBasketTry: meta?.minBasketTry ?? 220,
          deliveryFeeTry:
            meta?.deliveryFeeTry ?? (partner ? 0 : hub.deliveryFeeTry),
          freeDeliveryThresholdTry: hub.freeDeliveryThresholdTry,
          rating: Number(avgRating.toFixed(1)),
          reviewCount: totalReviews,
          coverImage:
            restDishes.find((d) => Boolean(d.image))?.image ?? primaryDish.image,
          tagline:
            partner?.tagline ??
            meta?.tagline ??
            primaryDish.description,
          hasCampaign: meta?.hasCampaign ?? Boolean(partner),
          isPartner: Boolean(partner) || Boolean(primaryDish.isPartnerDish),
          dishes: restDishes,
        };
      }
    );

    return storefronts;
  }, [allCatalogDishes, activeRestaurants]);

  // Deep-link to ?yemek=<id> or ?mutfak=<restoran>
  useEffect(() => {
    if (initialUrlParams.dishId) {
      const match = allCatalogDishes.find(
        (d) => d.id === initialUrlParams.dishId
      );
      if (match) setActiveDish(match);
    }
  }, [initialUrlParams.dishId, allCatalogDishes]);

  useEffect(() => {
    if (!initialUrlParams.restaurant || initialUrlParams.embed) return;
    const target = initialUrlParams.restaurant.toLocaleLowerCase('tr');
    const restMatch = allStorefronts.find(
      (r) => r.name.toLocaleLowerCase('tr') === target || r.id === initialUrlParams.restaurant
    );
    if (restMatch) {
      setActiveRestaurantModal(restMatch);
    }
  }, [initialUrlParams.restaurant, initialUrlParams.embed, allStorefronts]);

  const hubContinentMap = useMemo(
    () => new Map(CITY_HUBS.map((h) => [h.id, h.continent])),
    []
  );

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr');

    const list = allStorefronts.filter((rest) => {
      if (selectedRestaurantFilter) {
        const target = selectedRestaurantFilter.toLocaleLowerCase('tr');
        if (
          rest.name.toLocaleLowerCase('tr') !== target &&
          rest.id !== selectedRestaurantFilter
        ) {
          return false;
        }
      }
      if (selectedCity !== 'all' && rest.cityId !== selectedCity) return false;
      if (
        selectedCity !== 'all' &&
        selectedProvince !== 'all' &&
        rest.cityName.toLocaleLowerCase('tr') !==
          selectedProvince.toLocaleLowerCase('tr')
      ) {
        return false;
      }
      if (selectedCity !== 'all' && selectedDistrict !== 'all') {
        const rd = rest.district.toLocaleLowerCase('tr');
        const sd = selectedDistrict.toLocaleLowerCase('tr');
        const matches =
          rd === sd ||
          rd.split('/').some((part) => part.trim() === sd) ||
          sd.split('/').some((part) => part.trim() === rd);
        if (!matches) return false;
      }
      if (
        selectedCity === 'all' &&
        selectedContinent !== 'all' &&
        hubContinentMap.get(rest.cityId) !== selectedContinent
      ) {
        return false;
      }
      if (
        selectedCategory !== 'Tümü' &&
        rest.cuisineCategory !== selectedCategory &&
        !rest.dishes.some((d) => d.category === selectedCategory)
      ) {
        return false;
      }
      if (freeDeliveryOnly && rest.deliveryFeeTry > 0) return false;
      if (campaignOnly && !rest.hasCampaign) return false;
      if (partnerOnly && !rest.isPartner) return false;
      if (vegetarianOnly && !rest.dishes.some((d) => d.isVegetarian)) {
        return false;
      }
      if (q) {
        const hub = CITY_HUBS.find((h) => h.id === rest.cityId);
        const hay = [
          rest.name,
          rest.cityName,
          hub?.country ?? '',
          hub?.continent ?? '',
          rest.district,
          rest.cuisineCategory,
          rest.tagline,
          ...rest.dishes.map((d) => `${d.name} ${d.ingredients.join(' ')}`),
        ]
          .join(' ')
          .toLocaleLowerCase('tr');
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...list];
    if (sortBy === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    } else if (sortBy === 'fastest') {
      sorted.sort(
        (a, b) => a.estimatedMinutesNumeric - b.estimatedMinutesNumeric
      );
    } else if (sortBy === 'min_basket') {
      sorted.sort((a, b) => a.minBasketTry - b.minBasketTry);
    } else {
      sorted.sort(
        (a, b) =>
          Number(b.isPartner) - Number(a.isPartner) ||
          b.rating - a.rating
      );
    }
    return sorted;
  }, [
    allStorefronts,
    selectedRestaurantFilter,
    selectedCity,
    selectedProvince,
    selectedDistrict,
    selectedContinent,
    hubContinentMap,
    selectedCategory,
    freeDeliveryOnly,
    campaignOnly,
    partnerOnly,
    vegetarianOnly,
    searchQuery,
    sortBy,
  ]);

  const filteredDishes = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr');
    return allCatalogDishes.filter((dish) => {
      if (selectedRestaurantFilter) {
        const target = selectedRestaurantFilter.toLocaleLowerCase('tr');
        if (dish.restaurantName.toLocaleLowerCase('tr') !== target) {
          return false;
        }
      }
      if (selectedCity !== 'all' && dish.cityId !== selectedCity) return false;
      if (
        selectedCity !== 'all' &&
        selectedProvince !== 'all' &&
        dish.cityName.toLocaleLowerCase('tr') !==
          selectedProvince.toLocaleLowerCase('tr')
      ) {
        return false;
      }
      if (selectedCity !== 'all' && selectedDistrict !== 'all') {
        const dd = dish.district.toLocaleLowerCase('tr');
        const sd = selectedDistrict.toLocaleLowerCase('tr');
        const matches =
          dd === sd ||
          dd.split('/').some((part) => part.trim() === sd) ||
          sd.split('/').some((part) => part.trim() === dd);
        if (!matches) return false;
      }
      if (
        selectedCity === 'all' &&
        selectedContinent !== 'all' &&
        hubContinentMap.get(dish.cityId) !== selectedContinent
      ) {
        return false;
      }
      if (selectedCategory !== 'Tümü' && dish.category !== selectedCategory)
        return false;
      if (vegetarianOnly && !dish.isVegetarian) return false;
      if (q) {
        const hub = CITY_HUBS.find((h) => h.id === dish.cityId);
        const haystack = [
          dish.name,
          dish.restaurantName,
          dish.cityName,
          hub?.country ?? '',
          hub?.continent ?? '',
          dish.district,
          dish.description,
          ...dish.ingredients,
        ]
          .join(' ')
          .toLocaleLowerCase('tr');
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    allCatalogDishes,
    selectedRestaurantFilter,
    selectedCity,
    selectedProvince,
    selectedDistrict,
    selectedContinent,
    hubContinentMap,
    selectedCategory,
    vegetarianOnly,
    searchQuery,
  ]);

  const commitCartAddition = (
    payload: PendingCartAddition,
    replaceCart = false
  ) => {
    const { dish, portion, extras, note, quantity } = payload;
    const extrasKey = extras
      .map((e) => e.id)
      .sort()
      .join(',');
    const cartItemId = `${dish.id}__${portion.id}__${extrasKey}__${note}`;
    const extrasSum = extras.reduce((sum, ex) => sum + ex.priceTry, 0);
    const unitPriceTry = dish.priceTry + portion.priceDeltaTry + extrasSum;

    const newItem: CartItem = {
      cartItemId,
      dish,
      portion,
      extras,
      note,
      quantity,
      unitPriceTry,
    };

    if (replaceCart) {
      setCartItems([newItem]);
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, newItem];
    });
  };

  // Yemeksepeti Single-Restaurant Cart Guard
  const addToCart = (payload: PendingCartAddition) => {
    const currentRest = cartItems[0]?.dish.restaurantName;
    if (
      currentRest &&
      currentRest.toLocaleLowerCase('tr') !==
        payload.dish.restaurantName.toLocaleLowerCase('tr')
    ) {
      setPendingCartConflict(payload);
      return;
    }
    commitCartAddition(payload, false);
  };

  const handleQuickAdd = (dish: Dish) => {
    const defaultPortion = dish.portions[0];
    if (!defaultPortion) return;
    addToCart({
      dish,
      portion: defaultPortion,
      extras: [],
      note: '',
      quantity: 1,
    });
  };

  const handleUpdateCartQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) =>
      prev.filter((item) => item.cartItemId !== cartItemId)
    );
  };

  const handleSaveCard = async (
    card: Omit<SavedCardRecord, 'id' | 'ownerId'>
  ) => {
    if (!currentUser || !currentUser.emailVerified) return;
    const cardId = `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const path = `users/${currentUser.uid}/savedCards/${cardId}`;
    try {
      const safeLabel = sanitizeText(card.label, 40);
      await setDoc(doc(db, 'users', currentUser.uid, 'savedCards', cardId), {
        ownerId: currentUser.uid,
        label: safeLabel.length >= 2 ? safeLabel : 'Kayıtlı Kart',
        holderName: sanitizeText(card.holderName, VALIDATION_BOUNDS.nameMax),
        brand: card.brand,
        last4: card.last4.slice(0, 4),
        expiry: card.expiry.slice(0, 5),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDeleteSavedCard = async (cardId: string) => {
    if (!currentUser || !currentUser.emailVerified) return;
    const path = `users/${currentUser.uid}/savedCards/${cardId}`;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'savedCards', cardId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleSaveMemberProfile = async (
    profile: Omit<MemberProfile, 'ownerId'>
  ) => {
    if (!currentUser || !currentUser.emailVerified) return;
    const path = `users/${currentUser.uid}`;
    const payload = {
      displayName: sanitizeText(profile.displayName, VALIDATION_BOUNDS.nameMax),
      email: sanitizeText(
        currentUser.email || profile.email || '',
        VALIDATION_BOUNDS.emailMax
      ),
      phone: sanitizeText(profile.phone, VALIDATION_BOUNDS.phoneMax),
      defaultCityId: profile.defaultCityId,
      defaultProvince: sanitizeText(
        profile.defaultProvince,
        VALIDATION_BOUNDS.cityNameMax
      ),
      defaultDistrict: sanitizeText(
        profile.defaultDistrict,
        VALIDATION_BOUNDS.districtMax
      ),
      defaultAddress: sanitizeText(
        profile.defaultAddress,
        VALIDATION_BOUNDS.addressMax
      ),
      updatedAt: serverTimestamp(),
    };

    try {
      if (memberProfile) {
        await updateDoc(doc(db, 'users', currentUser.uid), payload);
      } else {
        await setDoc(doc(db, 'users', currentUser.uid), {
          ownerId: currentUser.uid,
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        memberProfile ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  };

  const handlePlaceOrder = (order: Order) => {
    const firestoreOrderId = `ord_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    const orderWithDocId: Order =
      currentUser && currentUser.emailVerified
        ? { ...order, firestoreId: firestoreOrderId, ownerId: currentUser.uid }
        : order;

    prevOrderStatusesRef.current[orderWithDocId.id] = orderWithDocId.status;
    setOrders((prev) => [orderWithDocId, ...prev]);
    setCartItems([]);
    setIsCartOpen(false);
    setFocusedOrderId(orderWithDocId.id);
    setIsOrdersOpen(true);
    pushStepNotification(orderWithDocId);
    void registerOrderSupportMetadata(orderWithDocId);

    if (currentUser && currentUser.emailVerified) {
      const rawRestaurantName = sanitizeText(
        order.items[0]?.restaurantName ?? 'Sofra Atlas Mutfak',
        VALIDATION_BOUNDS.nameMax
      );
      const restaurantName =
        rawRestaurantName.length >= 2
          ? rawRestaurantName
          : 'Sofra Atlas Mutfak';
      const rawCityName = sanitizeText(
        order.cityName,
        VALIDATION_BOUNDS.cityNameMax
      );
      const safeCityName = rawCityName.length >= 2 ? rawCityName : 'İstanbul';
      const rawNeighborhood = sanitizeText(
        order.neighborhood,
        VALIDATION_BOUNDS.districtMax
      );
      const safeNeighborhood =
        rawNeighborhood.length >= 2 ? rawNeighborhood : 'Merkez';
      const safeOrderNumber =
        sanitizeText(order.id, 32).length >= 4
          ? sanitizeText(order.id, 32)
          : `SA-${Date.now().toString().slice(-4)}`;
      const safeEstimatedArrival =
        sanitizeText(order.estimatedArrival, 40).length >= 2
          ? sanitizeText(order.estimatedArrival, 40)
          : '25–35 dk';
      const safeDeliveryPrefs = (order.deliveryPreferences ?? [])
        .filter(
          (p) => p === 'Temassız teslimat' || p === 'Zili çalmayın'
        )
        .slice(0, 4);

      const itemsSummary = order.items
        .slice(0, 25)
        .map(
          (it) =>
            `${it.quantity}× ${it.dishName} (${it.portionLabel}) · ${Math.round(it.lineTotalTry)} ₺`
        );
      const itemsCount = Math.max(
        1,
        Math.min(
          100,
          order.items.reduce((sum, it) => sum + it.quantity, 0) || 1
        )
      );
      const safeTotalTry = Math.max(1, Math.min(500000, order.totalTry || 1));
      const netSubtotalTry = Math.max(0, order.subtotalTry - order.discountTry);
      const fallbackBreakdown = calculateOrderCommissionBreakdown({
        netSubtotalTry,
        deliveryFeeTry: order.deliveryFeeTry,
        config: commissionConfig,
      });
      const safeServiceFeeTry = Math.max(
        0,
        Math.min(
          10000,
          Math.round(order.serviceFeeTry ?? fallbackBreakdown.serviceFeeTry)
        )
      );
      const safeCommissionRatePct = Math.max(
        0,
        Math.min(
          100,
          order.commissionRatePct ?? fallbackBreakdown.effectiveRatePct
        )
      );
      const safeCommissionTry = Math.max(
        0,
        Math.min(
          500000,
          Math.round(order.commissionTry ?? fallbackBreakdown.commissionTry)
        )
      );
      const safeRestaurantNetTry = Math.max(
        0,
        Math.min(
          500000,
          Math.round(order.restaurantNetTry ?? fallbackBreakdown.restaurantNetTry)
        )
      );

      void setDoc(doc(db, 'orders', firestoreOrderId), {
        ownerId: currentUser.uid,
        orderNumber: safeOrderNumber,
        cityId: order.cityId,
        cityName: safeCityName,
        neighborhood: safeNeighborhood,
        address: sanitizeText(order.address, VALIDATION_BOUNDS.addressMax),
        customerName: sanitizeText(order.customerName, VALIDATION_BOUNDS.nameMax),
        customerPhone: sanitizeText(
          order.customerPhone,
          VALIDATION_BOUNDS.phoneMax
        ),
        restaurantName,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        gatewayLabel: sanitizeText(
          order.paymentDetails?.gatewayLabel ?? '',
          60
        ),
        transactionId: sanitizeText(
          order.paymentDetails?.transactionId ?? '',
          64
        ),
        authCode: sanitizeText(order.paymentDetails?.authCode ?? '', 24),
        cardBrand: sanitizeText(order.paymentDetails?.cardBrand ?? '', 24),
        cardLast4: sanitizeText(order.paymentDetails?.last4 ?? '', 4),
        refundId: '',
        deliveryPreferences: safeDeliveryPrefs,
        itemsSummary,
        subtotalTry: order.subtotalTry,
        discountTry: order.discountTry,
        deliveryFeeTry: order.deliveryFeeTry,
        serviceFeeTry: safeServiceFeeTry,
        commissionRatePct: safeCommissionRatePct,
        commissionTry: safeCommissionTry,
        restaurantNetTry: safeRestaurantNetTry,
        totalTry: safeTotalTry,
        status: order.status,
        estimatedArrival: safeEstimatedArrival,
        courierId: '',
        courierStatus: 'accepted',
        courierName: sanitizeText(
          order.courierName || `${restaurantName} Kuryesi`,
          60
        ),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        handleFirestoreError(
          error,
          OperationType.WRITE,
          `orders/${firestoreOrderId}`
        );
      });
    }
  };

  const mergedAdminOrders = useMemo(() => {
    const byId = new Map<string, Order>();
    for (const o of orders) {
      byId.set(o.id, o);
    }
    for (const ao of adminFirestoreOrders) {
      const existing = byId.get(ao.id);
      byId.set(ao.id, {
        ...ao,
        createdAt: existing?.createdAt ?? ao.createdAt,
        items: existing?.items?.length ? existing.items : ao.items,
      });
    }
    return Array.from(byId.values());
  }, [orders, adminFirestoreOrders]);

  const handleAdvanceOrderStatus = (orderId: string) => {
    const target =
      orders.find((o) => o.id === orderId) ??
      adminFirestoreOrders.find((o) => o.id === orderId);
    if (!target) return;
    const nextStatus = getNextStatus(target.status);
    const updatedTarget: Order = { ...target, status: nextStatus };

    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? updatedTarget : order))
    );
    setAdminFirestoreOrders((prev) =>
      prev.map((order) => (order.id === orderId ? updatedTarget : order))
    );
    void registerOrderSupportMetadata(updatedTarget);

    if (
      target.firestoreId &&
      currentUser &&
      currentUser.emailVerified &&
      target.status !== 'delivered'
    ) {
      void updateDoc(doc(db, 'orders', target.firestoreId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `orders/${target.firestoreId}`
        );
      });
    }
  };

  const handleRefundOrder = async (order: Order) => {
    if (!order.paymentDetails?.transactionId) return;
    const { refundId } = await refundOnlinePayment(
      order.paymentDetails.transactionId,
      order.totalTry
    );

    const applyRefund = (o: Order): Order =>
      o.id === order.id
        ? {
            ...o,
            paymentStatus: 'refunded',
            paymentDetails: o.paymentDetails
              ? { ...o.paymentDetails, refundId }
              : undefined,
          }
        : o;

    setOrders((prev) => prev.map(applyRefund));
    setAdminFirestoreOrders((prev) => prev.map(applyRefund));

    if (order.firestoreId && currentUser && currentUser.emailVerified) {
      await updateDoc(doc(db, 'orders', order.firestoreId), {
        paymentStatus: 'refunded',
        refundId,
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `orders/${order.firestoreId}`
        );
      });
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    setAdminFirestoreOrders((prev) => prev.filter((o) => o.id !== order.id));
    if (order.firestoreId && currentUser && currentUser.emailVerified) {
      await deleteDoc(doc(db, 'orders', order.firestoreId)).catch((error) => {
        handleFirestoreError(
          error,
          OperationType.DELETE,
          `orders/${order.firestoreId}`
        );
      });
    }
  };

  const handleExploreRestaurants = () => {
    const el = document.getElementById('restoranlar');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetFilters = () => {
    setSelectedCity('all');
    setSelectedProvince('all');
    setSelectedDistrict('all');
    setSelectedContinent('all');
    setSelectedCategory('Tümü');
    setSelectedRestaurantFilter(null);
    setVegetarianOnly(false);
    setFreeDeliveryOnly(false);
    setCampaignOnly(false);
    setPartnerOnly(false);
    setSortBy('recommended');
    setSearchQuery('');
  };

  const totalCartCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const activeOrderCount = orders.filter(
    (o) => o.status !== 'delivered'
  ).length;

  const isMapsProviderActive = Boolean(GOOGLE_MAPS_API_KEY);

  const appContent = (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-[#141413]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Header
        cartCount={totalCartCount}
        activeOrderCount={activeOrderCount}
        currentUser={currentUser}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrders={() => setIsOrdersOpen(true)}
        onOpenMemberModal={() => setIsMemberModalOpen(true)}
        onOpenRestaurantPortal={() => setIsRestaurantPortalOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
      />

      <main className="flex-1">
        {!initialUrlParams.embed && (
          <Hero
            selectedCity={selectedCity}
            selectedProvince={selectedProvince}
            selectedDistrict={selectedDistrict}
            deliveryAddress={deliveryAddress}
            isMapsProviderActive={isMapsProviderActive}
            onChangeDeliveryAddress={setDeliveryAddress}
            onSelectCity={handleSelectCity}
            onSelectProvince={handleSelectProvince}
            onSelectDistrict={setSelectedDistrict}
            onExploreRestaurants={handleExploreRestaurants}
          />
        )}

        <RestaurantMarketplace
          restaurants={filteredRestaurants}
          dishes={filteredDishes}
          selectedCity={selectedCity}
          onSelectCity={handleSelectCity}
          selectedProvince={selectedProvince}
          onSelectProvince={handleSelectProvince}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
          selectedContinent={selectedContinent}
          onSelectContinent={setSelectedContinent}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          currencyMode={currencyMode}
          onChangeCurrencyMode={setCurrencyMode}
          vegetarianOnly={vegetarianOnly}
          onToggleVegetarian={() => setVegetarianOnly((v) => !v)}
          freeDeliveryOnly={freeDeliveryOnly}
          onToggleFreeDelivery={() => setFreeDeliveryOnly((v) => !v)}
          campaignOnly={campaignOnly}
          onToggleCampaign={() => setCampaignOnly((v) => !v)}
          partnerOnly={partnerOnly}
          onTogglePartnerOnly={() => setPartnerOnly((v) => !v)}
          sortBy={sortBy}
          onChangeSortBy={setSortBy}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedRestaurantFilter={selectedRestaurantFilter}
          onClearRestaurantFilter={() => setSelectedRestaurantFilter(null)}
          onOpenRestaurant={(rest) => setActiveRestaurantModal(rest)}
          onSelectDish={setActiveDish}
          onQuickAdd={handleQuickAdd}
          onResetFilters={handleResetFilters}
          onOpenRestaurantPortal={() => setIsRestaurantPortalOpen(true)}
        />

        {!initialUrlParams.embed && (
          <WorldMapSection
            selectedCity={selectedCity}
            selectedProvince={selectedProvince}
            selectedDistrict={selectedDistrict}
            onSelectCity={handleSelectCity}
            onSelectProvince={handleSelectProvince}
            onSelectDistrict={setSelectedDistrict}
            onExploreMenu={handleExploreRestaurants}
            activeRestaurants={activeRestaurants}
            onFilterRestaurant={(name) => setSelectedRestaurantFilter(name)}
            isMapsProviderActive={isMapsProviderActive}
          />
        )}

        {!initialUrlParams.embed && (
          <CraftsmanshipSection
            onOpenRestaurantPortal={() => setIsRestaurantPortalOpen(true)}
            onOpenExtensionStudio={() => setIsExtensionStudioOpen(true)}
            registeredCount={activeRestaurants.length}
          />
        )}
      </main>

      {!initialUrlParams.embed && (
        <Footer
          isSignedIn={Boolean(currentUser)}
          onSelectCity={handleSelectCity}
          onOpenOrders={() => setIsOrdersOpen(true)}
          onOpenMemberModal={() => setIsMemberModalOpen(true)}
          onOpenRestaurantPortal={() => setIsRestaurantPortalOpen(true)}
          onOpenExtensionStudio={() => setIsExtensionStudioOpen(true)}
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        />
      )}

      {/* Yemeksepeti Restaurant Storefront & Menu Modal */}
      <RestaurantMenuModal
        restaurant={activeRestaurantModal}
        currencyMode={currencyMode}
        cartItems={cartItems}
        onClose={() => setActiveRestaurantModal(null)}
        onSelectDish={setActiveDish}
        onQuickAdd={handleQuickAdd}
        onOpenCart={() => setIsCartOpen(true)}
        onShowOnMap={(rest) => {
          setActiveRestaurantModal(null);
          setSelectedCity(rest.cityId);
          setSelectedProvince(rest.cityName || 'all');
          setSelectedDistrict(rest.district || 'all');
          const mapEl = document.getElementById('harita');
          if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <DishDetailModal
        dish={activeDish}
        currencyMode={currencyMode}
        onClose={() => setActiveDish(null)}
        onAddToCart={addToCart}
      />

      {/* Single-Restaurant Cart Conflict Confirmation */}
      {pendingCartConflict && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
          onClick={() => setPendingCartConflict(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Sepet Restoran Değişikliği"
        >
          <div
            className="w-full max-w-md bg-white border border-[#E6E4DF] rounded-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-[#141413]">
              Sepetinizde farklı bir restorandan ürün var
            </h3>
            <p className="text-sm text-[#575550] leading-relaxed">
              Sepetinizde şu an{' '}
              <strong className="text-[#141413]">
                {cartItems[0]?.dish.restaurantName}
              </strong>{' '}
              restoranına ait ürünler bulunuyor. Sepeti temizleyip{' '}
              <strong className="text-[#141413]">
                {pendingCartConflict.dish.restaurantName}
              </strong>{' '}
              restoranından devam etmek ister misiniz?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingCartConflict(null)}
                className="px-4 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-xs font-medium text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  commitCartAddition(pendingCartConflict, true);
                  setPendingCartConflict(null);
                }}
                className="px-4 py-2 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] cursor-pointer"
              >
                Sepeti Temizle ve Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        currencyMode={currencyMode}
        selectedCity={selectedCity}
        selectedProvince={selectedProvince}
        selectedDistrict={selectedDistrict}
        initialDeliveryAddress={deliveryAddress}
        isMapsProviderActive={isMapsProviderActive}
        currentUser={currentUser}
        memberProfile={memberProfile}
        savedCards={savedCards}
        commissionConfig={
          cartItems[0]?.dish.cityId && !isTurkeyCityId(cartItems[0].dish.cityId)
            ? nonTurkeyCommissionConfig ?? commissionConfig
            : commissionConfig
        }
        onSaveCard={handleSaveCard}
        onDeleteSavedCard={handleDeleteSavedCard}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCartItems([])}
        onPlaceOrder={handlePlaceOrder}
      />

      <MemberAuthModal
        isOpen={isMemberModalOpen}
        currentUser={currentUser}
        memberProfile={memberProfile}
        activeOrderCount={activeOrderCount}
        savedCardsCount={savedCards.length}
        selectedCity={selectedCity}
        selectedProvince={selectedProvince}
        selectedDistrict={selectedDistrict}
        deliveryAddress={deliveryAddress}
        onSaveProfile={handleSaveMemberProfile}
        onApplyLocation={(loc) => {
          setSelectedCity(loc.cityId);
          setSelectedProvince(loc.province);
          setSelectedDistrict(loc.district);
          if (loc.address) setDeliveryAddress(loc.address);
        }}
        onOpenOrders={() => setIsOrdersOpen(true)}
        onClose={() => setIsMemberModalOpen(false)}
      />

      <OrdersPanel
        isOpen={isOrdersOpen}
        orders={orders}
        currencyMode={currencyMode}
        isMapsProviderActive={isMapsProviderActive}
        focusedOrderId={focusedOrderId}
        onClose={() => {
          setIsOrdersOpen(false);
          setFocusedOrderId(null);
        }}
        onAdvanceStatus={handleAdvanceOrderStatus}
        onOpenSupport={(order, channel = 'restaurant') =>
          setSupportChatState({ orderId: order.id, channel })
        }
        onOpenStaffInbox={() => {
          setStaffInboxOrderId(focusedOrderId);
          setIsStaffInboxOpen(true);
        }}
      />

      <OrderStepNotifications
        notifications={stepNotifications}
        onDismiss={dismissStepNotification}
        onTrackOrder={(orderId) => {
          setFocusedOrderId(orderId);
          setIsOrdersOpen(true);
        }}
        onOpenSupport={(orderId) =>
          setSupportChatState({ orderId, channel: 'courier' })
        }
      />

      <OfflineIndicator />

      <RestaurantPortalModal
        isOpen={isRestaurantPortalOpen}
        orders={orders}
        commissionConfig={commissionConfig}
        onClose={() => setIsRestaurantPortalOpen(false)}
        onOpenExtensionStudio={() => setIsExtensionStudioOpen(true)}
        onAdvanceOrderStatus={handleAdvanceOrderStatus}
      />

      <LiveSupportChatModal
        order={
          supportChatState
            ? orders.find((o) => o.id === supportChatState.orderId) ?? null
            : null
        }
        initialChannel={supportChatState?.channel ?? 'restaurant'}
        onClose={() => setSupportChatState(null)}
        onOpenStaffInbox={(orderId) => {
          setStaffInboxOrderId(orderId);
          setIsStaffInboxOpen(true);
        }}
      />

      <SupportStaffInboxModal
        isOpen={isStaffInboxOpen}
        orders={orders}
        initialOrderId={staffInboxOrderId}
        regionScope={isNonTurkeyRegionalAdmin ? 'non_turkey' : 'all'}
        onClose={() => setIsStaffInboxOpen(false)}
      />

      <ExtensionStudioModal
        isOpen={isExtensionStudioOpen}
        dishes={allCatalogDishes}
        activeRestaurants={activeRestaurants}
        onClose={() => setIsExtensionStudioOpen(false)}
        onQuickAdd={handleQuickAdd}
        onSelectDish={setActiveDish}
      />

      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        orders={mergedAdminOrders}
        commissionConfig={commissionConfig}
        nonTurkeyCommissionConfig={nonTurkeyCommissionConfig}
        onCommissionConfigUpdated={handleCommissionConfigUpdated}
        onNonTurkeyCommissionConfigUpdated={
          handleNonTurkeyCommissionConfigUpdated
        }
        onClose={() => setIsAdminPanelOpen(false)}
        onAdvanceOrderStatus={handleAdvanceOrderStatus}
        onRefundOrder={handleRefundOrder}
        onDeleteOrder={handleDeleteOrder}
      />
    </div>
  );

  const wrappedApp = (
    <LanguageProvider
      selectedCity={selectedCity}
      forcedLanguage={isNonTurkeyRegionalAdmin ? 'en' : null}
    >
      {appContent}
    </LanguageProvider>
  );

  if (isMapsProviderActive) {
    return (
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        language={isNonTurkeyRegionalAdmin ? 'en' : 'tr'}
        libraries={['places', 'marker', 'routes']}
      >
        {wrappedApp}
      </APIProvider>
    );
  }

  return wrappedApp;
}
