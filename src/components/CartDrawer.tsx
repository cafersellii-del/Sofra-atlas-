import { useEffect, useState } from 'react';
import { signInWithPopup, type User } from 'firebase/auth';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { CITY_HUBS, CURATED_RESTAURANT_META } from '../data/catalog';
import {
  getCenterForProvince,
  getDistrictsForProvince,
  getProvincesForCountry,
} from '../data/locations';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  CITY_HUB_ANCHORS,
  notifyQuotaExceededIfNeeded,
  usePlacesAutocomplete,
} from '../lib/maps';
import type {
  CardBrand,
  CartItem,
  CityId,
  CommissionConfig,
  CurrencyMode,
  MemberProfile,
  Order,
  PaymentMethod,
  PaymentReceipt,
  RestaurantCommissionOverride,
  SavedCardRecord,
  WalletProvider,
} from '../types/food';
import {
  calculateOrderCommissionBreakdown,
  DEFAULT_COMMISSION_CONFIG,
  normalizeRestaurantCommissionKey,
} from '../utils/commission';
import { formatPrice } from '../utils/currency';
import {
  confirm3DSPayment,
  detectCardBrand,
  digitsOnly,
  formatCardNumberInput,
  formatExpiryInput,
  initiateOnlinePayment,
  isExpiryValid,
  luhnCheck,
  TEST_CARD_PRESETS,
} from '../utils/payment';
import { CountrySelectOptions } from './CountrySelectOptions';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  currencyMode: CurrencyMode;
  selectedCity: CityId;
  selectedProvince?: 'all' | string;
  selectedDistrict?: 'all' | string;
  initialDeliveryAddress?: string;
  isMapsProviderActive?: boolean;
  currentUser: User | null;
  memberProfile?: MemberProfile | null;
  savedCards: SavedCardRecord[];
  commissionConfig?: CommissionConfig;
  onSaveCard: (card: Omit<SavedCardRecord, 'id' | 'ownerId'>) => Promise<void>;
  onDeleteSavedCard: (cardId: string) => Promise<void>;
  onClose: () => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onPlaceOrder: (order: Order) => void;
}

interface Pending3DSSession {
  sessionId: string;
  bankName: string;
  gatewayLabel: string;
  cardBrand: CardBrand | '';
  last4: string;
  maskedCard: string;
  amountTry: number;
  demoOtpHint?: string;
  shouldSaveNewCard: boolean;
  newCardHolder: string;
  newCardExpiry: string;
  newCardLabel: string;
}

