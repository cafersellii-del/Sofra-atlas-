import { useEffect, useMemo, useState } from 'react';
import { signInWithPopup, type User } from 'firebase/auth';
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Bike,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  PackageCheck,
  Phone,
  RotateCcw,
  Store,
  Truck,
  XCircle,
} from 'lucide-react';
import { CITY_HUBS } from '../data/catalog';
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
  CourierAvailability,
  CourierPrivateContact,
  CourierProfile,
  CourierVehicleType,
  DispatchJobRecord,
  Order,
} from '../types/food';
import { sanitizeText, VALIDATION_BOUNDS } from '../utils/validation';
import { CountrySelectOptions } from './CountrySelectOptions';

interface CourierWorkspaceProps {
  isOpen: boolean;
  user: User | null;
  authReady: boolean;
  orders: Order[];
  onAcceptOrderLocal: (orderId: string, courierId: string, courierName: string) => void;
  onPickupOrderLocal: (orderId: string) => void;
  onDeliverOrderLocal: (orderId: string) => void;
  onOpenCourierChat?: (order: Order) => void;
}

const VEHICLE_OPTIONS: {
  id: CourierVehicleType;
  label: string;
}[] = [
  { id: 'motorcycle', label: 'Motosiklet' },
  { id: 'ebike', label: 'E-Bisiklet' },
  { id: 'bicycle', label: 'Bisiklet' },
  { id: 'car', label: 'Otomobil' },
];

const AVAILABILITY_OPTIONS: {
  id: CourierAvailability;
  label: string;
}[] = [
  { id: 'online', label: 'Çevrimiçi' },
  { id: 'busy', label: 'Teslimatta' },
  { id: 'offline', label: 'Çevrimdışı' },
];

function estimateCourierFeeTry(orderTotalTry: number, deliveryFeeTry: number): number {
  if (deliveryFeeTry > 0) return Math.max(45, deliveryFeeTry);
  return Math.max(55, Math.round(orderTotalTry * 0.12));
}

