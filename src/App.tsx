import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
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
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  type OrderStepNotification,
  OrderStepNotifications,
} from './components/OrderStepNotifications';
import { OrdersPanel } from './components/OrdersPanel';
import { RestaurantMarketplace } from './components/RestaurantMarketplace';
import { RestaurantMenuModal } from './components/RestaurantMenuModal';
import { RestaurantPortalModal } from './components/RestaurantPortalModal';
import { WorldMapSection } from './components/WorldMapSection';
import {
  CITY_HUBS,
  CURATED_RESTAURANT_META,
  DISHES,
  EXTRA_RESTAURANT_DISHES,
  INITIAL_ORDERS,
  resolveImagePreset,
} from './data/catalog';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { GOOGLE_MAPS_API_KEY } from './lib/maps';
import { refundOnlinePayment } from './utils/payment';
import { sanitizeText, VALIDATION_BOUNDS } from './utils/validation';
import type {
  CartItem,
  CityId,
  ContinentId,
  CuisineCategory,
  CurrencyMode,
  Dish,
  DishExtra,
  DishPortion,
  Order,
  OrderStatus,
  PartnerDishRecord,
  PaymentMethod,
  PaymentStatus,
  RestaurantProfile,
  RestaurantSortOption,
  RestaurantStorefront,
  SavedCardRecord,
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
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [stepNotifications, setStepNotifications] = useState<
    OrderStepNotification[]
  >([]);
  const [isRestaurantPortalOpen, setIsRestaurantPortalOpen] = useState(false);
  const [isExtensionStudioOpen, setIsExtensionStudioOpen] = useState(false);
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
  const [savedCards, setSavedCards] = useState<SavedCardRecord[]>([]);
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

  // Subscribe to owner's saved tokenized cards and persisted Firestore orders when verified
  useEffect(() => {
    if (!authReady || !currentUser || !currentUser.emailVerified) {
      setSavedCards([]);
      return;
    }

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
            totalTry: number;
            status: OrderStatus;
            estimatedArrival: string;
            courierName: string;
          };
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
            totalTry: data.totalTry,
            status: data.status,
            estimatedArrival: data.estimatedArrival,
            courierName: data.courierName,
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
      unsubCards();
      unsubOrders();
    };
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

  // Automatic progression for active in-flight orders
  useEffect(() => {
    const hasActive = orders.some((o) => o.status !== 'delivered');
    if (!hasActive) return;

    const timer = window.setInterval(() => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.status === 'delivered') return order;
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
      if (
        selectedCity !== 'all' &&
        selectedDistrict !== 'all' &&
        rest.district.toLocaleLowerCase('tr') !==
          selectedDistrict.toLocaleLowerCase('tr')
      ) {
        return false;
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
      if (
        selectedCity !== 'all' &&
        selectedDistrict !== 'all' &&
        dish.district.toLocaleLowerCase('tr') !==
          selectedDistrict.toLocaleLowerCase('tr')
      ) {
        return false;
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

    if (currentUser && currentUser.emailVerified) {
      const restaurantName = sanitizeText(
        order.items[0]?.restaurantName ?? 'Sofra Atlas Mutfak',
        VALIDATION_BOUNDS.nameMax
      );
      const itemsSummary = order.items
        .slice(0, 25)
        .map(
          (it) =>
            `${it.quantity}× ${it.dishName} (${it.portionLabel}) · ${Math.round(it.lineTotalTry)} ₺`
        );

      void setDoc(doc(db, 'orders', firestoreOrderId), {
        ownerId: currentUser.uid,
        orderNumber: sanitizeText(order.id, 32),
        cityId: order.cityId,
        cityName: sanitizeText(order.cityName, VALIDATION_BOUNDS.cityNameMax),
        neighborhood: sanitizeText(
          order.neighborhood,
          VALIDATION_BOUNDS.districtMax
        ),
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
        deliveryPreferences: (order.deliveryPreferences ?? []).slice(0, 4),
        itemsSummary,
        subtotalTry: order.subtotalTry,
        discountTry: order.discountTry,
        deliveryFeeTry: order.deliveryFeeTry,
        totalTry: order.totalTry,
        status: order.status,
        estimatedArrival: sanitizeText(order.estimatedArrival, 40),
        courierName: sanitizeText(order.courierName, 60),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        handleFirestoreError(
          error,
          OperationType.CREATE,
          `orders/${firestoreOrderId}`
        );
      });
    }
  };

  const handleAdvanceOrderStatus = (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const nextStatus = getNextStatus(target.status);

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order
      )
    );

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

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              paymentStatus: 'refunded',
              paymentDetails: o.paymentDetails
                ? { ...o.paymentDetails, refundId }
                : undefined,
            }
          : o
      )
    );

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
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrders={() => setIsOrdersOpen(true)}
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
          onSelectCity={handleSelectCity}
          onOpenOrders={() => setIsOrdersOpen(true)}
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
        savedCards={savedCards}
        onSaveCard={handleSaveCard}
        onDeleteSavedCard={handleDeleteSavedCard}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCartItems([])}
        onPlaceOrder={handlePlaceOrder}
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
      />

      <OrderStepNotifications
        notifications={stepNotifications}
        onDismiss={dismissStepNotification}
        onTrackOrder={(orderId) => {
          setFocusedOrderId(orderId);
          setIsOrdersOpen(true);
        }}
      />

      <OfflineIndicator />

      <RestaurantPortalModal
        isOpen={isRestaurantPortalOpen}
        onClose={() => setIsRestaurantPortalOpen(false)}
        onOpenExtensionStudio={() => setIsExtensionStudioOpen(true)}
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
        orders={orders}
        onClose={() => setIsAdminPanelOpen(false)}
        onAdvanceOrderStatus={handleAdvanceOrderStatus}
        onRefundOrder={handleRefundOrder}
      />
    </div>
  );

  if (isMapsProviderActive) {
    return (
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        language="tr"
        libraries={['places', 'marker', 'routes']}
      >
        {appContent}
      </APIProvider>
    );
  }

  return appContent;
}