function CheckoutAddressAutocomplete({
  deliveryCityId,
  deliveryProvince,
  address,
  onSelectAddress,
}: {
  deliveryCityId: Exclude<CityId, 'all'>;
  deliveryProvince: string;
  address: string;
  onSelectAddress: (formatted: string) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const anchor = CITY_HUB_ANCHORS[deliveryCityId] ?? CITY_HUB_ANCHORS.istanbul;
  const center = getCenterForProvince(deliveryCityId, deliveryProvince);

  const { suggestions, resetSession } = usePlacesAutocomplete(
    showSuggestions ? address : '',
    center,
    [anchor.regionCode]
  );

  useEffect(() => {
    setShowSuggestions(true);
  }, [deliveryCityId, deliveryProvince]);

  if (!placesLib || suggestions.length === 0 || !showSuggestions) return null;

  const handlePick = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'displayName'] });
      const resolved =
        place.formattedAddress ||
        place.displayName ||
        suggestion.placePrediction.text.text;
      onSelectAddress(resolved);
      setShowSuggestions(false);
      resetSession();
    } catch (err) {
      notifyQuotaExceededIfNeeded(err);
    }
  };

  return (
    <ul className="mt-1.5 border border-[#E6E4DF] rounded-lg bg-white divide-y divide-[#E6E4DF] max-h-36 overflow-y-auto shadow-xs">
      {suggestions.map((sug, idx) => (
        <li key={`${sug.placePrediction?.placeId ?? idx}`}>
          <button
            type="button"
            onClick={() => void handlePick(sug)}
            className="w-full text-left px-3 py-2 text-xs text-[#141413] hover:bg-[#FAF9F7] flex items-start gap-2 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#D9043D] shrink-0 mt-0.5" />
            <span>{sug.placePrediction?.text.text}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CartDrawer({
  isOpen,
  items,
  currencyMode,
  selectedCity,
  selectedProvince = 'all',
  selectedDistrict = 'all',
  initialDeliveryAddress = '',
  isMapsProviderActive = false,
  currentUser,
  memberProfile = null,
  savedCards,
  commissionConfig = DEFAULT_COMMISSION_CONFIG,
  onSaveCard,
  onDeleteSavedCard,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onPlaceOrder,
}: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | '3ds_verify'>('cart');
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  const defaultCityId: Exclude<CityId, 'all'> =
    items[0]?.dish.cityId ??
    (selectedCity === 'all' ? 'istanbul' : selectedCity);
  const initialProvinces = getProvincesForCountry(defaultCityId);
  const defaultProvince =
    items[0]?.dish.cityName ||
    (selectedProvince !== 'all'
      ? selectedProvince
      : initialProvinces[0]?.name ?? 'İstanbul');
  const defaultDistricts = getDistrictsForProvince(defaultCityId, defaultProvince);
  const defaultDistrict =
    items[0]?.dish.district ||
    (selectedDistrict !== 'all'
      ? selectedDistrict
      : defaultDistricts[0] ?? 'Merkez');

  const [deliveryCityId, setDeliveryCityId] =
    useState<Exclude<CityId, 'all'>>(defaultCityId);
  const [deliveryProvince, setDeliveryProvince] = useState(defaultProvince);
  const [neighborhood, setNeighborhood] = useState(defaultDistrict);
  const [address, setAddress] = useState(initialDeliveryAddress);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [doNotRingBell, setDoNotRingBell] = useState(false);
  const [contactlessDelivery, setContactlessDelivery] = useState(true);
  const [formError, setFormError] = useState('');

  // Online Card & 3DS States
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string>('new');
  const [savedCardCvc, setSavedCardCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [use3DS, setUse3DS] = useState(true);
  const [saveCardChecked, setSaveCardChecked] = useState(false);
  const [cardLabel, setCardLabel] = useState('Kişisel Kartım');

  // Digital Wallet State
  const [walletProvider, setWalletProvider] =
    useState<WalletProvider>('sofracuzdan');

  // Processing & 3DS Challenge States
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pending3DS, setPending3DS] = useState<Pending3DSSession | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [restaurantOverride, setRestaurantOverride] =
    useState<RestaurantCommissionOverride | null>(null);

  useEffect(() => {
    if (initialDeliveryAddress && !address.trim()) {
      setAddress(initialDeliveryAddress);
    }
  }, [initialDeliveryAddress]);

  useEffect(() => {
    const resolvedName =
      memberProfile?.displayName || currentUser?.displayName || '';
    if (resolvedName && !customerName.trim()) {
      setCustomerName(resolvedName);
    }
    if (memberProfile?.phone && !customerPhone.trim()) {
      setCustomerPhone(memberProfile.phone);
    }
    if (memberProfile?.defaultAddress && !address.trim()) {
      setAddress(memberProfile.defaultAddress);
    }
  }, [currentUser, memberProfile]);

  useEffect(() => {
    if (savedCards.length > 0 && selectedSavedCardId === 'new') {
      setSelectedSavedCardId(savedCards[0].id);
    } else if (savedCards.length === 0) {
      setSelectedSavedCardId('new');
    }
  }, [savedCards]);

  useEffect(() => {
    if (items.length > 0) {
      const nextCityId = items[0].dish.cityId;
      const nextProvList = getProvincesForCountry(nextCityId);
      const nextProv =
        items[0].dish.cityName || nextProvList[0]?.name || 'Merkez';
      const nextDistList = getDistrictsForProvince(nextCityId, nextProv);
      const nextDist = items[0].dish.district || nextDistList[0] || 'Merkez';
      setDeliveryCityId(nextCityId);
      setDeliveryProvince(nextProv);
      setNeighborhood(nextDist);
    } else {
      setStep('cart');
      setPending3DS(null);
    }
  }, [items]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const activeCartRestaurantName = items[0]?.dish.restaurantName ?? '';
  useEffect(() => {
    let active = true;
    if (!isOpen || !activeCartRestaurantName) {
      setRestaurantOverride(null);
      return;
    }

    const overrideKey = normalizeRestaurantCommissionKey(activeCartRestaurantName);
    const overridePath = `restaurantCommissions/${overrideKey}`;
    getDoc(doc(db, 'restaurantCommissions', overrideKey))
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
  }, [isOpen, activeCartRestaurantName]);

  if (!isOpen) return null;

  const activeHub =
    CITY_HUBS.find((c) => c.id === deliveryCityId) ?? CITY_HUBS[0];
  const provinceOptions = getProvincesForCountry(deliveryCityId);
  const districtOptions = getDistrictsForProvince(
    deliveryCityId,
    deliveryProvince
  );
  const effectiveProvinceOptions = provinceOptions.some(
    (p) => p.name === deliveryProvince
  )
    ? provinceOptions
    : [
        {
          name: deliveryProvince,
          center: activeHub.center,
          districts: districtOptions,
        },
        ...provinceOptions,
      ];
  const effectiveDistrictOptions = districtOptions.includes(neighborhood)
    ? districtOptions
    : [neighborhood, ...districtOptions].filter(Boolean);

  const displayCityId = items[0]?.dish.cityId ?? deliveryCityId;
  const activeRestaurantName = items[0]?.dish.restaurantName ?? '';
  const restaurantMeta = CURATED_RESTAURANT_META[activeRestaurantName];
  const minBasketTry = restaurantMeta?.minBasketTry ?? 200;
  const baseDeliveryFeeTry =
    restaurantMeta?.deliveryFeeTry ?? activeHub.deliveryFeeTry;

  const subtotalTry = items.reduce(
    (sum, item) => sum + item.unitPriceTry * item.quantity,
    0
  );
  const minBasketRemainingTry = Math.max(0, minBasketTry - subtotalTry);
  const isMinBasketMet = minBasketRemainingTry === 0;

  const discountTry = promoApplied ? Math.round(subtotalTry * 0.15) : 0;
  const netSubtotalTry = Math.max(0, subtotalTry - discountTry);
  const freeDeliveryRemainingTry = Math.max(
    0,
    activeHub.freeDeliveryThresholdTry - netSubtotalTry
  );
  const deliveryFeeTry =
    items.length === 0 ||
    baseDeliveryFeeTry === 0 ||
    freeDeliveryRemainingTry === 0
      ? 0
      : baseDeliveryFeeTry;
  const commissionBreakdown = calculateOrderCommissionBreakdown({
    netSubtotalTry,
    deliveryFeeTry,
    config: commissionConfig,
    override: restaurantOverride,
  });
  const serviceFeeTry = commissionBreakdown.serviceFeeTry;
  const totalTry = netSubtotalTry + deliveryFeeTry + serviceFeeTry;

  const detectedBrand = detectCardBrand(cardNumber);
  const cardDigits = digitsOnly(cardNumber);
  const isCardNumberValid =
    cardDigits.length >= 15 && luhnCheck(cardDigits);

  const handleApplyPromo = () => {
    const normalized = promoInput.trim().toUpperCase();
    if (normalized === 'ATLAS15') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoApplied(false);
      setPromoError(
        'Geçersiz kod. İlk siparişinizde ATLAS15 kodunu kullanabilirsiniz.'
      );
    }
  };

  const handleGoogleSignInInCheckout = async () => {
    setAuthLoading(true);
    setFormError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setFormError('Google oturumu açılamadı. Misafir olarak devam edebilirsiniz.');
    } finally {
      setAuthLoading(false);
    }
  };

  const finalizeOrder = (
    method: PaymentMethod,
    receipt?: PaymentReceipt
  ) => {
    const orderNumber = `SA-${Math.floor(4800 + Math.random() * 5100)}`;

    const prefs: string[] = [];
    if (contactlessDelivery) prefs.push('Temassız teslimat');
    if (doNotRingBell) prefs.push('Zili çalmayın');

    const newOrder: Order = {
      id: orderNumber,
      ownerId: currentUser?.uid,
      createdAt: 'Az önce',
      cityId: activeHub.id,
      cityName: deliveryProvince || activeHub.name,
      neighborhood,
      address: address.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      paymentMethod: method,
      paymentStatus: method === 'cash_on_delivery' ? 'pending_cod' : 'paid',
      paymentDetails: receipt,
      deliveryPreferences: prefs,
      items: items.map((item) => ({
        dishName: item.dish.name,
        restaurantName: item.dish.restaurantName,
        portionLabel: item.portion.label,
        extrasLabels: item.extras.map((ex) => ex.label),
        quantity: item.quantity,
        lineTotalTry: item.unitPriceTry * item.quantity,
      })),
      subtotalTry,
      discountTry,
      deliveryFeeTry,
      serviceFeeTry,
      commissionRatePct: commissionBreakdown.effectiveRatePct,
      commissionTry: commissionBreakdown.commissionTry,
      restaurantNetTry: commissionBreakdown.restaurantNetTry,
      totalTry,
      status: 'received',
      estimatedArrival: activeHub.avgDelivery,
      courierId: '',
      courierStatus: 'waiting_courier',
      courierName: 'Kurye Bekleniyor',
    };

    setFormError('');
    setOtpError('');
    setOtpInput('');
    setPending3DS(null);
    setStep('cart');
    setPromoApplied(false);
    setPromoInput('');
    setCardCvc('');
    setSavedCardCvc('');
    onPlaceOrder(newOrder);
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
      setFormError(
        'Lütfen ad soyad, telefon ve açık teslimat adresini doldurun.'
      );
      return;
    }

    if (paymentMethod === 'cash_on_delivery') {
      finalizeOrder('cash_on_delivery');
      return;
    }

    if (paymentMethod === 'digital_wallet') {
      setIsProcessingPayment(true);
      try {
        const resp = await initiateOnlinePayment({
          mode: 'digital_wallet',
          amountTry: totalTry,
          restaurantName: activeRestaurantName,
          customerName: customerName.trim(),
          walletProvider,
        });
        if (resp.transactionId) {
          finalizeOrder('digital_wallet', {
            transactionId: resp.transactionId,
            authCode: resp.authCode ?? '000000',
            gatewayLabel: resp.gatewayLabel,
            paidAt: resp.paidAt ?? new Date().toISOString(),
            cardBrand: '',
            last4: '',
            maskedCard: resp.maskedCard,
          });
        }
      } catch (err) {
        setFormError(
          err instanceof Error
            ? err.message
            : 'Dijital cüzdan ödemesi başlatılamadı.'
        );
      } finally {
        setIsProcessingPayment(false);
      }
      return;
    }

    // Online Card Payment (New or Saved Card)
    const activeSavedCard = savedCards.find(
      (c) => c.id === selectedSavedCardId
    );

    if (activeSavedCard) {
      const expectedCvcLen = activeSavedCard.brand === 'Amex' ? 4 : 3;
      if (digitsOnly(savedCardCvc).length !== expectedCvcLen) {
        setFormError(
          `Seçili kart için ${expectedCvcLen} haneli CVC kodunu girin.`
        );
        return;
      }

      setIsProcessingPayment(true);
      try {
        const resp = await initiateOnlinePayment({
          mode: 'saved_card',
          amountTry: totalTry,
          restaurantName: activeRestaurantName,
          customerName: customerName.trim(),
          savedCardId: activeSavedCard.id,
          brand: activeSavedCard.brand,
          last4: activeSavedCard.last4,
          holderName: activeSavedCard.holderName,
          expiry: activeSavedCard.expiry,
          cvc: savedCardCvc,
          use3DS,
        });

        if (resp.requires3DS && resp.sessionId) {
          setPending3DS({
            sessionId: resp.sessionId,
            bankName: resp.bankName ?? '3D Secure Doğrulama',
            gatewayLabel: resp.gatewayLabel,
            cardBrand: resp.cardBrand,
            last4: resp.last4,
            maskedCard: resp.maskedCard,
            amountTry: resp.amountTry,
            demoOtpHint: resp.demoOtpHint,
            shouldSaveNewCard: false,
            newCardHolder: activeSavedCard.holderName,
            newCardExpiry: activeSavedCard.expiry,
            newCardLabel: activeSavedCard.label,
          });
          setOtpInput('');
          setOtpError('');
          setStep('3ds_verify');
        } else if (resp.transactionId) {
          finalizeOrder('card', {
            transactionId: resp.transactionId,
            authCode: resp.authCode ?? '000000',
            gatewayLabel: resp.gatewayLabel,
            paidAt: resp.paidAt ?? new Date().toISOString(),
            cardBrand: resp.cardBrand,
            last4: resp.last4,
            maskedCard: resp.maskedCard,
          });
        }
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : 'Kart ödemesi başlatılamadı.'
        );
      } finally {
        setIsProcessingPayment(false);
      }
      return;
    }

    // New card validation
    if (cardHolder.trim().length < 2) {
      setFormError('Kart üzerindeki ad soyad bilgisini girin.');
      return;
    }
    if (!isCardNumberValid) {
      setFormError(
        'Kart numarası geçersiz. Test etmek için "Test Kartı" seçeneklerinden birini kullanabilirsiniz.'
      );
      return;
    }
    if (!isExpiryValid(cardExpiry)) {
      setFormError('Son kullanma tarihi geçersiz veya süresi dolmuş (AA/YY).');
      return;
    }
    const expectedCvcLen = detectedBrand === 'Amex' ? 4 : 3;
    if (digitsOnly(cardCvc).length !== expectedCvcLen) {
      setFormError(
        `${detectedBrand} kartı için CVC ${expectedCvcLen} haneli olmalıdır.`
      );
      return;
    }

    setIsProcessingPayment(true);
    try {
      const resp = await initiateOnlinePayment({
        mode: 'card',
        amountTry: totalTry,
        restaurantName: activeRestaurantName,
        customerName: customerName.trim(),
        cardNumber: cardDigits,
        holderName: cardHolder.trim(),
        expiry: cardExpiry.trim(),
        cvc: digitsOnly(cardCvc),
        use3DS,
      });

      if (resp.requires3DS && resp.sessionId) {
        setPending3DS({
          sessionId: resp.sessionId,
          bankName: resp.bankName ?? '3D Secure Doğrulama',
          gatewayLabel: resp.gatewayLabel,
          cardBrand: resp.cardBrand,
          last4: resp.last4,
          maskedCard: resp.maskedCard,
          amountTry: resp.amountTry,
          demoOtpHint: resp.demoOtpHint,
          shouldSaveNewCard: Boolean(saveCardChecked && currentUser?.emailVerified),
          newCardHolder: cardHolder.trim().toUpperCase(),
          newCardExpiry: cardExpiry.trim(),
          newCardLabel: cardLabel.trim() || `${detectedBrand} Kartım`,
        });
        setOtpInput('');
        setOtpError('');
        setStep('3ds_verify');
      } else if (resp.transactionId) {
        if (saveCardChecked && currentUser?.emailVerified && resp.cardBrand) {
          await onSaveCard({
            label: (cardLabel.trim() || `${resp.cardBrand} Kartım`).slice(0, 40),
            holderName: cardHolder.trim().toUpperCase().slice(0, 80),
            brand: resp.cardBrand,
            last4: resp.last4,
            expiry: cardExpiry.trim(),
          });
        }
        finalizeOrder('card', {
          transactionId: resp.transactionId,
          authCode: resp.authCode ?? '000000',
          gatewayLabel: resp.gatewayLabel,
          paidAt: resp.paidAt ?? new Date().toISOString(),
          cardBrand: resp.cardBrand,
          last4: resp.last4,
          maskedCard: resp.maskedCard,
        });
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Online ödeme başlatılamadı.'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSubmit3DS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending3DS) return;
    setOtpError('');

    const code = digitsOnly(otpInput);
    if (code.length !== 6) {
      setOtpError('Lütfen 6 haneli banka SMS doğrulama kodunu girin.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const receipt = await confirm3DSPayment(pending3DS.sessionId, code);
      if (
        pending3DS.shouldSaveNewCard &&
        currentUser?.emailVerified &&
        pending3DS.cardBrand
      ) {
        await onSaveCard({
          label: pending3DS.newCardLabel.slice(0, 40),
          holderName: pending3DS.newCardHolder.slice(0, 80),
          brand: pending3DS.cardBrand,
          last4: pending3DS.last4,
          expiry: pending3DS.newCardExpiry,
        });
      }
      finalizeOrder('card', receipt);
    } catch (err) {
      setOtpError(
        err instanceof Error ? err.message : '3D Secure doğrulaması başarısız.'
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sepet ve Online Ödeme"
    >
      <div
        className="w-full max-w-md h-full bg-white border-l border-[#E6E4DF] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('cart')}
                aria-label="Sepete dön"
                className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {step === '3ds_verify' && (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                aria-label="Ödeme adımına dön"
                className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-display text-lg font-semibold text-[#141413]">
              {step === 'cart'
                ? 'Yemek Sepetiniz'
                : step === 'checkout'
                  ? 'Teslimat & Online Ödeme'
                  : '3D Secure Doğrulama'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Sepeti kapat"
            className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <ShoppingBag
              className="w-10 h-10 text-[#575550]/60 mb-4"
              strokeWidth={1.5}
            />
            <p className="font-display text-xl font-medium text-[#141413] mb-2">
              Sepetiniz şu an boş
            </p>
            <p className="text-sm text-[#575550] mb-6">
              Seçtiğiniz restorandan menüleri inceleyip ürün ekleyerek
              siparişinizi oluşturabilirsiniz.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 min-h-[42px] rounded-lg bg-[#D9043D] text-white text-sm font-medium hover:bg-[#B80032] transition-colors cursor-pointer"
            >
              Restoranları Keşfet
            </button>
          </div>
        ) : step === 'cart' ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Active Restaurant Lock Banner */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6E4DF]">
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="w-4 h-4 text-[#D9043D] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#575550]">
                      Sipariş Verilen Restoran
                    </p>
                    <p className="text-sm font-semibold text-[#141413] truncate">
                      {activeRestaurantName} · {items[0]?.dish.cityName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-xs font-medium text-[#575550] hover:text-[#D9043D] cursor-pointer shrink-0"
                >
                  Sepeti Boşalt
                </button>
              </div>

              {/* Minimum Basket & Free Delivery Progress */}
              <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF] space-y-2.5">
                {!isMinBasketMet ? (
                  <p className="text-xs text-[#D9043D] font-medium">
                    Minimum sepet tutarı (
                    <span className="font-mono tabular-nums">
                      {formatPrice(minBasketTry, displayCityId, currencyMode)}
                    </span>
                    ) için{' '}
                    <strong className="font-mono tabular-nums">
                      {formatPrice(
                        minBasketRemainingTry,
                        displayCityId,
                        currencyMode
                      )}
                    </strong>{' '}
                    daha ekleyin.
                  </p>
                ) : deliveryFeeTry === 0 ? (
                  <p className="text-xs font-medium text-[#141413]">
                    {activeRestaurantName} teslimatında{' '}
                    <span className="text-[#D9043D]">ücretsiz kurye</span>{' '}
                    geçerli.
                  </p>
                ) : (
                  <p className="text-xs text-[#141413]">
                    Ücretsiz kurye için{' '}
                    <strong className="font-mono tabular-nums">
                      {formatPrice(
                        freeDeliveryRemainingTry,
                        displayCityId,
                        currencyMode
                      )}
                    </strong>{' '}
                    daha ekleyin.
                  </p>
                )}

                <div className="w-full h-1.5 bg-[#E6E4DF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D9043D] transition-all duration-200"
                    style={{
                      width: `${Math.min(
                        100,
                        isMinBasketMet
                          ? (netSubtotalTry /
                              activeHub.freeDeliveryThresholdTry) *
                              100
                          : (subtotalTry / minBasketTry) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Cart Items */}
              <div className="divide-y divide-[#E6E4DF]">
                {items.map((item) => (
                  <div key={item.cartItemId} className="py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#141413]">
                          {item.dish.name}
                        </h3>
                        <p className="text-xs text-[#575550] mt-0.5">
                          {item.portion.label}
                          {item.extras.length > 0 &&
                            ` · +${item.extras.map((ex) => ex.label).join(', ')}`}
                        </p>
                        {item.note && (
                          <p className="text-xs text-[#575550] italic mt-1">
                            Not: {item.note}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.cartItemId)}
                        aria-label={`${item.dish.name} ürününü kaldır`}
                        className="text-[#575550] hover:text-[#141413] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="inline-flex items-center border border-[#E6E4DF] rounded-lg bg-[#FAF9F7]">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                          aria-label="Adet azalt"
                          className="w-8 h-8 flex items-center justify-center text-[#141413] hover:bg-[#EFECE6] rounded-l-lg cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono tabular-nums text-xs font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                          aria-label="Adet artır"
                          className="w-8 h-8 flex items-center justify-center text-[#141413] hover:bg-[#EFECE6] rounded-r-lg cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="font-mono tabular-nums text-sm font-semibold text-[#141413]">
                        {formatPrice(
                          item.unitPriceTry * item.quantity,
                          item.dish.cityId,
                          currencyMode
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo code */}
              <div className="pt-2">
                <label
                  htmlFor="promo-code"
                  className="block text-xs font-medium text-[#575550] mb-1.5"
                >
                  Kupon Kodu{' '}
                  <button
                    type="button"
                    onClick={() => setPromoInput('ATLAS15')}
                    className="text-[#D9043D] underline cursor-pointer ml-1"
                  >
                    (ATLAS15 uygula)
                  </button>
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo-code"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="ATLAS15"
                    className="flex-1 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] text-sm uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs font-medium text-[#141413] hover:bg-[#EFECE6] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Uygula
                  </button>
                </div>
                {promoApplied && (
                  <p className="text-xs text-[#D9043D] mt-1.5 font-medium">
                    ATLAS15 kodu uygulandı: %15 indirim aktif.
                  </p>
                )}
                {promoError && (
                  <p className="text-xs text-red-700 mt-1.5">{promoError}</p>
                )}
              </div>
            </div>

            {/* Cart Summary Footer */}
            <div className="px-6 py-5 border-t border-[#E6E4DF] bg-[#FAF9F7] space-y-2.5">
              <div className="flex justify-between text-xs text-[#575550]">
                <span>Ara Toplam</span>
                <span className="font-mono tabular-nums text-[#141413]">
                  {formatPrice(subtotalTry, displayCityId, currencyMode)}
                </span>
              </div>
              {discountTry > 0 && (
                <div className="flex justify-between text-xs text-[#D9043D]">
                  <span>Kupon İndirimi (%15)</span>
                  <span className="font-mono tabular-nums">
                    -{formatPrice(discountTry, displayCityId, currencyMode)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs text-[#575550]">
                <span>Getirme Ücreti</span>
                <span className="font-mono tabular-nums text-[#141413]">
                  {deliveryFeeTry === 0
                    ? 'Ücretsiz'
                    : formatPrice(deliveryFeeTry, displayCityId, currencyMode)}
                </span>
              </div>
              {serviceFeeTry > 0 && (
                <div className="flex justify-between text-xs text-[#575550]">
                  <span>Platform Hizmet Bedeli</span>
                  <span className="font-mono tabular-nums text-[#141413]">
                    {formatPrice(serviceFeeTry, displayCityId, currencyMode)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-[#141413] pt-2 border-t border-[#E6E4DF]">
                <span>Toplam</span>
                <span className="font-mono tabular-nums">
                  {formatPrice(totalTry, displayCityId, currencyMode)}
                </span>
              </div>

              <button
                type="button"
                disabled={!isMinBasketMet}
                onClick={() => setStep('checkout')}
                className="w-full mt-2 min-h-[44px] py-3 px-4 rounded-lg bg-[#D9043D] text-white text-sm font-semibold hover:bg-[#B80032] disabled:bg-[#E6E4DF] disabled:text-[#8A8780] transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isMinBasketMet
                  ? 'Ödeme Adımına Geç'
                  : `Min. Sepet: ${formatPrice(
                      minBasketTry,
                      displayCityId,
                      currencyMode
                    )}`}
              </button>
            </div>
          </>
        ) : step === '3ds_verify' && pending3DS ? (
          <form
            onSubmit={handleSubmit3DS}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              <div className="p-4 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141413]">
                    <ShieldCheck className="w-4 h-4 text-[#D9043D]" />
                    <span>{pending3DS.bankName}</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#575550]">
                    SSL · 256-bit
                  </span>
                </div>
                <p className="text-xs text-[#575550]">
                  {pending3DS.gatewayLabel} · {pending3DS.maskedCard}
                </p>
              </div>

              <div className="border border-[#E6E4DF] rounded-xl p-5 space-y-4 bg-white">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-[#E6E4DF]">
                  <span className="text-[#575550]">İşyeri</span>
                  <span className="font-semibold text-[#141413]">
                    Sofra Atlas · {activeRestaurantName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pb-3 border-b border-[#E6E4DF]">
                  <span className="text-[#575550]">Ödenecek Tutar</span>
                  <span className="font-mono tabular-nums text-sm font-semibold text-[#D9043D]">
                    {formatPrice(
                      pending3DS.amountTry,
                      displayCityId,
                      currencyMode
                    )}
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="otp-3ds-code"
                    className="block text-xs font-medium text-[#141413] mb-1.5"
                  >
                    Banka SMS Doğrulama Kodu (6 Hane)
                  </label>
                  <input
                    id="otp-3ds-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(digitsOnly(e.target.value))}
                    placeholder="6 haneli kod"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-lg border border-[#E6E4DF] font-mono text-center text-base tracking-[0.35em]"
                    required
                  />
                </div>

                {pending3DS.demoOtpHint && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF] text-xs">
                    <span className="text-[#575550]">
                      Test Banka SMS Kodu:{' '}
                      <strong className="font-mono text-[#141413]">
                        {pending3DS.demoOtpHint}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpInput(pending3DS.demoOtpHint ?? '')}
                      className="text-[#D9043D] font-semibold hover:underline cursor-pointer"
                    >
                      Kodu Doldur
                    </button>
                  </div>
                )}

                {otpError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {otpError}
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-5 border-t border-[#E6E4DF] bg-[#FAF9F7] space-y-2.5">
              <button
                type="submit"
                disabled={isProcessingPayment}
                className="w-full min-h-[44px] py-3 px-4 rounded-lg bg-[#D9043D] text-white text-sm font-semibold hover:bg-[#B80032] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isProcessingPayment
                  ? 'Banka Onayı Alınıyor...'
                  : 'Ödemeyi Onayla ve Siparişi Tamamla'}
              </button>
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-2 text-xs font-medium text-[#575550] hover:text-[#141413] cursor-pointer"
              >
                Ödeme Yöntemini Değiştir
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleConfirmOrder}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Optional Google Account Sync Banner for Saving Cards & Syncing Orders */}
              <div className="p-3 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF] flex items-center justify-between gap-3">
                {currentUser ? (
                  <div className="flex items-center gap-2 text-xs text-[#141413] min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-[#D9043D] shrink-0" />
                    <span className="truncate">
                      <strong className="font-medium">
                        {currentUser.displayName ?? currentUser.email}
                      </strong>{' '}
                      · Kayıtlı kart ve bulut sipariş senkronu aktif
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-[11px] text-[#575550]">
                      Kartlarınızı ve siparişlerinizi hesabınıza kaydetmek için
                      giriş yapabilirsiniz.
                    </span>
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={handleGoogleSignInInCheckout}
                      className="px-2.5 py-1.5 rounded-md border border-[#E6E4DF] bg-white text-[11px] font-semibold text-[#141413] hover:border-[#D9043D] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {authLoading ? 'Bağlanıyor...' : 'Google ile Giriş'}
                    </button>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="checkout-city"
                    className="block text-xs font-medium text-[#575550] mb-1.5"
                  >
                    Teslimat Ülkesi
                  </label>
                  <select
                    id="checkout-city"
                    value={deliveryCityId}
                    onChange={(e) => {
                      const nextCity = e.target.value as Exclude<CityId, 'all'>;
                      const nextProvs = getProvincesForCountry(nextCity);
                      const firstProv = nextProvs[0]?.name ?? 'Merkez';
                      const nextDists = getDistrictsForProvince(
                        nextCity,
                        firstProv
                      );
                      setDeliveryCityId(nextCity);
                      setDeliveryProvince(firstProv);
                      setNeighborhood(nextDists[0] ?? 'Merkez');
                    }}
                    className="w-full px-3 py-2 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                  >
                    <CountrySelectOptions />
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="checkout-province"
                      className="block text-xs font-medium text-[#575550] mb-1.5"
                    >
                      İl / Şehir
                    </label>
                    <select
                      id="checkout-province"
                      value={deliveryProvince}
                      onChange={(e) => {
                        const nextProv = e.target.value;
                        const nextDists = getDistrictsForProvince(
                          deliveryCityId,
                          nextProv
                        );
                        setDeliveryProvince(nextProv);
                        setNeighborhood(nextDists[0] ?? 'Merkez');
                      }}
                      className="w-full px-3 py-2 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                    >
                      {effectiveProvinceOptions.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-district"
                      className="block text-xs font-medium text-[#575550] mb-1.5"
                    >
                      İlçe / Semt
                    </label>
                    <select
                      id="checkout-district"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                    >
                      {effectiveDistrictOptions.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="checkout-address"
                  className="block text-xs font-medium text-[#575550] mb-1.5"
                >
                  Açık Teslimat Adresi
                </label>
                <textarea
                  id="checkout-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Cadde, sokak, bina no ve daire bilgisi..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E6E4DF] text-sm resize-none"
                  required
                />
                {isMapsProviderActive && (
                  <CheckoutAddressAutocomplete
                    deliveryCityId={deliveryCityId}
                    deliveryProvince={deliveryProvince}
                    address={address}
                    onSelectAddress={setAddress}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="checkout-name"
                    className="block text-xs font-medium text-[#575550] mb-1.5"
                  >
                    Alıcı Ad Soyad
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Örn: Deniz Yılmaz"
                    className="w-full px-3 py-2 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="checkout-phone"
                    className="block text-xs font-medium text-[#575550] mb-1.5"
                  >
                    Telefon Numarası
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+90 5XX XXX XX XX"
                    className="w-full px-3 py-2 min-h-[42px] rounded-lg border border-[#E6E4DF] text-sm"
                    required
                  />
                </div>
              </div>

              {/* Delivery Preferences */}
              <div className="pt-1 space-y-2">
                <p className="text-xs font-medium text-[#575550]">
                  Teslimat Tercihleri
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contactlessDelivery}
                      onChange={(e) => setContactlessDelivery(e.target.checked)}
                      className="w-4 h-4 accent-[#D9043D]"
                    />
                    <span>Temassız teslimat</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#141413] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={doNotRingBell}
                      onChange={(e) => setDoNotRingBell(e.target.checked)}
                      className="w-4 h-4 accent-[#D9043D]"
                    />
                    <span>Zili çalma</span>
                  </label>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="pt-2 border-t border-[#E6E4DF] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#141413]">
                    Ödeme Yöntemi Seçin
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#575550]">
                    <Lock className="w-3 h-3 text-[#D9043D]" />
                    <span>256-bit Şifreli</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`px-2.5 py-2.5 rounded-lg border text-xs font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-[#D9043D] bg-[#FAF9F7] text-[#141413]'
                        : 'border-[#E6E4DF] bg-white text-[#575550]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-[#D9043D]" />
                    <span>Online Kart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('digital_wallet')}
                    className={`px-2.5 py-2.5 rounded-lg border text-xs font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
                      paymentMethod === 'digital_wallet'
                        ? 'border-[#D9043D] bg-[#FAF9F7] text-[#141413]'
                        : 'border-[#E6E4DF] bg-white text-[#575550]'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-[#D9043D]" />
                    <span>Cüzdan / QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash_on_delivery')}
                    className={`px-2.5 py-2.5 rounded-lg border text-xs font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
                      paymentMethod === 'cash_on_delivery'
                        ? 'border-[#D9043D] bg-[#FAF9F7] text-[#141413]'
                        : 'border-[#E6E4DF] bg-white text-[#575550]'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-[#575550]" />
                    <span>Kapıda Öde</span>
                  </button>
                </div>

                {/* Method 1: Online Credit / Debit Card (3D Secure) */}
                {paymentMethod === 'card' && (
                  <div className="p-3.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] space-y-3">
                    {savedCards.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-[#575550]">
                          Kayıtlı Kartlarım
                        </p>
                        {savedCards.map((sc) => {
                          const isSelected = selectedSavedCardId === sc.id;
                          return (
                            <div
                              key={sc.id}
                              className={`p-2.5 rounded-lg border bg-white transition-colors ${
                                isSelected
                                  ? 'border-[#D9043D]'
                                  : 'border-[#E6E4DF]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <label className="flex items-center gap-2 text-xs text-[#141413] cursor-pointer flex-1">
                                  <input
                                    type="radio"
                                    name="saved-card"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedSavedCardId(sc.id);
                                      setSavedCardCvc('');
                                    }}
                                    className="accent-[#D9043D]"
                                  />
                                  <span className="font-semibold">
                                    {sc.label}
                                  </span>
                                  <span className="font-mono text-[11px] text-[#575550]">
                                    {sc.brand} •••• {sc.last4} ({sc.expiry})
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => void onDeleteSavedCard(sc.id)}
                                  aria-label="Kayıtlı kartı sil"
                                  className="text-[#8A8780] hover:text-[#DC2626] p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {isSelected && (
                                <div className="mt-2 pl-5 flex items-center gap-2">
                                  <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={sc.brand === 'Amex' ? 4 : 3}
                                    value={savedCardCvc}
                                    onChange={(e) =>
                                      setSavedCardCvc(
                                        digitsOnly(e.target.value)
                                      )
                                    }
                                    placeholder="CVC"
                                    className="w-24 px-2.5 py-1.5 rounded-md border border-[#E6E4DF] text-xs font-mono"
                                  />
                                  <span className="text-[11px] text-[#575550]">
                                    Güvenlik kodunu girin
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <label className="flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer pt-1">
                          <input
                            type="radio"
                            name="saved-card"
                            checked={selectedSavedCardId === 'new'}
                            onChange={() => setSelectedSavedCardId('new')}
                            className="accent-[#D9043D]"
                          />
                          <span>Yeni Kart ile Öde</span>
                        </label>
                      </div>
                    )}

                    {selectedSavedCardId === 'new' && (
                      <div className="space-y-3">
                        {/* Quick Test Card Fill Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="text-[11px] font-medium text-[#575550]">
                            Hızlı Test Kartı:
                          </span>
                          <div className="flex items-center gap-1.5">
                            {TEST_CARD_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => {
                                  setCardHolder(preset.holder);
                                  setCardNumber(preset.number);
                                  setCardExpiry(preset.expiry);
                                  setCardCvc(preset.cvc);
                                }}
                                className="px-2 py-1 rounded border border-[#E6E4DF] bg-white text-[11px] font-medium text-[#141413] hover:border-[#D9043D] cursor-pointer"
                              >
                                {preset.brand}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="card-holder"
                            className="block text-[11px] font-medium text-[#575550] mb-1"
                          >
                            Kart Üzerindeki Ad Soyad
                          </label>
                          <input
                            id="card-holder"
                            type="text"
                            value={cardHolder}
                            onChange={(e) =>
                              setCardHolder(e.target.value.toUpperCase())
                            }
                            placeholder="DENİZ YILMAZ"
                            className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-mono uppercase"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label
                              htmlFor="card-number"
                              className="text-[11px] font-medium text-[#575550]"
                            >
                              Kart Numarası
                            </label>
                            <span className="font-mono text-[11px] font-semibold text-[#D9043D]">
                              {cardDigits.length > 0 ? detectedBrand : 'TROY · VISA · MC'}
                            </span>
                          </div>
                          <input
                            id="card-number"
                            type="text"
                            inputMode="numeric"
                            value={cardNumber}
                            onChange={(e) =>
                              setCardNumber(
                                formatCardNumberInput(e.target.value)
                              )
                            }
                            placeholder="0000 0000 0000 0000"
                            className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-mono tracking-wider"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label
                              htmlFor="card-expiry"
                              className="block text-[11px] font-medium text-[#575550] mb-1"
                            >
                              Son Kullanma (AA/YY)
                            </label>
                            <input
                              id="card-expiry"
                              type="text"
                              inputMode="numeric"
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) =>
                                setCardExpiry(formatExpiryInput(e.target.value))
                              }
                              placeholder="12/29"
                              className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="card-cvc"
                              className="block text-[11px] font-medium text-[#575550] mb-1"
                            >
                              CVC / CVV
                            </label>
                            <input
                              id="card-cvc"
                              type="password"
                              inputMode="numeric"
                              maxLength={detectedBrand === 'Amex' ? 4 : 3}
                              value={cardCvc}
                              onChange={(e) =>
                                setCardCvc(digitsOnly(e.target.value))
                              }
                              placeholder="123"
                              className="w-full px-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-mono"
                            />
                          </div>
                        </div>

                        {currentUser?.emailVerified && (
                          <div className="pt-1 space-y-2">
                            <label className="flex items-center gap-2 text-xs text-[#141413] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={saveCardChecked}
                                onChange={(e) =>
                                  setSaveCardChecked(e.target.checked)
                                }
                                className="w-3.5 h-3.5 accent-[#D9043D]"
                              />
                              <span>
                                Kartı sonraki siparişler için kaydet (Yalnızca
                                son 4 hane)
                              </span>
                            </label>
                            {saveCardChecked && (
                              <input
                                type="text"
                                maxLength={40}
                                value={cardLabel}
                                onChange={(e) => setCardLabel(e.target.value)}
                                placeholder="Kart adı (Örn: İş Kartım)"
                                className="w-full px-3 py-1.5 rounded-md border border-[#E6E4DF] bg-white text-xs"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-[11px] text-[#575550] pt-1 border-t border-[#E6E4DF] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={use3DS}
                        onChange={(e) => setUse3DS(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#D9043D]"
                      />
                      <span>3D Secure SMS doğrulaması ile güvenli öde</span>
                    </label>
                  </div>
                )}

                {/* Method 2: Digital Wallet / FAST QR */}
                {paymentMethod === 'digital_wallet' && (
                  <div className="p-3.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] space-y-2">
                    <p className="text-[11px] font-medium text-[#575550]">
                      Dijital Cüzdan veya Anında QR Seçin
                    </p>
                    {(
                      [
                        {
                          id: 'sofracuzdan',
                          title: 'SofraCüzdan Bakiyesi',
                          sub: 'Anında onay · Komisyonsuz',
                        },
                        {
                          id: 'apple_google_pay',
                          title: 'Apple Pay / Google Pay',
                          sub: 'Tek tıkla biyometrik onay',
                        },
                        {
                          id: 'aninda_havale',
                          title: 'Anında FAST / QR Havale',
                          sub: 'Banka uygulamanızdan anlık transfer',
                        },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border bg-white cursor-pointer ${
                          walletProvider === opt.id
                            ? 'border-[#D9043D]'
                            : 'border-[#E6E4DF]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="wallet-provider"
                            checked={walletProvider === opt.id}
                            onChange={() => setWalletProvider(opt.id)}
                            className="accent-[#D9043D]"
                          />
                          <span>
                            <span className="block text-xs font-semibold text-[#141413]">
                              {opt.title}
                            </span>
                            <span className="block text-[11px] text-[#575550]">
                              {opt.sub}
                            </span>
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Method 3: Cash on Delivery */}
                {paymentMethod === 'cash_on_delivery' && (
                  <div className="p-3.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] text-xs text-[#575550]">
                    Siparişiniz teslim edilirken kuryeye nakit veya mobil POS
                    cihazı üzerinden ödeme yapabilirsiniz.
                  </div>
                )}
              </div>

              {formError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            <div className="px-6 py-5 border-t border-[#E6E4DF] bg-[#FAF9F7] space-y-2.5">
              {serviceFeeTry > 0 && (
                <div className="flex justify-between items-center text-xs text-[#575550]">
                  <span>Platform Hizmet Bedeli dahil</span>
                  <span className="font-mono tabular-nums text-[#141413]">
                    {formatPrice(serviceFeeTry, displayCityId, currencyMode)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#575550]">
                  Ödenecek Tutar ({activeHub.avgDelivery})
                </span>
                <span className="font-mono tabular-nums text-lg font-semibold text-[#141413]">
                  {formatPrice(totalTry, displayCityId, currencyMode)}
                </span>
              </div>

              <button
                type="submit"
                disabled={isProcessingPayment}
                className="w-full min-h-[44px] py-3 px-4 rounded-lg bg-[#D9043D] text-white text-sm font-semibold hover:bg-[#B80032] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isProcessingPayment
                  ? 'Ödeme İşleniyor...'
                  : paymentMethod === 'cash_on_delivery'
                    ? 'Kapıda Ödeme ile Siparişi Ver'
                    : paymentMethod === 'digital_wallet'
                      ? 'Cüzdan ile Öde ve Siparişi Tamamla'
                      : use3DS
                        ? '3D Secure ile Ödemeye Geç'
                        : 'Online Ödemeyi Tamamla'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
