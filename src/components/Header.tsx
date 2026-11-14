import { useState } from 'react';
import type { User } from 'firebase/auth';
import { ShoppingBag, User as UserIcon } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  cartCount: number;
  activeOrderCount: number;
  currentUser: User | null;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenMemberModal: () => void;
  onOpenRestaurantPortal: () => void;
  onOpenAdminPanel: () => void;
}

export function Header({
  cartCount,
  activeOrderCount,
  currentUser,
  onOpenCart,
  onOpenOrders,
  onOpenMemberModal,
  onOpenRestaurantPortal,
  onOpenAdminPanel,
}: HeaderProps) {
  const { t } = useLanguage();
  const [avatarError, setAvatarError] = useState(false);
  const firstName =
    currentUser?.displayName?.trim().split(/\s+/)[0] ||
    currentUser?.email?.split('@')[0] ||
    t.myAccount;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E6E4DF]">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-3 md:gap-6">
        {/* Zone 1: Single-element brand wordmark */}
        <a
          href="#top"
          className="font-display text-xl font-semibold tracking-tight text-[#D9043D] whitespace-nowrap shrink-0"
        >
          Sofra Atlas
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Ana menü"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#575550]"
        >
          <a
            href="#restoranlar"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.navRestaurants}
          </a>
          <a
            href="#harita"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.navMap}
          </a>
          <button
            type="button"
            onClick={onOpenOrders}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.navOrders}{activeOrderCount > 0 ? ` (${activeOrderCount})` : ''}
          </button>
          <button
            type="button"
            onClick={onOpenRestaurantPortal}
            className="text-[#D9043D] hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.navRestaurantPortal}
          </button>
          <button
            type="button"
            onClick={onOpenAdminPanel}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.navAdmin}
          </button>
        </nav>

        {/* Zone 3: Primary actions (Language Selector + Member Auth + PWA Download + Cart) */}
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSelector variant="header" />

          <button
            type="button"
            onClick={onOpenMemberModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-[#141413] text-xs font-semibold hover:border-[#D9043D] hover:text-[#D9043D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {currentUser ? (
              <>
                {currentUser.photoURL && !avatarError ? (
                  <img
                    src={currentUser.photoURL}
                    alt={firstName}
                    onError={() => setAvatarError(true)}
                    className="w-5 h-5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-[#D9043D] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[84px] truncate">{firstName}</span>
              </>
            ) : (
              <>
                <UserIcon className="w-4 h-4 text-[#D9043D] shrink-0" />
                <span className="hidden sm:inline">{t.memberLogin}</span>
              </>
            )}
          </button>

          <PWAInstallButton variant="header" />

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-sm font-medium hover:bg-[#B80032] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            <span className="hidden sm:inline">{t.myCart}</span>
            <span className="font-mono tabular-nums text-xs bg-white/20 px-1.5 py-0.5 rounded">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}


