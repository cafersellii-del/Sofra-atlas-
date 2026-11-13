export function CraftsmanshipSection() {
  const pillars = [
    {
      index: '01.',
      title: 'Yerinde ve Sipariş Anında Pişirim',
      body: 'Her restoran yalnızca kendi şehrinin teslimat çemberi içinde hizmet verir. Yemekler ön pişirme yapılmadan, sipariş onaylandığı anda taze hazırlanır.',
    },
    {
      index: '02.',
      title: 'İki Bölmeli Termal Kurye Çantaları',
      body: 'Ramen suyu ile taze erişte, çıtır hamur ile sos ayrı bölmelerde taşınır; yemek masanıza çıktığı ilk dokusunu kapınızda da korur.',
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
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-2">
            Küresel Teslimat Standardı
          </p>
          <h2
            className="font-display text-2xl sm:text-3xl font-semibold text-[#141413] tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            Restoran masası kalitesini şehirler arası standartla koruyoruz.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {pillars.map((pillar) => (
            <div key={pillar.index} className="pt-5 border-t border-[#E6E4DF]">
              <p className="font-mono text-xs font-medium text-[#1B4332] mb-2">
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
