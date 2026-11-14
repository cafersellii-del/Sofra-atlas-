import { CITY_HUBS, FEATURED_GLOBAL_HUBS } from '../data/catalog';
import type { CityId } from '../types/food';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterProps {
  onSelectCity: (cityId: CityId) => void;
  onOpenOrders: () => void;
  onOpenRestaurantPortal: () => void;
  onOpenExtensionStudio: () => void;
  onOpenAdminPanel: () => void;
}

export function Footer({
  onSelectCity,
  onOpenOrders,
  onOpenRestaurantPortal,
  onOpenExtensionStudio,
  onOpenAdminPanel,
}: FooterProps) {
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
              6 kıtada {CITY_HUBS.length} ülkeden yerel şef mutfaklarını tek
              bir online yemek siparişi deneyiminde buluşturan küresel
              gastronomi ağı.
            </p>
            <div className="mt-4">
              <PWAInstallButton variant="footer" />
            </div>
          </div>

          <div className="md:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#575550] mb-3">
              Öne Çıkan Teslimat Ülkeleri
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FEATURED_GLOBAL_HUBS.slice(0, 10).map((hub) => (
                <a
                  key={hub.id}
                  href="#restoranlar"
                  onClick={() => onSelectCity(hub.id)}
                  className="text-sm text-[#141413] hover:text-[#D9043D] hover:underline underline-offset-4"
                >
                  {hub.country} ({hub.name})
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
                  href="#harita"
                  className="hover:text-[#D9043D] hover:underline underline-offset-4"
                >
                  Küresel Harita (Google Maps)
                </a>
              </li>
              <li>
                <a
                  href="#restoranlar"
                  className="hover:text-[#D9043D] hover:underline underline-offset-4"
                >
                  Restoranlar & Menüler
                </a>
              </li>
              <li>
                <a
                  href="#mutfak-standartlari"
                  className="hover:text-[#D9043D] hover:underline underline-offset-4"
                >
                  Teslimat Standardı
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="hover:text-[#D9043D] hover:underline underline-offset-4 cursor-pointer"
                >
                  Sipariş Takibi
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenRestaurantPortal}
                  className="text-[#D9043D] font-medium hover:underline underline-offset-4 cursor-pointer"
                >
                  Restoran Üyeliği
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenExtensionStudio}
                  className="hover:text-[#D9043D] hover:underline underline-offset-4 cursor-pointer"
                >
                  Web Sitesi Uzantısı
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenAdminPanel}
                  className="hover:text-[#D9043D] hover:underline underline-offset-4 cursor-pointer"
                >
                  Yönetici Paneli
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
