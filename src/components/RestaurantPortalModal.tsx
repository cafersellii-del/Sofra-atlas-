import { useEffect, useState } from 'react';
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
  Bike,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  LogOut,
  MessageSquare,
  Plus,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import {
  CITY_HUBS,
  CUISINE_CATEGORIES,
  DISH_IMAGE_PRESETS,
  resolveImagePreset,
} from '../data/catalog';
import {
  getDistrictsForProvince,
  getProvincesForCountry,
} from '../data/locations';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type {
  CityId,
  CommissionConfig,
  CuisineCategory,
  Order,
  PartnerDishRecord,
  RestaurantCommissionOverride,
  RestaurantPrivateContact,
  RestaurantProfile,
} from '../types/food';
import {
  calculateOrderCommissionBreakdown,
  DEFAULT_COMMISSION_CONFIG,
  formatCommissionPolicySummary,
  normalizeRestaurantCommissionKey,
} from '../utils/commission';
import { CountrySelectOptions } from './CountrySelectOptions';
import { CourierWorkspace } from './CourierWorkspace';
import { SupportStaffInbox } from './SupportStaffInbox';
import {
  parseIngredients,
  sanitizeText,
  VALIDATION_BOUNDS,
} from '../utils/validation';
import { DishImage } from './DishImage';

interface RestaurantPortalModalProps {
  isOpen: boolean;
  orders?: Order[];
  initialRole?: 'restaurant' | 'courier';
  commissionConfig?: CommissionConfig;
  onClose: () => void;
  onOpenExtensionStudio: () => void;
  onAdvanceOrderStatus?: (orderId: string) => void;
  onAcceptOrderCourier?: (
    orderId: string,
    courierId: string,
    courierName: string
  ) => void;
  onPickupOrderCourier?: (orderId: string) => void;
  onDeliverOrderCourier?: (orderId: string) => void;
  onOpenCourierChat?: (order: Order) => void;
}

const PARTNER_CATEGORIES = CUISINE_CATEGORIES.filter(
  (c): c is Exclude<CuisineCategory, 'Tümü'> => c !== 'Tümü'
);

