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
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  Building2,
  CheckCircle2,
  ClipboardList,
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
  calculateOrderCommissionBreakdown,
  COMMISSION_BOUNDS,
  DEFAULT_COMMISSION_CONFIG,
  formatCommissionPolicySummary,
  normalizeRestaurantCommissionKey,
  sanitizeCommissionConfig,
} from '../utils/commission';
import { sanitizeText, VALIDATION_BOUNDS } from '../utils/validation';
import { CountrySelectOptions } from './CountrySelectOptions';
import { SupportStaffInbox } from './SupportStaffInbox';

interface AdminPanelModalProps {
  isOpen: boolean;
  orders: Order[];
  commissionConfig?: CommissionConfig;
  onCommissionConfigUpdated?: (next: CommissionConfig) => void;
  onClose: () => void;
  onAdvanceOrderStatus: (orderId: string) => void;
  onRefundOrder?: (order: Order) => Promise<void> | void;
}

type AdminSection =
  | 'overview'
  | 'members'
  | 'restaurants'
  | 'dishes'
  | 'orders_admins'
  | 'commission'
  | 'support';

const BOOTSTRAPPED_ADMIN_EMAIL = 'cafersellii@gmail.com';

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Sipariş Alındı',
  preparing: 'Hazırlanıyor',
  on_the_way: 'Kurye Yolda',
  delivered: 'Teslim Edildi',
};