export function CourierWorkspace({
  isOpen,
  user,
  authReady,
  orders,
  onAcceptOrderLocal,
  onPickupOrderLocal,
  onDeliverOrderLocal,
  onOpenCourierChat,
}: CourierWorkspaceProps) {
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [courier, setCourier] = useState<CourierProfile | null>(null);
  const [privateContact, setPrivateContact] =
    useState<CourierPrivateContact | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const [dispatchJobs, setDispatchJobs] = useState<DispatchJobRecord[]>([]);
  const [claimedCloudOrders, setClaimedCloudOrders] = useState<
    Record<
      string,
      {
        orderNumber: string;
        address: string;
        customerName: string;
        customerPhone: string;
        restaurantName: string;
        cityId: Exclude<CityId, 'all'>;
        cityName: string;
        neighborhood: string;
        totalTry: number;
        deliveryFeeTry: number;
        paymentMethod: Order['paymentMethod'];
        paymentStatus: Order['paymentStatus'];
        itemsSummary: string[];
        deliveryPreferences: string[];
        estimatedArrival: string;
        status: Order['status'];
        courierStatus?: Order['courierStatus'];
      }
    >
  >({});

  const [activeTab, setActiveTab] = useState<
    'queue' | 'active' | 'history' | 'profile'
  >('queue');
  const [zoneFilter, setZoneFilter] = useState<'all' | 'my_country'>('all');
  const [skippedOrderIds, setSkippedOrderIds] = useState<string[]>([]);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Registration & profile form states
  const [fullName, setFullName] = useState('');
  const [cityId, setCityId] = useState<Exclude<CityId, 'all'>>('istanbul');
  const [province, setProvince] = useState('İstanbul');
  const [district, setDistrict] = useState('Karaköy');
  const [vehicleType, setVehicleType] =
    useState<CourierVehicleType>('motorcycle');
  const [plateOrBagCode, setPlateOrBagCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [licenseOrTaxId, setLicenseOrTaxId] = useState('');

  useEffect(() => {
    if (user?.displayName && !fullName) {
      setFullName(user.displayName);
    }
    if (user?.email && !contactEmail) {
      setContactEmail(user.email);
    }
  }, [user, fullName, contactEmail]);

  // Subscribe to current user's courier profile + private contact
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setCourier(null);
      setPrivateContact(null);
      return;
    }

    setDataLoading(true);
    const courierPath = `couriers/${user.uid}`;
    const contactPath = `couriers/${user.uid}/private/contact`;

    const unsubCourier = onSnapshot(
      doc(db, 'couriers', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Omit<CourierProfile, 'id'>;
          const profile: CourierProfile = { id: snap.id, ...data };
          setCourier(profile);
          setFullName(profile.fullName);
          setCityId(profile.cityId);
          setProvince(profile.cityName || 'İstanbul');
          setDistrict(profile.district);
          setVehicleType(profile.vehicleType);
          setPlateOrBagCode(profile.plateOrBagCode);
        } else {
          setCourier(null);
        }
        setDataLoading(false);
      },
      (error) => {
        setDataLoading(false);
        handleFirestoreError(error, OperationType.GET, courierPath);
      }
    );

    const unsubContact = onSnapshot(
      doc(db, 'couriers', user.uid, 'private', 'contact'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CourierPrivateContact;
          setPrivateContact(data);
          setContactEmail(data.contactEmail);
          setContactPhone(data.contactPhone);
          setLicenseOrTaxId(data.licenseOrTaxId);
        } else {
          setPrivateContact(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, contactPath);
      }
    );

    return () => {
      unsubCourier();
      unsubContact();
    };
  }, [authReady, user]);

  // Subscribe to open dispatchJobs and orders claimed by this courier
  useEffect(() => {
    if (!isOpen || !authReady || !user || !user.emailVerified || !courier) {
      setDispatchJobs([]);
      setClaimedCloudOrders({});
      return;
    }

    const openJobsQuery = query(
      collection(db, 'dispatchJobs'),
      where('status', '==', 'open')
    );
    const unsubOpenJobs = onSnapshot(
      openJobsQuery,
      (snap) => {
        setDispatchJobs(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<DispatchJobRecord, 'id'>),
          }))
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'dispatchJobs');
      }
    );

    const claimedOrdersQuery = query(
      collection(db, 'orders'),
      where('courierId', '==', user.uid)
    );
    const unsubClaimedOrders = onSnapshot(
      claimedOrdersQuery,
      (snap) => {
        const nextMap: typeof claimedCloudOrders = {};
        for (const d of snap.docs) {
          const data = d.data() as {
            orderNumber: string;
            address: string;
            customerName: string;
            customerPhone: string;
            restaurantName: string;
            cityId: Exclude<CityId, 'all'>;
            cityName: string;
            neighborhood: string;
            totalTry: number;
            deliveryFeeTry: number;
            paymentMethod: Order['paymentMethod'];
            paymentStatus: Order['paymentStatus'];
            itemsSummary: string[];
            deliveryPreferences: string[];
            estimatedArrival: string;
            status: Order['status'];
            courierStatus?: Order['courierStatus'];
          };
          nextMap[d.id] = data;
        }
        setClaimedCloudOrders(nextMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => {
      unsubOpenJobs();
      unsubClaimedOrders();
    };
  }, [isOpen, authReady, user, courier]);

  const selectedCityHub =
    CITY_HUBS.find((c) => c.id === cityId) ?? CITY_HUBS[0];
  const provinceOptions = getProvincesForCountry(cityId);
  const districtOptions = getDistrictsForProvince(cityId, province);
  const effectiveProvinceOptions = provinceOptions.some(
    (p) => p.name === province
  )
    ? provinceOptions
    : [
        {
          name: province,
          center: selectedCityHub.center,
          districts: districtOptions,
        },
        ...provinceOptions,
      ];
  const effectiveDistrictOptions = districtOptions.includes(district)
    ? districtOptions
    : [district, ...districtOptions].filter(Boolean);

  // Merge Firestore open dispatch jobs with unassigned local/session orders
  const incomingQueueItems = useMemo(() => {
    const seenOrderNumbers = new Set<string>();
    const items: {
      key: string;
      firestoreId?: string;
      orderId: string;
      orderNumber: string;
      cityId: Exclude<CityId, 'all'>;
      cityName: string;
      neighborhood: string;
      restaurantName: string;
      itemsCount: number;
      totalTry: number;
      courierEarningsTry: number;
      estimatedArrival: string;
      paymentMethod: Order['paymentMethod'];
      deliveryPreferences: string[];
      isCloudJob: boolean;
    }[] = [];

    for (const job of dispatchJobs) {
      if (job.courierId) continue;
      if (skippedOrderIds.includes(job.orderNumber)) continue;
      if (zoneFilter === 'my_country' && courier && job.cityId !== courier.cityId) {
        continue;
      }
      seenOrderNumbers.add(job.orderNumber);
      items.push({
        key: job.id,
        firestoreId: job.orderId,
        orderId: job.orderId,
        orderNumber: job.orderNumber,
        cityId: job.cityId,
        cityName: job.cityName,
        neighborhood: job.neighborhood,
        restaurantName: job.restaurantName,
        itemsCount: job.itemsCount,
        totalTry: job.totalTry,
        courierEarningsTry: job.courierEarningsTry,
        estimatedArrival: job.estimatedArrival,
        paymentMethod: job.paymentMethod,
        deliveryPreferences: job.deliveryPreferences ?? [],
        isCloudJob: true,
      });
    }

    for (const order of orders) {
      if (order.status === 'delivered') continue;
      if (order.courierId) continue;
      if (order.courierStatus && order.courierStatus !== 'waiting_courier') {
        continue;
      }
      if (seenOrderNumbers.has(order.id)) continue;
      if (skippedOrderIds.includes(order.id)) continue;
      if (
        zoneFilter === 'my_country' &&
        courier &&
        order.cityId !== courier.cityId
      ) {
        continue;
      }

      const restName =
        order.items[0]?.restaurantName ?? 'Sofra Atlas İş Ortağı Mutfak';
      const itemsCount = order.items.reduce((s, it) => s + it.quantity, 0) || 1;
      items.push({
        key: order.firestoreId ?? order.id,
        firestoreId: order.firestoreId,
        orderId: order.firestoreId ?? order.id,
        orderNumber: order.id,
        cityId: order.cityId,
        cityName: order.cityName,
        neighborhood: order.neighborhood,
        restaurantName: restName,
        itemsCount,
        totalTry: order.totalTry,
        courierEarningsTry: estimateCourierFeeTry(
          order.totalTry,
          order.deliveryFeeTry
        ),
        estimatedArrival: order.estimatedArrival,
        paymentMethod: order.paymentMethod,
        deliveryPreferences: order.deliveryPreferences ?? [],
        isCloudJob: Boolean(order.firestoreId),
      });
    }

    return items;
  }, [dispatchJobs, orders, skippedOrderIds, zoneFilter, courier]);

  // Merge claimed cloud orders + local orders claimed by this courier
  const myDeliveries = useMemo(() => {
    const byOrderNumber = new Map<
      string,
      {
        orderNumber: string;
        firestoreId?: string;
        restaurantName: string;
        cityName: string;
        neighborhood: string;
        address: string;
        customerName: string;
        customerPhone: string;
        itemsSummary: string[];
        totalTry: number;
        courierEarningsTry: number;
        paymentMethod: Order['paymentMethod'];
        paymentStatus: Order['paymentStatus'];
        deliveryPreferences: string[];
        estimatedArrival: string;
        status: Order['status'];
        courierStatus: NonNullable<Order['courierStatus']>;
        sourceOrder?: Order;
      }
    >();

    for (const [docId, co] of Object.entries(claimedCloudOrders)) {
      const matchedLocal = orders.find((o) => o.id === co.orderNumber);
      const derivedCourierStatus: NonNullable<Order['courierStatus']> =
        co.status === 'delivered'
          ? 'delivered'
          : co.courierStatus ??
            (co.status === 'on_the_way' ? 'picked_up' : 'accepted');
      byOrderNumber.set(co.orderNumber, {
        orderNumber: co.orderNumber,
        firestoreId: docId,
        restaurantName: co.restaurantName,
        cityName: co.cityName,
        neighborhood: co.neighborhood,
        address: co.address,
        customerName: co.customerName,
        customerPhone: co.customerPhone,
        itemsSummary: co.itemsSummary ?? [],
        totalTry: co.totalTry,
        courierEarningsTry: estimateCourierFeeTry(
          co.totalTry,
          co.deliveryFeeTry
        ),
        paymentMethod: co.paymentMethod,
        paymentStatus: co.paymentStatus,
        deliveryPreferences: co.deliveryPreferences ?? [],
        estimatedArrival: co.estimatedArrival,
        status: co.status,
        courierStatus: derivedCourierStatus,
        sourceOrder: matchedLocal,
      });
    }

    if (user) {
      for (const order of orders) {
        if (order.courierId !== user.uid) continue;
        if (byOrderNumber.has(order.id)) continue;
        const derivedCourierStatus: NonNullable<Order['courierStatus']> =
          order.status === 'delivered'
            ? 'delivered'
            : order.courierStatus ??
              (order.status === 'on_the_way' ? 'picked_up' : 'accepted');
        byOrderNumber.set(order.id, {
          orderNumber: order.id,
          firestoreId: order.firestoreId,
          restaurantName:
            order.items[0]?.restaurantName ?? 'Sofra Atlas Mutfak',
          cityName: order.cityName,
          neighborhood: order.neighborhood,
          address: order.address,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          itemsSummary: order.items.map(
            (it) => `${it.quantity}× ${it.dishName}`
          ),
          totalTry: order.totalTry,
          courierEarningsTry: estimateCourierFeeTry(
            order.totalTry,
            order.deliveryFeeTry
          ),
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          deliveryPreferences: order.deliveryPreferences ?? [],
          estimatedArrival: order.estimatedArrival,
          status: order.status,
          courierStatus: derivedCourierStatus,
          sourceOrder: order,
        });
      }
    }

    return Array.from(byOrderNumber.values());
  }, [claimedCloudOrders, orders, user]);

  const activeDeliveries = useMemo(
    () => myDeliveries.filter((d) => d.status !== 'delivered'),
    [myDeliveries]
  );

  const completedDeliveriesList = useMemo(
    () => myDeliveries.filter((d) => d.status === 'delivered'),
    [myDeliveries]
  );

  const sessionEarningsTry = useMemo(
    () =>
      completedDeliveriesList.reduce((sum, d) => sum + d.courierEarningsTry, 0),
    [completedDeliveriesList]
  );

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
          'Tarayıcı açılır pencereyi engelledi. Lütfen açılır pencerelere izin verin.'
        );
      } else {
        setAuthError('Google ile oturum açılırken bir hata oluştu.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError('');
    setFeedbackMessage('');

    const cleanName = sanitizeText(fullName, VALIDATION_BOUNDS.nameMax);
    const provinceRaw = sanitizeText(province, VALIDATION_BOUNDS.cityNameMax);
    const cityName =
      provinceRaw.length >= 2 ? provinceRaw : selectedCityHub.name;
    const cleanDistrict = sanitizeText(
      district,
      VALIDATION_BOUNDS.districtMax
    );
    const cleanPlate = sanitizeText(plateOrBagCode, 30);
    const cleanEmail = sanitizeText(contactEmail, VALIDATION_BOUNDS.emailMax);
    const cleanPhone = sanitizeText(contactPhone, VALIDATION_BOUNDS.phoneMax);
    const cleanLicense = sanitizeText(licenseOrTaxId, VALIDATION_BOUNDS.taxIdMax);

    if (cleanName.length < VALIDATION_BOUNDS.nameMin) {
      setFormError('Ad soyad en az 2 karakter olmalıdır.');
      return;
    }
    if (cleanDistrict.length < VALIDATION_BOUNDS.districtMin) {
      setFormError('Lütfen geçerli bir teslimat ilçesi veya semt seçin.');
      return;
    }
    if (cleanPlate.length < 2) {
      setFormError('Lütfen araç plakası veya termal çanta kodunu girin.');
      return;
    }
    if (
      cleanEmail.length < VALIDATION_BOUNDS.emailMin ||
      cleanPhone.length < VALIDATION_BOUNDS.phoneMin ||
      cleanLicense.length < VALIDATION_BOUNDS.taxIdMin
    ) {
      setFormError(
        'Lütfen iletişim e-posta, telefon ve ehliyet / vergi no alanlarını eksiksiz doldurun.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const courierRef = doc(db, 'couriers', user.uid);
      const contactRef = doc(db, 'couriers', user.uid, 'private', 'contact');

      batch.set(courierRef, {
        ownerId: user.uid,
        fullName: cleanName,
        cityId: selectedCityHub.id,
        cityName,
        district: cleanDistrict,
        vehicleType,
        plateOrBagCode: cleanPlate,
        availability: 'online',
        completedDeliveries: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(contactRef, {
        ownerId: user.uid,
        contactEmail: cleanEmail,
        contactPhone: cleanPhone,
        licenseOrTaxId: cleanLicense,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      setFeedbackMessage(
        'Kurye iş ortağı kaydınız tamamlandı. Sipariş kabul kuyruğu aktif edildi.'
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `couriers/${user.uid}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCourierProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !courier) return;
    setFormError('');
    setFeedbackMessage('');

    const cleanName = sanitizeText(fullName, VALIDATION_BOUNDS.nameMax);
    const provinceRaw = sanitizeText(province, VALIDATION_BOUNDS.cityNameMax);
    const cityName =
      provinceRaw.length >= 2 ? provinceRaw : selectedCityHub.name;
    const cleanDistrict = sanitizeText(
      district,
      VALIDATION_BOUNDS.districtMax
    );
    const cleanPlate = sanitizeText(plateOrBagCode, 30);
    const cleanEmail = sanitizeText(contactEmail, VALIDATION_BOUNDS.emailMax);
    const cleanPhone = sanitizeText(contactPhone, VALIDATION_BOUNDS.phoneMax);
    const cleanLicense = sanitizeText(licenseOrTaxId, VALIDATION_BOUNDS.taxIdMax);

    if (
      cleanName.length < VALIDATION_BOUNDS.nameMin ||
      cleanDistrict.length < VALIDATION_BOUNDS.districtMin ||
      cleanPlate.length < 2 ||
      cleanEmail.length < VALIDATION_BOUNDS.emailMin ||
      cleanPhone.length < VALIDATION_BOUNDS.phoneMin ||
      cleanLicense.length < VALIDATION_BOUNDS.taxIdMin
    ) {
      setFormError('Lütfen tüm kurye ve iletişim alanlarını geçerli uzunlukta doldurun.');
      return;
    }

    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'couriers', user.uid), {
        fullName: cleanName,
        cityId: selectedCityHub.id,
        cityName,
        district: cleanDistrict,
        vehicleType,
        plateOrBagCode: cleanPlate,
        availability: courier.availability,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'couriers', user.uid, 'private', 'contact'), {
        contactEmail: cleanEmail,
        contactPhone: cleanPhone,
        licenseOrTaxId: cleanLicense,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setFeedbackMessage('Kurye profiliniz ve iletişim bilgileriniz güncellendi.');
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `couriers/${user.uid}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetAvailability = async (next: CourierAvailability) => {
    if (!user || !courier) return;
    setFeedbackMessage('');
    try {
      await updateDoc(doc(db, 'couriers', user.uid), {
        availability: next,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `couriers/${user.uid}`
      );
    }
  };

  const handleAcceptJob = async (item: (typeof incomingQueueItems)[number]) => {
    if (!user || !courier) return;
    setFormError('');
    setFeedbackMessage('');
    setBusyJobId(item.key);

    const safeCourierName = sanitizeText(courier.fullName, 60);

    try {
      if (item.isCloudJob && item.firestoreId) {
        const batch = writeBatch(db);
        batch.update(doc(db, 'dispatchJobs', item.firestoreId), {
          courierId: user.uid,
          courierName: safeCourierName,
          status: 'accepted',
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'orders', item.firestoreId), {
          courierId: user.uid,
          courierName: safeCourierName,
          courierStatus: 'accepted',
          status: 'preparing',
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'couriers', user.uid), {
          availability: 'busy',
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      } else {
        await updateDoc(doc(db, 'couriers', user.uid), {
          availability: 'busy',
          updatedAt: serverTimestamp(),
        });
      }

      onAcceptOrderLocal(item.orderNumber, user.uid, safeCourierName);
      setActiveTab('active');
      setFeedbackMessage(
        `#${item.orderNumber} siparişi kabul edildi. Restoran teslim alma detayları aşağıda açıldı.`
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        item.firestoreId ? `orders/${item.firestoreId}` : `couriers/${user.uid}`
      );
    } finally {
      setBusyJobId(null);
    }
  };

  const handleMarkPickedUp = async (
    delivery: (typeof activeDeliveries)[number]
  ) => {
    if (!user || !courier) return;
    setBusyJobId(delivery.orderNumber);
    setFeedbackMessage('');
    try {
      if (delivery.firestoreId) {
        const batch = writeBatch(db);
        batch.update(doc(db, 'orders', delivery.firestoreId), {
          courierStatus: 'picked_up',
          status: 'on_the_way',
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'dispatchJobs', delivery.firestoreId), {
          status: 'picked_up',
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      }
      onPickupOrderLocal(delivery.orderNumber);
      setFeedbackMessage(
        `#${delivery.orderNumber} restorandan teslim alındı. Müşteri rotasına geçildi.`
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        delivery.firestoreId
          ? `orders/${delivery.firestoreId}`
          : `couriers/${user.uid}`
      );
    } finally {
      setBusyJobId(null);
    }
  };

  const handleMarkDelivered = async (
    delivery: (typeof activeDeliveries)[number]
  ) => {
    if (!user || !courier) return;
    setBusyJobId(delivery.orderNumber);
    setFeedbackMessage('');
    try {
      const batch = writeBatch(db);
      if (delivery.firestoreId) {
        batch.update(doc(db, 'orders', delivery.firestoreId), {
          courierStatus: 'delivered',
          status: 'delivered',
          updatedAt: serverTimestamp(),
        });
        batch.update(doc(db, 'dispatchJobs', delivery.firestoreId), {
          status: 'delivered',
          updatedAt: serverTimestamp(),
        });
      }
      batch.update(doc(db, 'couriers', user.uid), {
        availability: 'online',
        completedDeliveries: increment(1),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      onDeliverOrderLocal(delivery.orderNumber);
      setFeedbackMessage(
        `#${delivery.orderNumber} başarıyla teslim edildi! Kazancınız bakiyenize yansıtıldı.`
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        delivery.firestoreId
          ? `orders/${delivery.firestoreId}`
          : `couriers/${user.uid}`
      );
    } finally {
      setBusyJobId(null);
    }
  };

  if (!authReady || dataLoading) {
    return (
      <div className="py-12 text-center text-sm text-[#575550]">
        Kurye iş ortağı hesap bilgileri yükleniyor...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-7 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[#575550]">
            Kurye İş Ortağı Programı
          </p>
          <h3
            className="font-display text-2xl font-semibold text-[#141413] leading-snug"
            style={{ textWrap: 'balance' }}
          >
            Bölgenizdeki restoran siparişlerini anlık kabul edin, esnek saatlerle kazanç sağlayın.
          </h3>
          <p className="text-sm text-[#575550] leading-relaxed">
            Google hesabınızla kurye iş ortağı kaydınızı oluşturun, aracınızı ve
            teslimat bölgenizi seçin; açık sipariş kuyruğundan dilediğiniz teslimatı
            tek dokunuşla kabul edin.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E6E4DF]">
            <div>
              <p className="font-mono text-xs font-semibold text-[#D9043D] mb-1">
                01. Anlık Sipariş Kabulü
              </p>
              <p className="text-xs text-[#575550]">
                Restoran ve semte göre açık paketleri görün, kabul edin veya pas geçin
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold text-[#D9043D] mb-1">
                02. Şeffaf Ücret
              </p>
              <p className="text-xs text-[#575550]">
                Kabul öncesi tahmini teslimat kazancı ve ödeme yöntemini inceleyin
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-semibold text-[#D9043D] mb-1">
                03. Canlı Destek Hattı
              </p>
              <p className="text-xs text-[#575550]">
                Teslimat sırasında müşteriyle doğrudan canlı sohbet kurun
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 bg-[#FAF9F7] border border-[#E6E4DF] rounded-xl p-6 space-y-4">
          <h4 className="font-display text-lg font-semibold text-[#141413]">
            Kurye Oturumu Aç
          </h4>
          <p className="text-xs text-[#575550] leading-relaxed">
            Yeni kurye başvurusu yapmak veya aktif teslimat kuyruğuna bağlanmak için
            Google hesabınızla devam edin.
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
              : 'Google ile Kurye Başvurusu / Giriş'}
          </button>
        </div>
      </div>
    );
  }

  if (!courier) {
    return (
      <form onSubmit={handleRegisterCourier} className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-1">
            Adım 2 / 2 · Kurye Profili
          </p>
          <h3 className="font-display text-xl font-semibold text-[#141413]">
            Kurye İş Ortağı Kaydı
          </h3>
          <p className="text-sm text-[#575550] mt-1">
            Sipariş kabul kuyruğuna katılmak için çalışma bölgenizi, araç tipinizi
            ve iletişim bilgilerinizi tamamlayın.
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
              Ad Soyad
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Örn: Emre Kaya"
              maxLength={VALIDATION_BOUNDS.nameMax}
              required
              className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#575550] mb-1.5">
              Plaka veya Termal Çanta Kodu
            </label>
            <input
              type="text"
              value={plateOrBagCode}
              onChange={(e) => setPlateOrBagCode(e.target.value)}
              placeholder="Örn: 34 SA 482 veya Çanta #104"
              maxLength={30}
              required
              className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <span className="block text-xs font-medium text-[#575550] mb-1.5">
              Teslimat Aracı Tipi
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VEHICLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVehicleType(opt.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 min-h-[42px] rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    vehicleType === opt.id
                      ? 'border-[#D9043D] bg-[#FAF9F7] text-[#D9043D]'
                      : 'border-[#E6E4DF] bg-white text-[#575550] hover:text-[#141413]'
                  }`}
                >
                  {opt.id === 'car' ? (
                    <Car className="w-4 h-4 shrink-0" />
                  ) : (
                    <Bike className="w-4 h-4 shrink-0" />
                  )}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#575550] mb-1.5">
                Ülke
              </label>
              <select
                value={cityId}
                onChange={(e) => {
                  const nextId = e.target.value as Exclude<CityId, 'all'>;
                  const nextProvs = getProvincesForCountry(nextId);
                  const firstProv = nextProvs[0]?.name ?? 'Merkez';
                  const nextDists = getDistrictsForProvince(nextId, firstProv);
                  setCityId(nextId);
                  setProvince(firstProv);
                  setDistrict(nextDists[0] ?? 'Merkez');
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
                value={province}
                onChange={(e) => {
                  const nextProv = e.target.value;
                  const nextDists = getDistrictsForProvince(cityId, nextProv);
                  setProvince(nextProv);
                  setDistrict(nextDists[0] ?? 'Merkez');
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
                Ana Teslimat Bölgesi / İlçe
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
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
        </div>

        <div className="pt-5 border-t border-[#E6E4DF] space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#141413]">
              Özel İletişim & Ehliyet / Kimlik Bilgileri (Yalnızca Size Görünür)
            </h4>
            <p className="text-xs text-[#575550]">
              Telefon ve kimlik/ehliyet numaranız güvenlik kurallarıyla izole alanda saklanır.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#575550] mb-1.5">
                E-posta
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                maxLength={VALIDATION_BOUNDS.emailMax}
                required
                className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#575550] mb-1.5">
                Cep Telefonu
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+90 5xx xxx xx xx"
                maxLength={VALIDATION_BOUNDS.phoneMax}
                required
                className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#575550] mb-1.5">
                Ehliyet / Vergi No
              </label>
              <input
                type="text"
                value={licenseOrTaxId}
                onChange={(e) => setLicenseOrTaxId(e.target.value)}
                placeholder="Örn: TR-EH-84210"
                maxLength={VALIDATION_BOUNDS.taxIdMax}
                required
                className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm font-mono"
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
            {submitting ? 'Kaydediliyor...' : 'Kurye Üyeliğini Tamamla'}
          </button>
        </div>
      </form>
    );
  }

  const vehicleLabel =
    VEHICLE_OPTIONS.find((v) => v.id === courier.vehicleType)?.label ??
    'Motosiklet';

  return (
    <div className="space-y-6">
      {/* Courier Identity & Shift Availability Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E6E4DF]">
        <div>
          <p className="text-xs text-[#575550]">
            {courier.cityName} · {courier.district} · {vehicleLabel} ·{' '}
            <span className="font-mono">{courier.plateOrBagCode}</span>
          </p>
          <h3 className="font-display text-2xl font-semibold text-[#141413] mt-0.5">
            {courier.fullName}
          </h3>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg self-start md:self-auto"
          role="group"
          aria-label="Kurye vardiya durumu"
        >
          {AVAILABILITY_OPTIONS.map((opt) => {
            const active = courier.availability === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => void handleSetAvailability(opt.id)}
                className={`px-3 py-1.5 min-h-[36px] rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? opt.id === 'online'
                      ? 'bg-white text-[#16A34A] shadow-xs'
                      : opt.id === 'busy'
                        ? 'bg-white text-[#D9043D] shadow-xs'
                        : 'bg-white text-[#575550] shadow-xs'
                    : 'text-[#575550] hover:text-[#141413]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4-Column Tabular KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-[#FAF9F7] border border-[#E6E4DF] rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[#E6E4DF]">
        <div className="p-4">
          <p className="text-[11px] text-[#575550]">Açık Sipariş Kuyruğu</p>
          <p className="font-mono tabular-nums text-xl font-semibold text-[#D9043D] mt-0.5">
            {incomingQueueItems.length}
          </p>
        </div>
        <div className="p-4">
          <p className="text-[11px] text-[#575550]">Aktif Teslimatlarım</p>
          <p className="font-mono tabular-nums text-xl font-semibold text-[#141413] mt-0.5">
            {activeDeliveries.length}
          </p>
        </div>
        <div className="p-4">
          <p className="text-[11px] text-[#575550]">Toplam Teslimat</p>
          <p className="font-mono tabular-nums text-xl font-semibold text-[#141413] mt-0.5">
            {Math.max(courier.completedDeliveries, completedDeliveriesList.length)}
          </p>
        </div>
        <div className="p-4">
          <p className="text-[11px] text-[#575550]">Oturum Teslimat Kazancı</p>
          <p className="font-mono tabular-nums text-xl font-semibold text-[#16A34A] mt-0.5">
            {sessionEarningsTry.toLocaleString('tr-TR')} ₺
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'queue'
                ? 'bg-white text-[#141413] shadow-xs'
                : 'text-[#575550] hover:text-[#141413]'
            }`}
          >
            Sipariş Kabul Kuyruğu ({incomingQueueItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-white text-[#D9043D] shadow-xs'
                : 'text-[#575550] hover:text-[#141413]'
            }`}
          >
            Aktif Teslimatlar ({activeDeliveries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white text-[#141413] shadow-xs'
                : 'text-[#575550] hover:text-[#141413]'
            }`}
          >
            Tamamlananlar ({completedDeliveriesList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-white text-[#141413] shadow-xs'
                : 'text-[#575550] hover:text-[#141413]'
            }`}
          >
            Kurye Profili
          </button>
        </div>

        {activeTab === 'queue' && (
          <div className="flex items-center gap-2">
            {skippedOrderIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSkippedOrderIds([])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-[#E6E4DF] text-xs font-medium text-[#575550] hover:text-[#141413] cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pas Geçilenleri Göster ({skippedOrderIds.length})</span>
              </button>
            )}
            <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg">
              <button
                type="button"
                onClick={() => setZoneFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                  zoneFilter === 'all'
                    ? 'bg-white text-[#141413]'
                    : 'text-[#575550]'
                }`}
              >
                Tüm Bölgeler
              </button>
              <button
                type="button"
                onClick={() => setZoneFilter('my_country')}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                  zoneFilter === 'my_country'
                    ? 'bg-white text-[#141413]'
                    : 'text-[#575550]'
                }`}
              >
                Bölgem ({courier.cityName})
              </button>
            </div>
          </div>
        )}
      </div>

      {feedbackMessage && (
        <div className="flex items-center gap-2 text-xs text-[#16A34A] bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {formError && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          {formError}
        </p>
      )}

      {/* TAB 1: Sipariş Kabul Kuyruğu */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {courier.availability === 'offline' && (
            <div className="bg-[#FAF9F7] border border-[#E6E4DF] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-[#575550]">
                Şu an <strong className="text-[#141413]">Çevrimdışı</strong> moddasınız.
                Sipariş kabul etmek için durumunuzu çevrimiçine alabilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => void handleSetAvailability('online')}
                className="px-3.5 py-2 min-h-[38px] rounded-lg bg-[#16A34A] text-white text-xs font-medium hover:bg-[#15803D] cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                Çevrimiçine Geç
              </button>
            </div>
          )}

          {incomingQueueItems.length === 0 ? (
            <div className="border border-dashed border-[#E6E4DF] rounded-xl py-12 px-6 text-center space-y-2">
              <Truck className="w-6 h-6 text-[#8A8780] mx-auto" />
              <p className="font-display text-base font-medium text-[#141413]">
                Şu an bekleyen açık sipariş bulunmuyor
              </p>
              <p className="text-xs text-[#575550] max-w-md mx-auto">
                Yeni bir müşteri siparişi oluşturulduğunda restoran adı, teslimat
                semti ve kurye kazancıyla anlık olarak burada listelenir.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E6E4DF] border border-[#E6E4DF] rounded-xl overflow-hidden bg-white">
              {incomingQueueItems.map((item) => {
                const isBusy = busyJobId === item.key;
                return (
                  <div
                    key={item.key}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#FAF9F7] transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#575550]">
                        <span className="font-mono tabular-nums font-semibold text-[#141413]">
                          #{item.orderNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.cityName}</span>
                        <span aria-hidden="true">/</span>
                        <span className="font-medium text-[#141413]">
                          {item.neighborhood}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {item.estimatedArrival}
                        </span>
                      </div>

                      <h4 className="font-display text-base font-semibold text-[#141413] flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#D9043D] shrink-0" />
                        <span className="truncate">{item.restaurantName}</span>
                      </h4>

                      <p className="text-xs text-[#575550]">
                        {item.itemsCount} ürün · Sepet{' '}
                        <span className="font-mono tabular-nums">
                          {Math.round(item.totalTry).toLocaleString('tr-TR')} ₺
                        </span>{' '}
                        ·{' '}
                        {item.paymentMethod === 'cash_on_delivery'
                          ? 'Kapıda Ödeme Tahsilatı'
                          : 'Online Ödendi (Tahsilat Yok)'}
                        {item.deliveryPreferences.length > 0
                          ? ` · ${item.deliveryPreferences.join(' · ')}`
                          : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                      <div className="text-left sm:text-right mr-2">
                        <span className="block text-[11px] text-[#575550]">
                          Kurye Kazancı
                        </span>
                        <span className="font-mono tabular-nums text-base font-semibold text-[#16A34A]">
                          +{item.courierEarningsTry.toLocaleString('tr-TR')} ₺
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          setSkippedOrderIds((prev) => [
                            ...prev,
                            item.orderNumber,
                          ])
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-medium text-[#575550] hover:text-[#141413] cursor-pointer whitespace-nowrap"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Pas Geç</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleAcceptJob(item)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {isBusy ? 'Onaylanıyor...' : 'Siparişi Kabul Et'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Aktif Teslimatlar */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeDeliveries.length === 0 ? (
            <div className="border border-dashed border-[#E6E4DF] rounded-xl py-12 px-6 text-center space-y-3">
              <p className="font-display text-base font-medium text-[#141413]">
                Üzerinizde aktif teslimat bulunmuyor
              </p>
              <p className="text-xs text-[#575550]">
                Sipariş Kabul Kuyruğu sekmesinden bekleyen siparişleri üzerinize alabilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('queue')}
                className="px-4 py-2 min-h-[40px] rounded-lg border border-[#D9043D] text-[#D9043D] text-xs font-medium hover:bg-[#D9043D] hover:text-white transition-colors cursor-pointer"
              >
                Açık Siparişlere Git
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeDeliveries.map((del) => {
                const isBusy = busyJobId === del.orderNumber;
                const isPickedUp =
                  del.courierStatus === 'picked_up' || del.status === 'on_the_way';
                return (
                  <div
                    key={del.orderNumber}
                    className="bg-white border border-[#E6E4DF] rounded-xl p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E4DF]">
                      <div>
                        <p className="text-xs text-[#575550]">
                          <span className="font-mono font-semibold text-[#141413]">
                            #{del.orderNumber}
                          </span>{' '}
                          · {del.restaurantName} ·{' '}
                          <span className="text-[#D9043D] font-medium">
                            {isPickedUp
                              ? 'Teslimata Çıkıldı (Yolda)'
                              : 'Kabul Edildi · Restorandan Alınacak'}
                          </span>
                        </p>
                        <h4 className="font-display text-base font-semibold text-[#141413] mt-0.5">
                          Alıcı: {del.customerName}
                        </h4>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="block text-[11px] text-[#575550]">
                          Kurye Ücreti
                        </span>
                        <span className="font-mono tabular-nums text-base font-semibold text-[#16A34A]">
                          +{del.courierEarningsTry.toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1.5">
                        <p className="font-medium text-[#141413] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#D9043D] shrink-0" />
                          <span>
                            {del.cityName} · {del.neighborhood}
                          </span>
                        </p>
                        <p className="text-[#575550] pl-5 leading-relaxed">
                          {del.address}
                        </p>
                        <p className="text-[#575550] pl-5 flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-[#8A8780]" />
                          <span>{del.customerPhone}</span>
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="font-medium text-[#141413]">
                          Sipariş İçeriği & Ödeme
                        </p>
                        <ul className="text-[#575550] space-y-0.5">
                          {del.itemsSummary.map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                        </ul>
                        <p className="font-medium text-[#141413] pt-1">
                          {del.paymentStatus === 'pending_cod'
                            ? `Kapıda Tahsil Edilecek: ${Math.round(del.totalTry).toLocaleString('tr-TR')} ₺`
                            : 'Online Ödendi (Kapıda tahsilat yok)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E6E4DF]">
                      {onOpenCourierChat && del.sourceOrder ? (
                        <button
                          type="button"
                          onClick={() => onOpenCourierChat(del.sourceOrder!)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs font-medium text-[#141413] hover:border-[#D9043D] hover:text-[#D9043D] cursor-pointer whitespace-nowrap"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Müşteri ile Canlı Destek</span>
                        </button>
                      ) : (
                        <span className="text-xs text-[#575550]">
                          Tahmini Varış: {del.estimatedArrival}
                        </span>
                      )}

                      <div className="flex items-center gap-2.5 ml-auto">
                        {!isPickedUp ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleMarkPickedUp(del)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg bg-[#141413] text-white text-xs font-semibold hover:bg-[#2A2A28] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                          >
                            <Truck className="w-4 h-4" />
                            <span>
                              {isBusy
                                ? 'Güncelleniyor...'
                                : 'Paketi Restorandan Aldım (Yola Çık)'}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleMarkDelivered(del)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg bg-[#16A34A] text-white text-xs font-semibold hover:bg-[#15803D] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>
                              {isBusy
                                ? 'Tamamlanıyor...'
                                : 'Müşteriye Teslim Ettim'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Tamamlanan Teslimatlar */}
      {activeTab === 'history' && (
        <div className="bg-white border border-[#E6E4DF] rounded-xl overflow-hidden">
          {completedDeliveriesList.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#575550]">
              Henüz tamamladığınız bir teslimat bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E6E4DF] bg-[#FAF9F7] text-[#575550]">
                    <th className="py-2.5 px-4 font-medium">Sipariş</th>
                    <th className="py-2.5 px-4 font-medium">Restoran & Bölge</th>
                    <th className="py-2.5 px-4 font-medium">Alıcı</th>
                    <th className="py-2.5 px-4 font-medium text-right">
                      Sepet
                    </th>
                    <th className="py-2.5 px-4 font-medium text-right">
                      Kurye Kazancı
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E4DF]">
                  {completedDeliveriesList.map((d) => (
                    <tr key={d.orderNumber} className="hover:bg-[#FAF9F7]">
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-[#141413]">
                        #{d.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-[#575550]">
                        {d.restaurantName} · {d.cityName} / {d.neighborhood}
                      </td>
                      <td className="py-3 px-4 text-[#141413]">
                        {d.customerName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#575550]">
                        {Math.round(d.totalTry).toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#16A34A]">
                        +{d.courierEarningsTry.toLocaleString('tr-TR')} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Kurye Profili Düzenle */}
      {activeTab === 'profile' && (
        <form onSubmit={handleUpdateCourierProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#575550] mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={VALIDATION_BOUNDS.nameMax}
                required
                className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#575550] mb-1">
                Plaka veya Çanta Kodu
              </label>
              <input
                type="text"
                value={plateOrBagCode}
                onChange={(e) => setPlateOrBagCode(e.target.value)}
                maxLength={30}
                required
                className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <span className="block text-xs font-medium text-[#575550] mb-1.5">
                Teslimat Aracı
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VEHICLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVehicleType(opt.id)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 min-h-[40px] rounded-lg border text-xs font-medium cursor-pointer ${
                      vehicleType === opt.id
                        ? 'border-[#D9043D] bg-[#FAF9F7] text-[#D9043D]'
                        : 'border-[#E6E4DF] bg-white text-[#575550]'
                    }`}
                  >
                    {opt.id === 'car' ? (
                      <Car className="w-3.5 h-3.5" />
                    ) : (
                      <Bike className="w-3.5 h-3.5" />
                    )}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#575550] mb-1">
                  Ülke
                </label>
                <select
                  value={cityId}
                  onChange={(e) => {
                    const nextId = e.target.value as Exclude<CityId, 'all'>;
                    const nextProvs = getProvincesForCountry(nextId);
                    const firstProv = nextProvs[0]?.name ?? 'Merkez';
                    const nextDists = getDistrictsForProvince(
                      nextId,
                      firstProv
                    );
                    setCityId(nextId);
                    setProvince(firstProv);
                    setDistrict(nextDists[0] ?? 'Merkez');
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
                  value={province}
                  onChange={(e) => {
                    const nextProv = e.target.value;
                    const nextDists = getDistrictsForProvince(cityId, nextProv);
                    setProvince(nextProv);
                    setDistrict(nextDists[0] ?? 'Merkez');
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
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
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
          </div>

          {privateContact && (
            <div className="pt-4 border-t border-[#E6E4DF] grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#575550] mb-1">
                  E-posta (Özel)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
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
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  maxLength={VALIDATION_BOUNDS.phoneMax}
                  required
                  className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#575550] mb-1">
                  Ehliyet / Vergi No (Özel)
                </label>
                <input
                  type="text"
                  value={licenseOrTaxId}
                  onChange={(e) => setLicenseOrTaxId(e.target.value)}
                  maxLength={VALIDATION_BOUNDS.taxIdMax}
                  required
                  className="w-full px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm font-mono"
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
              {submitting ? 'Güncelleniyor...' : 'Kurye Bilgilerini Kaydet'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
