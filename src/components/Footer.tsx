import { CITY_HUBS } from '../data/catalog';
import type { CityId } from '../types/food';

interface FooterProps {
  onSelectCity: (cityId: CityId) => void;
  onOpenOrders: () => void;
}

export function Footer({ onSelectCity, onOpenOrders }: FooterProps) {
  return (
    <footer className="border-t border-[#E6E4DF] bg-[#FAF9F7] py-12">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#E6E4DF]">
          <div className="md:col-span-5">
            <a
              href="#top"
              className="font-display text-xl font-semibold text-[#141413]"
            >
              Sofra Atlas
            </a>
            <p className="text-sm text-[#575550] mt-3 max-w-sm leading-relaxed">
              Altı dünya başkentinde yerel şef mutfaklarını tek bir yemek siparişi
              deneyiminde buluşturan küresel gastronomi platformu.
            </p>
          </div>

          <div className="md:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#575550] mb-3">
              Teslimat Şehirleri
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CITY_HUBS.map((hub) => (
                <a
                  key={hub.id}
                  href="#menu-katalog"
                  onClick={() => onSelectCity(hub.id)}
                  className="text-sm text-[#141413] hover:text-[#1B4332] hover:underline underline-offset-4"
                >
                  {hub.name}
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#575550] mb-3">
              Platform
            </p>
            <ul className="space-y-2 text-sm text-[#141413]">
              <li>
                <a
                  href="#menu-katalog"
                  className="hover:text-[#1B4332] hover:underline underline-offset-4"
                >
                  Menü Kataloğu
                </a>
              </li>
              <li>
                <a
                  href="#mutfak-standartlari"
                  className="hover:text-[#1B4332] hover:underline underline-offset-4"
                >
                  Teslimat Standardı
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="hover:text-[#1B4332] hover:underline underline-offset-4 cursor-pointer"
                >
                  Sipariş Takibi
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#575550]">
          <p>© 2026 Sofra Atlas. Tüm hakları saklıdır.</p>
          <p>Ücretsiz teslimat ve yerel para birimi desteği seçili şehir merkezlerinde geçerlidir.</p>
        </div>
      </div>
    </footer>
  );
}
