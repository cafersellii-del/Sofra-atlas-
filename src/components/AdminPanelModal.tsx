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
  Bike,
  Building2,
  CheckCircle2,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { CITY_HUBS, CONTINENTS, DISHES } from '../data/catalog';
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
  ContinentId,
  CourierPrivateContact,
  CourierProfile,
  MemberProfile,
  Order,
  OrderStatus,
  PartnerDishRecord,
  RestaurantPrivateContact,
  RestaurantProfile,
} from '../types/food';
import { sanitizeText, VALIDATION_BOUNDS } from '../utils/validation';
import { CountrySelectOptions } from './CountrySelectOptions';
import { SupportStaffInbox } from './SupportStaffInbox';

interface AdminPanelModalProps {
  isOpen: boolean;
  orders: Order[];
  onClose: () => void;
  onAdvanceOrderStatus: (orderId: string) => void;
  onRefundOrder?: (order: Order) => Promise<void> | void;
}

type AdminSection =
  | 'overview'
  | 'members'
  | 'restaurants'
  | 'couriers'
  | 'dishes'
  | 'orders_admins'
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
  const [couriers, setCouriers] = useState<CourierProfile[]>([]);
  const [courierSearch, setCourierSearch] = useState('');
  const [inspectedCourierContact, setInspectedCourierContact] = useState<{
    courierName: string;
    contact: CourierPrivateContact | null;
  } | null>(null);
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

    let unsubCouriers: (() => void) | undefined;
    if (user.email === BOOTSTRAPPED_ADMIN_EMAIL) {
      unsubCouriers = onSnapshot(
        collection(db, 'couriers'),
        (snap) => {
          setCouriers(
            snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<CourierProfile, 'id'>),
            }))
          );
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'couriers');
        }
      );
    }

    return () => {
      unsubRest();
      unsubDishes();
      unsubAdmins();
      if (unsubMembers) unsubMembers();
      if (unsubCouriers) unsubCouriers();
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

  const filteredCouriers = useMemo(() => {
    const q = courierSearch.trim().toLocaleLowerCase('tr');
    if (!q) return couriers;
    return couriers.filter((c) => {
      const text =
        `${c.fullName} ${c.cityName} ${c.district} ${c.plateOrBagCode} ${c.vehicleType}`.toLocaleLowerCase(
          'tr'
        );
      return text.includes(q);
    });
  }, [couriers, courierSearch]);

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

  const handleInspectCourierContact = async (courier: CourierProfile) => {
    const path = `couriers/${courier.id}/private/contact`;
    try {
      const snap = await getDoc(
        doc(db, 'couriers', courier.id, 'private', 'contact')
      );
      setInspectedCourierContact({
        courierName: courier.fullName,
        contact: snap.exists() ? (snap.data() as CourierPrivateContact) : null,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  };

  const sectionTitleMap: Record<AdminSection, string> = {
    overview: 'Genel Bakış',
    members: 'Uygulama Üyeleri',
    restaurants: 'Restoranlar',
    couriers: 'Kurye İş Ortakları',
    dishes: 'Menü Kataloğu',
    orders_admins: 'Siparişler & Yetkiler',
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
                onClick={() => setSection('couriers')}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  section === 'couriers'
                    ? 'bg-[#D9043D] text-white'
                    : 'text-[#575550] hover:bg-[#FAF9F7] hover:text-[#141413]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Bike className="w-4 h-4 shrink-0" />
                  <span>Kuryeler</span>
                </span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">
                  {couriers.length}
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
                  {/* Single-elevation 5-column KPI bar */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 bg-white border border-[#E6E4DF] rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-[#E6E4DF]">
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

              {section === 'couriers' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative sm:w-80">
                      <Search className="w-4 h-4 text-[#575550] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={courierSearch}
                        onChange={(e) => setCourierSearch(e.target.value)}
                        placeholder="Kurye adı, şehir, ilçe veya plaka ara..."
                        className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs"
                      />
                    </div>
                    <p className="text-xs text-[#575550] font-mono tabular-nums">
                      Çevrimiçi:{' '}
                      {couriers.filter((c) => c.availability === 'online').length} ·
                      Teslimatta:{' '}
                      {couriers.filter((c) => c.availability === 'busy').length}
                    </p>
                  </div>

                  {inspectedCourierContact && (
                    <div className="bg-white border border-[#D9043D]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-[#141413]">
                          {inspectedCourierContact.courierName} — Kurye Gizli İletişim Kaydı
                        </p>
                        {inspectedCourierContact.contact ? (
                          <p className="text-[#575550]">
                            E-posta: {inspectedCourierContact.contact.contactEmail} · Telefon:{' '}
                            {inspectedCourierContact.contact.contactPhone} · Ehliyet/Vergi No:{' '}
                            {inspectedCourierContact.contact.licenseOrTaxId}
                          </p>
                        ) : (
                          <p className="text-[#575550]">İletişim kaydı bulunamadı.</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectedCourierContact(null)}
                        className="text-xs font-medium text-[#D9043D] hover:underline self-start sm:self-center cursor-pointer"
                      >
                        Kapat
                      </button>
                    </div>
                  )}

                  <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
                    {filteredCouriers.length === 0 ? (
                      <div className="p-10 text-center space-y-2">
                        <p className="font-display text-base font-medium text-[#141413]">
                          Kayıtlı kurye iş ortağı bulunamadı
                        </p>
                        <p className="text-xs text-[#575550]">
                          &ldquo;Restoran &amp; Kurye Ortağı&rdquo; portalından yeni kurye başvurusu yapıldığında burada listelenir.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                              <th className="py-3 px-4 font-medium">Kurye</th>
                              <th className="py-3 px-4 font-medium">Bölge</th>
                              <th className="py-3 px-4 font-medium">Araç / Kod</th>
                              <th className="py-3 px-4 font-medium">Vardiya</th>
                              <th className="py-3 px-4 font-medium text-right">
                                Teslimat
                              </th>
                              <th className="py-3 px-4 font-medium text-right">
                                İletişim
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6E4DF]">
                            {filteredCouriers.map((courier) => (
                              <tr key={courier.id} className="hover:bg-[#FAF9F7]">
                                <td className="py-3 px-4 font-medium text-[#141413]">
                                  {courier.fullName}
                                </td>
                                <td className="py-3 px-4 text-[#575550]">
                                  {courier.cityName} · {courier.district}
                                </td>
                                <td className="py-3 px-4 font-mono text-[#141413]">
                                  {courier.vehicleType} · {courier.plateOrBagCode}
                                </td>
                                <td className="py-3 px-4 text-[#141413]">
                                  {courier.availability === 'online'
                                    ? 'Çevrimiçi'
                                    : courier.availability === 'busy'
                                      ? 'Teslimatta'
                                      : 'Çevrimdışı'}
                                </td>
                                <td className="py-3 px-4 text-right font-mono tabular-nums text-[#141413]">
                                  {courier.completedDeliveries}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleInspectCourierContact(courier)
                                    }
                                    className="px-2.5 py-1.5 rounded-md border border-[#E6E4DF] text-[11px] font-medium text-[#141413] hover:border-[#D9043D] cursor-pointer"
                                  >
                                    İletişimi Gör
                                  </button>
                                </td>
                              </tr>
                            ))}
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
                                {Math.round(order.totalTry).toLocaleString('tr-TR')} ₺
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
