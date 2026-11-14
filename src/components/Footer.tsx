import { CITY_HUBS, FEATURED_GLOBAL_HUBS } from '../data/catalog';
import { useLanguage } from '../i18n/LanguageContext';
import type { CityId } from '../types/food';
import { LanguageSelector } from './LanguageSelector';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterProps {
  isSignedIn: boolean;
  onSelectCity: (cityId: CityId) => void;
  onOpenOrders: () => void;
  onOpenMemberModal: () => void;
  onOpenRestaurantPortal: () => void;
  onOpenCourierPortal: () => void;
  onOpenExtensionStudio: () => void;
  onOpenAdminPanel: () => void;
}

export function Footer({
  isSignedIn,
  onSelectCity,
  onOpenOrders,
  onOpenMemberModal,
  onOpenRestaurantPortal,
  onOpenCourierPortal,
  onOpenExtensionStudio,
  onOpenAdminPanel,
}: FooterProps) {
  const { t } = useLanguage();

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
              {t.heroSubtitle}
            </p>
            <div className="mt-4">
              <PWAInstallButton variant="footer" />
            </div>
            <LanguageSelector variant="footer" />
          </div>

          <div className="md:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#575550] mb-3">
              {t.footerFeaturedTitle}
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
              {t.footerPlatformTitle}
            </p>
            <ul className="space-y-2 text-sm text-[#141413]">
              <li>
                <a
                  href="#harita"
                  className="hover:text-[#D9043D] hover:underline underline-offset-4"
                >
                  {t.footerMapLink}
                </a>
              </li>
              <li>
                <a
                  href="#restoranlar"
                  className="hover:text-[#D9043D] hover:underline underline-offset-4"
                >
                  {t.navRestaurants}
                </a>
              </li>
              <li>
                <a
                  href="#mutfak-standartlari"
                  className="hover:text-[#D9043D] hover:underline underline-offset-4"
                >
                  {t.footerStandardsLink}
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenMemberModal}
                  className="hover:text-[#D9043D] hover:underline underline-offset-4 cursor-pointer"
                >
                  {isSignedIn ? t.myAccount : t.memberLogin}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="hover:text-[#D9043D] hover:underline underline-offset-4 cursor-pointer"
                >
                  {t.footerOrdersLink}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenRestaurantPortal}
                  className="text-[#D9043D] font-medium hover:underline underline-offset-4 cursor-pointer"
                >
                  {t.navRestaurantPortal}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenCourierPortal}
                  className="text-[#D9043D] font-medium hover:underline underline-offset-4 cursor-pointer"
                >
                  {t.footerCourierLink}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenExtensionStudio}
                  className="hover:text-[#D9043D] hover:underline underline-offset-4 cursor-pointer"
                >
                  {t.footerExtensionLink}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenAdminPanel}
                  className="hover:text-[#D9043D] hover:underline underline-offset-4 cursor-pointer"
                >
                  {t.navAdmin}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#575550]">
          <p>{t.footerRights} ({CITY_HUBS.length})</p>
          <p>{t.footerNote}</p>
        </div>
      </div>
    </footer>
  );
}
