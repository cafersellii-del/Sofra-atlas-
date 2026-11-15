import { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
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
  writeBatch,
} from 'firebase/firestore';
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Globe,
  LayoutGrid,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Percent,
  Phone,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  CITY_HUBS,
  CONTINENTS,
  CURATED_RESTAURANT_META,
  DISHES,
  EXTRA_RESTAURANT_DISHES,
} from '../data/catalog';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type {
  AdminUserRecord,
  CityId,
  CommissionConfig,
  CommissionMode,
  ContinentId,
  MemberProfile,
  Order,
  OrderStatus,
  PartnerDishRecord,
  RestaurantCommissionOverride,
  RestaurantPrivateContact,
  RestaurantProfile,
} from '../types/food';
import {
  type AdminRegionScope,
  BOOTSTRAPPED_ADMIN_EMAIL,
  getAdminScopeLabel,
  isBootstrappedSuperAdmin,
  isHardcodedNonTurkeyAdmin,
  isTurkeyCityId,
  REGIONAL_NON_TURKEY_ADMIN_EMAIL,
  REGIONAL_NON_TURKEY_ADMIN_UID,
  resolveAdminDocScope,
  TURKEY_CITY_ID,
} from '../utils/adminScope';
import {
  calculateOrderCommissionBreakdown,
  COMMISSION_BOUNDS,
  DEFAULT_COMMISSION_CONFIG,
  formatCommissionPolicySummary,
  normalizeRestaurantCommissionKey,
  sanitizeCommissionConfig,
} from '../utils/commission';
import { sanitizeText, VALIDATION_BOUNDS } from '../utils/validation';
import { useLanguage } from '../i18n/LanguageContext';
import { CountrySelectOptions } from './CountrySelectOptions';
import { SupportStaffInbox } from './SupportStaffInbox';

interface AdminPanelModalProps {
  isOpen: boolean;
  orders: Order[];
  commissionConfig?: CommissionConfig;
  nonTurkeyCommissionConfig?: CommissionConfig | null;
  onCommissionConfigUpdated?: (next: CommissionConfig) => void;
  onNonTurkeyCommissionConfigUpdated?: (next: CommissionConfig) => void;
  onClose: () => void;
  onAdvanceOrderStatus: (orderId: string) => void;
  onRefundOrder?: (order: Order) => Promise<void> | void;
  onDeleteOrder?: (order: Order) => Promise<void> | void;
}

type AdminSection =
  | 'overview'
  | 'members'
  | 'restaurants'
  | 'dishes'
  | 'orders_admins'
  | 'commission'
  | 'support';

const ORDER_STATUS_LABELS_TR: Record<OrderStatus, string> = {
  received: 'Sipariş Alındı',
  preparing: 'Hazırlanıyor',
  on_the_way: 'Kurye Yolda',
  delivered: 'Teslim Edildi',
};

const ORDER_STATUS_LABELS_EN: Record<OrderStatus, string> = {
  received: 'Order Received',
  preparing: 'Preparing',
  on_the_way: 'On the Way',
  delivered: 'Delivered',
};

