import { useEffect, useState, type FormEvent } from 'react';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  CheckCircle2,
  CreditCard,
  LogOut,
  MapPin,
  Package,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  getDistrictsForProvince,
  getProvincesForCountry,
} from '../data/locations';
import { auth, googleProvider } from '../lib/firebase';
import type { CityId, MemberProfile } from '../types/food';
import { CountrySelectOptions } from './CountrySelectOptions';

interface MemberAuthModalProps {
  isOpen: boolean;
  currentUser: User | null;
  memberProfile: MemberProfile | null;
  activeOrderCount: number;
  savedCardsCount: number;
  selectedCity: CityId;
  selectedProvince: 'all' | string;
  selectedDistrict: 'all' | string;
  deliveryAddress: string;
  onSaveProfile: (profile: Omit<MemberProfile, 'ownerId'>) => Promise<void>;
  onApplyLocation: (loc: {
    cityId: Exclude<CityId, 'all'>;
    province: string;
    district: string;
    address: string;
  }) => void;
  onOpenOrders: () => void;
  onClose: () => void;
}

export function MemberAuthModal({
  isOpen,
  currentUser,
  memberProfile,
  activeOrderCount,
  savedCardsCount,
  selectedCity,
  selectedProvince,
  selectedDistrict,
  deliveryAddress,
  onSaveProfile,
  onApplyLocation,
  onOpenOrders,
  onClose,
}: MemberAuthModalProps) {
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const initialCityId: Exclude<CityId, 'all'> =
    memberProfile?.defaultCityId ??
    (selectedCity === 'all' ? 'istanbul' : selectedCity);
  const initialProvinces = getProvincesForCountry(initialCityId);
  const initialProv =
    memberProfile?.defaultProvince ??
    (selectedProvince !== 'all'
      ? selectedProvince
      : initialProvinces[0]?.name ?? 'İstanbul');
  const initialDists = getDistrictsForProvince(initialCityId, initialProv);
  const initialDist =
    memberProfile?.defaultDistrict ??
    (selectedDistrict !== 'all'
      ? selectedDistrict
      : initialDists[0] ?? 'Merkez');

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [cityId, setCityId] = useState<Exclude<CityId, 'all'>>(initialCityId);
  const [province, setProvince] = useState(initialProv);
  const [district, setDistrict] = useState(initialDist);
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setAvatarError(false);
    setAuthError('');
    setSaveMessage('');
    setFormError('');

    const targetCity: Exclude<CityId, 'all'> =
      memberProfile?.defaultCityId ??
      (selectedCity === 'all' ? 'istanbul' : selectedCity);
    const provs = getProvincesForCountry(targetCity);
    const targetProv =
      memberProfile?.defaultProvince ??
      (selectedProvince !== 'all'
        ? selectedProvince
        : provs[0]?.name ?? 'İstanbul');
    const dists = getDistrictsForProvince(targetCity, targetProv);
    const targetDist =
      memberProfile?.defaultDistrict ??
      (selectedDistrict !== 'all' ? selectedDistrict : dists[0] ?? 'Merkez');

    setDisplayName(
      memberProfile?.displayName || currentUser?.displayName || ''
    );
    setPhone(memberProfile?.phone || '');
    setCityId(targetCity);
    setProvince(targetProv);
    setDistrict(targetDist);
    setAddress(memberProfile?.defaultAddress || deliveryAddress || '');
  }, [
    isOpen,
    memberProfile,
    currentUser,
    selectedCity,
    selectedProvince,
    selectedDistrict,
    deliveryAddress,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const provinces = getProvincesForCountry(cityId);
  const districts = getDistrictsForProvince(cityId, province);

  const handleCityChange = (nextCity: Exclude<CityId, 'all'>) => {
    setCityId(nextCity);
    const nextProvs = getProvincesForCountry(nextCity);
    const firstProv = nextProvs[0]?.name ?? 'Merkez';
    setProvince(firstProv);
    const nextDists = getDistrictsForProvince(nextCity, firstProv);
    setDistrict(nextDists[0] ?? 'Merkez');
  };

  const handleProvinceChange = (nextProv: string) => {
    setProvince(nextProv);
    const nextDists = getDistrictsForProvince(cityId, nextProv);
    setDistrict(nextDists[0] ?? 'Merkez');
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Giriş penceresi kapatıldı. Devam etmek için tekrar deneyin.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'Tarayıcınız açılır pencereyi engelledi. Lütfen açılır pencerelere izin verin.'
        );
      } else {
        setAuthError('Üye girişi tamamlanamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      onClose();
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmitProfile = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaveMessage('');

    const cleanName = displayName.trim();
    if (cleanName.length < 2) {
      setFormError('Lütfen en az 2 karakterlik ad soyad girin.');
      return;
    }

    setSaving(true);
    try {
      await onSaveProfile({
        displayName: cleanName,
        phone: phone.trim(),
        defaultCityId: cityId,
        defaultProvince: province,
        defaultDistrict: district,
        defaultAddress: address.trim(),
      });
      onApplyLocation({
        cityId,
        province,
        district,
        address: address.trim(),
      });
      setSaveMessage('Üye bilgileriniz ve varsayılan teslimat konumunuz kaydedildi.');
    } catch {
      setFormError('Bilgiler kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (currentUser?.displayName || currentUser?.email || 'S')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="atlassofra Üye Girişi ve Hesabım"
    >
      <div
        className="w-full max-w-lg bg-white border border-[#E6E4DF] rounded-xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E6E4DF] flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#141413]">
              {currentUser ? 'Üye Hesabım' : 'atlassofra Üye Girişi'}
            </h2>
            <p className="text-xs text-[#575550]">
              {currentUser
                ? 'Kayıtlı teslimat adresiniz, kartlarınız ve aktif siparişleriniz'
                : 'Hızlı sipariş, kayıtlı adres ve bulut sipariş takibi için giriş yapın'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Üye penceresini kapat"
            className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAF9F7]">
          {!currentUser ? (
            <div className="bg-white border border-[#E6E4DF] rounded-xl p-6 space-y-5">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#D9043D]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Güvenli Üyelik</span>
                </span>
                <h3 className="font-display text-xl font-semibold text-[#141413]">
                  Tek Hesapla Tüm Dünyadan Sipariş Verin
                </h3>
                <p className="text-sm text-[#575550] leading-relaxed">
                  Google hesabınızla saniyeler içinde üye girişi yaparak
                  teslimat adreslerinizi ve ödeme tercihlerinizi güvenle
                  saklayın.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-[#575550]">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF]">
                  <MapPin className="w-4 h-4 text-[#D9043D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#141413]">
                      Kayıtlı Ülke, İl, İlçe ve Adres
                    </p>
                    <p>Her siparişte adresinizi tekrar yazmadan tek tıkla seçin.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF]">
                  <CreditCard className="w-4 h-4 text-[#D9043D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#141413]">
                      Kayıtlı Kartlarla Hızlı Ödeme
                    </p>
                    <p>Tokenize kart özetlerinizi hesabınızda güvenle yönetin.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF]">
                  <Package className="w-4 h-4 text-[#D9043D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#141413]">
                      Canlı Kurye & Sipariş Geçmişi
                    </p>
                    <p>
                      Siparişlerinizi ve canlı kurye rotalarını tüm cihazlarınızda
                      senkronize takip edin.
                    </p>
                  </div>
                </div>
              </div>

              {authError && (
                <p className="text-xs font-medium text-[#D9043D] bg-[#D9043D]/10 px-3 py-2 rounded-lg">
                  {authError}
                </p>
              )}

              <button
                type="button"
                disabled={authLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 min-h-[46px] rounded-lg bg-[#D9043D] text-white text-sm font-semibold hover:bg-[#B80032] disabled:opacity-60 transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {authLoading
                    ? 'Bağlanıyor...'
                    : 'Google ile Üye Girişi Yap'}
                </span>
              </button>
            </div>
          ) : (
            <>
              {/* Member Identity Card */}
              <div className="bg-white border border-[#E6E4DF] rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {currentUser.photoURL && !avatarError ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName ?? 'Üye'}
                      onError={() => setAvatarError(true)}
                      className="w-12 h-12 rounded-full border border-[#E6E4DF] object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#D9043D] text-white font-display font-semibold text-lg flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display text-base font-semibold text-[#141413] truncate">
                        {currentUser.displayName || 'atlassofra Üyesi'}
                      </h3>
                      {currentUser.emailVerified && (
                        <CheckCircle2
                          className="w-4 h-4 text-[#D9043D] shrink-0"
                          aria-label="Doğrulanmış Üye"
                        />
                      )}
                    </div>
                    <p className="text-xs text-[#575550] truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E6E4DF] text-xs font-medium text-[#141413] hover:border-[#D9043D] hover:text-[#D9043D] transition-colors shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Çıkış Yap</span>
                </button>
              </div>

              {/* Member Quick Overview */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOrders();
                  }}
                  className="bg-white border border-[#E6E4DF] rounded-xl p-4 text-left hover:border-[#D9043D] transition-colors cursor-pointer"
                >
                  <span className="text-[11px] text-[#575550] block">
                    Aktif Siparişler
                  </span>
                  <span className="font-mono tabular-nums text-lg font-semibold text-[#141413]">
                    {activeOrderCount} adet →
                  </span>
                </button>
                <div className="bg-white border border-[#E6E4DF] rounded-xl p-4">
                  <span className="text-[11px] text-[#575550] block">
                    Kayıtlı Kartlarım
                  </span>
                  <span className="font-mono tabular-nums text-lg font-semibold text-[#141413]">
                    {savedCardsCount} kart
                  </span>
                </div>
              </div>

              {/* Delivery Profile Form */}
              <form
                onSubmit={handleSubmitProfile}
                className="bg-white border border-[#E6E4DF] rounded-xl p-5 space-y-3.5"
              >
                <div>
                  <h4 className="font-display text-sm font-semibold text-[#141413]">
                    Varsayılan Teslimat Bilgilerim
                  </h4>
                  <p className="text-xs text-[#575550]">
                    Sepet ve ödeme adımında bu bilgileriniz otomatik doldurulur.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-[#141413]">
                      Ad Soyad
                    </span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Adınız Soyadınız"
                      maxLength={80}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-[#E6E4DF] bg-white text-xs text-[#141413] focus:outline-none focus:border-[#D9043D]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-[#141413]">
                      Telefon
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+90 5xx xxx xx xx"
                      maxLength={30}
                      className="w-full px-3 py-2 rounded-lg border border-[#E6E4DF] bg-white text-xs text-[#141413] focus:outline-none focus:border-[#D9043D]"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-[#141413]">
                      Ülke
                    </span>
                    <select
                      value={cityId}
                      onChange={(e) =>
                        handleCityChange(
                          e.target.value as Exclude<CityId, 'all'>
                        )
                      }
                      className="w-full px-2.5 py-2 rounded-lg border border-[#E6E4DF] bg-white text-xs text-[#141413] focus:outline-none focus:border-[#D9043D]"
                    >
                      <CountrySelectOptions includeAllOption={false} />
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-[#141413]">
                      Bölge / İl / Şehir
                    </span>
                    <select
                      value={province}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-[#E6E4DF] bg-white text-xs text-[#141413] focus:outline-none focus:border-[#D9043D]"
                    >
                      {provinces.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-[#141413]">
                      İlçe / Semt / Mahalle
                    </span>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-[#E6E4DF] bg-white text-xs text-[#141413] focus:outline-none focus:border-[#D9043D]"
                    >
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#141413]">
                    Açık Teslimat Adresi
                  </span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Mahalle, cadde/sokak, bina ve daire no"
                    maxLength={200}
                    className="w-full px-3 py-2 rounded-lg border border-[#E6E4DF] bg-white text-xs text-[#141413] focus:outline-none focus:border-[#D9043D]"
                  />
                </label>

                {formError && (
                  <p className="text-xs text-[#D9043D] font-medium">
                    {formError}
                  </p>
                )}
                {saveMessage && (
                  <p className="text-xs text-[#141413] bg-[#FAF9F7] border border-[#E6E4DF] px-3 py-2 rounded-lg font-medium">
                    {saveMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 px-4 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-xs font-semibold hover:bg-[#B80032] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {saving ? 'Kaydediliyor...' : 'Üye Bilgilerini Kaydet'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
