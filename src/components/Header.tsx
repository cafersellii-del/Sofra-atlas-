import { ShoppingBag } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  activeOrderCount: number;
  onOpenCart: () => void;
  onOpenOrders: () => void;
}

export function Header({
  cartCount,
  activeOrderCount,
  onOpenCart,
  onOpenOrders,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F7]/95 backdrop-blur-sm border-b border-[#E6E4DF]">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <a
          href="#top"
          className="font-display text-xl font-semibold tracking-tight text-[#141413] whitespace-nowrap shrink-0"
        >
          Sofra Atlas
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav
          aria-label="Ana menü"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#575550]"
        >
          <a
            href="#menu-katalog"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Keşfet
          </a>
          <a
            href="#sehirler"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Şehirler
          </a>
          <a
            href="#mutfak-standartlari"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Mutfaklar
          </a>
          <button
            type="button"
            onClick={onOpenOrders}
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Siparişlerim{activeOrderCount > 0 ? ` (${activeOrderCount})` : ''}
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-[#1B4332] text-white text-sm font-medium hover:bg-[#143326] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            <span>Sepetim</span>
            <span className="font-mono tabular-nums text-xs bg-white/15 px-1.5 py-0.5 rounded">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