export function RestaurantPortalModal({
  isOpen,
  orders = [],
  initialRole = 'restaurant',
  commissionConfig = DEFAULT_COMMISSION_CONFIG,
  onClose,
  onOpenExtensionStudio,
  onAdvanceOrderStatus,
  onAcceptOrderCourier,
  onPickupOrderCourier,
  onDeliverOrderCourier,
  onOpenCourierChat,
}: RestaurantPortalModalProps) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [partnerRole, setPartnerRole] = useState<'restaurant' | 'courier'>(
    initialRole
  );
  const [orderScope, setOrderScope] = useState<'mine' | 'all'>('mine');

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [restaurantOverride, setRestaurantOverride] =
    useState<RestaurantCommissionOverride | null>(null);
  const [privateContact, setPrivateContact] =
    useState<RestaurantPrivateContact | null>(null);
  const [myDishes, setMyDishes] = useState<PartnerDishRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'menu' | 'orders' | 'profile' | 'support'
  >('menu');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Registration / Profile edit form states
  const [regName, setRegName] = useState('');
  const [regCityId, setRegCityId] =
    useState<Exclude<CityId, 'all'>>('istanbul');
  const [regProvince, setRegProvince] = useState('İstanbul');
  const [regDistrict, setRegDistrict] = useState('Karaköy');
  const [regCategory, setRegCategory] = useState<
    Exclude<CuisineCategory, 'Tümü'>
  >('Anadolu & Akdeniz');
  const [regPrepMinutes, setRegPrepMinutes] = useState('20–30 dk');
  const [regTagline, setRegTagline] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regTaxId, setRegTaxId] = useState('');

  // Add dish form states
  const [showAddDish, setShowAddDish] = useState(false);
  const [dishName, setDishName] = useState('');
  const [dishCategory, setDishCategory] = useState<
    Exclude<CuisineCategory, 'Tümü'>
  >('Anadolu & Akdeniz');
  const [dishPriceTry, setDishPriceTry] = useState('420');
  const [dishPrep, setDishPrep] = useState('20–25 dk');
  const [dishCalories, setDishCalories] = useState('650');
  const [dishDescription, setDishDescription] = useState('');
  const [dishStory, setDishStory] = useState('');
  const [dishIngredientsRaw, setDishIngredientsRaw] = useState('');
  const [dishImagePreset, setDishImagePreset] = useState('kebab');
  const [dishIsVeg, setDishIsVeg] = useState(false);
  const [dishIsSpicy, setDishIsSpicy] = useState(false);
  const [dishIsSig, setDishIsSig] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser?.email) {
        setRegEmail((prev) => prev || nextUser.email || '');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setPartnerRole(initialRole);
  }, [isOpen, initialRole]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Subscribe to owner's restaurant profile, private contact, and dishes
  useEffect(() => {
    if (!authReady || !user) {
      setRestaurant(null);
      setPrivateContact(null);
      setMyDishes([]);
      return;
    }

    setDataLoading(true);
    const restPath = `restaurants/${user.uid}`;
    const contactPath = `restaurants/${user.uid}/private/contact`;

    const unsubRest = onSnapshot(
      doc(db, 'restaurants', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Omit<RestaurantProfile, 'id'>;
          const profile: RestaurantProfile = { id: snap.id, ...data };
          setRestaurant(profile);
          setRegName(profile.name);
          setRegCityId(profile.cityId);
          setRegProvince(profile.cityName || 'İstanbul');
          setRegDistrict(profile.district);
          setRegCategory(profile.cuisineCategory);
          setRegPrepMinutes(profile.avgPrepMinutes);
          setRegTagline(profile.tagline);
          setDishCategory(profile.cuisineCategory);
        } else {
          setRestaurant(null);
        }
        setDataLoading(false);
      },
      (error) => {
        setDataLoading(false);
        handleFirestoreError(error, OperationType.GET, restPath);
      }
    );

    const unsubContact = onSnapshot(
      doc(db, 'restaurants', user.uid, 'private', 'contact'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as RestaurantPrivateContact;
          setPrivateContact(data);
          setRegEmail(data.contactEmail);
          setRegPhone(data.contactPhone);
          setRegAddress(data.streetAddress);
          setRegTaxId(data.taxId);
        } else {
          setPrivateContact(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, contactPath);
      }
    );

    const dishesQuery = query(
      collection(db, 'dishes'),
      where('ownerId', '==', user.uid)
    );
    const unsubDishes = onSnapshot(
      dishesQuery,
      (snap) => {
        const list: PartnerDishRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PartnerDishRecord, 'id'>),
        }));
        setMyDishes(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'dishes');
      }
    );

    return () => {
      unsubRest();
      unsubContact();
      unsubDishes();
    };
  }, [authReady, user]);

  // Fetch per-restaurant commission override if configured
  useEffect(() => {
    let active = true;
    if (!isOpen || !restaurant?.name) {
      setRestaurantOverride(null);
      return;
    }

    const key = normalizeRestaurantCommissionKey(restaurant.name);
    const overridePath = `restaurantCommissions/${key}`;
    getDoc(doc(db, 'restaurantCommissions', key))
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          setRestaurantOverride({
            id: snap.id,
            ...(snap.data() as Omit<RestaurantCommissionOverride, 'id'>),
          });
        } else {
          setRestaurantOverride(null);
        }
      })
      .catch((error) => {
        if (active) setRestaurantOverride(null);
        handleFirestoreError(error, OperationType.GET, overridePath);
      });

    return () => {
      active = false;
    };
  }, [isOpen, restaurant?.name]);

  if (!isOpen) return null;

  const selectedCityHub =
    CITY_HUBS.find((c) => c.id === regCityId) ?? CITY_HUBS[0];
  const provinceOptions = getProvincesForCountry(regCityId);
  const districtOptions = getDistrictsForProvince(regCityId, regProvince);
  const effectiveProvinceOptions = provinceOptions.some(
    (p) => p.name === regProvince
  )
    ? provinceOptions
    : [
        {
          name: regProvince,
          center: selectedCityHub.center,
          districts: districtOptions,
        },
        ...provinceOptions,
      ];
  const effectiveDistrictOptions = districtOptions.includes(regDistrict)
    ? districtOptions
    : [regDistrict, ...districtOptions].filter(Boolean);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('Giriş penceresi kapatıldı. Devam etmek için tekrar deneyin.');
      } else if (msg.includes('popup-blocked')) {
        setAuthError(
          'Tarayıcı açılır pencereyi engelledi. Lütfen açılır pencerelere izin verip tekrar deneyin.'
        );
      } else {
        setAuthError('Google ile oturum açılırken bir hata oluştu.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setFeedbackMessage('');
    setFormError('');
  };

  const handleRegisterRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError('');
    setFeedbackMessage('');

    const name = sanitizeText(regName, VALIDATION_BOUNDS.nameMax);
    const provinceRaw = sanitizeText(
      regProvince,
      VALIDATION_BOUNDS.cityNameMax
    );
    const cityName =
      provinceRaw.length >= 2 ? provinceRaw : selectedCityHub.name;
    const district = sanitizeText(regDistrict, VALIDATION_BOUNDS.districtMax);
    const avgPrepMinutes = sanitizeText(
      regPrepMinutes,
      VALIDATION_BOUNDS.prepMax
    );
    const tagline = sanitizeText(regTagline, VALIDATION_BOUNDS.taglineMax);
    const contactEmail = sanitizeText(regEmail, VALIDATION_BOUNDS.emailMax);
    const contactPhone = sanitizeText(regPhone, VALIDATION_BOUNDS.phoneMax);
    const streetAddress = sanitizeText(
      regAddress,
      VALIDATION_BOUNDS.addressMax
    );
    const taxId = sanitizeText(regTaxId, VALIDATION_BOUNDS.taxIdMax);

    if (name.length < VALIDATION_BOUNDS.nameMin) {
      setFormError('Restoran adı en az 2 karakter olmalıdır.');
      return;
    }
    if (district.length < VALIDATION_BOUNDS.districtMin) {
      setFormError('Lütfen geçerli bir ilçe veya semt seçin.');
      return;
    }
    if (tagline.length < VALIDATION_BOUNDS.taglineMin) {
      setFormError('Kısa tanıtım metni en az 4 karakter olmalıdır.');
      return;
    }
    if (
      contactEmail.length < VALIDATION_BOUNDS.emailMin ||
      contactPhone.length < VALIDATION_BOUNDS.phoneMin ||
      streetAddress.length < VALIDATION_BOUNDS.addressMin ||
      taxId.length < VALIDATION_BOUNDS.taxIdMin
    ) {
      setFormError(
        'Lütfen iletişim e-posta, telefon, açık adres ve vergi/işletme no alanlarını eksiksiz doldurun.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const restRef = doc(db, 'restaurants', user.uid);
      const contactRef = doc(db, 'restaurants', user.uid, 'private', 'contact');

      batch.set(restRef, {
        ownerId: user.uid,
        name,
        cityId: selectedCityHub.id,
        cityName,
        district,
        cuisineCategory: regCategory,
        avgPrepMinutes,
        tagline,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(contactRef, {
        ownerId: user.uid,
        contactEmail,
        contactPhone,
        streetAddress,
        taxId,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      setFeedbackMessage(
        'Restoran üyeliğiniz oluşturuldu. Artık menünüze tabak ekleyebilirsiniz.'
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `restaurants/${user.uid}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !restaurant) return;
    setFormError('');
    setFeedbackMessage('');

    const name = sanitizeText(regName, VALIDATION_BOUNDS.nameMax);
    const provinceRaw = sanitizeText(
      regProvince,
      VALIDATION_BOUNDS.cityNameMax
    );
    const cityName =
      provinceRaw.length >= 2 ? provinceRaw : selectedCityHub.name;
    const district = sanitizeText(regDistrict, VALIDATION_BOUNDS.districtMax);
    const avgPrepMinutes = sanitizeText(
      regPrepMinutes,
      VALIDATION_BOUNDS.prepMax
    );
    const tagline = sanitizeText(regTagline, VALIDATION_BOUNDS.taglineMax);
    const contactEmail = sanitizeText(regEmail, VALIDATION_BOUNDS.emailMax);
    const contactPhone = sanitizeText(regPhone, VALIDATION_BOUNDS.phoneMax);
    const streetAddress = sanitizeText(
      regAddress,
      VALIDATION_BOUNDS.addressMax
    );
    const taxId = sanitizeText(regTaxId, VALIDATION_BOUNDS.taxIdMax);

    if (
      name.length < VALIDATION_BOUNDS.nameMin ||
      district.length < VALIDATION_BOUNDS.districtMin ||
      tagline.length < VALIDATION_BOUNDS.taglineMin ||
      contactEmail.length < VALIDATION_BOUNDS.emailMin ||
      contactPhone.length < VALIDATION_BOUNDS.phoneMin ||
      streetAddress.length < VALIDATION_BOUNDS.addressMin ||
      taxId.length < VALIDATION_BOUNDS.taxIdMin
    ) {
      setFormError('Lütfen tüm restoran ve iletişim alanlarını geçerli uzunlukta doldurun.');
      return;
    }

    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'restaurants', user.uid), {
        name,
        cityId: selectedCityHub.id,
        cityName,
        district,
        cuisineCategory: regCategory,
        avgPrepMinutes,
        tagline,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'restaurants', user.uid, 'private', 'contact'), {
        contactEmail,
        contactPhone,
        streetAddress,
        taxId,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setFeedbackMessage('Restoran profili ve iletişim bilgileri güncellendi.');
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `restaurants/${user.uid}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRestaurantStatus = async () => {
    if (!user || !restaurant) return;
    const nextStatus = restaurant.status === 'active' ? 'paused' : 'active';
    try {
      await updateDoc(doc(db, 'restaurants', user.uid), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `restaurants/${user.uid}`
      );
    }
  };

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !restaurant) return;
    setFormError('');
    setFeedbackMessage('');

    const name = sanitizeText(dishName, VALIDATION_BOUNDS.dishNameMax);
    const description = sanitizeText(
      dishDescription,
      VALIDATION_BOUNDS.dishDescMax
    );
    const story = sanitizeText(
      dishStory || dishDescription,
      VALIDATION_BOUNDS.dishStoryMax
    );
    const prepMinutes = sanitizeText(dishPrep, VALIDATION_BOUNDS.prepMax);
    const ingredients = parseIngredients(dishIngredientsRaw);
    const priceTry = Number(dishPriceTry);
    const calories = Number(dishCalories);

    if (name.length < VALIDATION_BOUNDS.dishNameMin) {
      setFormError('Yemek adı en az 2 karakter olmalıdır.');
      return;
    }
    if (description.length < VALIDATION_BOUNDS.dishDescMin) {
      setFormError('Açıklama en az 10 karakter olmalıdır.');
      return;
    }
    if (story.length < VALIDATION_BOUNDS.dishStoryMin) {
      setFormError('Mutfak hikâyesi en az 10 karakter olmalıdır.');
      return;
    }
    if (ingredients.length === 0) {
      setFormError('Virgülle ayırarak en az 1 temel malzeme girin.');
      return;
    }
    if (
      Number.isNaN(priceTry) ||
      priceTry < VALIDATION_BOUNDS.priceMin ||
      priceTry > VALIDATION_BOUNDS.priceMax
    ) {
      setFormError('Fiyat 50 ₺ ile 25.000 ₺ arasında olmalıdır.');
      return;
    }
    if (
      Number.isNaN(calories) ||
      calories < VALIDATION_BOUNDS.caloriesMin ||
      calories > VALIDATION_BOUNDS.caloriesMax
    ) {
      setFormError('Kalori 50 ile 5000 kcal arasında olmalıdır.');
      return;
    }

    const newDishId = `dish_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    setSubmitting(true);
    try {
      await setDoc(doc(db, 'dishes', newDishId), {
        ownerId: user.uid,
        restaurantId: user.uid,
        restaurantName: restaurant.name,
        cityId: restaurant.cityId,
        cityName: restaurant.cityName,
        district: restaurant.district,
        name,
        category: dishCategory,
        description,
        story,
        ingredients,
        priceTry,
        prepMinutes,
        calories,
        isVegetarian: dishIsVeg,
        isSpicy: dishIsSpicy,
        isChefSignature: dishIsSig,
        imagePreset: dishImagePreset,
        isPublished: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setDishName('');
      setDishDescription('');
      setDishStory('');
      setDishIngredientsRaw('');
      setShowAddDish(false);
      setFeedbackMessage(
        `"${name}" menüye eklendi ve küresel katalogda yayına alındı.`
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `dishes/${newDishId}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDishPublish = async (dish: PartnerDishRecord) => {
    try {
      await updateDoc(doc(db, 'dishes', dish.id), {
        isPublished: !dish.isPublished,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `dishes/${dish.id}`
      );
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    try {
      await deleteDoc(doc(db, 'dishes', dishId));
      setFeedbackMessage('Tabak menünüzden kaldırıldı.');
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `dishes/${dishId}`
      );
    }
  };

  const pendingCourierCount = orders.filter(
    (o) =>
      o.status !== 'delivered' &&
      !o.courierId &&
      (!o.courierStatus || o.courierStatus === 'waiting_courier')
  ).length;

  const restaurantMatchedOrders = restaurant
    ? orders.filter((o) =>
        o.items.some(
          (it) =>
            it.restaurantName.toLocaleLowerCase('tr') ===
            restaurant.name.toLocaleLowerCase('tr')
        )
      )
    : [];
  const visibleKitchenOrders =
    orderScope === 'mine' && restaurantMatchedOrders.length > 0
      ? restaurantMatchedOrders
      : orders;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="restaurant-portal-title"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-[#E6E4DF] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-[#E6E4DF] px-6 py-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {partnerRole === 'courier' ? (
                <Bike className="w-5 h-5 text-[#D9043D] shrink-0" />
              ) : (
                <Store className="w-5 h-5 text-[#D9043D] shrink-0" />
              )}
              <div className="min-w-0">
                <h2
                  id="restaurant-portal-title"
                  className="font-display text-lg font-semibold text-[#141413] truncate"
                >
                  Restoran & Kurye İş Ortağı Portalı
                </h2>
                <p className="text-xs text-[#575550] truncate">
                  {user
                    ? `${user.displayName ?? user.email} oturumu açık`
                    : 'Restoran mutfağınızı yönetin veya kurye olarak anlık sipariş kabul edin'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {user && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs font-medium text-[#575550] hover:text-[#141413] hover:bg-[#FAF9F7] cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Çıkış</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="İş ortağı panelini kapat"
                className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Partner Role Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="İş ortağı rolü"
              className="inline-flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg"
            >
              <button
                type="button"
                role="tab"
                aria-selected={partnerRole === 'restaurant'}
                onClick={() => {
                  setPartnerRole('restaurant');
                  setFormError('');
                  setFeedbackMessage('');
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  partnerRole === 'restaurant'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#575550] hover:text-[#141413]'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-[#D9043D]" />
                <span>Restoran İş Ortağı</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={partnerRole === 'courier'}
                onClick={() => {
                  setPartnerRole('courier');
                  setFormError('');
                  setFeedbackMessage('');
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  partnerRole === 'courier'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#575550] hover:text-[#141413]'
                }`}
              >
                <Bike className="w-3.5 h-3.5 text-[#D9043D]" />
                <span>Kurye İş Ortağı & Sipariş Kabulü</span>
                {pendingCourierCount > 0 && (
                  <span className="font-mono tabular-nums text-[11px] font-semibold text-[#D9043D]">
                    ({pendingCourierCount})
                  </span>
                )}
              </button>
            </div>

            <span className="text-[11px] text-[#575550] hidden sm:inline">
              {partnerRole === 'courier'
                ? 'Açık sipariş kuyruğu · Kabul / Teslimat Akışı'
                : 'Menü yönetimi · Gelen mutfak siparişleri'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {partnerRole === 'courier' ? (
            <CourierWorkspace
              isOpen={isOpen && partnerRole === 'courier'}
              user={user}
              authReady={authReady}
              orders={orders}
              commissionConfig={commissionConfig}
              onAcceptOrderLocal={(orderId, courierId, courierName) =>
                onAcceptOrderCourier?.(orderId, courierId, courierName)
              }
              onPickupOrderLocal={(orderId) =>
                onPickupOrderCourier?.(orderId)
              }
              onDeliverOrderLocal={(orderId) =>
                onDeliverOrderCourier?.(orderId)
              }
              onOpenCourierChat={onOpenCourierChat}
            />
          ) : !authReady || dataLoading ? (
            <div className="py-12 text-center text-sm text-[#575550]">
              Restoran hesap bilgileri yükleniyor...
            </div>
          ) : !user ? (
            /* Step 1: Google Sign-In Onboarding */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-7 space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#575550]">
                  Üye Restoran Programı
                </p>
                <h3
                  className="font-display text-2xl font-semibold text-[#141413] leading-snug"
                  style={{ textWrap: 'balance' }}
                >
                  Restoranınızı 6 kıtada 196 ülkeden binlerce gurme kullanıcıyla buluşturun.
                </h3>
                <p className="text-sm text-[#575550] leading-relaxed">
                  Google hesabınızla saniyeler içinde restoran üyeliği oluşturun,
                  işletme profilinizi doğrulayın ve imza yemeklerinizi doğrudan
                  Sofra Atlas menüsünde yayınlayın.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E6E4DF]">
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#D9043D] mb-1">
                      01. Hızlı Kayıt
                    </p>
                    <p className="text-xs text-[#575550]">
                      Tek adımlı işletme profili ve anında menü yayını
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#D9043D] mb-1">
                      02. Canlı Menü
                    </p>
                    <p className="text-xs text-[#575550]">
                      Fiyat, stok ve tabak detaylarını dilediğiniz an güncelleyin
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#D9043D] mb-1">
                      03. Güvenli Veri
                    </p>
                    <p className="text-xs text-[#575550]">
                      İletişim ve vergi bilgileriniz izole alanda saklanır
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#FAF9F7] border border-[#E6E4DF] rounded-xl p-6 space-y-4">
                <h4 className="font-display text-lg font-semibold text-[#141413]">
                  Restoran Oturumu Aç
                </h4>
                <p className="text-xs text-[#575550] leading-relaxed">
                  Yeni restoran başvurusu yapmak veya mevcut üye restoran menünüzü
                  yönetmek için Google hesabınızla devam edin.
                </p>

                {authError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {authError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  className="w-full min-h-[44px] px-4 py-3 rounded-lg bg-[#D9043D] text-white text-sm font-medium hover:bg-[#B80032] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {authLoading
                    ? 'Bağlantı kuruluyor...'
                    : 'Google ile Restoran Başvurusu / Giriş'}
                </button>
              </div>
            </div>
          ) : !restaurant ? (
            /* Step 2: Restaurant Membership Registration Form */
            <form onSubmit={handleRegisterRestaurant} className="space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-1">
                  Adım 2 / 2 · İşletme Profili
                </p>
                <h3 className="font-display text-xl font-semibold text-[#141413]">
                  Restoran Üyelik Başvurusu
                </h3>
                <p className="text-sm text-[#575550] mt-1">
                  Kamuya açık vitrin bilgilerinizi ve size özel iletişim kayıtlarınızı doldurun.
                </p>
              </div>

              {formError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#575550] mb-1.5">
                    Restoran Adı
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Örn: Galata Taş Fırın"
                    maxLength={VALIDATION_BOUNDS.nameMax}
                    required
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#575550] mb-1.5">
                    Ana Mutfak Kategorisi
                  </label>
                  <select
                    value={regCategory}
                    onChange={(e) =>
                      setRegCategory(
                        e.target.value as Exclude<CuisineCategory, 'Tümü'>
                      )
                    }
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                  >
                    {PARTNER_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#575550] mb-1.5">
                      Ülke
                    </label>
                    <select
                      value={regCityId}
                      onChange={(e) => {
                        const nextId = e.target.value as Exclude<CityId, 'all'>;
                        const nextProvs = getProvincesForCountry(nextId);
                        const firstProv = nextProvs[0]?.name ?? 'Merkez';
                        const nextDists = getDistrictsForProvince(
                          nextId,
                          firstProv
                        );
                        setRegCityId(nextId);
                        setRegProvince(firstProv);
                        setRegDistrict(nextDists[0] ?? 'Merkez');
                      }}
                      className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                    >
                      <CountrySelectOptions />
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#575550] mb-1.5">
                      İl / Şehir
                    </label>
                    <select
                      value={regProvince}
                      onChange={(e) => {
                        const nextProv = e.target.value;
                        const nextDists = getDistrictsForProvince(
                          regCityId,
                          nextProv
                        );
                        setRegProvince(nextProv);
                        setRegDistrict(nextDists[0] ?? 'Merkez');
                      }}
                      className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                    >
                      {effectiveProvinceOptions.map((prov) => (
                        <option key={prov.name} value={prov.name}>
                          {prov.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#575550] mb-1.5">
                      İlçe / Semt
                    </label>
                    <select
                      value={regDistrict}
                      onChange={(e) => setRegDistrict(e.target.value)}
                      className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                    >
                      {effectiveDistrictOptions.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#575550] mb-1.5">
                    Ortalama Hazırlık & Teslimat Süresi
                  </label>
                  <input
                    type="text"
                    value={regPrepMinutes}
                    onChange={(e) => setRegPrepMinutes(e.target.value)}
                    placeholder="Örn: 20–30 dk"
                    maxLength={VALIDATION_BOUNDS.prepMax}
                    required
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#575550] mb-1.5">
                    Vergi / İşletme Sicil No
                  </label>
                  <input
                    type="text"
                    value={regTaxId}
                    onChange={(e) => setRegTaxId(e.target.value)}
                    placeholder="Örn: 1234567890"
                    maxLength={VALIDATION_BOUNDS.taxIdMax}
                    required
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#575550] mb-1.5">
                    Kısa Mutfak Tanıtımı
                  </label>
                  <input
                    type="text"
                    value={regTagline}
                    onChange={(e) => setRegTagline(e.target.value)}
                    placeholder="Örn: Meşe odununda 48 saat mayalı ekşi maya ve yöresel malzemeler."
                    maxLength={VALIDATION_BOUNDS.taglineMax}
                    required
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                  />
                </div>
              </div>

              {/* Isolated Private Contact Section */}
              <div className="pt-5 border-t border-[#E6E4DF] space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-[#141413]">
                    Özel İletişim & Adres Bilgileri (Yalnızca Size Görünür)
                  </h4>
                  <p className="text-xs text-[#575550]">
                    Bu bilgiler müşterilere gösterilmez; güvenlik kurallarıyla izole alanda saklanır.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#575550] mb-1.5">
                      Yetkili E-posta
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      maxLength={VALIDATION_BOUNDS.emailMax}
                      required
                      className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#575550] mb-1.5">
                      İşletme Telefonu
                    </label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+90 212 000 00 00"
                      maxLength={VALIDATION_BOUNDS.phoneMax}
                      required
                      className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#575550] mb-1.5">
                      Mutfak Teslim Alma Adresi
                    </label>
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Cadde, sokak, kapı no ve kat bilgisi..."
                      maxLength={VALIDATION_BOUNDS.addressMax}
                      required
                      className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 min-h-[44px] rounded-lg bg-[#D9043D] text-white text-sm font-medium hover:bg-[#B80032] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {submitting
                    ? 'Üyelik kaydediliyor...'
                    : 'Restoran Üyeliğini Tamamla'}
                </button>
              </div>
            </form>
          ) : (
            /* Step 3: Registered Partner Restaurant Management Dashboard */
            <div className="space-y-6">
              {/* Restaurant summary strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E6E4DF]">
                <div>
                  <p className="text-xs text-[#575550]">
                    {restaurant.cityName} · {restaurant.district} ·{' '}
                    {restaurant.cuisineCategory}
                  </p>
                  <h3 className="font-display text-2xl font-semibold text-[#141413] mt-0.5">
                    {restaurant.name}
                  </h3>
                  <p className="text-xs text-[#575550] mt-1">
                    {restaurant.tagline}
                  </p>
                  <p className="text-[11px] font-mono tabular-nums text-[#D9043D] mt-1.5">
                    Aktif Komisyon:{' '}
                    {formatCommissionPolicySummary(
                      restaurantOverride ?? commissionConfig
                    )}{' '}
                    {restaurantOverride ? '(Özel Anlaşma)' : '(Platform Standardı)'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenExtensionStudio();
                    }}
                    className="px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-medium text-[#141413] hover:border-[#D9043D] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Web Uzantısı & Gömme Kodu
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleRestaurantStatus}
                    className={`px-3.5 py-2 min-h-[40px] rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      restaurant.status === 'active'
                        ? 'bg-[#FAF9F7] border-[#D9043D] text-[#D9043D]'
                        : 'bg-[#FAF9F7] border-[#E6E4DF] text-[#575550]'
                    }`}
                  >
                    {restaurant.status === 'active'
                      ? 'Durum: Yayında (Aktif)'
                      : 'Durum: Duraklatıldı'}
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EFECE6] rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('menu');
                      setFormError('');
                    }}
                    className={`px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === 'menu'
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#575550] hover:text-[#141413]'
                    }`}
                  >
                    Menüdeki Tabaklar ({myDishes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('orders');
                      setFormError('');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === 'orders'
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#575550] hover:text-[#141413]'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-[#D9043D]" />
                    <span>
                      Gelen Siparişler ({orders.filter((o) => o.status !== 'delivered').length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profile');
                      setFormError('');
                    }}
                    className={`px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === 'profile'
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#575550] hover:text-[#141413]'
                    }`}
                  >
                    Restoran Bilgileri
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('support');
                      setFormError('');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === 'support'
                        ? 'bg-white text-[#D9043D] shadow-xs'
                        : 'text-[#575550] hover:text-[#141413]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Canlı Destek</span>
                  </button>
                </div>

                {activeTab === 'menu' && (
                  <button
                    type="button"
                    onClick={() => setShowAddDish((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{showAddDish ? 'Formu Gizle' : 'Yeni Tabak Ekle'}</span>
                  </button>
                )}
              </div>

              {feedbackMessage && (
                <div className="flex items-center gap-2 text-xs text-[#D9043D] bg-[#FAF9F7] border border-[#D9043D]/30 rounded-lg px-3.5 py-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{feedbackMessage}</span>
                </div>
              )}

              {formError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                  {formError}
                </p>
              )}

              {activeTab === 'menu' ? (
                <div className="space-y-6">
                  {showAddDish && (
                    <form
                      onSubmit={handleAddDish}
                      className="bg-[#FAF9F7] border border-[#E6E4DF] rounded-xl p-5 space-y-4"
                    >
                      <h4 className="font-display text-base font-semibold text-[#141413]">
                        Kataloğa Yeni Yemek Ekle
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#575550] mb-1">
                            Yemek Adı
                          </label>
                          <input
                            type="text"
                            value={dishName}
                            onChange={(e) => setDishName(e.target.value)}
                            placeholder="Örn: Trüflü Mantarlı Risotto"
                            maxLength={VALIDATION_BOUNDS.dishNameMax}
                            required
                            className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#575550] mb-1">
                            Mutfak Kategorisi
                          </label>
                          <select
                            value={dishCategory}
                            onChange={(e) =>
                              setDishCategory(
                                e.target.value as Exclude<
                                  CuisineCategory,
                                  'Tümü'
                                >
                              )
                            }
                            className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                          >
                            {PARTNER_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-xs font-medium text-[#575550] mb-1">
                              Fiyat (₺)
                            </label>
                            <input
                              type="number"
                              min={VALIDATION_BOUNDS.priceMin}
                              max={VALIDATION_BOUNDS.priceMax}
                              value={dishPriceTry}
                              onChange={(e) => setDishPriceTry(e.target.value)}
                              required
                              className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm font-mono tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#575550] mb-1">
                              Kalori
                            </label>
                            <input
                              type="number"
                              min={VALIDATION_BOUNDS.caloriesMin}
                              max={VALIDATION_BOUNDS.caloriesMax}
                              value={dishCalories}
                              onChange={(e) => setDishCalories(e.target.value)}
                              required
                              className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm font-mono tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#575550] mb-1">
                              Süre
                            </label>
                            <input
                              type="text"
                              value={dishPrep}
                              onChange={(e) => setDishPrep(e.target.value)}
                              maxLength={VALIDATION_BOUNDS.prepMax}
                              required
                              className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#575550] mb-1">
                            Sunum Görseli Şablonu
                          </label>
                          <select
                            value={dishImagePreset}
                            onChange={(e) => setDishImagePreset(e.target.value)}
                            className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                          >
                            {DISH_IMAGE_PRESETS.map((preset) => (
                              <option key={preset.id} value={preset.id}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-[#575550] mb-1">
                            Kısa Açıklama (10–240 karakter)
                          </label>
                          <input
                            type="text"
                            value={dishDescription}
                            onChange={(e) => setDishDescription(e.target.value)}
                            placeholder="Örn: Arborio pirinci, porçini mantarı, 24 aylık parmesan ve taze kekik ile."
                            maxLength={VALIDATION_BOUNDS.dishDescMax}
                            required
                            className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-[#575550] mb-1">
                            Mutfak Hikâyesi & Paketleme Notu (10–400 karakter)
                          </label>
                          <input
                            type="text"
                            value={dishStory}
                            onChange={(e) => setDishStory(e.target.value)}
                            placeholder="Örn: Sipariş anında kemik suyunda pişirilir ve ısı korumalı porselen benzeri kapta gönderilir."
                            maxLength={VALIDATION_BOUNDS.dishStoryMax}
                            required
                            className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-[#575550] mb-1">
                            Temel Malzemeler (Virgülle ayırın, en fazla 10)
                          </label>
                          <input
                            type="text"
                            value={dishIngredientsRaw}
                            onChange={(e) =>
                              setDishIngredientsRaw(e.target.value)
                            }
                            placeholder="Örn: Arborio pirinci, Porçini mantarı, Parmesan, Tereyağı"
                            required
                            className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                          />
                        </div>

                        <div className="sm:col-span-2 flex flex-wrap gap-5 pt-1">
                          <label className="inline-flex items-center gap-2 text-xs text-[#141413] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dishIsVeg}
                              onChange={(e) => setDishIsVeg(e.target.checked)}
                              className="w-4 h-4 accent-[#D9043D]"
                            />
                            Vejetaryen
                          </label>
                          <label className="inline-flex items-center gap-2 text-xs text-[#141413] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dishIsSpicy}
                              onChange={(e) => setDishIsSpicy(e.target.checked)}
                              className="w-4 h-4 accent-[#D9043D]"
                            />
                            Baharatlı
                          </label>
                          <label className="inline-flex items-center gap-2 text-xs text-[#141413] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dishIsSig}
                              onChange={(e) => setDishIsSig(e.target.checked)}
                              className="w-4 h-4 accent-[#D9043D]"
                            />
                            Şefin İmza Tabağı
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddDish(false)}
                          className="px-4 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-medium text-[#575550] cursor-pointer"
                        >
                          İptal
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-5 py-2 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] disabled:opacity-60 cursor-pointer"
                        >
                          {submitting ? 'Kaydediliyor...' : 'Yemeği Yayınla'}
                        </button>
                      </div>
                    </form>
                  )}

                  {myDishes.length === 0 ? (
                    <div className="border border-dashed border-[#E6E4DF] rounded-xl py-10 px-6 text-center">
                      <p className="font-display text-base font-medium text-[#141413] mb-1">
                        Henüz menünüze tabak eklemediniz
                      </p>
                      <p className="text-xs text-[#575550] mb-4">
                        Yukarıdaki &ldquo;Yeni Tabak Ekle&rdquo; düğmesiyle ilk yemeğinizi ekleyin; anında ana katalogda görüntülensin.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E6E4DF] border border-[#E6E4DF] rounded-xl overflow-hidden">
                      {myDishes.map((dish) => (
                        <div
                          key={dish.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-20 h-16 rounded-lg overflow-hidden bg-[#EFECE6] shrink-0">
                              <DishImage
                                src={resolveImagePreset(dish.imagePreset)}
                                alt={dish.name}
                                title={dish.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] text-[#575550]">
                                {dish.category} · {dish.prepMinutes} ·{' '}
                                {dish.isPublished ? 'Yayında' : 'Gizli'}
                              </p>
                              <h5 className="font-display text-base font-semibold text-[#141413] truncate">
                                {dish.name}
                              </h5>
                              <p className="font-mono tabular-nums text-xs font-medium text-[#141413]">
                                {dish.priceTry.toLocaleString('tr-TR')} ₺
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleDishPublish(dish)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs font-medium text-[#141413] hover:bg-[#FAF9F7] cursor-pointer whitespace-nowrap"
                            >
                              {dish.isPublished ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Gizle</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Yayınla</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDish(dish.id)}
                              aria-label={`${dish.name} yemeğini sil`}
                              className="inline-flex items-center gap-1 px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'orders' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-display text-base font-semibold text-[#141413]">
                        Mutfak Sipariş Onay & Kurye Durumu
                      </h4>
                      <p className="text-xs text-[#575550]">
                        Yeni siparişleri mutfakta hazırlamaya alın; kurye kabul durumunu anlık izleyin.
                      </p>
                    </div>
                    {restaurantMatchedOrders.length > 0 && (
                      <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg">
                        <button
                          type="button"
                          onClick={() => setOrderScope('mine')}
                          className={`px-3 py-1 min-h-[32px] text-xs font-medium rounded-md cursor-pointer ${
                            orderScope === 'mine'
                              ? 'bg-white text-[#141413]'
                              : 'text-[#575550]'
                          }`}
                        >
                          Bu Restoran ({restaurantMatchedOrders.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderScope('all')}
                          className={`px-3 py-1 min-h-[32px] text-xs font-medium rounded-md cursor-pointer ${
                            orderScope === 'all'
                              ? 'bg-white text-[#141413]'
                              : 'text-[#575550]'
                          }`}
                        >
                          Tüm Ağ ({orders.length})
                        </button>
                      </div>
                    )}
                  </div>

                  {visibleKitchenOrders.length === 0 ? (
                    <div className="border border-dashed border-[#E6E4DF] rounded-xl py-10 px-6 text-center text-xs text-[#575550]">
                      Henüz aktif sipariş bulunmuyor.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 bg-[#FAF9F7] border border-[#E6E4DF] rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[#E6E4DF]">
                        {(() => {
                          let grossSum = 0;
                          let commissionSum = 0;
                          let netSum = 0;
                          for (const ord of visibleKitchenOrders) {
                            const netFood = Math.max(
                              0,
                              ord.subtotalTry - ord.discountTry
                            );
                            const calc = calculateOrderCommissionBreakdown({
                              netSubtotalTry: netFood,
                              deliveryFeeTry: ord.deliveryFeeTry,
                              config: commissionConfig,
                              override: restaurantOverride,
                            });
                            const ordComm =
                              ord.commissionTry ?? calc.commissionTry;
                            const ordNet =
                              ord.restaurantNetTry ??
                              Math.max(0, netFood - ordComm);
                            grossSum += netFood;
                            commissionSum += ordComm;
                            netSum += ordNet;
                          }
                          return (
                            <>
                              <div className="p-3.5">
                                <p className="text-[11px] text-[#575550]">
                                  Brüt Yemek Tutarı
                                </p>
                                <p className="font-mono tabular-nums text-base font-semibold text-[#141413] mt-0.5">
                                  {Math.round(grossSum).toLocaleString('tr-TR')} ₺
                                </p>
                              </div>
                              <div className="p-3.5">
                                <p className="text-[11px] text-[#575550]">
                                  Platform Komisyonu (
                                  {formatCommissionPolicySummary(
                                    restaurantOverride ?? commissionConfig
                                  )}
                                  )
                                </p>
                                <p className="font-mono tabular-nums text-base font-semibold text-[#D9043D] mt-0.5">
                                  -{Math.round(commissionSum).toLocaleString('tr-TR')} ₺
                                </p>
                              </div>
                              <div className="p-3.5">
                                <p className="text-[11px] text-[#575550]">
                                  Net Mutfak Hakedişi
                                </p>
                                <p className="font-mono tabular-nums text-base font-semibold text-[#16A34A] mt-0.5">
                                  {Math.round(netSum).toLocaleString('tr-TR')} ₺
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <div className="divide-y divide-[#E6E4DF] border border-[#E6E4DF] rounded-xl overflow-hidden bg-white">
                        {visibleKitchenOrders.map((order) => {
                          const statusLabel =
                            order.status === 'received'
                              ? 'Onay Bekliyor'
                              : order.status === 'preparing'
                                ? 'Mutfakta Hazırlanıyor'
                                : order.status === 'on_the_way'
                                  ? 'Kuryede / Yolda'
                                  : 'Teslim Edildi';
                          const netFood = Math.max(
                            0,
                            order.subtotalTry - order.discountTry
                          );
                          const calc = calculateOrderCommissionBreakdown({
                            netSubtotalTry: netFood,
                            deliveryFeeTry: order.deliveryFeeTry,
                            config: commissionConfig,
                            override: restaurantOverride,
                          });
                          const ordCommission =
                            order.commissionTry ?? calc.commissionTry;
                          const ordNet =
                            order.restaurantNetTry ??
                            Math.max(0, netFood - ordCommission);

                          return (
                            <div
                              key={order.id}
                              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-mono tabular-nums font-semibold text-[#D9043D]">
                                    #{order.id}
                                  </span>
                                  <span className="text-[#8A8780]">·</span>
                                  <span className="font-medium text-[#141413]">
                                    {order.cityName} · {order.neighborhood}
                                  </span>
                                  <span className="text-[#8A8780]">·</span>
                                  <span className="text-[#575550]">
                                    {statusLabel}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-[#141413] truncate">
                                  {order.items
                                    .map((it) => `${it.quantity}× ${it.dishName}`)
                                    .join(', ')}
                                </p>
                                <p className="text-xs text-[#575550] flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-[#D9043D]" />
                                  <span>
                                    Kurye: {order.courierName || 'Kurye Bekleniyor'} ·{' '}
                                    {order.estimatedArrival}
                                  </span>
                                </p>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <span className="font-mono tabular-nums text-sm font-semibold text-[#141413] block">
                                    {Math.round(order.totalTry).toLocaleString('tr-TR')} ₺
                                  </span>
                                  <span className="font-mono tabular-nums text-[11px] text-[#575550] block">
                                    Komisyon: -{Math.round(ordCommission).toLocaleString('tr-TR')} ₺ · Net:{' '}
                                    <strong className="text-[#16A34A]">
                                      {Math.round(ordNet).toLocaleString('tr-TR')} ₺
                                    </strong>
                                  </span>
                                </div>
                                {order.status === 'received' && onAdvanceOrderStatus && (
                                  <button
                                    type="button"
                                    onClick={() => onAdvanceOrderStatus(order.id)}
                                    className="px-3.5 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    Mutfağa Al / Hazırla
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : activeTab === 'support' ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#575550]">
                    Müşterilerden gelen sipariş sorularını mutfak veya kurye rolüyle anlık yanıtlayın.
                  </p>
                  <SupportStaffInbox
                    orders={orders}
                    enabled={isOpen && activeTab === 'support'}
                    compactHeightClass="h-[460px]"
                  />
                </div>
              ) : (
                /* Tab 2: Edit Restaurant Profile & Private Contact */
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#575550] mb-1">
                        Restoran Adı
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        maxLength={VALIDATION_BOUNDS.nameMax}
                        required
                        className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#575550] mb-1">
                        Ana Mutfak Kategorisi
                      </label>
                      <select
                        value={regCategory}
                        onChange={(e) =>
                          setRegCategory(
                            e.target.value as Exclude<CuisineCategory, 'Tümü'>
                          )
                        }
                        className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                      >
                        {PARTNER_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#575550] mb-1">
                          Ülke
                        </label>
                        <select
                          value={regCityId}
                          onChange={(e) => {
                            const nextId = e.target.value as Exclude<
                              CityId,
                              'all'
                            >;
                            const nextProvs = getProvincesForCountry(nextId);
                            const firstProv = nextProvs[0]?.name ?? 'Merkez';
                            const nextDists = getDistrictsForProvince(
                              nextId,
                              firstProv
                            );
                            setRegCityId(nextId);
                            setRegProvince(firstProv);
                            setRegDistrict(nextDists[0] ?? 'Merkez');
                          }}
                          className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                        >
                          <CountrySelectOptions />
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#575550] mb-1">
                          İl / Şehir
                        </label>
                        <select
                          value={regProvince}
                          onChange={(e) => {
                            const nextProv = e.target.value;
                            const nextDists = getDistrictsForProvince(
                              regCityId,
                              nextProv
                            );
                            setRegProvince(nextProv);
                            setRegDistrict(nextDists[0] ?? 'Merkez');
                          }}
                          className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                        >
                          {effectiveProvinceOptions.map((prov) => (
                            <option key={prov.name} value={prov.name}>
                              {prov.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#575550] mb-1">
                          İlçe / Semt
                        </label>
                        <select
                          value={regDistrict}
                          onChange={(e) => setRegDistrict(e.target.value)}
                          className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                        >
                          {effectiveDistrictOptions.map((dist) => (
                            <option key={dist} value={dist}>
                              {dist}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#575550] mb-1">
                        Ortalama Hazırlık Süresi
                      </label>
                      <input
                        type="text"
                        value={regPrepMinutes}
                        onChange={(e) => setRegPrepMinutes(e.target.value)}
                        maxLength={VALIDATION_BOUNDS.prepMax}
                        required
                        className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#575550] mb-1">
                        Kısa Tanıtım
                      </label>
                      <input
                        type="text"
                        value={regTagline}
                        onChange={(e) => setRegTagline(e.target.value)}
                        maxLength={VALIDATION_BOUNDS.taglineMax}
                        required
                        className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm"
                      />
                    </div>
                  </div>

                  {privateContact && (
                    <div className="pt-4 border-t border-[#E6E4DF] grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#575550] mb-1">
                          Yetkili E-posta (Özel)
                        </label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          maxLength={VALIDATION_BOUNDS.emailMax}
                          required
                          className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#575550] mb-1">
                          Telefon (Özel)
                        </label>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          maxLength={VALIDATION_BOUNDS.phoneMax}
                          required
                          className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#575550] mb-1">
                          Vergi / Sicil No (Özel)
                        </label>
                        <input
                          type="text"
                          value={regTaxId}
                          onChange={(e) => setRegTaxId(e.target.value)}
                          maxLength={VALIDATION_BOUNDS.taxIdMax}
                          required
                          className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#575550] mb-1">
                          Açık Adres (Özel)
                        </label>
                        <input
                          type="text"
                          value={regAddress}
                          onChange={(e) => setRegAddress(e.target.value)}
                          maxLength={VALIDATION_BOUNDS.addressMax}
                          required
                          className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 min-h-[42px] rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
