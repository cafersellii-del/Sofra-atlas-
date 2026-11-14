import { ShoppingBag } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  activeOrderCount: number;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onOpenRestaurantPortal: () => void;
  onOpenAdminPanel: () => void;
}

export function Header({
  cartCount,
  activeOrderCount,
  onOpenCart,
  onOpenOrders,
  onOpenRestaurantPortal,
  onOpenAdminPanel,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E6E4DF]">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
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
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#575550]"
        >
          <a
            href="#restoranlar"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Restoranlar
          </a>
          <a
            href="#harita"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Harita
          </a>
          <button
            type="button"
            onClick={onOpenOrders}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Siparişlerim{activeOrderCount > 0 ? ` (${activeOrderCount})` : ''}
          </button>
          <button
            type="button"
            onClick={onOpenRestaurantPortal}
            className="text-[#D9043D] hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Restoran Üyeliği
          </button>
          <button
            type="button"
            onClick={onOpenAdminPanel}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Yönetici Paneli
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-[#D9043D] text-white text-sm font-medium hover:bg-[#B80032] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            <span>Sepetim</span>
            <span className="font-mono tabular-nums text-xs bg-white/20 px-1.5 py-0.5 rounded">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
