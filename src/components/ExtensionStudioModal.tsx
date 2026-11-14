import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Puzzle,
  Search,
  X,
} from 'lucide-react';
import { CITY_HUBS } from '../data/catalog';
import type { CityId, Dish, RestaurantProfile } from '../types/food';
import {
  generateChromeExtensionZip,
  getExtensionSourceFiles,
} from '../utils/extensionPackage';
import { CountrySelectOptions } from './CountrySelectOptions';

interface ExtensionStudioModalProps {
  isOpen: boolean;
  dishes: Dish[];
  activeRestaurants: RestaurantProfile[];
  onClose: () => void;
  onQuickAdd: (dish: Dish) => void;
  onSelectDish: (dish: Dish) => void;
}

export function ExtensionStudioModal({
  isOpen,
  dishes,
  activeRestaurants,
  onClose,
  onQuickAdd,
  onSelectDish,
}: ExtensionStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'browser' | 'website'>('browser');
  const [previewCity, setPreviewCity] = useState<CityId>('all');
  const [previewQuery, setPreviewQuery] = useState('');
  const [addedId, setAddedId] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const [selectedSlug, setSelectedSlug] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSourceCode, setShowSourceCode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const appOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://sofra-atlas.web.app';

  const restaurantOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string; city: string }>();
    for (const rest of activeRestaurants) {
      map.set(rest.id, {
        id: rest.id,
        label: `${rest.name} (Üye Restoran)`,
        city: rest.cityName,
      });
    }
    for (const dish of dishes) {
      if (!map.has(dish.restaurantName)) {
        map.set(dish.restaurantName, {
          id: dish.restaurantName,
          label: dish.restaurantName,
          city: dish.cityName,
        });
      }
    }
    return Array.from(map.values());
  }, [activeRestaurants, dishes]);

  const previewDishes = useMemo(() => {
    const q = previewQuery.trim().toLocaleLowerCase('tr');
    return dishes
      .filter((d) => {
        if (previewCity !== 'all' && d.cityId !== previewCity) return false;
        if (q) {
          const text = `${d.name} ${d.restaurantName} ${d.cityName}`.toLocaleLowerCase('tr');
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .slice(0, 6);
  }, [dishes, previewCity, previewQuery]);

  if (!isOpen) return null;

  const extensionUrl =
    selectedSlug === 'all'
      ? `${appOrigin}/?embed=1#restoranlar`
      : `${appOrigin}/?mutfak=${encodeURIComponent(selectedSlug)}#restoranlar`;

  const embedUrl =
    selectedSlug === 'all'
      ? `${appOrigin}/?embed=1#restoranlar`
      : `${appOrigin}/?mutfak=${encodeURIComponent(selectedSlug)}&embed=1#restoranlar`;

  const iframeSnippet = `<iframe
  src="${embedUrl}"
  title="Sofra Atlas Online Sipariş Uzantısı"
  width="100%"
  height="680"
  style="border:1px solid #E6E4DF;border-radius:12px;"
  loading="lazy"
></iframe>`;

  const sourcePreview = getExtensionSourceFiles(appOrigin);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1600);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const blob = await generateChromeExtensionZip(appOrigin);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sofra-atlas-uzantisi.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingZip(false);
    }
  };

  const handlePreviewQuickAdd = (dish: Dish) => {
    onQuickAdd(dish);
    setAddedId(dish.id);
    window.setTimeout(() => {
      setAddedId((prev) => (prev === dish.id ? null : prev));
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="extension-studio-title"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-[#E6E4DF] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-[#E6E4DF] px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Puzzle className="w-5 h-5 text-[#D9043D] shrink-0" />
            <div className="min-w-0">
              <h2
                id="extension-studio-title"
                className="font-display text-lg font-semibold text-[#141413] truncate"
              >
                Web Sitesi & Tarayıcı Uzantısı
              </h2>
              <p className="text-xs text-[#575550] truncate">
                Manifest V3 tarayıcı eklentisi paketi ve sitelere gömülebilir sipariş uzantısı
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Uzantı penceresini kapat"
            className="w-9 h-9 rounded-lg border border-[#E6E4DF] flex items-center justify-center text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-5 pb-0 flex items-center gap-2 border-b border-[#E6E4DF]">
          <button
            type="button"
            onClick={() => setActiveTab('browser')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'browser'
                ? 'border-[#D9043D] text-[#141413] font-semibold'
                : 'border-transparent text-[#575550] hover:text-[#141413]'
            }`}
          >
            Tarayıcı Uzantısı (Chrome / Edge)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('website')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'website'
                ? 'border-[#D9043D] text-[#141413] font-semibold'
                : 'border-transparent text-[#575550] hover:text-[#141413]'
            }`}
          >
            Web Sitesi Uzantısı & Gömme Kodu
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {activeTab === 'browser' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Instructions + Download */}
              <div className="lg:col-span-6 space-y-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-1.5">
                    Manifest V3 Paketi · Canlı Firestore Bağlantısı
                  </p>
                  <h3 className="font-display text-2xl font-semibold text-[#141413] leading-snug">
                    Her sekmeden tek tıkla yemek siparişi verin.
                  </h3>
                  <p className="text-sm text-[#575550] leading-relaxed mt-2">
                    Sofra Atlas tarayıcı uzantısı; 6 kıtada {CITY_HUBS.length} ülkedeki menüleri ve
                    üye restoranların canlı eklediği tabakları doğrudan tarayıcı araç
                    çubuğundan listeler.
                  </p>
                </div>

                <div className="bg-[#FAF9F7] border border-[#E6E4DF] rounded-xl p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-[#141413]">
                    3 Adımda Tarayıcıya Kurulum
                  </p>
                  <ol className="space-y-1.5 text-xs text-[#575550] list-decimal list-inside">
                    <li>
                      Aşağıdaki düğmeyle <strong className="text-[#141413]">sofra-atlas-uzantisi.zip</strong> dosyasını indirip klasöre çıkarın.
                    </li>
                    <li>
                      Chrome veya Edge’de <code className="font-mono text-[#141413]">chrome://extensions</code> adresini açıp <strong className="text-[#141413]">Geliştirici Modu</strong>’nu etkinleştirin.
                    </li>
                    <li>
                      <strong className="text-[#141413]">Paketlenmemiş öğe yükle</strong> seçeneğiyle çıkardığınız klasörü seçin.
                    </li>
                  </ol>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={downloadingZip}
                    className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-lg bg-[#D9043D] text-white text-sm font-medium hover:bg-[#B80032] transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {downloadingZip
                        ? 'Paket Hazırlanıyor...'
                        : 'Chrome Uzantısını İndir (.zip)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSourceCode((v) => !v)}
                    className="inline-flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-medium text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
                  >
                    <Code2 className="w-4 h-4" />
                    <span>
                      {showSourceCode ? 'Kaynak Kodunu Gizle' : 'manifest.json Önizle'}
                    </span>
                  </button>
                </div>

                {showSourceCode && (
                  <pre className="p-4 rounded-lg bg-[#141413] text-[#FAF9F7] font-mono text-[11px] leading-relaxed overflow-x-auto max-h-56">
                    {sourcePreview.manifestJson}
                  </pre>
                )}
              </div>

              {/* Right: Interactive Live Popup Preview */}
              <div className="lg:col-span-6 flex flex-col items-center">
                <p className="text-xs text-[#575550] mb-3">
                  Canlı Uzantı Açılır Pencere Önizlemesi (380 × 500 px)
                </p>

                <div className="w-full max-w-[380px] rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] overflow-hidden shadow-sm flex flex-col">
                  {/* Simulated extension popup header */}
                  <div className="px-4 py-3 bg-white border-b border-[#E6E4DF] flex items-center justify-between">
                    <span className="font-display text-base font-semibold text-[#141413]">
                      Sofra Atlas
                    </span>
                    <span className="text-[11px] font-medium text-[#D9043D]">
                      Tarayıcı Eklentisi
                    </span>
                  </div>

                  {/* Simulated controls */}
                  <div className="p-3 bg-white border-b border-[#E6E4DF] grid grid-cols-2 gap-2">
                    <select
                      value={previewCity}
                      onChange={(e) => setPreviewCity(e.target.value as CityId)}
                      aria-label="Uzantı önizleme ülke seçimi"
                      className="px-2.5 py-1.5 rounded-md border border-[#E6E4DF] text-xs bg-white"
                    >
                      <CountrySelectOptions
                        includeAllOption
                        allLabel={`Tüm Ülkeler (${CITY_HUBS.length})`}
                      />
                    </select>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#575550] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={previewQuery}
                        onChange={(e) => setPreviewQuery(e.target.value)}
                        placeholder="Tabak ara..."
                        className="w-full pl-7 pr-2 py-1.5 rounded-md border border-[#E6E4DF] text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* Simulated list */}
                  <div className="p-3 space-y-2.5 max-h-[300px] overflow-y-auto">
                    {previewDishes.map((dish) => {
                      const isAdded = addedId === dish.id;
                      return (
                        <div
                          key={dish.id}
                          className="p-3 rounded-lg bg-white border border-[#E6E4DF] flex items-center justify-between gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectDish(dish);
                            }}
                            className="text-left min-w-0 cursor-pointer"
                          >
                            <p className="text-[10px] text-[#575550] truncate">
                              {dish.cityName} · {dish.restaurantName}
                            </p>
                            <p className="text-xs font-semibold text-[#141413] truncate">
                              {dish.name}
                            </p>
                            <p className="font-mono tabular-nums text-[11px] font-medium text-[#D9043D]">
                              {dish.priceTry.toLocaleString('tr-TR')} ₺
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePreviewQuickAdd(dish)}
                            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                              isAdded
                                ? 'bg-[#B80032] text-white'
                                : 'bg-[#D9043D] text-white hover:bg-[#B80032]'
                            }`}
                          >
                            {isAdded ? 'Eklendi' : '+ Ekle'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-4 py-2.5 bg-white border-t border-[#E6E4DF] flex items-center justify-between text-[11px] text-[#575550]">
                    <span>{dishes.length} canlı tabak senkron</span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-[#D9043D] font-semibold hover:underline cursor-pointer"
                    >
                      Kataloğa Dön
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Restaurant Website URL Extension & Iframe Embed */
            <div className="space-y-6">
              <div className="max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-1.5">
                  Restorana Özel Web Bağlantısı & Gömme Kodu
                </p>
                <h3 className="font-display text-2xl font-semibold text-[#141413] leading-snug">
                  Mevcut web sitenize doğrudan Sofra Atlas sipariş penceresi ekleyin.
                </h3>
                <p className="text-sm text-[#575550] leading-relaxed mt-2">
                  İster tüm dünya mutfaklarını, ister yalnızca kendi restoranınızın
                  menüsünü özel web bağlantısı veya HTML gömme koduyla başka sitelerde yayınlayın.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5 space-y-4">
                  <div>
                    <label
                      htmlFor="ext-restaurant-select"
                      className="block text-xs font-medium text-[#575550] mb-1.5"
                    >
                      Hedef Mutfak / Restoran Seçimi
                    </label>
                    <select
                      id="ext-restaurant-select"
                      value={selectedSlug}
                      onChange={(e) => setSelectedSlug(e.target.value)}
                      className="w-full px-3.5 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-white text-sm"
                    >
                      <option value="all">Tüm Sofra Atlas Kataloğu</option>
                      {restaurantOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} — {opt.city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#575550] mb-1.5">
                      Özel Web Sitesi Uzantısı Bağlantısı
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={extensionUrl}
                        aria-label="Özel web sitesi uzantısı bağlantısı"
                        className="flex-1 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] font-mono text-xs text-[#141413]"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy('url', extensionUrl)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-medium text-[#141413] hover:bg-[#FAF9F7] cursor-pointer whitespace-nowrap"
                      >
                        {copiedKey === 'url' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#D9043D]" />
                            <span>Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <a
                    href={extensionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] transition-colors"
                  >
                    <span>Uzantı Sayfasını Yeni Sekmede Aç</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="md:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#575550]">
                      Web Sitesine Gömme Kodu (HTML iframe)
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopy('iframe', iframeSnippet)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E6E4DF] bg-white text-xs font-medium text-[#141413] hover:bg-[#FAF9F7] cursor-pointer"
                    >
                      {copiedKey === 'iframe' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#D9043D]" />
                          <span>Kod Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Kodu Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl bg-[#141413] text-[#FAF9F7] font-mono text-xs leading-relaxed overflow-x-auto">
                    {iframeSnippet}
                  </pre>

                  <p className="text-xs text-[#575550]">
                    <code className="font-mono text-[#141413]">?embed=1</code> parametresi
                    sayfanın üst tanıtım ve alt bilgi alanlarını gizleyerek yalnızca sipariş kataloğunu
                    ve sepeti gösterir.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
