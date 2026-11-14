import { useMemo, useState } from 'react';
import { ArrowRight, Globe, MapPin, Navigation } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { CITY_HUBS, FEATURED_GLOBAL_HUBS, HERO_IMAGE } from '../data/catalog';
import {
  getCenterForProvince,
  getDistrictsForProvince,
  getProvincesForCountry,
} from '../data/locations';
import {
  CITY_HUB_ANCHORS,
  notifyQuotaExceededIfNeeded,
  usePlacesAutocomplete,
} from '../lib/maps';
import type { CityId } from '../types/food';
import { CountrySelectOptions } from './CountrySelectOptions';
import { DishImage } from './DishImage';

interface HeroProps {
  selectedCity: CityId;
  selectedProvince: 'all' | string;
  selectedDistrict: 'all' | string;
  deliveryAddress: string;
  isMapsProviderActive: boolean;
  onChangeDeliveryAddress: (addr: string) => void;
  onSelectCity: (cityId: CityId) => void;
  onSelectProvince: (province: 'all' | string) => void;
  onSelectDistrict: (district: 'all' | string) => void;
  onExploreRestaurants: () => void;
}

function HeroAddressAutocomplete({
  cityId,
  center,
  value,
  onChange,
  onSelectFormatted,
}: {
  cityId: Exclude<CityId, 'all'>;
  center: { lat: number; lng: number };
  value: string;
  onChange: (val: string) => void;
  onSelectFormatted: (formatted: string) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const [open, setOpen] = useState(true);
  const anchor = CITY_HUB_ANCHORS[cityId];

  const { suggestions, resetSession } = usePlacesAutocomplete(
    open ? value : '',
    center,
    [anchor.regionCode]
  );

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
      onSelectFormatted(resolved);
      setOpen(false);
      resetSession();
    } catch (err) {
      notifyQuotaExceededIfNeeded(err);
    }
  };

  return (
    <div className="relative flex-1">
      <MapPin className="w-4 h-4 text-[#D9043D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setOpen(true);
          onChange(e.target.value);
        }}
        placeholder="Cadde, sokak veya açık teslimat adresinizi girin..."
        aria-label="Teslimat adresi"
        className="w-full pl-10 pr-3 py-2.5 min-h-[44px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-sm text-[#141413] placeholder:text-[#8A8780] focus:border-[#D9043D]"
      />
      {placesLib && open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-[#E6E4DF] rounded-lg divide-y divide-[#E6E4DF] shadow-md max-h-52 overflow-y-auto">
          {suggestions.map((sug, idx) => (
            <li key={`${sug.placePrediction?.placeId ?? idx}`}>
              <button
                type="button"
                onClick={() => void handlePick(sug)}
                className="w-full text-left px-3.5 py-2.5 text-xs text-[#141413] hover:bg-[#FAF9F7] flex items-start gap-2 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#D9043D] shrink-0 mt-0.5" />
                <span>{sug.placePrediction?.text.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Hero({
  selectedCity,
  selectedProvince,
  selectedDistrict,
  deliveryAddress,
  isMapsProviderActive,
  onChangeDeliveryAddress,
  onSelectCity,
  onSelectProvince,
  onSelectDistrict,
  onExploreRestaurants,
}: HeroProps) {
  const activeHub =
    selectedCity === 'all'
      ? CITY_HUBS[0]
      : CITY_HUBS.find((hub) => hub.id === selectedCity) ?? CITY_HUBS[0];

  const provinces = useMemo(
    () => (selectedCity === 'all' ? [] : getProvincesForCountry(selectedCity)),
    [selectedCity]
  );

  const districts = useMemo(() => {
    if (selectedCity === 'all' || selectedProvince === 'all') return [];
    return getDistrictsForProvince(selectedCity, selectedProvince);
  }, [selectedCity, selectedProvince]);

  const activeBiasCenter = useMemo(
    () =>
      getCenterForProvince(
        activeHub.id,
        selectedProvince !== 'all' ? selectedProvince : undefined
      ),
    [activeHub.id, selectedProvince]
  );

  const handleCityJump = (cityId: Exclude<CityId, 'all'>) => {
    onSelectCity(cityId);
    onExploreRestaurants();
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExploreRestaurants();
  };

  const locationSummary =
    selectedCity === 'all'
      ? `Tüm Dünya (${CITY_HUBS.length} ülke)`
      : [
          activeHub.country,
          selectedProvince !== 'all' ? selectedProvince : null,
          selectedDistrict !== 'all' ? selectedDistrict : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <section id="top" className="border-b border-[#E6E4DF] bg-[#FAF9F7]">
      <div className="max-w-[1280px] mx-auto px-6 pt-10 pb-12 lg:pt-14 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Yemeksepeti Address-First Hero Column */}
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-medium tracking-wider uppercase text-[#575550] mb-4">
                Küresel Teslimat Ağı · {CITY_HUBS.length} Ülke · 81 İl &amp; İlçeler
              </p>

              <h1
                className="font-display font-semibold text-[#141413] tracking-tight leading-[1.08] mb-5"
                style={{
                  fontSize: 'clamp(2.25rem, 3.8vw, 3.4rem)',
                  textWrap: 'balance',
                }}
              >
                Ülke, il ve ilçeni seç, açık restoranlardan anında sipariş ver.
              </h1>

              <p className="text-base text-[#575550] leading-relaxed max-w-xl mb-7">
                Türkiye’nin 81 ili ve tüm ilçelerinden dünyanın 196 ülkesindeki
                şehir ve semtlere kadar yerel mutfakların menülerini minimum
                sepet, teslimat süresi ve canlı Google Maps rotasıyla
                karşılaştırıp sipariş oluşturun.
              </p>

              {/* Yemeksepeti Delivery Address Search Box with Cascaded Country / Province / District */}
              <form
                onSubmit={handleAddressSubmit}
                className="bg-white border border-[#E6E4DF] rounded-xl p-3.5 mb-6 space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="relative">
                    <Globe className="w-4 h-4 text-[#D9043D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={selectedCity}
                      onChange={(e) => onSelectCity(e.target.value as CityId)}
                      aria-label="Ülke seçimi"
                      className="w-full pl-9 pr-2 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs font-medium text-[#141413] focus:border-[#D9043D]"
                    >
                      <CountrySelectOptions
                        includeAllOption
                        allLabel={`Tüm Ülkeler (${CITY_HUBS.length})`}
                      />
                    </select>
                  </div>

                  <div>
                    <select
                      value={selectedProvince}
                      disabled={selectedCity === 'all'}
                      onChange={(e) => onSelectProvince(e.target.value)}
                      aria-label="İl veya şehir seçimi"
                      className="w-full px-3 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs font-medium text-[#141413] focus:border-[#D9043D] disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                      <option value="all">
                        {selectedCity === 'all'
                          ? 'İl / Şehir (Önce ülke)'
                          : `Tüm İller / Şehirler (${provinces.length})`}
                      </option>
                      {provinces.map((prov) => (
                        <option key={prov.name} value={prov.name}>
                          {prov.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={selectedDistrict}
                      disabled={
                        selectedCity === 'all' || selectedProvince === 'all'
                      }
                      onChange={(e) => onSelectDistrict(e.target.value)}
                      aria-label="İlçe veya semt seçimi"
                      className="w-full px-3 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs font-medium text-[#141413] focus:border-[#D9043D] disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                      <option value="all">
                        {selectedProvince === 'all'
                          ? 'İlçe / Semt (Önce il)'
                          : `Tüm İlçeler (${districts.length})`}
                      </option>
                      {districts.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  {isMapsProviderActive ? (
                    <HeroAddressAutocomplete
                      cityId={activeHub.id}
                      center={activeBiasCenter}
                      value={deliveryAddress}
                      onChange={onChangeDeliveryAddress}
                      onSelectFormatted={(formatted) => {
                        onChangeDeliveryAddress(formatted);
                        onExploreRestaurants();
                      }}
                    />
                  ) : (
                    <div className="relative flex-1">
                      <MapPin className="w-4 h-4 text-[#D9043D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => onChangeDeliveryAddress(e.target.value)}
                        placeholder="Cadde, sokak veya açık teslimat adresinizi girin..."
                        aria-label="Teslimat adresi"
                        className="w-full pl-10 pr-3 py-2.5 min-h-[44px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-sm text-[#141413] placeholder:text-[#8A8780] focus:border-[#D9043D]"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-[#D9043D] text-white text-sm font-semibold hover:bg-[#B80032] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Restoranları Listele</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#575550] px-1">
                  <span>
                    Aktif Teslimat Bölgesi:{' '}
                    <strong className="text-[#141413]">{locationSummary}</strong>
                    {deliveryAddress.trim() ? ` · ${deliveryAddress.trim()}` : ''}
                  </span>
                  <a
                    href="#harita"
                    className="inline-flex items-center gap-1 font-medium text-[#D9043D] hover:underline whitespace-nowrap shrink-0"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Haritada Seç</span>
                  </a>
                </div>
              </form>
            </div>

            {/* Interactive global city quick-select */}
            <div id="sehirler" className="pt-5 border-t border-[#E6E4DF]">
              <p className="text-xs font-medium text-[#575550] mb-3">
                Öne çıkan küresel gastronomi merkezlerine hızlı geçiş
              </p>
              <div className="flex flex-wrap gap-2">
                {FEATURED_GLOBAL_HUBS.slice(0, 8).map((hub) => {
                  const isActive = selectedCity === hub.id;
                  return (
                    <button
                      key={hub.id}
                      type="button"
                      onClick={() => handleCityJump(hub.id)}
                      className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer border ${
                        isActive
                          ? 'bg-[#D9043D] text-white border-[#D9043D]'
                          : 'bg-white text-[#141413] border-[#E6E4DF] hover:border-[#D9043D]/60'
                      }`}
                    >
                      {hub.country} ({hub.name})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right visual anchor */}
          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[300px] lg:min-h-[440px] rounded-xl overflow-hidden bg-[#EFECE6] border border-[#E6E4DF]">
              <DishImage
                src={HERO_IMAGE}
                alt="Napoli pizzası, Tokyo nigiri sushi ve Anadolu mezelerinden oluşan dünya sofrası"
                title="Dünya Sofrası"
                className="w-full h-full object-cover lg:h-full"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                <p className="text-xs text-white/80 mb-1">
                  Tek Restorandan Hızlı Teslimat · Canlı Kurye Takibi
                </p>
                <p className="font-display text-lg font-medium leading-snug">
                  Minimum sepet avantajı ve ATLAS15 ile ilk siparişte %15 indirim.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column proof strip below the split */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-10 pt-8 border-t border-[#E6E4DF]">
          <div>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
              {CITY_HUBS.length} Ülke · 81 İl
            </p>
            <p className="text-xs text-[#575550] mt-1">
              6 kıtada tüm ülkeler, şehirler ve ilçe bazlı teslimat ağı
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
              Tek Sepet Modeli
            </p>
            <p className="text-xs text-[#575550] mt-1">
              Her restoranın kendi menüsü, min. sepet tutarı ve teslimat ücreti
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
              19–30 dk
            </p>
            <p className="text-xs text-[#575550] mt-1">
              Canlı Google Maps rotalı sıcak kurye teslimatı
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#D9043D]">
              ATLAS15
            </p>
            <p className="text-xs text-[#575550] mt-1">
              Kampanyalı restoranlarda sepette anında %15 indirim
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