function formatFirestoreDate(value: unknown): string {
  if (!value) return '—';
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString(
      'tr-TR',
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
      return parsed.toLocaleDateString('tr-TR', {
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
  onCommissionConfigUpdated,
  onClose,
  onAdvanceOrderStatus,
  onRefundOrder,
}: AdminPanelModalProps) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
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
  const [adminActionMsg, setAdminActionMsg] = useState('');
  const [adminActionErr, setAdminActionErr] = useState('');

  // Commission settings & overrides states
  const [commMode, setCommMode] = useState<CommissionMode>(
    commissionConfig.commissionMode
  );
  const [commPct, setCommPct] = useState(
    String(commissionConfig.restaurantCommissionPct)
  );
  const [commFixed, setCommFixed] = useState(
    String(commissionConfig.fixedCommissionTry)
  );
  const [commMin, setCommMin] = useState(
    String(commissionConfig.minCommissionTry)
  );
  const [custServiceFee, setCustServiceFee] = useState(
    String(commissionConfig.customerServiceFeeTry)
  );
  const [commSaving, setCommSaving] = useState(false);
  const [commErr, setCommErr] = useState('');
  const [simBasketTry, setSimBasketTry] = useState('500');
  const [simDeliveryTry, setSimDeliveryTry] = useState('0');

  const [restaurantOverrides, setRestaurantOverrides] = useState<
    RestaurantCommissionOverride[]
  >([]);
  const [overrideRestName, setOverrideRestName] = useState('');
  const [overrideMode, setOverrideMode] = useState<CommissionMode>('percentage');
  const [overridePct, setOverridePct] = useState('12');
  const [overrideFixed, setOverrideFixed] = useState('35');
  const [overrideNote, setOverrideNote] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideErr, setOverrideErr] = useState('');

  useEffect(() => {
    setCommMode(commissionConfig.commissionMode);
    setCommPct(String(commissionConfig.restaurantCommissionPct));
    setCommFixed(String(commissionConfig.fixedCommissionTry));
    setCommMin(String(commissionConfig.minCommissionTry));
    setCustServiceFee(String(commissionConfig.customerServiceFeeTry));
  }, [commissionConfig]);

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

  // Verify admin authorization
  useEffect(() => {
    let active = true;
    async function verifyAdmin() {
      if (!authReady || !user || !user.emailVerified) {
        if (active) {
          setIsAdminAuthorized(false);
          setCheckingRole(false);
        }
        return;
      }

      if (user.email === BOOTSTRAPPED_ADMIN_EMAIL) {
        if (active) {
          setIsAdminAuthorized(true);
          setCheckingRole(false);
        }
        return;
      }

      setCheckingRole(true);
      try {
        const snap = await getDoc(doc(db, 'admins', user.uid));
        if (active) {
          setIsAdminAuthorized(snap.exists());
        }
      } catch (error) {
        if (active) setIsAdminAuthorized(false);
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

  // Subscribe to all restaurants, dishes, and admin users once authorized
  useEffect(() => {
    if (!isOpen || !isAdminAuthorized || !user) return;

    setDataLoading(true);
    const unsubRest = onSnapshot(
      collection(db, 'restaurants'),
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

    const unsubDishes = onSnapshot(
      collection(db, 'dishes'),
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

    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
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
    if (user.email === BOOTSTRAPPED_ADMIN_EMAIL) {
      setMembersLoading(true);
      unsubMembers = onSnapshot(
        collection(db, 'users'),
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
    if (user.email === BOOTSTRAPPED_ADMIN_EMAIL) {
      unsubOverrides = onSnapshot(
        collection(db, 'restaurantCommissions'),
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
  }, [isOpen, isAdminAuthorized, user]);

  const isBootstrappedAdminUser = user?.email === BOOTSTRAPPED_ADMIN_EMAIL;

  const memberOrderStats = useMemo(() => {
    const map = new Map<string, { count: number; totalTry: number }>();
    for (const order of orders) {
      if (!order.ownerId) continue;
      const prev = map.get(order.ownerId) ?? { count: 0, totalTry: 0 };
      map.set(order.ownerId, {
        count: prev.count + 1,
        totalTry: prev.totalTry + order.totalTry,
      });
    }
    return map;
  }, [orders]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLocaleLowerCase('tr');
    return members.filter((m) => {
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
  }, [members, memberSearch, memberCityFilter]);

  const filteredRestaurants = useMemo(() => {
    const q = restSearch.trim().toLocaleLowerCase('tr');
    return restaurants.filter((r) => {
      if (restStatusFilter !== 'all' && r.status !== restStatusFilter) {
        return false;
      }
      if (q) {
        const text = `${r.name} ${r.cityName} ${r.district} ${r.cuisineCategory}`.toLocaleLowerCase('tr');
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [restaurants, restSearch, restStatusFilter]);

  const filteredDishes = useMemo(() => {
    const q = dishSearch.trim().toLocaleLowerCase('tr');
    return dishes.filter((d) => {
      if (dishCityFilter !== 'all' && d.cityId !== dishCityFilter) return false;
      if (q) {
        const text = `${d.name} ${d.restaurantName} ${d.cityName} ${d.category}`.toLocaleLowerCase('tr');
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [dishes, dishSearch, dishCityFilter]);

  const totalOrderVolumeTry = useMemo(
    () => orders.reduce((sum, o) => sum + o.totalTry, 0),
    [orders]
  );

  const totalPlatformCommissionTry = useMemo(
    () =>
      orders.reduce((sum, o) => {
        if (o.commissionTry !== undefined || o.serviceFeeTry !== undefined) {
          return sum + (o.commissionTry ?? 0) + (o.serviceFeeTry ?? 0);
        }
        const netFood = Math.max(0, o.subtotalTry - o.discountTry);
        const est = calculateOrderCommissionBreakdown({
          netSubtotalTry: netFood,
          deliveryFeeTry: o.deliveryFeeTry,
          config: commissionConfig,
        });
        return sum + est.commissionTry;
      }, 0),
    [orders, commissionConfig]
  );

  const selectableRestaurantNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of restaurants) names.add(r.name);
    for (const name of Object.keys(CURATED_RESTAURANT_META)) names.add(name);
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [restaurants]);

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
        setAuthError('Giriş penceresi kapatıldı.');
      } else {
        setAuthError('Oturum açılırken bir hata oluştu.');
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
        `"${rest.name}" durumu "${nextStatus === 'active' ? 'Yayında' : 'Duraklatıldı'}" olarak güncellendi.`
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
      setAdminActionMsg(`"${rest.name}" restoran kaydı silindi.`);
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
      setAdminActionMsg(`"${dish.name}" katalogdan silindi.`);
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
    const note = sanitizeText(newAdminNote || 'Platform Yöneticisi', 100);

    if (!VALIDATION_BOUNDS.idPattern.test(uid) || uid.length < 3) {
      setAdminActionErr('Geçerli bir Firebase Kullanıcı UID değeri girin.');
      return;
    }
    if (email.length < VALIDATION_BOUNDS.emailMin) {
      setAdminActionErr('Geçerli bir e-posta adresi girin.');
      return;
    }

    try {
      await setDoc(doc(db, 'admins', uid), {
        uid,
        email,
        note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewAdminUid('');
      setNewAdminEmail('');
      setNewAdminNote('');
      setAdminActionMsg(`${email} yönetici listesine eklendi.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `admins/${uid}`);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      await deleteDoc(doc(db, 'admins', adminId));
      setConfirmDeleteId(null);
      setAdminActionMsg('Yönetici yetkisi kaldırıldı.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admins/${adminId}`);
    }
  };

  const handleLookupMemberByUid = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberLookupError('');
    const uid = sanitizeText(memberLookupUid, 128);
    if (!VALIDATION_BOUNDS.idPattern.test(uid)) {
      setMemberLookupError('Geçerli bir kullanıcı UID girin.');
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        setMemberLookupError('Bu UID ile kayıtlı üye bulunamadı.');
        return;
      }
      const fetched = {
        ...(snap.data() as MemberProfile),
        ownerId: (snap.data() as MemberProfile).ownerId || snap.id,
      };
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
      user.email || BOOTSTRAPPED_ADMIN_EMAIL,
      VALIDATION_BOUNDS.emailMax
    );
    const safeUpdaterEmail =
      updaterEmail.length >= VALIDATION_BOUNDS.emailMin
        ? updaterEmail
        : BOOTSTRAPPED_ADMIN_EMAIL;

    setCommSaving(true);
    try {
      await setDoc(doc(db, 'platformSettings', 'commission'), {
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
      onCommissionConfigUpdated?.({
        ...sanitized,
        updatedByEmail: safeUpdaterEmail,
      });
      setAdminActionMsg(
        `Komisyon politikası güncellendi (${formatCommissionPolicySummary(sanitized)}).`
      );
    } catch (error) {
      setCommErr('Komisyon ayarları kaydedilirken bir hata oluştu.');
      handleFirestoreError(
        error,
        OperationType.WRITE,
        'platformSettings/commission'
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
      setOverrideErr('Lütfen geçerli bir restoran adı seçin veya yazın.');
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
        `"${cleanRestName}" için özel komisyon tanımı kaydedildi.`
      );
    } catch (error) {
      setOverrideErr('Restoran komisyon tanımı kaydedilemedi.');
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `restaurantCommissions/${restKey}`
      );
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleDeleteRestaurantOverride = async (override: RestaurantCommissionOverride) => {
    try {
      await deleteDoc(doc(db, 'restaurantCommissions', override.id));
      setRestaurantOverrides((prev) => prev.filter((o) => o.id !== override.id));
      setAdminActionMsg(
        `"${override.restaurantName}" özel komisyonu kaldırıldı; platform standardı geçerli.`
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `restaurantCommissions/${override.id}`
      );
    }
  };

  const sectionTitleMap: Record<AdminSection, string> = {
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
              Sofra Atlas
            </span>
            <span className="text-[#8A8780]">/</span>
            <h2
              id="admin-panel-title"
              className="font-medium text-[#575550] truncate"
            >
              Yönetici Paneli
            </h2>
            {isAdminAuthorized && (
              <>
                <span className="text-[#8A8780] hidden sm:inline">/</span>
                <span className="text-[#141413] font-medium hidden sm:inline whitespace-nowrap">
                  {sectionTitleMap[section]}
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
                  <span>Çıkış</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Yönetici panelini kapat"
              className="w-9 h-9 rounded-lg border border-[#E6E4DF] bg-white flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Auth & Access Gate */}
        {!authReady || checkingRole ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#575550]">
            Yönetici oturumu ve yetki düzeyi doğrulanıyor...
          </div>
        ) : !user ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white border border-[#E6E4DF] rounded-xl p-7 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-1.5">
                  Yetkili Girişi
                </p>
                <h3 className="font-display text-2xl font-semibold text-[#141413]">
                  Yönetici Paneli Oturumu
                </h3>
                <p className="text-sm text-[#575550] mt-2 leading-relaxed">
                  Kayıtlı restoranları onaylamak, menü öğelerini denetlemek ve
                  yönetici yetkilerini düzenlemek için yetkili Google hesabınızla giriş yapın.
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
                Google ile Yönetici Girişi Yap
              </button>
            </div>
          </div>
        ) : !isAdminAuthorized ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white border border-[#E6E4DF] rounded-xl p-7 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">
                Erişim Reddedildi
              </p>
              <h3 className="font-display text-xl font-semibold text-[#141413]">
                Bu hesap yönetici yetkisine sahip değil
              </h3>
              <p className="text-sm text-[#575550] leading-relaxed">
                Oturum açılan hesap (<span className="font-mono text-[#141413]">{user.email}</span>)
                yönetici listesinde bulunmuyor. Ana yönetici hesabıyla (<span className="font-mono text-[#141413]">{BOOTSTRAPPED_ADMIN_EMAIL}</span>) giriş yapın veya yetki tanımlaması isteyin.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-4 py-2.5 min-h-[40px] rounded-lg border border-[#E6E4DF] text-xs font-medium text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
                >
                  Oturumu Kapat
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] cursor-pointer"
                >
                  Kataloğa Dön
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
                <span>Genel Bakış</span>
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
                  <span>Üyeler</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {members.length}
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
                  <span>Restoranlar</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {restaurants.length}
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
                  <span>Menü Kataloğu</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {dishes.length}
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
                  <span>Siparişler & Yetkiler</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {orders.length}
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
                  <span>Komisyon & Ücretler</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {commissionConfig.commissionMode === 'fixed'
                    ? `${commissionConfig.fixedCommissionTry}₺`
                    : `%${commissionConfig.restaurantCommissionPct}`}
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
                <span>Canlı Destek</span>
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
                        Uygulama Üyeleri
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                        {members.length}
                      </p>
                      <p className="text-[11px] text-[#D9043D] mt-1 font-medium">
                        Üyeleri görüntüle →
                      </p>
                    </button>
                    <div className="p-5">
                      <p className="text-xs text-[#575550] mb-1">
                        Kayıtlı Üye Restoran
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                        {restaurants.length}
                      </p>
                      <p className="text-[11px] text-[#16A34A] mt-1 font-mono tabular-nums">
                        {restaurants.filter((r) => r.status === 'active').length} yayında
                      </p>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-[#575550] mb-1">
                        Üye Menü Tabakları
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                        {dishes.length}
                      </p>
                      <p className="text-[11px] text-[#575550] mt-1 font-mono tabular-nums">
                        +{DISHES.length} kürasyon tabak
                      </p>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-[#575550] mb-1">
                        Aktif Sipariş Kuyruğu
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                        {orders.filter((o) => o.status !== 'delivered').length}
                      </p>
                      <p className="text-[11px] text-[#575550] mt-1 font-mono tabular-nums">
                        Toplam {orders.length} sipariş
                      </p>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-[#575550] mb-1">
                        Sipariş Hacmi
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
                        {Math.round(totalOrderVolumeTry).toLocaleString('tr-TR')} ₺
                      </p>
                      <p className="text-[11px] text-[#575550] mt-1">
                        {CITY_HUBS.length} ülke · 6 kıta
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection('commission')}
                      className="p-5 text-left hover:bg-[#FAF9F7] transition-colors cursor-pointer"
                    >
                      <p className="text-xs text-[#575550] mb-1">
                        Komisyon Geliri
                      </p>
                      <p className="font-mono tabular-nums text-2xl font-semibold text-[#D9043D]">
                        {Math.round(totalPlatformCommissionTry).toLocaleString('tr-TR')} ₺
                      </p>
                      <p className="text-[11px] text-[#575550] mt-1 font-medium truncate">
                        {formatCommissionPolicySummary(commissionConfig)} →
                      </p>
                    </button>
                  </div>

                  {/* Global Delivery Network Breakdown Table */}
                  <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#E6E4DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-semibold text-[#141413]">
                          Küresel Teslimat Ağı & Ülke Operasyon Tablosu ({CITY_HUBS.length} Ülke)
                        </h3>
                        <p className="text-xs text-[#575550] mt-0.5">
                          Tüm kıtalardaki ülke merkezleri, yerel para birimleri ve teslimat eşikleri.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={hubSearch}
                          onChange={(e) => setHubSearch(e.target.value)}
                          placeholder="Ülke veya şehir ara..."
                          className="px-3 py-1.5 min-h-[34px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs"
                        />
                        <select
                          value={hubContinentFilter}
                          onChange={(e) =>
                            setHubContinentFilter(e.target.value as 'all' | ContinentId)
                          }
                          aria-label="Kıta filtresi"
                          className="px-3 py-1.5 min-h-[34px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                        >
                          <option value="all">Tüm Kıtalar ({CITY_HUBS.length})</option>
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
                            <th className="py-2.5 px-4 font-medium">Ülke</th>
                            <th className="py-2.5 px-4 font-medium">Merkez Şehir</th>
                            <th className="py-2.5 px-4 font-medium">Kıta</th>
                            <th className="py-2.5 px-4 font-medium text-right">
                              Üye Restoran
                            </th>
                            <th className="py-2.5 px-4 font-medium text-right">
                              Toplam Tabak
                            </th>
                            <th className="py-2.5 px-4 font-medium text-right">
                              Kur / Eşik
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E4DF]">
                          {CITY_HUBS.filter((hub) => {
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
                            const hubRestCount = restaurants.filter(
                              (r) => r.cityId === hub.id
                            ).length;
                            const hubDishCount =
                              dishes.filter((d) => d.cityId === hub.id).length +
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
                        Toplam Kayıtlı Üye
                      </p>
                      <p className="font-mono tabular-nums text-xl font-semibold text-[#141413] mt-0.5">
                        {members.length}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] text-[#575550]">
                        Listelenen Üye
                      </p>
                      <p className="font-mono tabular-nums text-xl font-semibold text-[#141413] mt-0.5">
                        {filteredMembers.length}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] text-[#575550]">
                        Telefonu Kayıtlı
                      </p>
                      <p className="font-mono tabular-nums text-xl font-semibold text-[#141413] mt-0.5">
                        {members.filter((m) => Boolean(m.phone?.trim())).length}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] text-[#575550]">
                        Adresi Kayıtlı
                      </p>
                      <p className="font-mono tabular-nums text-xl font-semibold text-[#141413] mt-0.5">
                        {
                          members.filter((m) =>
                            Boolean(m.defaultAddress?.trim())
                          ).length
                        }
                      </p>
                    </div>
                  </div>

                  {!isBootstrappedAdminUser && (
                    <div className="bg-white border border-[#E6E4DF] rounded-xl p-4 space-y-3">
                      <p className="text-xs text-[#575550]">
                        Tüm üyelerin toplu listelenmesi yalnızca ana yönetici (
                        <span className="font-mono text-[#141413]">
                          {BOOTSTRAPPED_ADMIN_EMAIL}
                        </span>
                        ) hesabına açıktır. Yardımcı yönetici olarak belirli bir
                        üyeyi UID ile sorgulayabilirsiniz:
                      </p>
                      <form
                        onSubmit={handleLookupMemberByUid}
                        className="flex flex-col sm:flex-row gap-2"
                      >
                        <input
                          type="text"
                          value={memberLookupUid}
                          onChange={(e) => setMemberLookupUid(e.target.value)}
                          placeholder="Firebase Kullanıcı UID"
                          className="flex-1 px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs font-mono"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] cursor-pointer"
                        >
                          Üyeyi Getir
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
                        placeholder="Ad soyad, e-posta, telefon, konum veya UID ara..."
                        className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                      />
                    </div>

                    <select
                      value={memberCityFilter}
                      onChange={(e) =>
                        setMemberCityFilter(e.target.value as CityId)
                      }
                      aria-label="Ülkeye göre üye filtrele"
                      className="px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                    >
                      <CountrySelectOptions
                        includeAllOption
                        allLabel={`Tüm Ülkeler (${CITY_HUBS.length})`}
                      />
                    </select>
                  </div>

                  <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
                    {membersLoading ? (
                      <div className="p-8 text-center text-xs text-[#575550]">
                        Uygulama üyeleri yükleniyor...
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="p-10 text-center space-y-2">
                        <p className="font-display text-base font-medium text-[#141413]">
                          Kayıtlı uygulama üyesi bulunamadı
                        </p>
                        <p className="text-xs text-[#575550]">
                          Google hesabı ile oturum açan ve profilini oluşturan
                          tüm kullanıcılar burada listelenir.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                              <th className="py-2.5 px-4 font-medium">Üye</th>
                              <th className="py-2.5 px-4 font-medium">
                                E-posta & Telefon
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                Varsayılan Teslimat Bölgesi
                              </th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                Sipariş
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                Kayıt / Güncelleme
                              </th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                Yetki
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
                              const isDelegatedAdmin = admins.some(
                                (a) => a.uid === member.ownerId
                              );
                              const initials = (
                                member.displayName ||
                                member.email ||
                                'Ü'
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
                                        {member.email || 'E-posta yok'}
                                      </span>
                                    </p>
                                    <p className="flex items-center gap-1.5 text-[#575550]">
                                      <Phone className="w-3 h-3 text-[#8A8780] shrink-0" />
                                      <span>
                                        {member.phone?.trim() ||
                                          'Telefon girilmedi'}
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
                                      {stats.count} sipariş
                                    </p>
                                    {stats.totalTry > 0 && (
                                      <p className="text-[11px] text-[#575550]">
                                        {Math.round(
                                          stats.totalTry
                                        ).toLocaleString('tr-TR')}{' '}
                                        ₺
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-[#575550] whitespace-nowrap">
                                    <p>
                                      {formatFirestoreDate(member.createdAt)}
                                    </p>
                                    <p className="text-[10px] text-[#8A8780]">
                                      Günc:{' '}
                                      {formatFirestoreDate(member.updatedAt)}
                                    </p>
                                  </td>
                                  <td className="py-3 px-4 text-right whitespace-nowrap">
                                    {isPrimaryAdmin ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#D9043D]/10 text-[#D9043D] text-[11px] font-medium">
                                        Ana Yönetici
                                      </span>
                                    ) : isDelegatedAdmin ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                                        Yönetici
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
                                            member.displayName || 'Yönetici'
                                          );
                                          setSection('orders_admins');
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E6E4DF] bg-white text-[#141413] hover:border-[#D9043D] hover:text-[#D9043D] cursor-pointer"
                                      >
                                        <UserPlus className="w-3 h-3" />
                                        <span>Yönetici Yap</span>
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
                        placeholder="Restoran, şehir veya mutfak ara..."
                        className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                      />
                    </div>

                    <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg self-start">
                      {(
                        [
                          { id: 'all', label: 'Tümü' },
                          { id: 'active', label: 'Yayında' },
                          { id: 'paused', label: 'Duraklatıldı' },
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
                          {inspectedContact.restaurantName} — Gizli İletişim Kaydı
                        </p>
                        {inspectedContact.contact ? (
                          <p className="text-[#575550]">
                            E-posta: {inspectedContact.contact.contactEmail} · Telefon:{' '}
                            {inspectedContact.contact.contactPhone} · Vergi No:{' '}
                            {inspectedContact.contact.taxId} · Adres:{' '}
                            {inspectedContact.contact.streetAddress}
                          </p>
                        ) : (
                          <p className="text-[#575550]">
                            İletişim kaydı bulunamadı.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectedContact(null)}
                        className="text-xs font-medium text-[#D9043D] hover:underline self-start sm:self-center cursor-pointer"
                      >
                        Kapat
                      </button>
                    </div>
                  )}

                  <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
                    {dataLoading ? (
                      <div className="p-8 text-center text-xs text-[#575550]">
                        Restoran kayıtları yükleniyor...
                      </div>
                    ) : filteredRestaurants.length === 0 ? (
                      <div className="p-10 text-center space-y-2">
                        <p className="font-display text-base font-medium text-[#141413]">
                          Kayıtlı üye restoran bulunamadı
                        </p>
                        <p className="text-xs text-[#575550]">
                          Restoran Üyeliği akışı üzerinden kayıt olan işletmeler burada listelenir.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                              <th className="py-2.5 px-4 font-medium">
                                Restoran
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                Konum
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                Kategori
                              </th>
                              <th className="py-2.5 px-4 font-medium">
                                Durum
                              </th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                İşlemler
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
                                        ? 'Yayında'
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
                                      İletişim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleRestaurantStatus(rest)
                                      }
                                      className="px-2.5 py-1.5 rounded-md border border-[#E6E4DF] bg-white text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
                                    >
                                      {rest.status === 'active'
                                        ? 'Duraklat'
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
                                        Silmeyi Onayla
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmDeleteId(`rest_${rest.id}`)
                                        }
                                        aria-label={`${rest.name} restoranını sil`}
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
                        placeholder="Tabak veya restoran ara..."
                        className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                      />
                    </div>

                    <select
                      value={dishCityFilter}
                      onChange={(e) =>
                        setDishCityFilter(e.target.value as CityId)
                      }
                      aria-label="Ülkeye göre tabak filtrele"
                      className="px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                    >
                      <CountrySelectOptions
                        includeAllOption
                        allLabel={`Tüm Ülkeler (${CITY_HUBS.length})`}
                      />
                    </select>
                  </div>

                  <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
                    {filteredDishes.length === 0 ? (
                      <div className="p-10 text-center space-y-1.5">
                        <p className="font-display text-base font-medium text-[#141413]">
                          Üye restoran tabağı bulunamadı
                        </p>
                        <p className="text-xs text-[#575550]">
                          Üye restoranların eklediği yemekler burada denetlenir ve yönetilir.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                              <th className="py-2.5 px-4 font-medium">Yemek</th>
                              <th className="py-2.5 px-4 font-medium">
                                Restoran
                              </th>
                              <th className="py-2.5 px-4 font-medium">Şehir</th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                Fiyat
                              </th>
                              <th className="py-2.5 px-4 font-medium">Durum</th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                İşlemler
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
                                    {dish.priceTry.toLocaleString('tr-TR')} ₺
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`font-medium ${
                                        dish.isPublished
                                          ? 'text-[#16A34A]'
                                          : 'text-[#D97706]'
                                      }`}
                                    >
                                      {dish.isPublished ? 'Yayında' : 'Gizli'}
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
                                      {dish.isPublished ? 'Gizle' : 'Yayınla'}
                                    </button>
                                    {confirming ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDish(dish)}
                                        className="px-2.5 py-1.5 rounded-md bg-[#DC2626] text-white font-medium cursor-pointer"
                                      >
                                        Silmeyi Onayla
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmDeleteId(`dish_${dish.id}`)
                                        }
                                        aria-label={`${dish.name} yemeğini sil`}
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
                        Sipariş Operasyon Kuyruğu
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                            <th className="py-2.5 px-4 font-medium">Sipariş</th>
                            <th className="py-2.5 px-4 font-medium">Müşteri</th>
                            <th className="py-2.5 px-4 font-medium">Ödeme</th>
                            <th className="py-2.5 px-4 font-medium text-right">
                              Tutar
                            </th>
                            <th className="py-2.5 px-4 font-medium">Durum</th>
                            <th className="py-2.5 px-4 font-medium text-right">
                              Aksiyon
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E4DF]">
                          {orders.map((order) => (
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
                                    ? 'İade Edildi'
                                    : order.paymentStatus === 'paid'
                                      ? 'Online Ödendi'
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
                                  {Math.round(order.totalTry).toLocaleString('tr-TR')} ₺
                                </p>
                                {order.commissionTry !== undefined && (
                                  <p className="text-[10px] text-[#D9043D]">
                                    Komisyon:{' '}
                                    {Math.round(order.commissionTry).toLocaleString('tr-TR')}{' '}
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
                                  {ORDER_STATUS_LABELS[order.status]}
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
                                      İade Et
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
                                    Aşama İlerlet
                                  </button>
                                ) : (
                                  <span className="text-[#575550]">
                                    Tamamlandı
                                  </span>
                                )}
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
                        Yönetici Erişim Yetkileri
                      </h3>
                      <p className="text-xs text-[#575550] mt-0.5">
                        Ana yönetici (<span className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</span>)
                        dışında yardımcı yönetici UID tanımlayabilirsiniz.
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
                        className="sm:col-span-4 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-xs font-mono"
                      />
                      <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="E-posta adresi"
                        required
                        className="sm:col-span-4 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-xs"
                      />
                      <input
                        type="text"
                        value={newAdminNote}
                        onChange={(e) => setNewAdminNote(e.target.value)}
                        placeholder="Rol notu (Örn: Operasyon)"
                        className="sm:col-span-2 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-xs"
                      />
                      <button
                        type="submit"
                        className="sm:col-span-2 min-h-[40px] px-4 py-2 rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] cursor-pointer"
                      >
                        Yetki Ekle
                      </button>
                    </form>

                    {admins.length > 0 && (
                      <div className="border-t border-[#E6E4DF] pt-4 space-y-2">
                        {admins.map((adm) => (
                          <div
                            key={adm.id}
                            className="flex items-center justify-between gap-3 text-xs py-1.5"
                          >
                            <div>
                              <span className="font-medium text-[#141413]">
                                {adm.email}
                              </span>
                              <span className="text-[#575550] ml-2">
                                · {adm.note} ({adm.uid})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAdmin(adm.id)}
                              className="text-[#DC2626] hover:underline cursor-pointer"
                            >
                              Kaldır
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                            Platform Komisyon & Ücret Politikası
                          </h3>
                          <p className="text-xs text-[#575550] mt-0.5">
                            Restoran komisyonu ve müşteri hizmet bedelini belirleyin. Teslimatlar yalnızca restoran kuryesiyle yapılır.
                          </p>
                        </div>
                        <span className="font-mono tabular-nums text-xs font-semibold text-[#D9043D] shrink-0">
                          {formatCommissionPolicySummary(draftCommissionConfig)}
                        </span>
                      </div>

                      {/* Quick Presets */}
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-medium text-[#575550]">
                          Hızlı Şablonlar
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              {
                                label: 'Standart (%15)',
                                mode: 'percentage' as CommissionMode,
                                pct: '15',
                                fixed: '0',
                                min: '0',
                                fee: '0',
                              },
                              {
                                label: 'Ekonomik (%10)',
                                mode: 'percentage' as CommissionMode,
                                pct: '10',
                                fixed: '0',
                                min: '0',
                                fee: '0',
                              },
                              {
                                label: 'Sabit (45 ₺)',
                                mode: 'fixed' as CommissionMode,
                                pct: '0',
                                fixed: '45',
                                min: '0',
                                fee: '0',
                              },
                              {
                                label: 'Karma (%12 + 15 ₺)',
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
                          Komisyon Hesaplama Modeli
                        </span>
                        <div className="grid grid-cols-3 gap-1 p-1 bg-[#EFECE6] rounded-lg">
                          {(
                            [
                              { id: 'percentage', label: 'Yüzdelik (%)' },
                              { id: 'fixed', label: 'Sabit Tutar (₺)' },
                              { id: 'hybrid', label: 'Karma (% + ₺)' },
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
                            Restoran Komisyon Oranı (%)
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
                            Sabit Sipariş Komisyonu (₺)
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
                            Minimum Komisyon Tabanı (₺)
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
                            Müşteri Hizmet Bedeli (₺)
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
                            Teslimat Modeli: Yalnızca Restoran Kuryesi
                          </strong>{' '}
                          — Platform kurye hizmeti kapalıdır; her sipariş doğrudan ilgili restoranın kendi kuryesi tarafından teslim edilir.
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
                            ? `Son güncelleyen: ${commissionConfig.updatedByEmail}`
                            : 'Tüm yeni siparişlere anında uygulanır'}
                        </span>
                        <button
                          type="submit"
                          disabled={commSaving}
                          className="px-5 py-2.5 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {commSaving
                            ? 'Kaydediliyor...'
                            : 'Komisyon Ayarlarını Kaydet'}
                        </button>
                      </div>
                    </form>

                    {/* Live Interactive Simulator */}
                    <div className="lg:col-span-5 bg-white border border-[#E6E4DF] rounded-xl p-5 space-y-4">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[#575550]">
                          Canlı Hesaplama Simülatörü
                        </p>
                        <h4 className="font-display text-base font-semibold text-[#141413] mt-0.5">
                          Örnek Sipariş Dağılımı
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#575550] mb-1">
                            Örnek Sepet (₺)
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
                            Getirme Ücreti (₺)
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
                          <span className="text-[#575550]">Ürün Sepeti</span>
                          <span className="font-mono tabular-nums font-medium text-[#141413]">
                            {Math.round(Number(simBasketTry) || 0).toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#575550]">
                            Müşteri Hizmet Bedeli
                          </span>
                          <span className="font-mono tabular-nums font-medium text-[#141413]">
                            +{simulatorBreakdown.serviceFeeTry.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#E6E4DF] font-semibold">
                          <span className="text-[#141413]">Müşteri Ödemesi</span>
                          <span className="font-mono tabular-nums text-[#141413]">
                            {(
                              Math.max(0, Number(simBasketTry) || 0) +
                              Math.max(0, Number(simDeliveryTry) || 0) +
                              simulatorBreakdown.serviceFeeTry
                            ).toLocaleString('tr-TR')}{' '}
                            ₺
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#E6E4DF]">
                          <span className="text-[#575550]">
                            Restoran Komisyonu (
                            {formatCommissionPolicySummary(draftCommissionConfig)})
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-[#D9043D]">
                            {simulatorBreakdown.commissionTry.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#575550]">
                            Restoran Net Hakedişi
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-[#16A34A]">
                            {simulatorBreakdown.restaurantNetTry.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#575550]">
                            Teslimat Kuryesi
                          </span>
                          <span className="font-medium text-[#141413]">
                            Restoran Kuryesi
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[#E6E4DF] font-semibold">
                          <span className="text-[#141413]">
                            Toplam Platform Geliri
                          </span>
                          <span className="font-mono tabular-nums text-[#D9043D]">
                            {simulatorBreakdown.totalPlatformRevenueTry.toLocaleString('tr-TR')}{' '}
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
                        Restorana Özel Komisyon Anlaşmaları
                      </h3>
                      <p className="text-xs text-[#575550] mt-0.5">
                        Belirli restoranlar için genel platform oranı yerine özel komisyon miktarı tanımlayın.
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
                          Restoran Adı
                        </label>
                        <input
                          type="text"
                          list="sofra-commission-restaurants"
                          value={overrideRestName}
                          onChange={(e) => setOverrideRestName(e.target.value)}
                          placeholder="Seçin veya restoran adı yazın"
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
                          Model
                        </label>
                        <select
                          value={overrideMode}
                          onChange={(e) =>
                            setOverrideMode(e.target.value as CommissionMode)
                          }
                          className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                        >
                          <option value="percentage">Yüzdelik (%)</option>
                          <option value="fixed">Sabit (₺)</option>
                          <option value="hybrid">Karma (% + ₺)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#575550] mb-1">
                          Oran (%)
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
                          Sabit (₺)
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

                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="submit"
                          disabled={overrideSaving}
                          className="w-full px-4 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] disabled:opacity-60 cursor-pointer"
                        >
                          {overrideSaving ? 'Kaydediliyor...' : 'Tanım Ekle'}
                        </button>
                      </div>

                      <div className="sm:col-span-12">
                        <input
                          type="text"
                          value={overrideNote}
                          onChange={(e) => setOverrideNote(e.target.value)}
                          placeholder="Anlaşma notu (opsiyonel, örn: Lansman iş ortağı %12 anlaşması)"
                          maxLength={COMMISSION_BOUNDS.noteMax}
                          className="w-full px-3 py-2 min-h-[36px] rounded-lg border border-[#E6E4DF] text-xs"
                        />
                      </div>
                    </form>

                    {restaurantOverrides.length > 0 ? (
                      <div className="overflow-x-auto border border-[#E6E4DF] rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                              <th className="py-2.5 px-4 font-medium">Restoran</th>
                              <th className="py-2.5 px-4 font-medium">Komisyon</th>
                              <th className="py-2.5 px-4 font-medium">Not</th>
                              <th className="py-2.5 px-4 font-medium text-right">
                                İşlem
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6E4DF]">
                            {restaurantOverrides.map((ov) => (
                              <tr key={ov.id} className="hover:bg-[#FAF9F7]">
                                <td className="py-2.5 px-4 font-medium text-[#141413]">
                                  {ov.restaurantName}
                                </td>
                                <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-[#D9043D]">
                                  {formatCommissionPolicySummary(ov)}
                                </td>
                                <td className="py-2.5 px-4 text-[#575550]">
                                  {ov.note || '—'}
                                </td>
                                <td className="py-2.5 px-4 text-right whitespace-nowrap space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOverrideRestName(ov.restaurantName);
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
                                    Düzenle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleDeleteRestaurantOverride(ov)
                                    }
                                    className="px-2.5 py-1 rounded-md border border-[#E6E4DF] text-[#DC2626] hover:bg-red-50 cursor-pointer"
                                  >
                                    Kaldır
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-[#575550]">
                        Henüz restorana özel tanımlanmış farklı bir komisyon oranı yok; tüm restoranlar için genel politika uygulanıyor.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {section === 'support' && (
                <div className="space-y-4">
                  <div className="bg-white border border-[#E6E4DF] rounded-xl px-5 py-3.5">
                    <h3 className="font-display text-base font-semibold text-[#141413]">
                      Restoran & Kurye Canlı Destek Masası
                    </h3>
                    <p className="text-xs text-[#575550] mt-0.5">
                      Aktif sipariş müşterilerinin restoran veya kurye kanalına gönderdiği mesajları gerçek zamanlı yanıtlayın.
                    </p>
                  </div>
                  <SupportStaffInbox
                    orders={orders}
                    enabled={isOpen && section === 'support'}
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
