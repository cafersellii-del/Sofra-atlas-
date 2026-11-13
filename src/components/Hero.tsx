import { ArrowRight, MapPin } from 'lucide-react';
import { CITY_HUBS, HERO_IMAGE } from '../data/catalog';
import type { CityId } from '../types/food';
import { DishImage } from './DishImage';

interface HeroProps {
  selectedCity: CityId;
  onSelectCity: (cityId: CityId) => void;
  onExploreMenu: () => void;
}

export function Hero({ selectedCity, onSelectCity, onExploreMenu }: HeroProps) {
  const activeHub =
    selectedCity === 'all'
      ? CITY_HUBS[0]
      : CITY_HUBS.find((hub) => hub.id === selectedCity) ?? CITY_HUBS[0];

  const handleCityJump = (cityId: Exclude<CityId, 'all'>) => {
    onSelectCity(cityId);
    onExploreMenu();
  };

  return (
    <section id="top" className="border-b border-[#E6E4DF] bg-[#FAF9F7]">
      <div className="max-w-[1280px] mx-auto px-6 pt-10 pb-12 lg:pt-14 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left editorial column */}
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-medium tracking-wider uppercase text-[#575550] mb-4">
                6 Dünya Başkenti · Seçkin Yerel Mutfaklar
              </p>

              <h1
                className="font-display font-semibold text-[#141413] tracking-tight leading-[1.08] mb-5"
                style={{
                  fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)',
                  textWrap: 'balance',
                }}
              >
                Dünyanın imza sofraları bulunduğunuz şehirde.
              </h1>

              <p className="text-base text-[#575550] leading-relaxed max-w-xl mb-8">
                İstanbul’un odun ateşinden Tokyo’nun 18 saatlik ramen kazanlarına,
                Napoli taş fırınlarından Paris bistro mutfaklarına kadar yerel şeflerin
                hazırladığı tabakları sıcak ve taze teslim alın.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-10">
                <button
                  type="button"
                  onClick={onExploreMenu}
                  className="inline-flex items-center gap-2.5 px-6 py-3 min-h-[44px] rounded-lg bg-[#1B4332] text-white text-sm font-medium hover:bg-[#143326] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Menüleri Keşfet</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <div className="flex items-center gap-2 text-sm text-[#575550]">
                  <MapPin className="w-4 h-4 text-[#1B4332] shrink-0" />
                  <span>
                    Aktif bölge:{' '}
                    <strong className="font-semibold text-[#141413]">
                      {selectedCity === 'all' ? 'Tüm Dünya Mutfakları' : `${activeHub.name}, ${activeHub.country}`}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive global city quick-select */}
            <div id="sehirler" className="pt-6 border-t border-[#E6E4DF]">
              <p className="text-xs font-medium text-[#575550] mb-3">
                Teslimat şehrini seçerek o şehrin mutfaklarına odaklanın
              </p>
              <div className="flex flex-wrap gap-2">
                {CITY_HUBS.map((hub) => {
                  const isActive = selectedCity === hub.id;
                  return (
                    <button
                      key={hub.id}
                      type="button"
                      onClick={() => handleCityJump(hub.id)}
                      className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer border ${
                        isActive
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-white text-[#141413] border-[#E6E4DF] hover:border-[#1B4332]/50'
                      }`}
                    >
                      {hub.name}
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
              <div
                className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white"
              >
                <p className="text-xs text-white/80 mb-1">
                  Haftanın Küresel Seçkisi · İstanbul · Tokyo · Napoli
                </p>
                <p className="font-display text-lg font-medium leading-snug">
                  Aynı özen, altı başkentte standart ısı korumalı teslimat.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column proof strip below the split */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-10 pt-8 border-t border-[#E6E4DF]">
          <div>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
              6 Şehir
            </p>
            <p className="text-xs text-[#575550] mt-1">
              İstanbul, Tokyo, Napoli, Paris, Bangkok, New York
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
              220+ Mutfak
            </p>
            <p className="text-xs text-[#575550] mt-1">
              Ön elemeden geçmiş yerel şef restoranları
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
              24 dk
            </p>
            <p className="text-xs text-[#575550] mt-1">
              Şehir içi ortalama sıcak teslimat süresi
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl font-semibold text-[#141413]">
              650 ₺+
            </p>
            <p className="text-xs text-[#575550] mt-1">
              Seçili şehir merkezlerinde ücretsiz kurye teslimatı
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
