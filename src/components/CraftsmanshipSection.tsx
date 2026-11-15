import { useLanguage } from '../i18n/LanguageContext';

interface CraftsmanshipSectionProps {
  onOpenRestaurantPortal: () => void;
  onOpenExtensionStudio: () => void;
  registeredCount: number;
}

export function CraftsmanshipSection({
  onOpenRestaurantPortal,
  onOpenExtensionStudio,
  registeredCount,
}: CraftsmanshipSectionProps) {
  const { t } = useLanguage();

  const pillars = [
    {
      index: '01.',
      title: 'Yerinde ve Sipariş Anında Pişirim',
      body: 'Her restoran yalnızca kendi şehrinin teslimat çemberi içinde hizmet verir. Yemekler ön pişirme yapılmadan, sipariş onaylandığı anda taze hazırlanır.',
    },
    {
      index: '02.',
      title: 'Restoran Kuryesi & Termal Çanta Standardı',
      body: 'Siparişler doğrudan restoranın kendi kuryesiyle, ramen suyu ile erişte veya çıtır hamur ile sos ayrı termal bölmelerde taşınır.',
    },
    {
      index: '03.',
      title: 'Şeffaf Malzeme ve Yerel Para Birimi',
      body: 'Her tabağın köken hikâyesini, kalori bilgisini ve alerjen içeriğini önceden görür; dilerseniz ₺ cinsinden, dilerseniz yerel para biriminde ödeme yaparsınız.',
    },
  ];

  return (
    <section
      id="mutfak-standartlari"
      className="border-t border-[#E6E4DF] bg-white py-16"
    >
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-2">
              {t.craftEyebrow}
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl font-semibold text-[#141413] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              {t.craftTitle}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={onOpenExtensionStudio}
              className="px-4 py-2.5 min-h-[42px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-[#141413] text-sm font-medium hover:border-[#D9043D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.craftExtensionBtn}
            </button>
            <button
              type="button"
              onClick={onOpenRestaurantPortal}
              className="px-5 py-2.5 min-h-[42px] rounded-lg bg-[#D9043D] text-white text-sm font-medium hover:bg-[#B80032] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.craftPartnerBtn}{registeredCount > 0 ? ` (${registeredCount})` : ''}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {pillars.map((pillar) => (
            <div key={pillar.index} className="pt-5 border-t border-[#E6E4DF]">
              <p className="font-mono text-xs font-medium text-[#D9043D] mb-2">
                {pillar.index}
              </p>
              <h3 className="font-display text-lg font-semibold text-[#141413] mb-2.5">
                {pillar.title}
              </h3>
              <p className="text-sm text-[#575550] leading-relaxed">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