function formatFirestoreDate(value: unknown, locale = 'tr-TR'): string {
  if (!value) return '—';
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString(
      locale,
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return '—';
}

export function AdminPanelModal({
  isOpen,
  orders,
  commissionConfig = DEFAULT_COMMISSION_CONFIG,
  nonTurkeyCommissionConfig = null,
  onCommissionConfigUpdated,
  onNonTurkeyCommissionConfigUpdated,
  onClose,
  onAdvanceOrderStatus,
  onRefundOrder,
  onDeleteOrder,
}: AdminPanelModalProps) {
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [adminScope, setAdminScope] = useState<AdminRegionScope | null>(null);
  const [checkingRole, setCheckingRole] = useState(false);
  const [authError, setAuthError] = useState('');

  const [section, setSection] = useState<AdminSection>('overview');
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [dishes, setDishes] = useState<PartnerDishRecord[]>([]);
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const [memberSearch, setMemberSearch] = useState('');
  const [memberCityFilter, setMemberCityFilter] = useState<CityId>('all');
  const [memberLookupUid, setMemberLookupUid] = useState('');
  const [memberLookupError, setMemberLookupError] = useState('');
  const [restSearch, setRestSearch] = useState('');
  const [restStatusFilter, setRestStatusFilter] = useState<
    'all' | 'active' | 'paused'
  >('all');
  const [dishSearch, setDishSearch] = useState('');
  const [dishCityFilter, setDishCityFilter] = useState<CityId>('all');
  const [hubContinentFilter, setHubContinentFilter] = useState<'all' | ContinentId>('all');
  const [hubSearch, setHubSearch] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [inspectedContact, setInspectedContact] = useState<{
    restaurantName: string;
    contact: RestaurantPrivateContact | null;
  } | null>(null);

  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminNote, setNewAdminNote] = useState('');
  const [newAdminScope, setNewAdminScope] =
    useState<AdminRegionScope>('non_turkey');
  const [adminActionMsg, setAdminActionMsg] = useState('');
  const [adminActionErr, setAdminActionErr] = useState('');

  // Commission settings & overrides states
  const [commissionTarget, setCommissionTarget] = useState<
    'commission' | 'commission_non_turkey'
  >('commission');
  const activeEditedCommissionConfig =
    commissionTarget === 'commission_non_turkey'
      ? nonTurkeyCommissionConfig ?? commissionConfig
      : commissionConfig;

  const [commMode, setCommMode] = useState<CommissionMode>(
    activeEditedCommissionConfig.commissionMode
  );
  const [commPct, setCommPct] = useState(
    String(activeEditedCommissionConfig.restaurantCommissionPct)
  );
  const [commFixed, setCommFixed] = useState(
    String(activeEditedCommissionConfig.fixedCommissionTry)
  );
  const [commMin, setCommMin] = useState(
    String(activeEditedCommissionConfig.minCommissionTry)
  );
  const [custServiceFee, setCustServiceFee] = useState(
    String(activeEditedCommissionConfig.customerServiceFeeTry)
  );
  const [commSaving, setCommSaving] = useState(false);
  const [commErr, setCommErr] = useState('');
  const [simBasketTry, setSimBasketTry] = useState('500');
  const [simDeliveryTry, setSimDeliveryTry] = useState('0');

  const [restaurantOverrides, setRestaurantOverrides] = useState<
    RestaurantCommissionOverride[]
  >([]);
  const [overrideRestName, setOverrideRestName] = useState('');
  const [overrideCityId, setOverrideCityId] =
    useState<Exclude<CityId, 'all'>>('napoli');
  const [overrideMode, setOverrideMode] = useState<CommissionMode>('percentage');
  const [overridePct, setOverridePct] = useState('12');
  const [overrideFixed, setOverrideFixed] = useState('35');
  const [overrideNote, setOverrideNote] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideErr, setOverrideErr] = useState('');

  useEffect(() => {
    setCommMode(activeEditedCommissionConfig.commissionMode);
    setCommPct(String(activeEditedCommissionConfig.restaurantCommissionPct));
    setCommFixed(String(activeEditedCommissionConfig.fixedCommissionTry));
    setCommMin(String(activeEditedCommissionConfig.minCommissionTry));
    setCustServiceFee(
      String(activeEditedCommissionConfig.customerServiceFeeTry)
    );
  }, [activeEditedCommissionConfig]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const isAdminAuthorized = adminScope !== null;
  const isNonTurkeyScope = adminScope === 'non_turkey';
  const isGlobalAdminUser = adminScope === 'all';
  const isBootstrappedAdminUser = isBootstrappedSuperAdmin(user);
  const isEn = language === 'en' || isNonTurkeyScope;
  const numberLocale = isEn ? 'en-US' : 'tr-TR';
  const orderStatusLabels = isEn ? ORDER_STATUS_LABELS_EN : ORDER_STATUS_LABELS_TR;

  // Verify admin authorization and regional scope
  useEffect(() => {
    let active = true;
    async function verifyAdmin() {
      if (!authReady || !user || !user.emailVerified) {
        if (active) {
          setAdminScope(null);
          setCheckingRole(false);
        }
        return;
      }

      if (isBootstrappedSuperAdmin(user)) {
        if (active) {
          setAdminScope('all');
          setCommissionTarget('commission');
          setCheckingRole(false);
        }
        return;
      }

      if (isHardcodedNonTurkeyAdmin(user)) {
        if (active) {
          setAdminScope('non_turkey');
          setNewAdminScope('non_turkey');
          setCommissionTarget('commission_non_turkey');
          setCheckingRole(false);
        }
        return;
      }

      setCheckingRole(true);
      try {
        const snap = await getDoc(doc(db, 'admins', user.uid));
        if (active) {
          if (snap.exists()) {
            const resolved = resolveAdminDocScope(
              snap.data() as AdminUserRecord
            );
            setAdminScope(resolved);
            if (resolved === 'non_turkey') {
              setNewAdminScope('non_turkey');
              setCommissionTarget('commission_non_turkey');
            } else {
              setCommissionTarget('commission');
            }
          } else {
            setAdminScope(null);
          }
        }
      } catch (error) {
        if (active) setAdminScope(null);
        handleFirestoreError(error, OperationType.GET, `admins/${user.uid}`);
      } finally {
        if (active) setCheckingRole(false);
      }
    }

    void verifyAdmin();
    return () => {
      active = false;
    };
  }, [authReady, user]);

  // Subscribe to scoped restaurants, dishes, admin users, members, and overrides once authorized
  useEffect(() => {
    if (!isOpen || !adminScope || !user) return;

    setDataLoading(true);
    const isScopedNonTurkey = adminScope === 'non_turkey';
    const isSuper = isBootstrappedSuperAdmin(user);
    const isIntlIdentity = isHardcodedNonTurkeyAdmin(user);

    const restQuery = isScopedNonTurkey
      ? query(
          collection(db, 'restaurants'),
          where('cityId', '!=', TURKEY_CITY_ID)
        )
      : collection(db, 'restaurants');

    const unsubRest = onSnapshot(
      restQuery,
      (snap) => {
        setRestaurants(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<RestaurantProfile, 'id'>),
          }))
        );
        setDataLoading(false);
      },
      (error) => {
        setDataLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'restaurants');
      }
    );

    const dishesQuery = isScopedNonTurkey
      ? query(collection(db, 'dishes'), where('cityId', '!=', TURKEY_CITY_ID))
      : collection(db, 'dishes');

    const unsubDishes = onSnapshot(
      dishesQuery,
      (snap) => {
        setDishes(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<PartnerDishRecord, 'id'>),
          }))
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'dishes');
      }
    );

    const adminsQuery = isSuper
      ? collection(db, 'admins')
      : isIntlIdentity
        ? query(
            collection(db, 'admins'),
            where('regionScope', '==', 'non_turkey')
          )
        : query(collection(db, 'admins'), where('uid', '==', user.uid));

    const unsubAdmins = onSnapshot(
      adminsQuery,
      (snap) => {
        setAdmins(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AdminUserRecord, 'id'>),
          }))
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'admins');
      }
    );

    let unsubMembers: (() => void) | undefined;
    if (isSuper || isIntlIdentity) {
      setMembersLoading(true);
      const membersQuery = isSuper
        ? collection(db, 'users')
        : query(
            collection(db, 'users'),
            where('defaultCityId', '!=', TURKEY_CITY_ID)
          );
      unsubMembers = onSnapshot(
        membersQuery,
        (snap) => {
          setMembers(
            snap.docs.map((d) => ({
              ...(d.data() as MemberProfile),
              ownerId: (d.data() as MemberProfile).ownerId || d.id,
            }))
          );
          setMembersLoading(false);
        },
        (error) => {
          setMembersLoading(false);
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      );
    } else {
      setMembersLoading(false);
    }

    let unsubOverrides: (() => void) | undefined;
    if (isSuper || isIntlIdentity) {
      const overridesQuery = isSuper
        ? collection(db, 'restaurantCommissions')
        : query(
            collection(db, 'restaurantCommissions'),
            where('cityId', '!=', TURKEY_CITY_ID)
          );
      unsubOverrides = onSnapshot(
        overridesQuery,
        (snap) => {
          setRestaurantOverrides(
            snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<RestaurantCommissionOverride, 'id'>),
            }))
          );
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.LIST,
            'restaurantCommissions'
          );
        }
      );
    }

    return () => {
      unsubRest();
      unsubDishes();
      unsubAdmins();
      if (unsubMembers) unsubMembers();
      if (unsubOverrides) unsubOverrides();
    };
  }, [isOpen, adminScope, user]);

  const canBulkListMembers =
    isBootstrappedAdminUser || isHardcodedNonTurkeyAdmin(user);

  const scopedHubs = useMemo(
    () =>
      isNonTurkeyScope
        ? CITY_HUBS.filter((h) => !isTurkeyCityId(h.id))
        : CITY_HUBS,
    [isNonTurkeyScope]
  );

  const scopedCuratedDishCount = useMemo(
    () =>
      isNonTurkeyScope
        ? DISHES.filter((d) => !isTurkeyCityId(d.cityId)).length
        : DISHES.length,
    [isNonTurkeyScope]
  );

  const scopedOrders = useMemo(
    () =>
      isNonTurkeyScope
        ? orders.filter((o) => !isTurkeyCityId(o.cityId))
        : orders,
    [orders, isNonTurkeyScope]
  );

  const scopedRestaurants = useMemo(
    () =>
      isNonTurkeyScope
        ? restaurants.filter((r) => !isTurkeyCityId(r.cityId))
        : restaurants,
    [restaurants, isNonTurkeyScope]
  );

  const scopedDishes = useMemo(
    () =>
      isNonTurkeyScope
        ? dishes.filter((d) => !isTurkeyCityId(d.cityId))
        : dishes,
    [dishes, isNonTurkeyScope]
  );

  const scopedMembers = useMemo(
    () =>
      isNonTurkeyScope
        ? members.filter((m) => !isTurkeyCityId(m.defaultCityId))
        : members,
    [members, isNonTurkeyScope]
  );

  const scopedOverrides = useMemo(
    () =>
      isNonTurkeyScope
        ? restaurantOverrides.filter(
            (ov) => !isTurkeyCityId(ov.cityId)
          )
        : restaurantOverrides,
    [restaurantOverrides, isNonTurkeyScope]
  );

  const memberOrderStats = useMemo(() => {
    const map = new Map<string, { count: number; totalTry: number }>();
    for (const order of scopedOrders) {
      if (!order.ownerId) continue;
      const prev = map.get(order.ownerId) ?? { count: 0, totalTry: 0 };
      map.set(order.ownerId, {
        count: prev.count + 1,
        totalTry: prev.totalTry + order.totalTry,
      });
    }
    return map;
  }, [scopedOrders]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLocaleLowerCase('tr');
    return scopedMembers.filter((m) => {
      if (memberCityFilter !== 'all' && m.defaultCityId !== memberCityFilter) {
        return false;
      }
      if (q) {
        const hubCountry =
          CITY_HUBS.find((h) => h.id === m.defaultCityId)?.country ?? '';
        const text = [
          m.displayName,
          m.email ?? '',
          m.phone,
          m.ownerId,
          hubCountry,
          m.defaultProvince,
          m.defaultDistrict,
          m.defaultAddress,
        ]
          .join(' ')
          .toLocaleLowerCase('tr');
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [scopedMembers, memberSearch, memberCityFilter]);

  const filteredRestaurants = useMemo(() => {
    const q = restSearch.trim().toLocaleLowerCase('tr');
    return scopedRestaurants.filter((r) => {
      if (restStatusFilter !== 'all' && r.status !== restStatusFilter) {
        return false;
      }
      if (q) {
        const text = `${r.name} ${r.cityName} ${r.district} ${r.cuisineCategory}`.toLocaleLowerCase('tr');
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [scopedRestaurants, restSearch, restStatusFilter]);

  const filteredDishes = useMemo(() => {
    const q = dishSearch.trim().toLocaleLowerCase('tr');
    return scopedDishes.filter((d) => {
      if (dishCityFilter !== 'all' && d.cityId !== dishCityFilter) return false;
      if (q) {
        const text = `${d.name} ${d.restaurantName} ${d.cityName} ${d.category}`.toLocaleLowerCase('tr');
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [scopedDishes, dishSearch, dishCityFilter]);

  const totalOrderVolumeTry = useMemo(
    () => scopedOrders.reduce((sum, o) => sum + o.totalTry, 0),
    [scopedOrders]
  );

  const totalPlatformCommissionTry = useMemo(
    () =>
      scopedOrders.reduce((sum, o) => {
        if (o.commissionTry !== undefined || o.serviceFeeTry !== undefined) {
          return sum + (o.commissionTry ?? 0) + (o.serviceFeeTry ?? 0);
        }
        const netFood = Math.max(0, o.subtotalTry - o.discountTry);
        const orderConfig = !isTurkeyCityId(o.cityId)
          ? nonTurkeyCommissionConfig ?? commissionConfig
          : commissionConfig;
        const est = calculateOrderCommissionBreakdown({
          netSubtotalTry: netFood,
          deliveryFeeTry: o.deliveryFeeTry,
          config: orderConfig,
        });
        return sum + est.commissionTry;
      }, 0),
    [scopedOrders, commissionConfig, nonTurkeyCommissionConfig]
  );

  const restaurantCityLookup = useMemo(() => {
    const map = new Map<string, Exclude<CityId, 'all'>>();
    for (const d of [...DISHES, ...EXTRA_RESTAURANT_DISHES]) {
      const key = d.restaurantName.toLocaleLowerCase('tr');
      if (!map.has(key)) map.set(key, d.cityId);
    }
    for (const r of restaurants) {
      map.set(r.name.toLocaleLowerCase('tr'), r.cityId);
    }
    return map;
  }, [restaurants]);

  const selectableRestaurantNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of scopedRestaurants) names.add(r.name);
    for (const name of Object.keys(CURATED_RESTAURANT_META)) {
      const cid = restaurantCityLookup.get(name.toLocaleLowerCase('tr'));
      if (isNonTurkeyScope && isTurkeyCityId(cid)) continue;
      names.add(name);
    }
    for (const d of EXTRA_RESTAURANT_DISHES) {
      if (isNonTurkeyScope && isTurkeyCityId(d.cityId)) continue;
      names.add(d.restaurantName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [scopedRestaurants, isNonTurkeyScope, restaurantCityLookup]);

  const draftCommissionConfig = useMemo<CommissionConfig>(
    () =>
      sanitizeCommissionConfig({
        commissionMode: commMode,
        restaurantCommissionPct: Number(commPct),
        fixedCommissionTry: Number(commFixed),
        customerServiceFeeTry: Number(custServiceFee),
        courierSharePct: 0,
        courierMinFeeTry: 0,
        minCommissionTry: Number(commMin),
      }),
    [commMode, commPct, commFixed, custServiceFee, commMin]
  );

  const simulatorBreakdown = useMemo(() => {
    const basket = Math.max(0, Number(simBasketTry) || 0);
    const delivery = Math.max(0, Number(simDeliveryTry) || 0);
    return calculateOrderCommissionBreakdown({
      netSubtotalTry: basket,
      deliveryFeeTry: delivery,
      config: draftCommissionConfig,
    });
  }, [simBasketTry, simDeliveryTry, draftCommissionConfig]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('popup-closed-by-user')) {
        setAuthError(isEn ? 'Sign-in window was closed.' : 'Giriş penceresi kapatıldı.');
      } else {
        setAuthError(isEn ? 'An error occurred during sign-in.' : 'Oturum açılırken bir hata oluştu.');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setAdminActionMsg('');
    setAdminActionErr('');
    setInspectedContact(null);
  };

  const handleToggleRestaurantStatus = async (rest: RestaurantProfile) => {
    const nextStatus = rest.status === 'active' ? 'paused' : 'active';
    try {
      await updateDoc(doc(db, 'restaurants', rest.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      setAdminActionMsg(
        isEn
          ? `"${rest.name}" status updated to "${nextStatus === 'active' ? 'Live' : 'Paused'}".`
          : `"${rest.name}" durumu "${nextStatus === 'active' ? 'Yayında' : 'Duraklatıldı'}" olarak güncellendi.`
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `restaurants/${rest.id}`
      );
    }
  };

  const handleInspectPrivateContact = async (rest: RestaurantProfile) => {
    const path = `restaurants/${rest.id}/private/contact`;
    try {
      const snap = await getDoc(doc(db, 'restaurants', rest.id, 'private', 'contact'));
      setInspectedContact({
        restaurantName: rest.name,
        contact: snap.exists() ? (snap.data() as RestaurantPrivateContact) : null,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  };

  const handleDeleteRestaurant = async (rest: RestaurantProfile) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'restaurants', rest.id, 'private', 'contact'));
      batch.delete(doc(db, 'restaurants', rest.id));
      await batch.commit();
      setConfirmDeleteId(null);
      setAdminActionMsg(
        isEn
          ? `Restaurant record "${rest.name}" deleted.`
          : `"${rest.name}" restoran kaydı silindi.`
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `restaurants/${rest.id}`
      );
    }
  };

  const handleToggleDishPublish = async (dish: PartnerDishRecord) => {
    try {
      await updateDoc(doc(db, 'dishes', dish.id), {
        isPublished: !dish.isPublished,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `dishes/${dish.id}`);
    }
  };

  const handleDeleteDish = async (dish: PartnerDishRecord) => {
    try {
      await deleteDoc(doc(db, 'dishes', dish.id));
      setConfirmDeleteId(null);
      setAdminActionMsg(
        isEn
          ? `"${dish.name}" removed from catalog.`
          : `"${dish.name}" katalogdan silindi.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `dishes/${dish.id}`);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminActionErr('');
    setAdminActionMsg('');

    const uid = sanitizeText(newAdminUid, 128);
    const email = sanitizeText(newAdminEmail, VALIDATION_BOUNDS.emailMax);
    const targetScope: AdminRegionScope = isNonTurkeyScope
      ? 'non_turkey'
      : newAdminScope;
    const note = sanitizeText(
      newAdminNote ||
        (targetScope === 'non_turkey'
          ? isEn
            ? 'Regional Manager (Non-Turkey)'
            : 'Bölge Yöneticisi (TR Harici)'
          : isEn
            ? 'Platform Administrator'
            : 'Platform Yöneticisi'),
      100
    );

    if (!VALIDATION_BOUNDS.idPattern.test(uid) || uid.length < 3) {
      setAdminActionErr(
        isEn
          ? 'Please enter a valid Firebase User UID.'
          : 'Geçerli bir Firebase Kullanıcı UID değeri girin.'
      );
      return;
    }
    if (email.length < VALIDATION_BOUNDS.emailMin) {
      setAdminActionErr(
        isEn
          ? 'Please enter a valid email address.'
          : 'Geçerli bir e-posta adresi girin.'
      );
      return;
    }

    try {
      await setDoc(doc(db, 'admins', uid), {
        uid,
        email,
        note,
        regionScope: targetScope,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewAdminUid('');
      setNewAdminEmail('');
      setNewAdminNote('');
      setAdminActionMsg(
        isEn
          ? `${email} (${targetScope === 'non_turkey' ? 'Non-Turkey Regions' : 'All Regions'}) added to administrators.`
          : `${email} (${targetScope === 'non_turkey' ? 'Türkiye Harici' : 'Tüm Bölgeler'}) yönetici listesine eklendi.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `admins/${uid}`);
    }
  };

  const handleRemoveAdmin = async (adm: AdminUserRecord) => {
    if (isNonTurkeyScope && adm.regionScope !== 'non_turkey') {
      setAdminActionErr(
        isEn
          ? 'You can only revoke Non-Turkey regional sub-admin permissions.'
          : 'Yalnızca Türkiye harici bölge yöneticisi yetkilerini kaldırabilirsiniz.'
      );
      return;
    }
    try {
      await deleteDoc(doc(db, 'admins', adm.id));
      setConfirmDeleteId(null);
      setAdminActionMsg(
        isEn ? 'Administrator role removed.' : 'Yönetici yetkisi kaldırıldı.'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admins/${adm.id}`);
    }
  };

  const handleLookupMemberByUid = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberLookupError('');
    const uid = sanitizeText(memberLookupUid, 128);
    if (!VALIDATION_BOUNDS.idPattern.test(uid)) {
      setMemberLookupError(
        isEn ? 'Please enter a valid user UID.' : 'Geçerli bir kullanıcı UID girin.'
      );
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        setMemberLookupError(
          isEn
            ? 'No registered member found with this UID.'
            : 'Bu UID ile kayıtlı üye bulunamadı.'
        );
        return;
      }
      const fetched = {
        ...(snap.data() as MemberProfile),
        ownerId: (snap.data() as MemberProfile).ownerId || snap.id,
      };
      if (isNonTurkeyScope && isTurkeyCityId(fetched.defaultCityId)) {
        setMemberLookupError(
          isEn
            ? 'This member is registered in Turkey; your scope covers non-Turkey regions only.'
            : 'Bu üye Türkiye bölgesine kayıtlıdır; yetki kapsamınız Türkiye harici bölgelerle sınırlıdır.'
        );
        return;
      }
      setMembers((prev) => {
        const others = prev.filter((m) => m.ownerId !== fetched.ownerId);
        return [fetched, ...others];
      });
      setMemberLookupUid('');
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
  };

  const handleSaveCommissionConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCommErr('');
    setAdminActionMsg('');

    const targetSettingId = isNonTurkeyScope
      ? 'commission_non_turkey'
      : commissionTarget;

    const sanitized = sanitizeCommissionConfig({
      commissionMode: commMode,
      restaurantCommissionPct: Number(commPct),
      fixedCommissionTry: Number(commFixed),
      customerServiceFeeTry: Number(custServiceFee),
      courierSharePct: 0,
      courierMinFeeTry: 0,
      minCommissionTry: Number(commMin),
    });

    const updaterEmail = sanitizeText(
      user.email || REGIONAL_NON_TURKEY_ADMIN_EMAIL,
      VALIDATION_BOUNDS.emailMax
    );
    const safeUpdaterEmail =
      updaterEmail.length >= VALIDATION_BOUNDS.emailMin
        ? updaterEmail
        : BOOTSTRAPPED_ADMIN_EMAIL;

    setCommSaving(true);
    try {
      await setDoc(doc(db, 'platformSettings', targetSettingId), {
        commissionMode: sanitized.commissionMode,
        restaurantCommissionPct: sanitized.restaurantCommissionPct,
        fixedCommissionTry: sanitized.fixedCommissionTry,
        customerServiceFeeTry: sanitized.customerServiceFeeTry,
        courierSharePct: 0,
        courierMinFeeTry: 0,
        minCommissionTry: sanitized.minCommissionTry,
        updatedByEmail: safeUpdaterEmail,
        updatedAt: serverTimestamp(),
      });
      const updatedObj: CommissionConfig = {
        ...sanitized,
        updatedByEmail: safeUpdaterEmail,
      };
      if (targetSettingId === 'commission_non_turkey') {
        onNonTurkeyCommissionConfigUpdated?.(updatedObj);
      } else {
        onCommissionConfigUpdated?.(updatedObj);
      }
      setAdminActionMsg(
        isEn
          ? `${targetSettingId === 'commission_non_turkey' ? 'Non-Turkey regional commission' : 'Global platform commission'} updated (${formatCommissionPolicySummary(sanitized, 'en')}).`
          : `${targetSettingId === 'commission_non_turkey' ? 'Türkiye harici bölge komisyonu' : 'Genel platform komisyonu'} güncellendi (${formatCommissionPolicySummary(sanitized)}).`
      );
    } catch (error) {
      setCommErr(
        isEn
          ? 'Failed to save commission settings.'
          : 'Komisyon ayarları kaydedilirken bir hata oluştu.'
      );
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `platformSettings/${targetSettingId}`
      );
    } finally {
      setCommSaving(false);
    }
  };

  const handleSaveRestaurantOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideErr('');
    setAdminActionMsg('');

    const cleanRestName = sanitizeText(overrideRestName, 80);
    if (cleanRestName.length < 2) {
      setOverrideErr(
        isEn
          ? 'Please select or enter a valid restaurant name.'
          : 'Lütfen geçerli bir restoran adı seçin veya yazın.'
      );
      return;
    }

    const matchedCityId = restaurantCityLookup.get(
      cleanRestName.toLocaleLowerCase('tr')
    );
    const resolvedCityId = matchedCityId ?? overrideCityId;
    if (isNonTurkeyScope && isTurkeyCityId(resolvedCityId)) {
      setOverrideErr(
        isEn
          ? 'Restaurants in Turkey ("Istanbul") are outside your scope; please choose from the 196 non-Turkey countries.'
          : 'Türkiye ("İstanbul") restoranları yetki kapsamınız dışındadır; lütfen Türkiye harici 196 ülkeden bir restoran seçin.'
      );
      return;
    }

    const restKey = normalizeRestaurantCommissionKey(cleanRestName);
    const pct = Math.min(
      COMMISSION_BOUNDS.pctMax,
      Math.max(0, Math.round((Number(overridePct) || 0) * 100) / 100)
    );
    const fixed = Math.min(
      COMMISSION_BOUNDS.fixedMax,
      Math.max(0, Math.round(Number(overrideFixed) || 0))
    );
    const note = sanitizeText(overrideNote, COMMISSION_BOUNDS.noteMax);

    setOverrideSaving(true);
    try {
      await setDoc(doc(db, 'restaurantCommissions', restKey), {
        restaurantName: cleanRestName,
        cityId: resolvedCityId,
        commissionMode: overrideMode,
        restaurantCommissionPct: pct,
        fixedCommissionTry: fixed,
        note,
        updatedAt: serverTimestamp(),
      });
      setRestaurantOverrides((prev) => {
        const filtered = prev.filter((item) => item.id !== restKey);
        return [
          {
            id: restKey,
            restaurantName: cleanRestName,
            cityId: resolvedCityId,
            commissionMode: overrideMode,
            restaurantCommissionPct: pct,
            fixedCommissionTry: fixed,
            note,
          },
          ...filtered,
        ];
      });
      setOverrideRestName('');
      setOverrideNote('');
      setAdminActionMsg(
        isEn
          ? `Custom commission override saved for "${cleanRestName}".`
          : `"${cleanRestName}" için özel komisyon tanımı kaydedildi.`
      );
    } catch (error) {
      setOverrideErr(
        isEn
          ? 'Could not save restaurant commission override.'
          : 'Restoran komisyon tanımı kaydedilemedi.'
      );
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `restaurantCommissions/${restKey}`
      );
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleDeleteRestaurantOverride = async (
    override: RestaurantCommissionOverride
  ) => {
    try {
      await deleteDoc(doc(db, 'restaurantCommissions', override.id));
      setRestaurantOverrides((prev) => prev.filter((o) => o.id !== override.id));
      setAdminActionMsg(
        isEn
          ? `Custom commission removed for "${override.restaurantName}"; regional default now applies.`
          : `"${override.restaurantName}" özel komisyonu kaldırıldı; bölge standardı geçerli.`
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `restaurantCommissions/${override.id}`
      );
    }
  };

  const sectionTitleMap: Record<AdminSection, string> = isEn
    ? {
        overview: 'Overview',
        members: 'App Members',
        restaurants: 'Restaurants',
        dishes: 'Menu Catalog',
        orders_admins: 'Orders & Permissions',
        commission: 'Commission & Fees',
        support: 'Live Support Desk',
      }
    : {
        overview: 'Genel Bakış',
        members: 'Uygulama Üyeleri',
        restaurants: 'Restoranlar',
        dishes: 'Menü Kataloğu',
        orders_admins: 'Siparişler & Yetkiler',
        commission: 'Komisyon & Ücretler',
        support: 'Canlı Destek Masası',
      };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-title"
    >
      <div
        className="w-full max-w-6xl h-[90vh] bg-[#FAF9F7] rounded-xl border border-[#E6E4DF] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar Contract (Dashboard style: Breadcrumb left, account + actions right) */}
        <div className="bg-white border-b border-[#E6E4DF] px-5 py-3.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <ShieldCheck className="w-4 h-4 text-[#D9043D] shrink-0" />
            <span className="font-display font-semibold text-[#141413] whitespace-nowrap">
              atlassofra
            </span>
            <span className="text-[#8A8780]">/</span>
            <h2
              id="admin-panel-title"
              className="font-medium text-[#575550] truncate"
            >
              {isEn ? 'Admin Console' : 'Yönetici Paneli'}
            </h2>
            {isAdminAuthorized && (
              <>
                <span className="text-[#8A8780] hidden sm:inline">/</span>
                <span className="text-[#141413] font-medium hidden sm:inline whitespace-nowrap">
                  {sectionTitleMap[section]}
                </span>
                <span className="hidden lg:inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-md bg-[#FAF9F7] border border-[#E6E4DF] text-[11px] font-medium text-[#141413] whitespace-nowrap">
                  <Globe className="w-3 h-3 text-[#D9043D]" />
                  {getAdminScopeLabel(adminScope, isEn ? 'en' : 'tr')}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {user && (
              <>
                <span className="hidden md:inline text-xs text-[#575550] font-mono">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-medium text-[#575550] hover:text-[#141413] cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Sign Out' : 'Çıkış'}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={isEn ? 'Close admin console' : 'Yönetici panelini kapat'}
              className="w-9 h-9 rounded-lg border border-[#E6E4DF] bg-white flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Auth & Access Gate */}
        {!authReady || checkingRole ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#575550]">
            {isEn
              ? 'Verifying administrator session and permissions...'
              : 'Yönetici oturumu ve yetki düzeyi doğrulanıyor...'}
          </div>
        ) : !user ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white border border-[#E6E4DF] rounded-xl p-7 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-1.5">
                  {isEn ? 'Authorized Sign-In' : 'Yetkili Girişi'}
                </p>
                <h3 className="font-display text-2xl font-semibold text-[#141413]">
                  {isEn ? 'Admin Console Session' : 'Yönetici Paneli Oturumu'}
                </h3>
                <p className="text-sm text-[#575550] mt-2 leading-relaxed">
                  {isEn
                    ? 'Sign in with your authorized Google account to approve partner restaurants, review menu items, and manage regional operations.'
                    : 'Kayıtlı restoranları onaylamak, menü öğelerini denetlemek ve yönetici yetkilerini düzenlemek için yetkili Google hesabınızla giriş yapın.'}
                </p>
              </div>

              {authError && (
                <p className="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {authError}
                </p>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full min-h-[44px] px-4 py-3 rounded-lg bg-[#D9043D] text-white text-sm font-medium hover:bg-[#B80032] transition-colors cursor-pointer"
              >
                {isEn
                  ? 'Sign In as Admin with Google'
                  : 'Google ile Yönetici Girişi Yap'}
              </button>
            </div>
          </div>
        ) : !isAdminAuthorized ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white border border-[#E6E4DF] rounded-xl p-7 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">
                {isEn ? 'Access Denied' : 'Erişim Reddedildi'}
              </p>
              <h3 className="font-display text-xl font-semibold text-[#141413]">
                {isEn
                  ? 'This account does not have administrator access'
                  : 'Bu hesap yönetici yetkisine sahip değil'}
              </h3>
              <p className="text-sm text-[#575550] leading-relaxed">
                {isEn ? (
                  <>
                    The signed-in account (<span className="font-mono text-[#141413]">{user.email}</span>) is not listed as an administrator. Sign in with an authorized admin account (<span className="font-mono text-[#141413]">{BOOTSTRAPPED_ADMIN_EMAIL}</span>) or request access.
                  </>
                ) : (
                  <>
                    Oturum açılan hesap (<span className="font-mono text-[#141413]">{user.email}</span>) yönetici listesinde bulunmuyor. Ana yönetici hesabıyla (<span className="font-mono text-[#141413]">{BOOTSTRAPPED_ADMIN_EMAIL}</span>) giriş yapın veya yetki tanımlaması isteyin.
                  </>
                )}
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-4 py-2.5 min-h-[40px] rounded-lg border border-[#E6E4DF] text-xs font-medium text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
                >
                  {isEn ? 'Sign Out' : 'Oturumu Kapat'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] cursor-pointer"
                >
                  {isEn ? 'Back to Catalog' : 'Kataloğa Dön'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Authorized Admin Workspace: Left Sidebar + Main Viewport */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="lg:w-60 bg-white border-b lg:border-b-0 lg:border-r border-[#E6E4DF] p-3 lg:p-4 flex lg:flex-col gap-1.5 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setSection('overview')}
                className={`flex items-center gap-2.5 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  section === 'overview'
                    ? 'bg-[#D9043D] text-white'
                    : 'text-[#575550] hover:bg-[#FAF9F7] hover:text-[#141413]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'Overview' : 'Genel Bakış'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSection('members')}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  section === 'members'
                    ? 'bg-[#D9043D] text-white'
                    : 'text-[#575550] hover:bg-[#FAF9F7] hover:text-[#141413]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>{isEn ? 'Members' : 'Üyeler'}</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {scopedMembers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSection('restaurants')}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  section === 'restaurants'
                    ? 'bg-[#D9043D] text-white'
                    : 'text-[#575550] hover:bg-[#FAF9F7] hover:text-[#141413]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>{isEn ? 'Restaurants' : 'Restoranlar'}</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {scopedRestaurants.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSection('dishes')}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  section === 'dishes'
                    ? 'bg-[#D9043D] text-white'
                    : 'text-[#575550] hover:bg-[#FAF9F7] hover:text-[#141413]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <UtensilsCrossed className="w-4 h-4 shrink-0" />
                  <span>{isEn ? 'Menu Catalog' : 'Menü Kataloğu'}</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {scopedDishes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSection('orders_admins')}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  section === 'orders_admins'
                    ? 'bg-[#D9043D] text-white'
                    : 'text-[#575550] hover:bg-[#FAF9F7] hover:text-[#141413]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span>{isEn ? 'Orders & Roles' : 'Siparişler & Yetkiler'}</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {scopedOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSection('commission')}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  section === 'commission'
                    ? 'bg-[#D9043D] text-white'
                    : 'text-[#575550] hover:bg-[#FAF9F7] hover:text-[#141413]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Percent className="w-4 h-4 shrink-0" />
                  <span>{isEn ? 'Commission & Fees' : 'Komisyon & Ücretler'}</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {activeEditedCommissionConfig.commissionMode === 'fixed'
                    ? `${activeEditedCommissionConfig.fixedCommissionTry}₺`
                    : `${activeEditedCommissionConfig.restaurantCommissionPct}%`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSection('support')}
                className={`flex items-center gap-2.5 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  section === 'support'
                    ? 'bg-[#D9043D] text-white'
                    : 'text-[#575550] hover:bg-[#FAF9F7] hover:text-[#141413]'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'Live Support' : 'Canlı Destek'}</span>
              </button>
            </aside>

            {/* Main Viewport */}
            <main className="flex-1 overflow-y-auto p-5 lg:p-7 space-y-6">
              {adminActionMsg && (
                <div className="flex items-center justify-between gap-3 bg-white border border-[#D9043D]/35 rounded-lg px-4 py-2.5 text-xs text-[#D9043D]">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {adminActionMsg}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdminActionMsg('')}
                    className="text-[#575550] hover:text-[#141413] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isNonTurkeyScope && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-[#E6E4DF] rounded-xl px-4 py-3 text-xs">
                  <div className="flex items-center gap-2 text-[#141413]">
                    <Globe className="w-4 h-4 text-[#D9043D] shrink-0" />
                    <span>
                      <strong>Scope: All Non-Turkey Regions (196 Countries)</strong>{' '}
                      <span className="text-[#575550]">
                        — You have full administrative access across all international operations including members, restaurants, menus, orders, regional commissions, and live support. Turkey operations are isolated separately.
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {section === 'overview' && (
                <div className="space-y-6">
                  {/* Single-elevation 6-column KPI bar */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-white border border-[#E6E4DF] rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-[#E6E4DF]">
                    <button
                      type="button"
                      onClick={() => setSection('members')}
                      className="p-5 text-left hover:bg-[#FAF9F7] transition-colors cursor-pointer"
                    >
                      <p className="text-xs text-[#575550] mb-1">
                        {isEn ? 'App Members' : 'Uygulama Üyeleri'}
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                        {scopedMembers.length}
                      </p>
                      <p className="text-[11px] text-[#D9043D] mt-1 font-medium">
                        {isEn ? 'View members →' : 'Üyeleri görüntüle →'}
                      </p>
                    </button>
                    <div className="p-5">
                      <p className="text-xs text-[#575550] mb-1">
                        {isEn ? 'Partner Restaurants' : 'Kayıtlı Üye Restoran'}
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                        {scopedRestaurants.length}
                      </p>
                      <p className="text-[11px] text-[#16A34A] mt-1 font-mono tabular-nums">
                        {scopedRestaurants.filter((r) => r.status === 'active').length}{' '}
                        {isEn ? 'live' : 'yayında'}
                      </p>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-[#575550] mb-1">
                        {isEn ? 'Partner Dishes' : 'Üye Menü Tabakları'}
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                        {scopedDishes.length}
                      </p>
                      <p className="text-[11px] text-[#575550] mt-1 font-mono tabular-nums">
                        +{scopedCuratedDishCount}{' '}
                        {isEn ? 'curated dishes' : 'kürasyon tabak'}
                      </p>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-[#575550] mb-1">
                        {isEn ? 'Active Order Queue' : 'Aktif Sipariş Kuyruğu'}
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                        {scopedOrders.filter((o) => o.status !== 'delivered').length}
                      </p>
                      <p className="text-[11px] text-[#575550] mt-1 font-mono tabular-nums">
                        {isEn
                          ? `${scopedOrders.length} total orders`
                          : `Toplam ${scopedOrders.length} sipariş`}
                      </p>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-[#575550] mb-1">
                        {isEn ? 'Order Volume' : 'Sipariş Hacmi'}
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                        {Math.round(totalOrderVolumeTry).toLocaleString(numberLocale)} ₺
                      </p>
                      <p className="text-[11px] text-[#575550] mt-1">
                        {isEn
                          ? `${scopedHubs.length} countries · 6 continents`
                          : `${scopedHubs.length} ülke · 6 kıta`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection('commission')}
                      className="p-5 text-left hover:bg-[#FAF9F7] transition-colors cursor-pointer"
                    >
                      <p className="text-xs text-[#575550] mb-1">
                        {isEn ? 'Commission Revenue' : 'Komisyon Geliri'}
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#D9043D]">
                        {Math.round(totalPlatformCommissionTry).toLocaleString(numberLocale)} ₺
                      </p>
                      <p className="text-[11px] text-[#575550] mt-1 font-medium truncate">
                        {formatCommissionPolicySummary(
                          isNonTurkeyScope
                            ? nonTurkeyCommissionConfig ?? commissionConfig
                            : commissionConfig,
                          isEn ? 'en' : 'tr'
                        )}{' '}
                        →
                      </p>
                    </button>
                  </div>

                  {/* Global Delivery Network Breakdown Table */}
                  <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#E6E4DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-semibold text-[#141413]">
                          {isEn
                            ? isNonTurkeyScope
                              ? `International Delivery Network — Non-Turkey (${scopedHubs.length} Countries)`
                              : `Global Delivery Network & Country Operations (${scopedHubs.length} Countries)`
                            : isNonTurkeyScope
                              ? `Uluslararası Teslimat Ağı — Türkiye Harici (${scopedHubs.length} Ülke)`
                              : `Küresel Teslimat Ağı & Ülke Operasyon Tablosu (${scopedHubs.length} Ülke)`}
                        </h3>
                        <p className="text-xs text-[#575550] mt-0.5">
                          {isEn
                            ? 'Country hubs, local currencies, and free delivery thresholds across your authorized continents.'
                            : 'Yetkili olduğunuz kıtalardaki ülke merkezleri, yerel para birimleri ve teslimat eşikleri.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={hubSearch}
                          onChange={(e) => setHubSearch(e.target.value)}
                          placeholder={
                            isEn ? 'Search country or city...' : 'Ülke veya şehir ara...'
                          }
                          className="px-3 py-1.5 min-h-[34px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs"
                        />
                        <select
                          value={hubContinentFilter}
                          onChange={(e) =>
                            setHubContinentFilter(e.target.value as 'all' | ContinentId)
                          }
                          aria-label={isEn ? 'Filter by continent' : 'Kıta filtresi'}
                          className="px-3 py-1.5 min-h-[34px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                        >
                          <option value="all">
                            {isEn
                              ? `All Continents (${scopedHubs.length})`
                              : `Tüm Kıtalar (${scopedHubs.length})`}
                          </option>
                          {CONTINENTS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                            <th className="py-2.5 px-4 font-medium">
                              {isEn ? 'Country' : 'Ülke'}
                            </th>
                            <th className="py-2.5 px-4 font-medium">
                              {isEn ? 'Hub City' : 'Merkez Şehir'}
                            </th>
                            <th className="py-2.5 px-4 font-medium">
                              {isEn ? 'Continent' : 'Kıta'}
                            </th>
                            <th className="py-2.5 px-4 font-medium text-right">
                              {isEn ? 'Partner Restaurants' : 'Üye Restoran'}
                            </th>
                            <th className="py-2.5 px-4 font-medium text-right">
                              {isEn ? 'Total Dishes' : 'Toplam Tabak'}
                            </th>
                            <th className="py-2.5 px-4 font-medium text-right">
                              {isEn ? 'Currency / Threshold' : 'Kur / Eşik'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E4DF]">
                          {scopedHubs.filter((hub) => {
                            if (
                              hubContinentFilter !== 'all' &&
                              hub.continent !== hubContinentFilter
                            ) {
                              return false;
                            }
                            const q = hubSearch.trim().toLocaleLowerCase('tr');
                            if (q) {
                              return (
                                hub.country.toLocaleLowerCase('tr').includes(q) ||
                                hub.name.toLocaleLowerCase('tr').includes(q) ||
                                hub.currencyCode.toLowerCase().includes(q)
                              );
                            }
                            return true;
                          }).map((hub) => {
                            const hubRestCount = scopedRestaurants.filter(
                              (r) => r.cityId === hub.id
                            ).length;
                            const hubDishCount =
                              scopedDishes.filter((d) => d.cityId === hub.id).length +
                              DISHES.filter((d) => d.cityId === hub.id).length;

                            return (
                              <tr key={hub.id} className="hover:bg-[#FAF9F7]">
                                <td className="py-2.5 px-4 font-medium text-[#141413]">
                                  {hub.country}
                                </td>
                                <td className="py-2.5 px-4 text-[#575550]">
                                  {hub.name}
                                </td>
                                <td className="py-2.5 px-4 text-[#575550]">
                                  {hub.continent}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#141413]">
                                  {hubRestCount}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#141413]">
                                  {hubDishCount}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#141413]">
                                  {hub.currencyCode} · {hub.freeDeliveryThresholdTry} ₺
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {section === 'members' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 bg-white border border-[#E6E4DF] rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[#E6E4DF]">
                    <div className="p-4">
                      <p className="text-[11px] text-[#575550]">
                        {isEn
                          ? isNonTurkeyScope
                            ? 'Regional Registered Members'
                            : 'Total Registered Members'
                          : isNonTurkeyScope
                            ? 'Bölge Kayıtlı Üye'
                            : 'Toplam Kayıtlı Üye'}
                      </p>
                      <p className="font-mono tabular-nums text-xl font-semibold text-[#141413] mt-0.5">
                        {scopedMembers.length}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] text-[#575550]">
                        {isEn ? 'Filtered Members' : 'Listelenen Üye'}
                      </p>
                      <p className="font-mono tabular-nums text-xl font-semibold text-[#141413] mt-0.5">
                        {filteredMembers.length}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] text-[#575550]">
                        {isEn ? 'Phone Saved' : 'Telefonu Kayıtlı'}
                      </p>
                      <p className="font-mono tabular-nums text-xl font-semibold text-[#141413] mt-0.5">
                        {scopedMembers.filter((m) => Boolean(m.phone?.trim())).length}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] text-[#575550]">
                        {isEn ? 'Address Saved' : 'Adresi Kayıtlı'}
                      </p>
                      <p className="font-mono tabular-nums text-xl font-semibold text-[#141413] mt-0.5">
                        {
                          scopedMembers.filter((m) =>
                            Boolean(m.defaultAddress?.trim())
                          ).length
                        }
                      </p>
                    </div>
                  </div>

                  {!canBulkListMembers && (
                    <div className="bg-white border border-[#E6E4DF] rounded-xl p-4 space-y-3">
                      <p className="text-xs text-[#575550]">
                        {isEn
                          ? 'Look up a specific member within your authorized region by UID:'
                          : 'Yetkili kapsamınızdaki belirli bir üyeyi UID ile sorgulayabilirsiniz:'}
                      </p>
                      <form
                        onSubmit={handleLookupMemberByUid}
                        className="flex flex-col sm:flex-row gap-2"
                      >
                        <input
                          type="text"
                          value={memberLookupUid}
                          onChange={(e) => setMemberLookupUid(e.target.value)}
                          placeholder={isEn ? 'Firebase User UID' : 'Firebase Kullanıcı UID'}
                          className="flex-1 px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs font-mono"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] cursor-pointer"
                        >
                          {isEn ? 'Fetch Member' : 'Üyeyi Getir'}
                        </button>
                      </form>
                      {memberLookupError && (
                        <p className="text-xs text-[#DC2626]">
                          {memberLookupError}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative sm:w-80">
                      <Search className="w-4 h-4 text-[#575550] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder={
                          isEn
                            ? 'Search name, email, phone, location or UID...'
                            : 'Ad soyad, e-posta, telefon, konum veya UID ara...'
                        }
                        className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                      />
                    </div>

                    <select
                      value={memberCityFilter}
                      onChange={(e) =>
                        setMemberCityFilter(e.target.value as CityId)
                      }
                      aria-label={isEn ? 'Filter members by country' : 'Ülkeye göre üye filtrele'}
                      className="px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                    >
                      <CountrySelectOptions
                        includeAllOption
                        excludeTurkey={isNonTurkeyScope}
                        lang={isEn ? 'en' : 'tr'}
                        allLabel={
                          isEn
                            ? isNonTurkeyScope
                              ? `Non-Turkey Countries (${scopedHubs.length})`
                              : `All Countries (${CITY_HUBS.length})`
                            : isNonTurkeyScope
                              ? `Türkiye Harici Ülkeler (${scopedHubs.length})`
                              : `Tüm Ülkeler (${CITY_HUBS.length})`
                        }
                      />
                    </select>
                  </div>

                  <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
                    {membersLoading ? (
                      <div className="p-8 text-center text-xs text-[#575550]">
                        {isEn ? 'Loading application members...' : 'Uygulama üyeleri yükleniyor...'}
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="p-10 text-center space-y-2">
                        <p className="font-display text-base font-medium text-[#141413]">
                          {isEn ? 'No registered members found' : 'Kayıtlı uygulama üyesi bulunamadı'}
                        </p>
                        <p className="text-xs text-[#575550]">
                          {isEn
                            ? 'Users who sign in with Google and create their profile are listed here.'
                            : 'Google hesabı ile oturum açan ve profilini oluşturan tüm kullanıcılar burada listelenir.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Member' : 'Üye'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Email & Phone' : 'E-posta & Telefon'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Default Delivery Region' : 'Varsayılan Teslimat Bölgesi'}
                              </th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                {isEn ? 'Orders' : 'Sipariş'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Joined / Updated' : 'Kayıt / Güncelleme'}
                              </th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                {isEn ? 'Role' : 'Yetki'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6E4DF]">
                            {filteredMembers.map((member) => {
                              const hub = CITY_HUBS.find(
                                (h) => h.id === member.defaultCityId
                              );
                              const stats = memberOrderStats.get(
                                member.ownerId
                              ) ?? { count: 0, totalTry: 0 };
                              const isPrimaryAdmin =
                                member.email === BOOTSTRAPPED_ADMIN_EMAIL;
                              const isPermanentIntlAdmin =
                                member.ownerId === REGIONAL_NON_TURKEY_ADMIN_UID ||
                                member.email?.toLowerCase() ===
                                  REGIONAL_NON_TURKEY_ADMIN_EMAIL;
                              const isDelegatedAdmin = admins.some(
                                (a) => a.uid === member.ownerId
                              );
                              const initials = (
                                member.displayName ||
                                member.email ||
                                (isEn ? 'M' : 'Ü')
                              )
                                .trim()
                                .charAt(0)
                                .toUpperCase();

                              return (
                                <tr
                                  key={member.ownerId}
                                  className="hover:bg-[#FAF9F7]"
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-[#D9043D]/10 text-[#D9043D] font-display font-semibold text-xs flex items-center justify-center shrink-0">
                                        {initials}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-semibold text-[#141413] truncate max-w-[190px]">
                                          {member.displayName}
                                        </p>
                                        <p
                                          className="font-mono text-[10px] text-[#8A8780] truncate max-w-[190px]"
                                          title={member.ownerId}
                                        >
                                          UID: {member.ownerId}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 space-y-0.5">
                                    <p className="flex items-center gap-1.5 text-[#141413]">
                                      <Mail className="w-3 h-3 text-[#8A8780] shrink-0" />
                                      <span className="truncate max-w-[200px]">
                                        {member.email || (isEn ? 'No email' : 'E-posta yok')}
                                      </span>
                                    </p>
                                    <p className="flex items-center gap-1.5 text-[#575550]">
                                      <Phone className="w-3 h-3 text-[#8A8780] shrink-0" />
                                      <span>
                                        {member.phone?.trim() ||
                                          (isEn ? 'No phone saved' : 'Telefon girilmedi')}
                                      </span>
                                    </p>
                                  </td>
                                  <td className="py-3 px-4">
                                    <p className="flex items-center gap-1.5 text-[#141413] font-medium">
                                      <MapPin className="w-3 h-3 text-[#D9043D] shrink-0" />
                                      <span>
                                        {hub?.country ?? member.defaultCityId} ·{' '}
                                        {member.defaultProvince} /{' '}
                                        {member.defaultDistrict}
                                      </span>
                                    </p>
                                    {member.defaultAddress && (
                                      <p
                                        className="text-[11px] text-[#575550] truncate max-w-[220px] pl-4"
                                        title={member.defaultAddress}
                                      >
                                        {member.defaultAddress}
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                                    <p className="font-semibold text-[#141413]">
                                      {stats.count} {isEn ? 'orders' : 'sipariş'}
                                    </p>
                                    {stats.totalTry > 0 && (
                                      <p className="text-[11px] text-[#575550]">
                                        {Math.round(
                                          stats.totalTry
                                        ).toLocaleString(numberLocale)}{' '}
                                        ₺
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-[#575550] whitespace-nowrap">
                                    <p>
                                      {formatFirestoreDate(member.createdAt, numberLocale)}
                                    </p>
                                    <p className="text-[10px] text-[#8A8780]">
                                      {isEn ? 'Upd:' : 'Günc:'}{' '}
                                      {formatFirestoreDate(member.updatedAt, numberLocale)}
                                    </p>
                                  </td>
                                  <td className="py-3 px-4 text-right whitespace-nowrap">
                                    {isPrimaryAdmin ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#D9043D]/10 text-[#D9043D] text-[11px] font-medium">
                                        {isEn ? 'Primary Admin' : 'Ana Yönetici'}
                                      </span>
                                    ) : isPermanentIntlAdmin ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                                        {isEn ? 'Non-Turkey Regional Admin' : 'TR Harici Yetkili'}
                                      </span>
                                    ) : isDelegatedAdmin ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                                        {isEn ? 'Admin' : 'Yönetici'}
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewAdminUid(member.ownerId);
                                          setNewAdminEmail(
                                            member.email || ''
                                          );
                                          setNewAdminNote(
                                            member.displayName || (isEn ? 'Admin' : 'Yönetici')
                                          );
                                          setNewAdminScope(
                                            isNonTurkeyScope ? 'non_turkey' : 'all'
                                          );
                                          setSection('orders_admins');
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E6E4DF] bg-white text-[#141413] hover:border-[#D9043D] hover:text-[#D9043D] cursor-pointer"
                                      >
                                        <UserPlus className="w-3 h-3" />
                                        <span>{isEn ? 'Make Admin' : 'Yönetici Yap'}</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {section === 'restaurants' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative sm:w-72">
                      <Search className="w-4 h-4 text-[#575550] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={restSearch}
                        onChange={(e) => setRestSearch(e.target.value)}
                        placeholder={
                          isEn
                            ? 'Search restaurant, city or cuisine...'
                            : 'Restoran, şehir veya mutfak ara...'
                        }
                        className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                      />
                    </div>

                    <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg self-start">
                      {(
                        [
                          { id: 'all', label: isEn ? 'All' : 'Tümü' },
                          { id: 'active', label: isEn ? 'Live' : 'Yayında' },
                          { id: 'paused', label: isEn ? 'Paused' : 'Duraklatıldı' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setRestStatusFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                            restStatusFilter === tab.id
                              ? 'bg-white text-[#141413]'
                              : 'text-[#575550]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {inspectedContact && (
                    <div className="bg-white border border-[#D9043D]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-[#141413]">
                          {inspectedContact.restaurantName} —{' '}
                          {isEn ? 'Private Contact Record' : 'Gizli İletişim Kaydı'}
                        </p>
                        {inspectedContact.contact ? (
                          <p className="text-[#575550]">
                            {isEn ? 'Email' : 'E-posta'}: {inspectedContact.contact.contactEmail} ·{' '}
                            {isEn ? 'Phone' : 'Telefon'}: {inspectedContact.contact.contactPhone} ·{' '}
                            {isEn ? 'Tax ID' : 'Vergi No'}: {inspectedContact.contact.taxId} ·{' '}
                            {isEn ? 'Address' : 'Adres'}: {inspectedContact.contact.streetAddress}
                          </p>
                        ) : (
                          <p className="text-[#575550]">
                            {isEn ? 'Contact record not found.' : 'İletişim kaydı bulunamadı.'}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectedContact(null)}
                        className="text-xs font-medium text-[#D9043D] hover:underline self-start sm:self-center cursor-pointer"
                      >
                        {isEn ? 'Close' : 'Kapat'}
                      </button>
                    </div>
                  )}

                  <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
                    {dataLoading ? (
                      <div className="p-8 text-center text-xs text-[#575550]">
                        {isEn ? 'Loading restaurant records...' : 'Restoran kayıtları yükleniyor...'}
                      </div>
                    ) : filteredRestaurants.length === 0 ? (
                      <div className="p-10 text-center space-y-2">
                        <p className="font-display text-base font-medium text-[#141413]">
                          {isEn ? 'No partner restaurants found' : 'Kayıtlı üye restoran bulunamadı'}
                        </p>
                        <p className="text-xs text-[#575550]">
                          {isEn
                            ? 'Businesses registered through the Partner Onboarding flow appear here.'
                            : 'Restoran Üyeliği akışı üzerinden kayıt olan işletmeler burada listelenir.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Restaurant' : 'Restoran'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Location' : 'Konum'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Category' : 'Kategori'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Status' : 'Durum'}
                              </th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                {isEn ? 'Actions' : 'İşlemler'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6E4DF]">
                            {filteredRestaurants.map((rest) => {
                              const confirming =
                                confirmDeleteId === `rest_${rest.id}`;
                              return (
                                <tr
                                  key={rest.id}
                                  className="hover:bg-[#FAF9F7]"
                                >
                                  <td className="py-3 px-4">
                                    <p className="font-semibold text-[#141413]">
                                      {rest.name}
                                    </p>
                                    <p className="text-[11px] text-[#575550] truncate max-w-[220px]">
                                      {rest.tagline}
                                    </p>
                                  </td>
                                  <td className="py-3 px-4 text-[#575550] whitespace-nowrap">
                                    {rest.cityName} · {rest.district}
                                  </td>
                                  <td className="py-3 px-4 text-[#575550] whitespace-nowrap">
                                    {rest.cuisineCategory}
                                  </td>
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <span
                                      className={`font-medium ${
                                        rest.status === 'active'
                                          ? 'text-[#16A34A]'
                                          : 'text-[#D97706]'
                                      }`}
                                    >
                                      {rest.status === 'active'
                                        ? isEn
                                          ? 'Live'
                                          : 'Yayında'
                                        : isEn
                                          ? 'Paused'
                                          : 'Duraklatıldı'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleInspectPrivateContact(rest)
                                      }
                                      className="px-2.5 py-1.5 rounded-md border border-[#E6E4DF] bg-white text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
                                    >
                                      {isEn ? 'Contact' : 'İletişim'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleRestaurantStatus(rest)
                                      }
                                      className="px-2.5 py-1.5 rounded-md border border-[#E6E4DF] bg-white text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
                                    >
                                      {rest.status === 'active'
                                        ? isEn
                                          ? 'Pause'
                                          : 'Duraklat'
                                        : isEn
                                          ? 'Publish'
                                          : 'Yayınla'}
                                    </button>
                                    {confirming ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteRestaurant(rest)
                                        }
                                        className="px-2.5 py-1.5 rounded-md bg-[#DC2626] text-white font-medium cursor-pointer"
                                      >
                                        {isEn ? 'Confirm Delete' : 'Silmeyi Onayla'}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmDeleteId(`rest_${rest.id}`)
                                        }
                                        aria-label={
                                          isEn
                                            ? `Delete restaurant ${rest.name}`
                                            : `${rest.name} restoranını sil`
                                        }
                                        className="p-1.5 rounded-md border border-[#E6E4DF] text-[#DC2626] hover:bg-red-50 cursor-pointer align-middle"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {section === 'dishes' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative sm:w-72">
                      <Search className="w-4 h-4 text-[#575550] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={dishSearch}
                        onChange={(e) => setDishSearch(e.target.value)}
                        placeholder={isEn ? 'Search dish or restaurant...' : 'Tabak veya restoran ara...'}
                        className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                      />
                    </div>

                    <select
                      value={dishCityFilter}
                      onChange={(e) =>
                        setDishCityFilter(e.target.value as CityId)
                      }
                      aria-label={isEn ? 'Filter dishes by country' : 'Ülkeye göre tabak filtrele'}
                      className="px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                    >
                      <CountrySelectOptions
                        includeAllOption
                        excludeTurkey={isNonTurkeyScope}
                        lang={isEn ? 'en' : 'tr'}
                        allLabel={
                          isEn
                            ? isNonTurkeyScope
                              ? `Non-Turkey Countries (${scopedHubs.length})`
                              : `All Countries (${CITY_HUBS.length})`
                            : isNonTurkeyScope
                              ? `Türkiye Harici Ülkeler (${scopedHubs.length})`
                              : `Tüm Ülkeler (${CITY_HUBS.length})`
                        }
                      />
                    </select>
                  </div>

                  <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
                    {filteredDishes.length === 0 ? (
                      <div className="p-10 text-center space-y-1.5">
                        <p className="font-display text-base font-medium text-[#141413]">
                          {isEn ? 'No partner restaurant dishes found' : 'Üye restoran tabağı bulunamadı'}
                        </p>
                        <p className="text-xs text-[#575550]">
                          {isEn
                            ? 'Dishes added by partner restaurants are reviewed and managed here.'
                            : 'Üye restoranların eklediği yemekler burada denetlenir ve yönetilir.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Dish' : 'Yemek'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Restaurant' : 'Restoran'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'City' : 'Şehir'}
                              </th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                {isEn ? 'Price' : 'Fiyat'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Status' : 'Durum'}
                              </th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                {isEn ? 'Actions' : 'İşlemler'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6E4DF]">
                            {filteredDishes.map((dish) => {
                              const confirming =
                                confirmDeleteId === `dish_${dish.id}`;
                              return (
                                <tr
                                  key={dish.id}
                                  className="hover:bg-[#FAF9F7]"
                                >
                                  <td className="py-3 px-4 font-semibold text-[#141413]">
                                    {dish.name}
                                  </td>
                                  <td className="py-3 px-4 text-[#575550]">
                                    {dish.restaurantName}
                                  </td>
                                  <td className="py-3 px-4 text-[#575550]">
                                    {dish.cityName}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#141413]">
                                    {dish.priceTry.toLocaleString(numberLocale)} ₺
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`font-medium ${
                                        dish.isPublished
                                          ? 'text-[#16A34A]'
                                          : 'text-[#D97706]'
                                      }`}
                                    >
                                      {dish.isPublished
                                        ? isEn
                                          ? 'Live'
                                          : 'Yayında'
                                        : isEn
                                          ? 'Hidden'
                                          : 'Gizli'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleDishPublish(dish)
                                      }
                                      className="px-2.5 py-1.5 rounded-md border border-[#E6E4DF] bg-white text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
                                    >
                                      {dish.isPublished
                                        ? isEn
                                          ? 'Hide'
                                          : 'Gizle'
                                        : isEn
                                          ? 'Publish'
                                          : 'Yayınla'}
                                    </button>
                                    {confirming ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDish(dish)}
                                        className="px-2.5 py-1.5 rounded-md bg-[#DC2626] text-white font-medium cursor-pointer"
                                      >
                                        {isEn ? 'Confirm Delete' : 'Silmeyi Onayla'}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmDeleteId(`dish_${dish.id}`)
                                        }
                                        aria-label={
                                          isEn
                                            ? `Delete dish ${dish.name}`
                                            : `${dish.name} yemeğini sil`
                                        }
                                        className="p-1.5 rounded-md border border-[#E6E4DF] text-[#DC2626] hover:bg-red-50 cursor-pointer align-middle"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {section === 'orders_admins' && (
                <div className="space-y-6">
                  {/* Live Orders Table */}
                  <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#E6E4DF]">
                      <h3 className="font-display text-base font-semibold text-[#141413]">
                        {isEn ? 'Order Operations Queue' : 'Sipariş Operasyon Kuyruğu'}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                            <th className="py-2.5 px-4 font-medium">
                              {isEn ? 'Order' : 'Sipariş'}
                            </th>
                            <th className="py-2.5 px-4 font-medium">
                              {isEn ? 'Customer' : 'Müşteri'}
                            </th>
                            <th className="py-2.5 px-4 font-medium">
                              {isEn ? 'Payment' : 'Ödeme'}
                            </th>
                            <th className="py-2.5 px-4 font-medium text-right">
                              {isEn ? 'Total' : 'Tutar'}
                            </th>
                            <th className="py-2.5 px-4 font-medium">
                              {isEn ? 'Status' : 'Durum'}
                            </th>
                            <th className="py-2.5 px-4 font-medium text-right">
                              {isEn ? 'Action' : 'Aksiyon'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E4DF]">
                          {scopedOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-[#FAF9F7]">
                              <td className="py-3 px-4">
                                <p className="font-mono tabular-nums font-semibold text-[#141413]">
                                  #{order.id}
                                </p>
                                <p className="text-[11px] text-[#575550]">
                                  {order.cityName} · {order.neighborhood}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-[#141413]">
                                {order.customerName}
                              </td>
                              <td className="py-3 px-4">
                                <p
                                  className={`font-medium ${
                                    order.paymentStatus === 'refunded'
                                      ? 'text-[#DC2626]'
                                      : order.paymentStatus === 'paid'
                                        ? 'text-[#16A34A]'
                                        : 'text-[#575550]'
                                  }`}
                                >
                                  {order.paymentStatus === 'refunded'
                                    ? isEn
                                      ? 'Refunded'
                                      : 'İade Edildi'
                                    : order.paymentStatus === 'paid'
                                      ? isEn
                                        ? 'Paid Online'
                                        : 'Online Ödendi'
                                      : isEn
                                        ? 'Cash on Delivery'
                                        : 'Kapıda Ödeme'}
                                </p>
                                {order.paymentDetails?.transactionId && (
                                  <p className="font-mono text-[10px] text-[#575550]">
                                    {order.paymentDetails.transactionId}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#141413]">
                                <p>
                                  {Math.round(order.totalTry).toLocaleString(numberLocale)} ₺
                                </p>
                                {order.commissionTry !== undefined && (
                                  <p className="text-[10px] text-[#D9043D]">
                                    {isEn ? 'Commission:' : 'Komisyon:'}{' '}
                                    {Math.round(order.commissionTry).toLocaleString(numberLocale)}{' '}
                                    ₺
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`font-medium ${
                                    order.status === 'delivered'
                                      ? 'text-[#16A34A]'
                                      : 'text-[#D97706]'
                                  }`}
                                >
                                  {orderStatusLabels[order.status]}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                                {order.paymentStatus === 'paid' &&
                                  order.paymentDetails?.transactionId &&
                                  onRefundOrder && (
                                    <button
                                      type="button"
                                      onClick={() => void onRefundOrder(order)}
                                      className="px-2.5 py-1.5 rounded-md border border-[#E6E4DF] text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                      {isEn ? 'Refund' : 'İade Et'}
                                    </button>
                                  )}
                                {order.status !== 'delivered' ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onAdvanceOrderStatus(order.id)
                                    }
                                    className="px-2.5 py-1.5 rounded-md border border-[#D9043D] text-[#D9043D] hover:bg-[#D9043D] hover:text-white transition-colors cursor-pointer"
                                  >
                                    {isEn ? 'Advance Step' : 'Aşama İlerlet'}
                                  </button>
                                ) : (
                                  <span className="text-[#575550]">
                                    {isEn ? 'Completed' : 'Tamamlandı'}
                                  </span>
                                )}
                                {onDeleteOrder &&
                                  (confirmDeleteId === `ord_${order.id}` ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void onDeleteOrder(order);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="px-2.5 py-1.5 rounded-md bg-[#DC2626] text-white font-medium cursor-pointer"
                                    >
                                      {isEn ? 'Confirm Delete' : 'Silmeyi Onayla'}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmDeleteId(`ord_${order.id}`)
                                      }
                                      aria-label={
                                        isEn
                                          ? `Delete order #${order.id}`
                                          : `#${order.id} siparişini sil`
                                      }
                                      className="p-1.5 rounded-md border border-[#E6E4DF] text-[#DC2626] hover:bg-red-50 cursor-pointer align-middle"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Admin RBAC Management */}
                  <div className="bg-white border border-[#E6E4DF] rounded-xl p-5 space-y-5">
                    <div>
                      <h3 className="font-display text-base font-semibold text-[#141413]">
                        {isEn ? 'Admin Access Permissions (RBAC)' : 'Yönetici Erişim Yetkileri'}
                      </h3>
                      <p className="text-xs text-[#575550] mt-0.5">
                        {isEn
                          ? isNonTurkeyScope
                            ? 'Assign regional assistant admin UIDs for operations across 196 non-Turkey countries.'
                            : `Assign global admin (${BOOTSTRAPPED_ADMIN_EMAIL}) or non-Turkey regional admin UIDs.`
                          : isNonTurkeyScope
                            ? 'Türkiye harici 196 ülke operasyonları için bölgesel yardımcı yönetici UID tanımlayabilirsiniz.'
                            : `Ana yönetici (${BOOTSTRAPPED_ADMIN_EMAIL}) veya Türkiye harici bölge yetkilisi olarak yönetici UID tanımlayabilirsiniz.`}
                      </p>
                    </div>

                    {adminActionErr && (
                      <p className="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {adminActionErr}
                      </p>
                    )}

                    <form
                      onSubmit={handleAddAdmin}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3"
                    >
                      <input
                        type="text"
                        value={newAdminUid}
                        onChange={(e) => setNewAdminUid(e.target.value)}
                        placeholder="Firebase UID"
                        required
                        className="sm:col-span-3 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-xs font-mono"
                      />
                      <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder={isEn ? 'Email address' : 'E-posta adresi'}
                        required
                        className="sm:col-span-3 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-xs"
                      />
                      <input
                        type="text"
                        value={newAdminNote}
                        onChange={(e) => setNewAdminNote(e.target.value)}
                        placeholder={isEn ? 'Role note' : 'Rol notu'}
                        className="sm:col-span-2 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-xs"
                      />
                      <select
                        value={isNonTurkeyScope ? 'non_turkey' : newAdminScope}
                        disabled={isNonTurkeyScope}
                        onChange={(e) =>
                          setNewAdminScope(e.target.value as AdminRegionScope)
                        }
                        aria-label={isEn ? 'Admin access region' : 'Yönetici yetki bölgesi'}
                        className="sm:col-span-2 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs disabled:bg-[#FAF9F7] disabled:text-[#575550]"
                      >
                        {!isNonTurkeyScope && (
                          <option value="all">
                            {isEn ? 'Global + Turkey (197)' : 'Tüm Dünya + TR (197)'}
                          </option>
                        )}
                        <option value="non_turkey">
                          {isEn ? 'Non-Turkey (196 Countries)' : 'Türkiye Harici (196 Ülke)'}
                        </option>
                      </select>
                      <button
                        type="submit"
                        className="sm:col-span-2 min-h-[40px] px-4 py-2 rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] cursor-pointer"
                      >
                        {isEn ? 'Add Role' : 'Yetki Ekle'}
                      </button>
                    </form>

                    {/* Core permanent RBAC directory + delegated admins */}
                    <div className="border-t border-[#E6E4DF] pt-4 space-y-2">
                      {!isNonTurkeyScope && (
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs py-1.5">
                          <div>
                            <span className="font-medium text-[#141413]">
                              {BOOTSTRAPPED_ADMIN_EMAIL}
                            </span>
                            <span className="text-[#575550] ml-2">
                              {isEn
                                ? '· Primary Admin (Full Access: Turkey + 196 Countries)'
                                : '· Ana Yönetici (Tam Yetki: Türkiye + 196 Ülke)'}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-[#D9043D]">
                            {isEn ? 'Fixed Master Account' : 'Sabit Ana Hesap'}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs py-1.5">
                        <div>
                          <span className="font-medium text-[#141413]">
                            {REGIONAL_NON_TURKEY_ADMIN_EMAIL}
                          </span>
                          <span className="text-[#575550] ml-2">
                            ·{' '}
                            {isEn
                              ? `All Non-Turkey Regions Administrator (${REGIONAL_NON_TURKEY_ADMIN_UID})`
                              : `Türkiye Harici Tüm Bölgeler Yetkilisi (${REGIONAL_NON_TURKEY_ADMIN_UID})`}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-[#16A34A]">
                          {isEn ? '196 Countries Full Access' : '196 Ülke Tam Erişim'}
                        </span>
                      </div>

                      {admins.map((adm) => {
                        const scope = resolveAdminDocScope(adm);
                        const canRemove =
                          isGlobalAdminUser ||
                          (isNonTurkeyScope &&
                            scope === 'non_turkey' &&
                            adm.uid !== user?.uid);
                        return (
                          <div
                            key={adm.id}
                            className="flex items-center justify-between gap-3 text-xs py-1.5"
                          >
                            <div>
                              <span className="font-medium text-[#141413]">
                                {adm.email}
                              </span>
                              <span className="text-[#575550] ml-2">
                                · {adm.note} ({adm.uid}) ·{' '}
                                {isEn
                                  ? scope === 'non_turkey'
                                    ? 'Non-Turkey (196 Countries)'
                                    : 'Global + Turkey'
                                  : scope === 'non_turkey'
                                    ? 'Türkiye Harici (196 Ülke)'
                                    : 'Tüm Dünya + TR'}
                              </span>
                            </div>
                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAdmin(adm)}
                                className="text-[#DC2626] hover:underline cursor-pointer"
                              >
                                {isEn ? 'Remove' : 'Kaldır'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {section === 'commission' && (
                <div className="space-y-6">
                  {/* Global Commission & Fee Policy + Live Simulator */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    <form
                      onSubmit={handleSaveCommissionConfig}
                      className="lg:col-span-7 bg-white border border-[#E6E4DF] rounded-xl p-5 space-y-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E6E4DF]">
                        <div>
                          <h3 className="font-display text-base font-semibold text-[#141413]">
                            {isEn
                              ? isNonTurkeyScope ||
                                commissionTarget === 'commission_non_turkey'
                                ? 'Non-Turkey Regional Commission Policy (196 Countries)'
                                : 'Platform Commission & Fee Policy'
                              : isNonTurkeyScope ||
                                  commissionTarget === 'commission_non_turkey'
                                ? 'Türkiye Harici Bölgeler Komisyon Politikası (196 Ülke)'
                                : 'Platform Komisyon & Ücret Politikası'}
                          </h3>
                          <p className="text-xs text-[#575550] mt-0.5">
                            {isEn
                              ? isNonTurkeyScope ||
                                commissionTarget === 'commission_non_turkey'
                                ? 'Commission and service fee policy applied to new orders across all non-Turkey countries.'
                                : 'Set restaurant commission and customer service fee. All deliveries are fulfilled exclusively by restaurant couriers.'
                              : isNonTurkeyScope ||
                                  commissionTarget === 'commission_non_turkey'
                                ? 'Türkiye harici tüm ülkelerdeki yeni siparişlerde geçerli komisyon ve hizmet bedeli ayarları.'
                                : 'Restoran komisyonu ve müşteri hizmet bedelini belirleyin. Teslimatlar yalnızca restoran kuryesiyle yapılır.'}
                          </p>
                        </div>
                        <span className="font-mono tabular-nums text-xs font-semibold text-[#D9043D] shrink-0">
                          {formatCommissionPolicySummary(
                            draftCommissionConfig,
                            isEn ? 'en' : 'tr'
                          )}
                        </span>
                      </div>

                      {isGlobalAdminUser && (
                        <div className="grid grid-cols-2 gap-1 p-1 bg-[#EFECE6] rounded-lg">
                          <button
                            type="button"
                            onClick={() => setCommissionTarget('commission')}
                            className={`py-2 px-2.5 rounded-md text-xs font-medium cursor-pointer ${
                              commissionTarget === 'commission'
                                ? 'bg-white text-[#141413]'
                                : 'text-[#575550]'
                            }`}
                          >
                            {isEn ? 'Global Standard (TR + World)' : 'Genel Standart (TR + Dünya)'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCommissionTarget('commission_non_turkey')
                            }
                            className={`py-2 px-2.5 rounded-md text-xs font-medium cursor-pointer ${
                              commissionTarget === 'commission_non_turkey'
                                ? 'bg-white text-[#141413]'
                                : 'text-[#575550]'
                            }`}
                          >
                            {isEn ? 'Non-Turkey (196 Countries)' : 'Türkiye Harici (196 Ülke)'}
                          </button>
                        </div>
                      )}

                      {/* Quick Presets */}
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-medium text-[#575550]">
                          {isEn ? 'Quick Presets' : 'Hızlı Şablonlar'}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              {
                                label: isEn ? 'Standard (15%)' : 'Standart (%15)',
                                mode: 'percentage' as CommissionMode,
                                pct: '15',
                                fixed: '0',
                                min: '0',
                                fee: '0',
                              },
                              {
                                label: isEn ? 'Economy (10%)' : 'Ekonomik (%10)',
                                mode: 'percentage' as CommissionMode,
                                pct: '10',
                                fixed: '0',
                                min: '0',
                                fee: '0',
                              },
                              {
                                label: isEn ? 'Fixed (45 ₺)' : 'Sabit (45 ₺)',
                                mode: 'fixed' as CommissionMode,
                                pct: '0',
                                fixed: '45',
                                min: '0',
                                fee: '0',
                              },
                              {
                                label: isEn ? 'Hybrid (12% + 15 ₺)' : 'Karma (%12 + 15 ₺)',
                                mode: 'hybrid' as CommissionMode,
                                pct: '12',
                                fixed: '15',
                                min: '35',
                                fee: '12',
                              },
                            ] as const
                          ).map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setCommMode(preset.mode);
                                setCommPct(preset.pct);
                                setCommFixed(preset.fixed);
                                setCommMin(preset.min);
                                setCustServiceFee(preset.fee);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-[11px] font-medium text-[#141413] hover:border-[#D9043D] hover:text-[#D9043D] transition-colors cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Calculation Mode Selector */}
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-[#575550]">
                          {isEn ? 'Commission Calculation Model' : 'Komisyon Hesaplama Modeli'}
                        </span>
                        <div className="grid grid-cols-3 gap-1 p-1 bg-[#EFECE6] rounded-lg">
                          {(
                            [
                              { id: 'percentage', label: isEn ? 'Percentage (%)' : 'Yüzdelik (%)' },
                              { id: 'fixed', label: isEn ? 'Fixed Fee (₺)' : 'Sabit Tutar (₺)' },
                              { id: 'hybrid', label: isEn ? 'Hybrid (% + ₺)' : 'Karma (% + ₺)' },
                            ] as const
                          ).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setCommMode(item.id)}
                              className={`py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                commMode === item.id
                                  ? 'bg-white text-[#141413] shadow-xs'
                                  : 'text-[#575550] hover:text-[#141413]'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Numeric Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#575550] mb-1">
                            {isEn ? 'Restaurant Commission Rate (%)' : 'Restoran Komisyon Oranı (%)'}
                          </label>
                          <input
                            type="number"
                            min={COMMISSION_BOUNDS.pctMin}
                            max={COMMISSION_BOUNDS.pctMax}
                            step="0.5"
                            disabled={commMode === 'fixed'}
                            value={commPct}
                            onChange={(e) => setCommPct(e.target.value)}
                            className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm font-mono tabular-nums disabled:bg-[#FAF9F7] disabled:text-[#8A8780]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#575550] mb-1">
                            {isEn ? 'Fixed Order Commission (₺)' : 'Sabit Sipariş Komisyonu (₺)'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={COMMISSION_BOUNDS.fixedMax}
                            step="1"
                            disabled={commMode === 'percentage'}
                            value={commFixed}
                            onChange={(e) => setCommFixed(e.target.value)}
                            className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm font-mono tabular-nums disabled:bg-[#FAF9F7] disabled:text-[#8A8780]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#575550] mb-1">
                            {isEn ? 'Minimum Commission Floor (₺)' : 'Minimum Komisyon Tabanı (₺)'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={COMMISSION_BOUNDS.minCommissionMax}
                            step="1"
                            value={commMin}
                            onChange={(e) => setCommMin(e.target.value)}
                            className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm font-mono tabular-nums"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#575550] mb-1">
                            {isEn ? 'Customer Service Fee (₺)' : 'Müşteri Hizmet Bedeli (₺)'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={COMMISSION_BOUNDS.serviceFeeMax}
                            step="1"
                            value={custServiceFee}
                            onChange={(e) => setCustServiceFee(e.target.value)}
                            className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm font-mono tabular-nums"
                          />
                        </div>

                        <div className="sm:col-span-2 rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] px-3.5 py-2.5 text-xs text-[#575550]">
                          <strong className="text-[#141413]">
                            {isEn
                              ? 'Delivery Model: Restaurant Courier Only'
                              : 'Teslimat Modeli: Yalnızca Restoran Kuryesi'}
                          </strong>{' '}
                          —{' '}
                          {isEn
                            ? 'Platform courier dispatch is disabled; every order is delivered directly by the restaurant’s own courier.'
                            : 'Platform kurye hizmeti kapalıdır; her sipariş doğrudan ilgili restoranın kendi kuryesi tarafından teslim edilir.'}
                        </div>
                      </div>

                      {commErr && (
                        <p className="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          {commErr}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E6E4DF]">
                        <span className="text-[11px] text-[#575550]">
                          {commissionConfig.updatedByEmail
                            ? isEn
                              ? `Last updated by: ${commissionConfig.updatedByEmail}`
                              : `Son güncelleyen: ${commissionConfig.updatedByEmail}`
                            : isEn
                              ? 'Applied immediately to all new orders'
                              : 'Tüm yeni siparişlere anında uygulanır'}
                        </span>
                        <button
                          type="submit"
                          disabled={commSaving}
                          className="px-5 py-2.5 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {commSaving
                            ? isEn
                              ? 'Saving...'
                              : 'Kaydediliyor...'
                            : isEn
                              ? 'Save Commission Settings'
                              : 'Komisyon Ayarlarını Kaydet'}
                        </button>
                      </div>
                    </form>

                    {/* Live Interactive Simulator */}
                    <div className="lg:col-span-5 bg-white border border-[#E6E4DF] rounded-xl p-5 space-y-4">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[#575550]">
                          {isEn ? 'Live Calculation Simulator' : 'Canlı Hesaplama Simülatörü'}
                        </p>
                        <h4 className="font-display text-base font-semibold text-[#141413] mt-0.5">
                          {isEn ? 'Sample Order Breakdown' : 'Örnek Sipariş Dağılımı'}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#575550] mb-1">
                            {isEn ? 'Sample Basket (₺)' : 'Örnek Sepet (₺)'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100000}
                            value={simBasketTry}
                            onChange={(e) => setSimBasketTry(e.target.value)}
                            className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#575550] mb-1">
                            {isEn ? 'Delivery Fee (₺)' : 'Getirme Ücreti (₺)'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={1000}
                            value={simDeliveryTry}
                            onChange={(e) => setSimDeliveryTry(e.target.value)}
                            className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs font-mono tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] p-4 space-y-2.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#575550]">
                            {isEn ? 'Item Subtotal' : 'Ürün Sepeti'}
                          </span>
                          <span className="font-mono tabular-nums font-medium text-[#141413]">
                            {Math.round(Number(simBasketTry) || 0).toLocaleString(numberLocale)} ₺
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#575550]">
                            {isEn ? 'Customer Service Fee' : 'Müşteri Hizmet Bedeli'}
                          </span>
                          <span className="font-mono tabular-nums font-medium text-[#141413]">
                            +{simulatorBreakdown.serviceFeeTry.toLocaleString(numberLocale)} ₺
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#E6E4DF] font-semibold">
                          <span className="text-[#141413]">
                            {isEn ? 'Customer Total' : 'Müşteri Ödemesi'}
                          </span>
                          <span className="font-mono tabular-nums text-[#141413]">
                            {(
                              Math.max(0, Number(simBasketTry) || 0) +
                              Math.max(0, Number(simDeliveryTry) || 0) +
                              simulatorBreakdown.serviceFeeTry
                            ).toLocaleString(numberLocale)}{' '}
                            ₺
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#E6E4DF]">
                          <span className="text-[#575550]">
                            {isEn ? 'Restaurant Commission' : 'Restoran Komisyonu'} (
                            {formatCommissionPolicySummary(
                              draftCommissionConfig,
                              isEn ? 'en' : 'tr'
                            )})
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-[#D9043D]">
                            {simulatorBreakdown.commissionTry.toLocaleString(numberLocale)} ₺
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#575550]">
                            {isEn ? 'Restaurant Net Payout' : 'Restoran Net Hakedişi'}
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-[#16A34A]">
                            {simulatorBreakdown.restaurantNetTry.toLocaleString(numberLocale)} ₺
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#575550]">
                            {isEn ? 'Delivery Courier' : 'Teslimat Kuryesi'}
                          </span>
                          <span className="font-medium text-[#141413]">
                            {isEn ? 'Restaurant Courier' : 'Restoran Kuryesi'}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#E6E4DF] font-semibold">
                          <span className="text-[#141413]">
                            {isEn ? 'Total Platform Revenue' : 'Toplam Platform Geliri'}
                          </span>
                          <span className="font-mono tabular-nums text-[#D9043D]">
                            {simulatorBreakdown.totalPlatformRevenueTry.toLocaleString(numberLocale)}{' '}
                            ₺
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Per-Restaurant Commission Overrides */}
                  <div className="bg-white border border-[#E6E4DF] rounded-xl p-5 space-y-5">
                    <div>
                      <h3 className="font-display text-base font-semibold text-[#141413]">
                        {isEn
                          ? 'Per-Restaurant Commission Overrides'
                          : 'Restorana Özel Komisyon Anlaşmaları'}
                      </h3>
                      <p className="text-xs text-[#575550] mt-0.5">
                        {isEn
                          ? 'Define a custom commission rate for specific restaurants instead of the regional policy.'
                          : 'Belirli restoranlar için genel platform oranı yerine özel komisyon miktarı tanımlayın.'}
                      </p>
                    </div>

                    {overrideErr && (
                      <p className="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {overrideErr}
                      </p>
                    )}

                    <form
                      onSubmit={handleSaveRestaurantOverride}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-medium text-[#575550] mb-1">
                          {isEn ? 'Restaurant Name' : 'Restoran Adı'}
                        </label>
                        <input
                          type="text"
                          list="sofra-commission-restaurants"
                          value={overrideRestName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOverrideRestName(val);
                            const matched = restaurantCityLookup.get(
                              val.trim().toLocaleLowerCase('tr')
                            );
                            if (matched && (!isNonTurkeyScope || !isTurkeyCityId(matched))) {
                              setOverrideCityId(matched);
                            }
                          }}
                          placeholder={
                            isEn
                              ? 'Select or type restaurant name'
                              : 'Seçin veya restoran adı yazın'
                          }
                          maxLength={80}
                          required
                          className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs"
                        />
                        <datalist id="sofra-commission-restaurants">
                          {selectableRestaurantNames.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#575550] mb-1">
                          {isEn ? 'Country Region' : 'Ülke Bölgesi'}
                        </label>
                        <select
                          value={overrideCityId}
                          onChange={(e) =>
                            setOverrideCityId(
                              e.target.value as Exclude<CityId, 'all'>
                            )
                          }
                          aria-label={
                            isEn
                              ? 'Custom commission restaurant country'
                              : 'Özel komisyon restoran ülkesi'
                          }
                          className="w-full px-2.5 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                        >
                          <CountrySelectOptions
                            excludeTurkey={isNonTurkeyScope}
                            lang={isEn ? 'en' : 'tr'}
                          />
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#575550] mb-1">
                          {isEn ? 'Model' : 'Model'}
                        </label>
                        <select
                          value={overrideMode}
                          onChange={(e) =>
                            setOverrideMode(e.target.value as CommissionMode)
                          }
                          className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                        >
                          <option value="percentage">
                            {isEn ? 'Percentage (%)' : 'Yüzdelik (%)'}
                          </option>
                          <option value="fixed">
                            {isEn ? 'Fixed (₺)' : 'Sabit (₺)'}
                          </option>
                          <option value="hybrid">
                            {isEn ? 'Hybrid (% + ₺)' : 'Karma (% + ₺)'}
                          </option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#575550] mb-1">
                          {isEn ? 'Rate (%)' : 'Oran (%)'}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={COMMISSION_BOUNDS.pctMax}
                          step="0.5"
                          disabled={overrideMode === 'fixed'}
                          value={overridePct}
                          onChange={(e) => setOverridePct(e.target.value)}
                          className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs font-mono tabular-nums disabled:bg-[#FAF9F7]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#575550] mb-1">
                          {isEn ? 'Fixed (₺)' : 'Sabit (₺)'}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={COMMISSION_BOUNDS.fixedMax}
                          step="1"
                          disabled={overrideMode === 'percentage'}
                          value={overrideFixed}
                          onChange={(e) => setOverrideFixed(e.target.value)}
                          className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs font-mono tabular-nums disabled:bg-[#FAF9F7]"
                        />
                      </div>

                      <div className="sm:col-span-9">
                        <input
                          type="text"
                          value={overrideNote}
                          onChange={(e) => setOverrideNote(e.target.value)}
                          placeholder={
                            isEn
                              ? 'Agreement note (optional, e.g., Launch partner 12% rate)'
                              : 'Anlaşma notu (opsiyonel, örn: Lansman iş ortağı %12 anlaşması)'
                          }
                          maxLength={COMMISSION_BOUNDS.noteMax}
                          className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3 flex items-end">
                        <button
                          type="submit"
                          disabled={overrideSaving}
                          className="w-full px-4 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] disabled:opacity-60 cursor-pointer"
                        >
                          {overrideSaving
                            ? isEn
                              ? 'Saving...'
                              : 'Kaydediliyor...'
                            : isEn
                              ? 'Add Override'
                              : 'Tanım Ekle'}
                        </button>
                      </div>
                    </form>

                    {scopedOverrides.length > 0 ? (
                      <div className="overflow-x-auto border border-[#E6E4DF] rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Restaurant' : 'Restoran'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Commission' : 'Komisyon'}
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                {isEn ? 'Note' : 'Not'}
                              </th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                {isEn ? 'Action' : 'İşlem'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6E4DF]">
                            {scopedOverrides.map((ov) => (
                              <tr key={ov.id} className="hover:bg-[#FAF9F7]">
                                <td className="py-2.5 px-4 font-medium text-[#141413]">
                                  {ov.restaurantName}
                                </td>
                                <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-[#D9043D]">
                                  {formatCommissionPolicySummary(
                                    ov,
                                    isEn ? 'en' : 'tr'
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-[#575550]">
                                  {ov.note || '—'}
                                </td>
                                <td className="py-2.5 px-4 text-right whitespace-nowrap space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOverrideRestName(ov.restaurantName);
                                      if (
                                        ov.cityId &&
                                        (!isNonTurkeyScope ||
                                          !isTurkeyCityId(ov.cityId))
                                      ) {
                                        setOverrideCityId(ov.cityId);
                                      }
                                      setOverrideMode(ov.commissionMode);
                                      setOverridePct(
                                        String(ov.restaurantCommissionPct)
                                      );
                                      setOverrideFixed(
                                        String(ov.fixedCommissionTry)
                                      );
                                      setOverrideNote(ov.note || '');
                                    }}
                                    className="px-2.5 py-1 rounded-md border border-[#E6E4DF] text-[#141413] hover:border-[#D9043D] cursor-pointer"
                                  >
                                    {isEn ? 'Edit' : 'Düzenle'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleDeleteRestaurantOverride(ov)
                                    }
                                    className="px-2.5 py-1 rounded-md border border-[#E6E4DF] text-[#DC2626] hover:bg-red-50 cursor-pointer"
                                  >
                                    {isEn ? 'Remove' : 'Kaldır'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-[#575550]">
                        {isEn
                          ? 'No custom restaurant commission overrides configured yet; the regional standard policy applies.'
                          : 'Henüz restorana özel tanımlanmış farklı bir komisyon oranı yok; bölge standart politikası uygulanıyor.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {section === 'support' && (
                <div className="space-y-4">
                  <div className="bg-white border border-[#E6E4DF] rounded-xl px-5 py-3.5">
                    <h3 className="font-display text-base font-semibold text-[#141413]">
                      {isEn
                        ? 'Restaurant & Courier Live Support Desk'
                        : 'Restoran & Kurye Canlı Destek Masası'}
                    </h3>
                    <p className="text-xs text-[#575550] mt-0.5">
                      {isEn
                        ? isNonTurkeyScope
                          ? 'Reply in real time to restaurant and courier support messages for active orders across 196 non-Turkey countries.'
                          : 'Reply in real time to active order customer messages on restaurant or courier channels.'
                        : isNonTurkeyScope
                          ? 'Türkiye harici 196 ülkedeki aktif siparişlerin restoran ve kurye destek mesajlarını gerçek zamanlı yanıtlayın.'
                          : 'Aktif sipariş müşterilerinin restoran veya kurye kanalına gönderdiği mesajları gerçek zamanlı yanıtlayın.'}
                    </p>
                  </div>
                  <SupportStaffInbox
                    orders={scopedOrders}
                    enabled={isOpen && section === 'support'}
                    regionScope={adminScope}
                    compactHeightClass="h-[62vh] max-h-[540px]"
                  />
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
