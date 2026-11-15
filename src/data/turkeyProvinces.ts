export interface ProvinceLocation {
  name: string;
  center: { lat: number; lng: number };
  districts: string[];
}

// Türkiye'nin 81 İli, tüm resmi ilçeleri ve öne çıkan semt & mahalleleri
export const TURKEY_PROVINCES: ProvinceLocation[] = [
  {
    name: 'İstanbul',
    center: { lat: 41.0082, lng: 28.9784 },
    districts: [
      'Karaköy', 'Nişantaşı', 'Moda / Kadıköy', 'Bebek', 'Cihangir',
      'Etiler', 'Levent', 'Suadiye', 'Bağdat Caddesi', 'Taksim', 'Galata',
      'Ortaköy', 'Bomonti', 'Fenerbahçe', 'Caddebostan', 'Acıbadem',
      'Koşuyolu', 'Kuzguncuk', 'Çengelköy', 'Maslak', 'Göktürk', 'Ataköy',
      'Florya', 'Yeşilköy', 'Balat', 'Sultanahmet', 'Emirgan', 'İstinye',
      'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
      'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
      'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
      'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
      'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
      'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
      'Ümraniye', 'Üsküdar', 'Zeytinburnu',
    ],
  },
  {
    name: 'Ankara',
    center: { lat: 39.9334, lng: 32.8597 },
    districts: [
      'Kızılay', 'Tunalı Hilmi', 'Çayyolu', 'Ümitköy', 'Bahçelievler Mah.',
      'Balgat', 'Söğütözü', 'Kavaklıdere', 'Gaziosmanpaşa (GOP)', 'Ayrancı',
      'Batıkent', 'Eryaman', 'Oran', 'Ulus', 'Akyurt', 'Altındağ', 'Ayaş',
      'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya', 'Çubuk', 'Elmadağ',
      'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana', 'Kahramankazan',
      'Kalecik', 'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan', 'Polatlı',
      'Pursaklar', 'Sincan', 'Şereflikoçhisar', 'Yenimahalle',
    ],
  },
  {
    name: 'İzmir',
    center: { lat: 38.4237, lng: 27.1428 },
    districts: [
      'Alsancak', 'Kordon', 'Bostanlı', 'Mavişehir', 'Göztepe', 'Güzelyalı',
      'Kemeraltı', 'Alaçatı', 'Ilıca', 'Küçükpark', 'Aliağa', 'Balçova',
      'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova', 'Buca', 'Çeşme',
      'Çiğli', 'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe', 'Karabağlar',
      'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz', 'Konak',
      'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş', 'Seferihisar', 'Selçuk',
      'Tire', 'Torbalı', 'Urla',
    ],
  },
  {
    name: 'Adana',
    center: { lat: 37.0, lng: 35.3213 },
    districts: [
      'Ziyapaşa', 'Barajyolu', 'Turgut Özal', 'Gazipaşa', 'Güzelyalı Mah.',
      'Aladağ', 'Ceyhan', 'Çukurova', 'Feke', 'İmamoğlu', 'Karaisalı',
      'Karataş', 'Kozan', 'Pozantı', 'Saimbeyli', 'Sarıçam', 'Seyhan',
      'Tufanbeyli', 'Yumurtalık', 'Yüreğir',
    ],
  },
  {
    name: 'Adıyaman',
    center: { lat: 37.7648, lng: 38.2786 },
    districts: [
      'Besni', 'Çelikhan', 'Gerger', 'Gölbaşı', 'Kahta', 'Merkez', 'Samsat',
      'Sincik', 'Tut',
    ],
  },
  {
    name: 'Afyonkarahisar',
    center: { lat: 38.7507, lng: 30.5567 },
    districts: [
      'Başmakçı', 'Bayat', 'Bolvadin', 'Çay', 'Çobanlar', 'Dazkırı', 'Dinar',
      'Emirdağ', 'Evciler', 'Hocalar', 'İhsaniye', 'İscehisar', 'Kızılören',
      'Merkez', 'Sandıklı', 'Sinanpaşa', 'Sultandağı', 'Şuhut',
    ],
  },
  {
    name: 'Ağrı',
    center: { lat: 39.7191, lng: 43.0503 },
    districts: [
      'Diyadin', 'Doğubayazıt', 'Eleşkirt', 'Hamur', 'Merkez', 'Patnos',
      'Taşlıçay', 'Tutak',
    ],
  },
  {
    name: 'Aksaray',
    center: { lat: 38.3687, lng: 34.037 },
    districts: [
      'Ağaçören', 'Eskil', 'Gülağaç', 'Güzelyurt', 'Merkez', 'Ortaköy',
      'Sarıyahşi', 'Sultanhanı',
    ],
  },
  {
    name: 'Amasya',
    center: { lat: 40.6499, lng: 35.8353 },
    districts: [
      'Göynücek', 'Gümüşhacıköy', 'Hamamözü', 'Merkez', 'Merzifon', 'Suluova',
      'Taşova',
    ],
  },
  {
    name: 'Antalya',
    center: { lat: 36.8969, lng: 30.7133 },
    districts: [
      'Kaleiçi', 'Lara', 'Konyaaltı Liman', 'Işıklar', 'Belek', 'Side',
      'Akseki', 'Aksu', 'Alanya', 'Demre', 'Döşemealtı', 'Elmalı', 'Finike',
      'Gazipaşa', 'Gündoğmuş', 'İbradı', 'Kaş', 'Kemer', 'Kepez', 'Konyaaltı',
      'Korkuteli', 'Kumluca', 'Manavgat', 'Muratpaşa', 'Serik',
    ],
  },
  {
    name: 'Ardahan',
    center: { lat: 41.1105, lng: 42.7022 },
    districts: ['Çıldır', 'Damal', 'Göle', 'Hanak', 'Merkez', 'Posof'],
  },
  {
    name: 'Artvin',
    center: { lat: 41.1828, lng: 41.8183 },
    districts: [
      'Ardanuç', 'Arhavi', 'Borçka', 'Hopa', 'Kemalpaşa', 'Merkez', 'Murgul',
      'Şavşat', 'Yusufeli',
    ],
  },
  {
    name: 'Aydın',
    center: { lat: 37.856, lng: 27.8416 },
    districts: [
      'Bozdoğan', 'Buharkent', 'Çine', 'Didim', 'Efeler', 'Germencik',
      'İncirliova', 'Karacasu', 'Karpuzlu', 'Koçarlı', 'Köşk', 'Kuşadası',
      'Kuyucak', 'Nazilli', 'Söke', 'Sultanhisar', 'Yenipazar',
    ],
  },
  {
    name: 'Balıkesir',
    center: { lat: 39.6484, lng: 27.8826 },
    districts: [
      'Altıeylül', 'Ayvalık', 'Balya', 'Bandırma', 'Bigadiç', 'Burhaniye',
      'Dursunbey', 'Edremit', 'Erdek', 'Gömeç', 'Gönen', 'Havran', 'İvrindi',
      'Karesi', 'Kepsut', 'Manyas', 'Marmara', 'Savaştepe', 'Sındırgı',
      'Susurluk',
    ],
  },
  {
    name: 'Bartın',
    center: { lat: 41.6344, lng: 32.3375 },
    districts: ['Amasra', 'Kurucaşile', 'Merkez', 'Ulus'],
  },
  {
    name: 'Batman',
    center: { lat: 37.8812, lng: 41.1351 },
    districts: ['Beşiri', 'Gercüş', 'Hasankeyf', 'Kozluk', 'Merkez', 'Sason'],
  },
  {
    name: 'Bayburt',
    center: { lat: 40.2552, lng: 40.2249 },
    districts: ['Aydıntepe', 'Demirözü', 'Merkez'],
  },
  {
    name: 'Bilecik',
    center: { lat: 40.1501, lng: 29.983 },
    districts: [
      'Bozüyük', 'Gölpazarı', 'İnhisar', 'Merkez', 'Osmaneli', 'Pazaryeri',
      'Söğüt', 'Yenipazar',
    ],
  },
  {
    name: 'Bingöl',
    center: { lat: 38.8855, lng: 40.4966 },
    districts: [
      'Adaklı', 'Genç', 'Karlıova', 'Kiğı', 'Merkez', 'Solhan', 'Yayladere',
      'Yedisu',
    ],
  },
  {
    name: 'Bitlis',
    center: { lat: 38.4006, lng: 42.1095 },
    districts: [
      'Adilcevaz', 'Ahlat', 'Güroymak', 'Hizan', 'Merkez', 'Mutki', 'Tatvan',
    ],
  },
  {
    name: 'Bolu',
    center: { lat: 40.7392, lng: 31.6089 },
    districts: [
      'Dörtdivan', 'Gerede', 'Göynük', 'Kıbrıscık', 'Mengen', 'Merkez',
      'Mudurnu', 'Seben', 'Yeniçağa',
    ],
  },
  {
    name: 'Burdur',
    center: { lat: 37.7203, lng: 30.2908 },
    districts: [
      'Ağlasun', 'Altınyayla', 'Bucak', 'Çavdır', 'Çeltikçi', 'Gölhisar',
      'Karamanlı', 'Kemer', 'Merkez', 'Tefenni', 'Yeşilova',
    ],
  },
  {
    name: 'Bursa',
    center: { lat: 40.1885, lng: 29.061 },
    districts: [
      'Özlüce', 'Bademli', 'Görükle', 'FSM Bulvarı', 'Çekirge', 'Heykel',
      'Büyükorhan', 'Gemlik', 'Gürsu', 'Harmancık', 'İnegöl', 'İznik',
      'Karacabey', 'Keles', 'Kestel', 'Mudanya', 'Mustafakemalpaşa', 'Nilüfer',
      'Orhaneli', 'Orhangazi', 'Osmangazi', 'Yenişehir', 'Yıldırım',
    ],
  },
  {
    name: 'Çanakkale',
    center: { lat: 40.1553, lng: 26.4142 },
    districts: [
      'Ayvacık', 'Bayramiç', 'Biga', 'Bozcaada', 'Çan', 'Eceabat', 'Ezine',
      'Gelibolu', 'Gökçeada', 'Lapseki', 'Merkez', 'Yenice',
    ],
  },
  {
    name: 'Çankırı',
    center: { lat: 40.6013, lng: 33.6134 },
    districts: [
      'Atkaracalar', 'Bayramören', 'Çerkeş', 'Eldivan', 'Ilgaz', 'Kızılırmak',
      'Korgun', 'Kurşunlu', 'Merkez', 'Orta', 'Şabanözü', 'Yapraklı',
    ],
  },
  {
    name: 'Çorum',
    center: { lat: 40.5506, lng: 34.9556 },
    districts: [
      'Alaca', 'Bayat', 'Boğazkale', 'Dodurga', 'İskilip', 'Kargı', 'Laçin',
      'Mecitözü', 'Merkez', 'Oğuzlar', 'Ortaköy', 'Osmancık', 'Sungurlu',
      'Uğurludağ',
    ],
  },
  {
    name: 'Denizli',
    center: { lat: 37.7765, lng: 29.0864 },
    districts: [
      'Acıpayam', 'Babadağ', 'Baklan', 'Bekilli', 'Beyağaç', 'Bozkurt', 'Buldan',
      'Çal', 'Çameli', 'Çardak', 'Çivril', 'Güney', 'Honaz', 'Kale',
      'Merkezefendi', 'Pamukkale', 'Sarayköy', 'Serinhisar', 'Tavas',
    ],
  },
  {
    name: 'Diyarbakır',
    center: { lat: 37.9144, lng: 40.2306 },
    districts: [
      'Bağlar', 'Bismil', 'Çermik', 'Çınar', 'Çüngüş', 'Dicle', 'Eğil',
      'Ergani', 'Hani', 'Hazro', 'Kayapınar', 'Kocaköy', 'Kulp', 'Lice',
      'Silvan', 'Sur', 'Yenişehir',
    ],
  },
  {
    name: 'Düzce',
    center: { lat: 40.8438, lng: 31.1565 },
    districts: [
      'Akçakoca', 'Cumayeri', 'Çilimli', 'Gölyaka', 'Gümüşova', 'Kaynaşlı',
      'Merkez', 'Yığılca',
    ],
  },
  {
    name: 'Edirne',
    center: { lat: 41.6771, lng: 26.5557 },
    districts: [
      'Enez', 'Havsa', 'İpsala', 'Keşan', 'Lalapaşa', 'Meriç', 'Merkez',
      'Süloğlu', 'Uzunköprü',
    ],
  },
  {
    name: 'Elazığ',
    center: { lat: 38.681, lng: 39.2264 },
    districts: [
      'Ağın', 'Alacakaya', 'Arıcak', 'Baskil', 'Karakoçan', 'Keban',
      'Kovancılar', 'Maden', 'Merkez', 'Palu', 'Sivrice',
    ],
  },
  {
    name: 'Erzincan',
    center: { lat: 39.75, lng: 39.5 },
    districts: [
      'Çayırlı', 'İliç', 'Kemah', 'Kemaliye', 'Merkez', 'Otlukbeli', 'Refahiye',
      'Tercan', 'Üzümlü',
    ],
  },
  {
    name: 'Erzurum',
    center: { lat: 39.9, lng: 41.27 },
    districts: [
      'Aşkale', 'Aziziye', 'Çat', 'Hınıs', 'Horasan', 'İspir', 'Karaçoban',
      'Karayazı', 'Köprüköy', 'Narman', 'Oltu', 'Olur', 'Palandöken',
      'Pasinler', 'Pazaryolu', 'Şenkaya', 'Tekman', 'Tortum', 'Uzundere',
      'Yakutiye',
    ],
  },
  {
    name: 'Eskişehir',
    center: { lat: 39.7767, lng: 30.5206 },
    districts: [
      'Bağlar Mah.', 'Adalar / Porsuk', 'Vişnelik', 'Batıkent Mah.',
      'Alpu', 'Beylikova', 'Çifteler', 'Günyüzü', 'Han', 'İnönü', 'Mahmudiye',
      'Mihalgazi', 'Mihalıççık', 'Odunpazarı', 'Sarıcakaya', 'Seyitgazi',
      'Sivrihisar', 'Tepebaşı',
    ],
  },
  {
    name: 'Gaziantep',
    center: { lat: 37.0662, lng: 37.3833 },
    districts: [
      'İbrahimli', 'Batıkent Mah.', 'Gazimuhtarpaşa', 'Kalealtı', 'Karataş',
      'Araban', 'İslahiye', 'Karkamış', 'Nizip', 'Nurdağı', 'Oğuzeli',
      'Şahinbey', 'Şehitkamil', 'Yavuzeli',
    ],
  },
  {
    name: 'Giresun',
    center: { lat: 40.9128, lng: 38.3895 },
    districts: [
      'Alucra', 'Bulancak', 'Çamoluk', 'Çanakçı', 'Dereli', 'Doğankent',
      'Espiye', 'Eynesil', 'Görele', 'Güce', 'Keşap', 'Merkez', 'Piraziz',
      'Şebinkarahisar', 'Tirebolu', 'Yağlıdere',
    ],
  },
  {
    name: 'Gümüşhane',
    center: { lat: 40.4386, lng: 39.5086 },
    districts: ['Kelkit', 'Köse', 'Kürtün', 'Merkez', 'Şiran', 'Torul'],
  },
  {
    name: 'Hakkari',
    center: { lat: 37.5744, lng: 43.7408 },
    districts: ['Çukurca', 'Derecik', 'Merkez', 'Şemdinli', 'Yüksekova'],
  },
  {
    name: 'Hatay',
    center: { lat: 36.2023, lng: 36.1613 },
    districts: [
      'Altınözü', 'Antakya', 'Arsuz', 'Belen', 'Defne', 'Dörtyol', 'Erzin',
      'Hassa', 'İskenderun', 'Kırıkhan', 'Kumlu', 'Payas', 'Reyhanlı',
      'Samandağ', 'Yayladağı',
    ],
  },
  {
    name: 'Iğdır',
    center: { lat: 39.9167, lng: 44.0333 },
    districts: ['Aralık', 'Karakoyunlu', 'Merkez', 'Tuzluca'],
  },
  {
    name: 'Isparta',
    center: { lat: 37.7648, lng: 30.5566 },
    districts: [
      'Aksu', 'Atabey', 'Eğirdir', 'Gelendost', 'Gönen', 'Keçiborlu', 'Merkez',
      'Senirkent', 'Sütçüler', 'Şarkikaraağaç', 'Uluborlu', 'Yalvaç',
      'Yenişarbademli',
    ],
  },
  {
    name: 'Kahramanmaraş',
    center: { lat: 37.5858, lng: 36.9371 },
    districts: [
      'Afşin', 'Andırın', 'Çağlayancerit', 'Dulkadiroğlu', 'Ekinözü',
      'Elbistan', 'Göksun', 'Nurhak', 'Onikişubat', 'Pazarcık', 'Türkoğlu',
    ],
  },
  {
    name: 'Karabük',
    center: { lat: 41.2061, lng: 32.6204 },
    districts: [
      'Eflani', 'Eskipazar', 'Merkez', 'Ovacık', 'Safranbolu', 'Yenice',
    ],
  },
  {
    name: 'Karaman',
    center: { lat: 37.1759, lng: 33.2287 },
    districts: [
      'Ayrancı', 'Başyayla', 'Ermenek', 'Kazımkarabekir', 'Merkez', 'Sarıveliler',
    ],
  },
  {
    name: 'Kars',
    center: { lat: 40.6167, lng: 43.1 },
    districts: [
      'Akyaka', 'Arpaçay', 'Digor', 'Kağızman', 'Merkez', 'Sarıkamış', 'Selim',
      'Susuz',
    ],
  },
  {
    name: 'Kastamonu',
    center: { lat: 41.3887, lng: 33.7827 },
    districts: [
      'Abana', 'Ağlı', 'Araç', 'Azdavay', 'Bozkurt', 'Cide', 'Çatalzeytin',
      'Daday', 'Devrekani', 'Doğanyurt', 'Hanönü', 'İhsangazi', 'İnebolu',
      'Küre', 'Merkez', 'Pınarbaşı', 'Seydiler', 'Şenpazar', 'Taşköprü', 'Tosya',
    ],
  },
  {
    name: 'Kayseri',
    center: { lat: 38.7312, lng: 35.4787 },
    districts: [
      'Akkışla', 'Bünyan', 'Develi', 'Felahiye', 'Hacılar', 'İncesu',
      'Kocasinan', 'Melikgazi', 'Özvatan', 'Pınarbaşı', 'Sarıoğlan', 'Sarız',
      'Talas', 'Tomarza', 'Yahyalı', 'Yeşilhisar',
    ],
  },
  {
    name: 'Kırıkkale',
    center: { lat: 39.8468, lng: 33.5153 },
    districts: [
      'Bahşılı', 'Balışeyh', 'Çelebi', 'Delice', 'Karakeçili', 'Keskin',
      'Merkez', 'Sulakyurt', 'Yahşihan',
    ],
  },
  {
    name: 'Kırklareli',
    center: { lat: 41.7333, lng: 27.2167 },
    districts: [
      'Babaeski', 'Demirköy', 'Kofçaz', 'Lüleburgaz', 'Merkez', 'Pehlivanköy',
      'Pınarhisar', 'Vize',
    ],
  },
  {
    name: 'Kırşehir',
    center: { lat: 39.1425, lng: 34.1709 },
    districts: [
      'Akçakent', 'Akpınar', 'Boztepe', 'Çiçekdağı', 'Kaman', 'Merkez', 'Mucur',
    ],
  },
  {
    name: 'Kilis',
    center: { lat: 36.7184, lng: 37.1212 },
    districts: ['Elbeyli', 'Merkez', 'Musabeyli', 'Polateli'],
  },
  {
    name: 'Kocaeli',
    center: { lat: 40.8533, lng: 29.8815 },
    districts: [
      'Başiskele', 'Çayırova', 'Darıca', 'Derince', 'Dilovası', 'Gebze',
      'Gölcük', 'İzmit', 'Kandıra', 'Karamürsel', 'Kartepe', 'Körfez',
    ],
  },
  {
    name: 'Konya',
    center: { lat: 37.8713, lng: 32.4846 },
    districts: [
      'Ahırlı', 'Akören', 'Akşehir', 'Altınekin', 'Beyşehir', 'Bozkır',
      'Cihanbeyli', 'Çeltik', 'Çumra', 'Derbent', 'Derebucak', 'Doğanhisar',
      'Emirgazi', 'Ereğli', 'Güneysınır', 'Hadim', 'Halkapınar', 'Hüyük',
      'Ilgın', 'Kadınhanı', 'Karapınar', 'Karatay', 'Kulu', 'Meram', 'Sarayönü',
      'Selçuklu', 'Seydişehir', 'Taşkent', 'Tuzlukçu', 'Yalıhüyük', 'Yunak',
    ],
  },
  {
    name: 'Kütahya',
    center: { lat: 39.4167, lng: 29.9833 },
    districts: [
      'Altıntaş', 'Aslanapa', 'Çavdarhisar', 'Domaniç', 'Dumlupınar', 'Emet',
      'Gediz', 'Hisarcık', 'Merkez', 'Pazarlar', 'Simav', 'Şaphane', 'Tavşanlı',
    ],
  },
  {
    name: 'Malatya',
    center: { lat: 38.3552, lng: 38.3095 },
    districts: [
      'Akçadağ', 'Arapgir', 'Arguvan', 'Battalgazi', 'Darende', 'Doğanşehir',
      'Doğanyol', 'Hekimhan', 'Kale', 'Kuluncak', 'Pütürge', 'Yazıhan',
      'Yeşilyurt',
    ],
  },
  {
    name: 'Manisa',
    center: { lat: 38.6191, lng: 27.4289 },
    districts: [
      'Ahmetli', 'Akhisar', 'Alaşehir', 'Demirci', 'Gölmarmara', 'Gördes',
      'Kırkağaç', 'Köprübaşı', 'Kula', 'Salihli', 'Sarıgöl', 'Saruhanlı',
      'Selendi', 'Soma', 'Şehzadeler', 'Turgutlu', 'Yunusemre',
    ],
  },
  {
    name: 'Mardin',
    center: { lat: 37.3212, lng: 40.7245 },
    districts: [
      'Artuklu', 'Dargeçit', 'Derik', 'Kızıltepe', 'Mazıdağı', 'Midyat',
      'Nusaybin', 'Ömerli', 'Savur', 'Yeşilli',
    ],
  },
  {
    name: 'Mersin',
    center: { lat: 36.8, lng: 34.6333 },
    districts: [
      'Pozcu', 'Kushimoto Sokağı', 'Mezitli Sahil', 'Viranşehir',
      'Akdeniz', 'Anamur', 'Aydıncık', 'Bozyazı', 'Çamlıyayla', 'Erdemli',
      'Gülnar', 'Mezitli', 'Mut', 'Silifke', 'Tarsus', 'Toroslar', 'Yenişehir',
    ],
  },
  {
    name: 'Muğla',
    center: { lat: 37.2153, lng: 28.3636 },
    districts: [
      'Yalıkavak', 'Türkbükü', 'Gümbet', 'Turgutreis', 'Göcek', 'Ölüdeniz', 'Akyaka',
      'Bodrum', 'Dalaman', 'Datça', 'Fethiye', 'Kavaklıdere', 'Köyceğiz',
      'Marmaris', 'Menteşe', 'Milas', 'Ortaca', 'Seydikemer', 'Ula', 'Yatağan',
    ],
  },
  {
    name: 'Muş',
    center: { lat: 38.9462, lng: 41.7539 },
    districts: ['Bulanık', 'Hasköy', 'Korkut', 'Malazgirt', 'Merkez', 'Varto'],
  },
  {
    name: 'Nevşehir',
    center: { lat: 38.6939, lng: 34.6857 },
    districts: [
      'Acıgöl', 'Avanos', 'Derinkuyu', 'Gülşehir', 'Hacıbektaş', 'Kozaklı',
      'Merkez', 'Ürgüp',
    ],
  },
  {
    name: 'Niğde',
    center: { lat: 37.9667, lng: 34.6833 },
    districts: ['Altunhisar', 'Bor', 'Çamardı', 'Çiftlik', 'Merkez', 'Ulukışla'],
  },
  {
    name: 'Ordu',
    center: { lat: 40.9839, lng: 37.8764 },
    districts: [
      'Akkuş', 'Altınordu', 'Aybastı', 'Çamaş', 'Çatalpınar', 'Çaybaşı',
      'Fatsa', 'Gölköy', 'Gülyalı', 'Gürgentepe', 'İkizce', 'Kabadüz',
      'Kabataş', 'Korgan', 'Kumru', 'Mesudiye', 'Perşembe', 'Ulubey', 'Ünye',
    ],
  },
  {
    name: 'Osmaniye',
    center: { lat: 37.0742, lng: 36.2478 },
    districts: [
      'Bahçe', 'Düziçi', 'Hasanbeyli', 'Kadirli', 'Merkez', 'Sumbas', 'Toprakkale',
    ],
  },
  {
    name: 'Rize',
    center: { lat: 41.0201, lng: 40.5234 },
    districts: [
      'Ardeşen', 'Çamlıhemşin', 'Çayeli', 'Derepazarı', 'Fındıklı', 'Güneysu',
      'Hemşin', 'İkizdere', 'İyidere', 'Kalkandere', 'Merkez', 'Pazar',
    ],
  },
  {
    name: 'Sakarya',
    center: { lat: 40.7569, lng: 30.3783 },
    districts: [
      'Adapazarı', 'Akyazı', 'Arifiye', 'Erenler', 'Ferizli', 'Geyve',
      'Hendek', 'Karapürçek', 'Karasu', 'Kaynarca', 'Kocaali', 'Pamukova',
      'Sapanca', 'Serdivan', 'Söğütlü', 'Taraklı',
    ],
  },
  {
    name: 'Samsun',
    center: { lat: 41.2928, lng: 36.3313 },
    districts: [
      '19 Mayıs', 'Alaçam', 'Asarcık', 'Atakum', 'Ayvacık', 'Bafra', 'Canik',
      'Çarşamba', 'Havza', 'İlkadım', 'Kavak', 'Ladik', 'Salıpazarı',
      'Tekkeköy', 'Terme', 'Vezirköprü', 'Yakakent',
    ],
  },
  {
    name: 'Siirt',
    center: { lat: 37.9333, lng: 41.95 },
    districts: [
      'Baykan', 'Eruh', 'Kurtalan', 'Merkez', 'Pervari', 'Şirvan', 'Tillo',
    ],
  },
  {
    name: 'Sinop',
    center: { lat: 42.0231, lng: 35.1531 },
    districts: [
      'Ayancık', 'Boyabat', 'Dikmen', 'Durağan', 'Erfelek', 'Gerze', 'Merkez',
      'Saraydüzü', 'Türkeli',
    ],
  },
  {
    name: 'Sivas',
    center: { lat: 39.7477, lng: 37.0179 },
    districts: [
      'Akıncılar', 'Altınyayla', 'Divriği', 'Doğanşar', 'Gemerek', 'Gölova',
      'Gürün', 'Hafik', 'İmranlı', 'Kangal', 'Koyulhisar', 'Merkez', 'Suşehri',
      'Şarkışla', 'Ulaş', 'Yıldızeli', 'Zara',
    ],
  },
  {
    name: 'Şanlıurfa',
    center: { lat: 37.1674, lng: 38.7955 },
    districts: [
      'Akçakale', 'Birecik', 'Bozova', 'Ceylanpınar', 'Eyyübiye', 'Halfeti',
      'Haliliye', 'Harran', 'Hilvan', 'Karaköprü', 'Siverek', 'Suruç',
      'Viranşehir',
    ],
  },
  {
    name: 'Şırnak',
    center: { lat: 37.4187, lng: 42.4918 },
    districts: [
      'Beytüşşebap', 'Cizre', 'Güçlükonak', 'İdil', 'Merkez', 'Silopi', 'Uludere',
    ],
  },
  {
    name: 'Tekirdağ',
    center: { lat: 40.9833, lng: 27.5167 },
    districts: [
      'Çerkezköy', 'Çorlu', 'Ergene', 'Hayrabolu', 'Kapaklı', 'Malkara',
      'Marmaraereğlisi', 'Muratlı', 'Saray', 'Süleymanpaşa', 'Şarköy',
    ],
  },
  {
    name: 'Tokat',
    center: { lat: 40.3167, lng: 36.55 },
    districts: [
      'Almus', 'Artova', 'Başçiftlik', 'Erbaa', 'Merkez', 'Niksar', 'Pazar',
      'Reşadiye', 'Sulusaray', 'Turhal', 'Yeşilyurt', 'Zile',
    ],
  },
  {
    name: 'Trabzon',
    center: { lat: 41.0015, lng: 39.7178 },
    districts: [
      'Akçaabat', 'Araklı', 'Arsin', 'Beşikdüzü', 'Çarşıbaşı', 'Çaykara',
      'Dernekpazarı', 'Düzköy', 'Hayrat', 'Köprübaşı', 'Maçka', 'Of',
      'Ortahisar', 'Sürmene', 'Şalpazarı', 'Tonya', 'Vakfıkebir', 'Yomra',
    ],
  },
  {
    name: 'Tunceli',
    center: { lat: 39.1079, lng: 39.5401 },
    districts: [
      'Çemişgezek', 'Hozat', 'Mazgirt', 'Merkez', 'Nazımiye', 'Ovacık',
      'Pertek', 'Pülümür',
    ],
  },
  {
    name: 'Uşak',
    center: { lat: 38.6823, lng: 29.4082 },
    districts: ['Banaz', 'Eşme', 'Karahallı', 'Merkez', 'Sivaslı', 'Ulubey'],
  },
  {
    name: 'Van',
    center: { lat: 38.4891, lng: 43.4089 },
    districts: [
      'Bahçesaray', 'Başkale', 'Çaldıran', 'Çatak', 'Edremit', 'Erciş',
      'Gevaş', 'Gürpınar', 'İpekyolu', 'Muradiye', 'Özalp', 'Saray', 'Tuşba',
    ],
  },
  {
    name: 'Yalova',
    center: { lat: 40.65, lng: 29.2667 },
    districts: [
      'Altınova', 'Armutlu', 'Çınarcık', 'Çiftlikköy', 'Merkez', 'Termal',
    ],
  },
  {
    name: 'Yozgat',
    center: { lat: 39.8181, lng: 34.8147 },
    districts: [
      'Akdağmadeni', 'Aydıncık', 'Boğazlıyan', 'Çandır', 'Çayıralan', 'Çekerek',
      'Kadışehri', 'Merkez', 'Saraykent', 'Sarıkaya', 'Sorgun', 'Şefaatli',
      'Yenifakılı', 'Yerköy',
    ],
  },
  {
    name: 'Zonguldak',
    center: { lat: 41.4564, lng: 31.7987 },
    districts: [
      'Alaplı', 'Çaycuma', 'Devrek', 'Ereğli', 'Gökçebey', 'Kilimli', 'Kozlu',
      'Merkez',
    ],
  },
];
