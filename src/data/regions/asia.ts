import type { ProvinceLocation } from '../turkeyProvinces';

// Asya kıtasındaki tüm 48 ülkenin bölgeleri, şehirleri, ilçe/semt ve mahalleleri
export const ASIA_COUNTRY_PROVINCES: Record<string, ProvinceLocation[]> = {
  // Japonya
  tokyo: [
    {
      name: 'Tokyo',
      center: { lat: 35.6595, lng: 139.7004 },
      districts: [
        'Shibuya', 'Ginza', 'Daikanyama', 'Aoyama', 'Shinjuku',
        'Roppongi', 'Omotesando', 'Harajuku', 'Ebisu', 'Akihabara',
        'Asakusa', 'Ueno', 'Ikebukuro', 'Nakameguro',
      ],
    },
    {
      name: 'Osaka',
      center: { lat: 34.6937, lng: 135.5023 },
      districts: ['Namba', 'Umeda', 'Shinsaibashi', 'Tennoji', 'Dotonbori', 'Kitahama', 'Fukushima'],
    },
    {
      name: 'Kyoto',
      center: { lat: 35.0116, lng: 135.7681 },
      districts: ['Gion', 'Kawaramachi', 'Arashiyama', 'Nakagyo', 'Higashiyama', 'Shimogyo'],
    },
    {
      name: 'Fukuoka',
      center: { lat: 33.5902, lng: 130.4017 },
      districts: ['Hakata', 'Tenjin', 'Daimyo', 'Nakasu', 'Momochihama'],
    },
    {
      name: 'Sapporo',
      center: { lat: 43.0618, lng: 141.3545 },
      districts: ['Susukino', 'Odori', 'Maruyama', 'Sapporo Station'],
    },
    {
      name: 'Yokohama',
      center: { lat: 35.4437, lng: 139.638 },
      districts: ['Minato Mirai', 'Motomachi', 'Kannai', 'Yokohama Chinatown'],
    },
  ],

  // Tayland
  bangkok: [
    {
      name: 'Bangkok',
      center: { lat: 13.7367, lng: 100.5608 },
      districts: ['Sukhumvit', 'Thonglor', 'Ari', 'Silom', 'Siam', 'Ekkamai', 'Sathorn', 'Yaowarat'],
    },
    {
      name: 'Chiang Mai',
      center: { lat: 18.7883, lng: 98.9853 },
      districts: ['Nimman', 'Old City', 'Santitham', 'Chang Klan'],
    },
    {
      name: 'Phuket',
      center: { lat: 7.8804, lng: 98.3923 },
      districts: ['Phuket Town', 'Patong', 'Kata', 'Kamala', 'Rawai'],
    },
    {
      name: 'Pattaya (Chonburi)',
      center: { lat: 12.9236, lng: 100.8825 },
      districts: ['Central Pattaya', 'Jomtien', 'Pratumnak', 'Naklua'],
    },
  ],

  // Güney Kore
  kr: [
    {
      name: 'Seul',
      center: { lat: 37.5665, lng: 126.978 },
      districts: ['Gangnam', 'Itaewon', 'Hongdae', 'Myeongdong', 'Jongno', 'Seongsu-dong', 'Apgujeong', 'Yeouido'],
    },
    {
      name: 'Busan',
      center: { lat: 35.1796, lng: 129.0756 },
      districts: ['Haeundae', 'Seomyeon', 'Nampo-dong', 'Gwangalli', 'Centum City'],
    },
    {
      name: 'İncheon',
      center: { lat: 37.4563, lng: 126.7052 },
      districts: ['Songdo', 'Bupyeong', 'Namdong', 'Cheongna'],
    },
    {
      name: 'Daegu',
      center: { lat: 35.8714, lng: 128.6014 },
      districts: ['Dongseong-ro', 'Suseong-gu', 'Jung-gu'],
    },
    {
      name: 'Jeju Adası',
      center: { lat: 33.4996, lng: 126.5312 },
      districts: ['Jeju City', 'Seogwipo', 'Aewol'],
    },
  ],

  // Birleşik Arap Emirlikleri
  ae: [
    {
      name: 'Dubai',
      center: { lat: 25.2048, lng: 55.2708 },
      districts: ['DIFC', 'Downtown Dubai', 'Dubai Marina', 'Jumeirah', 'Business Bay', 'Palm Jumeirah', 'Deira', 'JLT'],
    },
    {
      name: 'Abu Dabi',
      center: { lat: 24.4539, lng: 54.3773 },
      districts: ['Al Maryah Island', 'Corniche', 'Yas Island', 'Saadiyat', 'Al Khalidiyah'],
    },
    {
      name: 'Şarika',
      center: { lat: 25.3463, lng: 55.4209 },
      districts: ['Al Majaz', 'Al Khan', 'Muwaileh', 'Al Nahda'],
    },
    {
      name: 'Acman & Resü’l-Hayme',
      center: { lat: 25.4052, lng: 55.5136 },
      districts: ['Ajman Corniche', 'Al Hamra', 'Al Marjan Island'],
    },
  ],

  // Hong Kong
  hk: [
    {
      name: 'Hong Kong Adası',
      center: { lat: 22.2819, lng: 114.1588 },
      districts: ['Central', 'SoHo', 'Causeway Bay', 'Wan Chai', 'Admiralty', 'Sheung Wan', 'Stanley'],
    },
    {
      name: 'Kowloon',
      center: { lat: 22.2988, lng: 114.1722 },
      districts: ['Tsim Sha Tsui', 'Mong Kok', 'Yau Ma Tei', 'West Kowloon', 'Hung Hom', 'Jordan'],
    },
    {
      name: 'New Territories',
      center: { lat: 22.3814, lng: 114.1886 },
      districts: ['Sha Tin', 'Tsuen Wan', 'Sai Kung', 'Tai Po', 'Tuen Mun'],
    },
  ],

  // Çin
  cn: [
    {
      name: 'Şanghay',
      center: { lat: 31.2304, lng: 121.4737 },
      districts: ['Jing’an', 'French Concession', 'Pudong', 'Xuhui', 'Huangpu', 'Changning'],
    },
    {
      name: 'Pekin',
      center: { lat: 39.9042, lng: 116.4074 },
      districts: ['Chaoyang', 'Sanlitun', 'Dongcheng', 'Haidian', 'Xicheng', 'Guomao'],
    },
    {
      name: 'Shenzhen',
      center: { lat: 22.5431, lng: 114.0579 },
      districts: ['Futian', 'Nanshan', 'Luohu', 'Bao’an'],
    },
    {
      name: 'Guangzhou',
      center: { lat: 23.1291, lng: 113.2644 },
      districts: ['Tianhe', 'Yuexiu', 'Haizhu', 'Liwan'],
    },
    {
      name: 'Chengdu',
      center: { lat: 30.5728, lng: 104.0668 },
      districts: ['Jinjiang', 'Wuhou', 'Qingyang', 'Taikoo Li'],
    },
  ],

  // Hindistan
  in: [
    {
      name: 'Mumbai',
      center: { lat: 19.076, lng: 72.8777 },
      districts: ['Bandra', 'Colaba', 'Lower Parel', 'Juhu', 'Andheri', 'Powai', 'Fort'],
    },
    {
      name: 'Yeni Delhi',
      center: { lat: 28.6139, lng: 77.209 },
      districts: ['Connaught Place', 'Hauz Khas', 'Khan Market', 'Saket', 'Vasant Kunj', 'Defence Colony'],
    },
    {
      name: 'Bengaluru',
      center: { lat: 12.9716, lng: 77.5946 },
      districts: ['Indiranagar', 'Koramangala', 'MG Road', 'Whitefield', 'Jayanagar'],
    },
    {
      name: 'Haydarabad',
      center: { lat: 17.385, lng: 78.4867 },
      districts: ['Banjara Hills', 'Jubilee Hills', 'HITEC City', 'Gachibowli'],
    },
    {
      name: 'Chennai',
      center: { lat: 13.0827, lng: 80.2707 },
      districts: ['T. Nagar', 'Adyar', 'Mylapore', 'Nungambakkam'],
    },
  ],

  // Singapur
  sg: [
    {
      name: 'Central Singapore',
      center: { lat: 1.3521, lng: 103.8198 },
      districts: ['Orchard', 'Marina Bay', 'Tiong Bahru', 'Chinatown', 'Bugis', 'Clarke Quay', 'Holland Village'],
    },
    {
      name: 'East Coast & Katong',
      center: { lat: 1.3048, lng: 103.905 },
      districts: ['Katong', 'Joo Chiat', 'Tampines', 'Bedok'],
    },
    {
      name: 'Jurong & West',
      center: { lat: 1.3329, lng: 103.7436 },
      districts: ['Jurong East', 'Clementi', 'Bukit Timah'],
    },
  ],

  // Endonezya
  id: [
    {
      name: 'Cakarta',
      center: { lat: -6.2088, lng: 106.8456 },
      districts: ['Menteng', 'Senopati', 'Kemang', 'SCBD', 'PIK', 'Kuningan'],
    },
    {
      name: 'Bali (Denpasar & Canggu)',
      center: { lat: -8.65, lng: 115.2167 },
      districts: ['Seminyak', 'Canggu', 'Ubud', 'Kuta', 'Uluwatu', 'Sanur'],
    },
    {
      name: 'Surabaya',
      center: { lat: -7.2575, lng: 112.7521 },
      districts: ['Gubeng', 'Tegalsari', 'Citraland'],
    },
    {
      name: 'Bandung',
      center: { lat: -6.9175, lng: 107.6191 },
      districts: ['Dago', 'Braga', 'Cihampelas', 'Setiabudi'],
    },
  ],

  // Vietnam
  vn: [
    {
      name: 'Ho Chi Minh Şehri',
      center: { lat: 10.8231, lng: 106.6297 },
      districts: ['District 1', 'District 3', 'Thao Dien', 'District 7', 'Binh Thanh'],
    },
    {
      name: 'Hanoi',
      center: { lat: 21.0278, lng: 105.8342 },
      districts: ['Hoan Kiem (Old Quarter)', 'Tay Ho', 'Ba Dinh', 'Dong Da'],
    },
    {
      name: 'Da Nang',
      center: { lat: 16.0544, lng: 108.2022 },
      districts: ['Hai Chau', 'My Khe', 'Son Tra', 'An Thuong'],
    },
  ],

  // Malezya
  my: [
    {
      name: 'Kuala Lumpur',
      center: { lat: 3.139, lng: 101.6869 },
      districts: ['Bukit Bintang', 'KLCC', 'Bangsar', 'Mont Kiara', 'Damansara Heights'],
    },
    {
      name: 'George Town (Penang)',
      center: { lat: 5.4141, lng: 100.3288 },
      districts: ['George Town Heritage', 'Gurney Drive', 'Tanjung Bungah'],
    },
    {
      name: 'Johor Bahru',
      center: { lat: 1.4927, lng: 103.7414 },
      districts: ['JB Sentral', 'Mount Austin', 'Medini'],
    },
  ],

  // Filipinler
  ph: [
    {
      name: 'Manila (Metro Manila)',
      center: { lat: 14.5995, lng: 120.9842 },
      districts: ['Makati', 'BGC (Taguig)', 'Malate', 'Ortigas', 'Quezon City', 'Poblacion'],
    },
    {
      name: 'Cebu',
      center: { lat: 10.3157, lng: 123.8854 },
      districts: ['Cebu IT Park', 'Lahug', 'Ayala Center', 'Mactan'],
    },
    {
      name: 'Davao',
      center: { lat: 7.1907, lng: 125.4553 },
      districts: ['Poblacion', 'Matina', 'Lanang'],
    },
  ],

  // Suudi Arabistan
  sa: [
    {
      name: 'Riyad',
      center: { lat: 24.7136, lng: 46.6753 },
      districts: ['Olaya', 'Al Malqa', 'Diplomatic Quarter', 'Hittin', 'Al Nakheel', 'KAFD'],
    },
    {
      name: 'Cidde',
      center: { lat: 21.4858, lng: 39.1925 },
      districts: ['Al Rawdah', 'Al Hamra', 'Obhur', 'Al Balad', 'Ash Shati'],
    },
    {
      name: 'Mekke',
      center: { lat: 21.3891, lng: 39.8579 },
      districts: ['Al Aziziyah', 'Al Haram', 'Al Shawqiyyah', 'Al Awali'],
    },
    {
      name: 'Medine',
      center: { lat: 24.5247, lng: 39.5692 },
      districts: ['Al Haram', 'Quba', 'Sultana', 'Al Khalidiyyah'],
    },
    {
      name: 'Dammam & El-Huber',
      center: { lat: 26.4207, lng: 50.0888 },
      districts: ['Al Khobar Corniche', 'Al Rakah', 'Al Shati'],
    },
  ],

  // Katar
  qa: [
    {
      name: 'Doha',
      center: { lat: 25.2854, lng: 51.531 },
      districts: ['West Bay', 'The Pearl', 'Msheireb', 'Souq Waqif', 'Al Sadd', 'Katara'],
    },
    {
      name: 'Lusail & Al Wakrah',
      center: { lat: 25.4211, lng: 51.4906 },
      districts: ['Lusail Marina', 'Fox Hills', 'Al Wakrah Souq'],
    },
  ],

  // Kuveyt
  kw: [
    {
      name: 'Kuveyt Şehri',
      center: { lat: 29.3759, lng: 47.9774 },
      districts: ['Salmiya', 'Sharq', 'Hawalli', 'Mirqab', 'Jabriya', 'Shaab'],
    },
    {
      name: 'Al Ahmadi & Fahaheel',
      center: { lat: 29.0825, lng: 48.1303 },
      districts: ['Fahaheel', 'Mangaf', 'Mahboula'],
    },
  ],

  // Bahreyn
  bh: [
    {
      name: 'Manama',
      center: { lat: 26.2285, lng: 50.586 },
      districts: ['Seef', 'Adliya', 'Juffair', 'Diplomatic Area', 'Amwaj Islands'],
    },
    {
      name: 'Muharrak & Riffa',
      center: { lat: 26.2572, lng: 50.6119 },
      districts: ['Muharraq', 'Riffa Views', 'Saar'],
    },
  ],

  // Umman
  om: [
    {
      name: 'Maskat',
      center: { lat: 23.588, lng: 58.3829 },
      districts: ['Qurum', 'Mutrah', 'Al Mouj', 'Al Khuwair', 'Shatti Al Qurum', 'Madinat Al Sultan Qaboos'],
    },
    {
      name: 'Salalah',
      center: { lat: 17.0151, lng: 54.0924 },
      districts: ['Al Haffa', 'Dahariz', 'Salalah Central'],
    },
  ],

  // Ürdün
  jo: [
    {
      name: 'Amman',
      center: { lat: 31.9454, lng: 35.9284 },
      districts: ['Abdoun', 'Jabal Amman', 'Sweifieh', 'Al Weibdeh', 'Abdali', 'Khalda'],
    },
    {
      name: 'Akabe & İrbid',
      center: { lat: 29.5321, lng: 35.0063 },
      districts: ['Akabe Merkez', 'Ayla Oasis', 'İrbid Merkez'],
    },
  ],

  // Lübnan
  lb: [
    {
      name: 'Beyrut',
      center: { lat: 33.8938, lng: 35.5018 },
      districts: ['Hamra', 'Achrafieh', 'Gemmayzeh', 'Mar Mikhael', 'Verdun', 'Downtown Beirut'],
    },
    {
      name: 'Trablusşam & Byblos',
      center: { lat: 34.4335, lng: 35.8442 },
      districts: ['El Mina', 'Eski Çarşı', 'Jbeil (Byblos)', 'Jounieh'],
    },
  ],

  // İsrail
  il: [
    {
      name: 'Tel Aviv',
      center: { lat: 32.0853, lng: 34.7818 },
      districts: ['Neve Tzedek', 'Florentin', 'Rothschild', 'Yafa (Jaffa)', 'Sarona', 'Dizengoff'],
    },
    {
      name: 'Kudüs',
      center: { lat: 31.7683, lng: 35.2137 },
      districts: ['Eski Şehir', 'German Colony', 'Rehavia', 'Mahane Yehuda'],
    },
    {
      name: 'Hayfa',
      center: { lat: 32.794, lng: 34.9896 },
      districts: ['German Colony', 'Carmel Center', 'Downtown Haifa'],
    },
  ],

  // Filistin
  ps: [
    {
      name: 'Ramallah & El-Bireh',
      center: { lat: 31.9038, lng: 35.2034 },
      districts: ['Al-Masyoun', 'Al-Tireh', 'Al-Manara', 'Al-Bireh'],
    },
    {
      name: 'Beytüllahim & Nablus',
      center: { lat: 31.7054, lng: 35.2024 },
      districts: ['Beytüllahim Merkez', 'Eriha (Jericho)', 'Nablus Eski Şehir', 'El Halil'],
    },
  ],

  // Irak
  iq: [
    {
      name: 'Bağdat',
      center: { lat: 33.3152, lng: 44.3661 },
      districts: ['Mansour', 'Karrada', 'Jadriya', 'Adhamiyah', 'Zayouna'],
    },
    {
      name: 'Erbil',
      center: { lat: 36.1911, lng: 44.0092 },
      districts: ['Ankawa', 'Empire World', 'Kale Çevresi', 'Gulan'],
    },
    {
      name: 'Basra & Süleymaniye',
      center: { lat: 30.5085, lng: 47.7804 },
      districts: ['Ashar', 'Basra Merkez', 'Süleymaniye Merkez'],
    },
  ],

  // İran
  ir: [
    {
      name: 'Tahran',
      center: { lat: 35.6892, lng: 51.389 },
      districts: ['Elahiyeh', 'Saadat Abad', 'Tajrish', 'Niavaran', 'Jordan', 'Vanak', 'Shahrak-e Gharb'],
    },
    {
      name: 'İsfahan',
      center: { lat: 32.6539, lng: 51.666 },
      districts: ['Jolfa', 'Chahar Bagh', 'Naqsh-e Jahan'],
    },
    {
      name: 'Şiraz & Tebriz',
      center: { lat: 29.5926, lng: 52.5836 },
      districts: ['Şiraz Merkez', 'Eram', 'Tebriz Valiasr', 'Tebriz Çarşısı'],
    },
  ],

  // Azerbaycan
  az: [
    {
      name: 'Bakü',
      center: { lat: 40.4093, lng: 49.8671 },
      districts: ['Nizami', 'İçərişəhər', 'Nərimanov', 'Yasamal', 'Səbail', 'Xətai', 'Nəsimi', 'Ağ Şəhər'],
    },
    {
      name: 'Gence',
      center: { lat: 40.6828, lng: 46.3606 },
      districts: ['Nizami Rayonu', 'Kəpəz', 'Merkez'],
    },
    {
      name: 'Sumqayıt',
      center: { lat: 40.5855, lng: 49.6317 },
      districts: ['Merkez', 'Corat', 'Hacı Zeynalabdin'],
    },
    {
      name: 'Nahçıvan & Şeki',
      center: { lat: 39.2089, lng: 45.4122 },
      districts: ['Nahçıvan Merkez', 'Şeki Merkez', 'Qəbələ'],
    },
  ],

  // Gürcistan
  ge: [
    {
      name: 'Tiflis',
      center: { lat: 41.7151, lng: 44.8271 },
      districts: ['Vera', 'Vake', 'Sololaki', 'Saburtalo', 'Abanotubani', 'Marjanishvili'],
    },
    {
      name: 'Batum',
      center: { lat: 41.6168, lng: 41.6367 },
      districts: ['Batum Bulvarı', 'Eski Batum', 'Gonio'],
    },
    {
      name: 'Kutaisi',
      center: { lat: 42.2662, lng: 42.718 },
      districts: ['Merkez', 'Balakhvani', 'Rioni'],
    },
  ],

  // Ermenistan
  am: [
    {
      name: 'Erivan',
      center: { lat: 40.1792, lng: 44.4991 },
      districts: ['Kentron', 'Arabkir', 'Cascade', 'Ajapnyak', 'Malatia-Sebastia'],
    },
    {
      name: 'Gümrü & Vanadzor',
      center: { lat: 40.7894, lng: 43.8475 },
      districts: ['Kumayri', 'Gümrü Merkez', 'Vanadzor Merkez'],
    },
  ],

  // Kazakistan
  kz: [
    {
      name: 'Almatı',
      center: { lat: 43.222, lng: 76.8512 },
      districts: ['Medeu', 'Almaly', 'Bostandyk', 'Esentai', 'Dostyk'],
    },
    {
      name: 'Astana',
      center: { lat: 51.1605, lng: 71.4704 },
      districts: ['Esil', 'Saryarka', 'Almaty Rayonu', 'Nura'],
    },
    {
      name: 'Çimkent',
      center: { lat: 42.3417, lng: 69.5901 },
      districts: ['Abai', 'Al-Farabi', 'Enbekshi'],
    },
  ],

  // Özbekistan
  uz: [
    {
      name: 'Taşkent',
      center: { lat: 41.2995, lng: 69.2401 },
      districts: ['Yunusabad', 'Mirzo Ulugbek', 'Chilanzar', 'Yakkasaray', 'Tashkent City'],
    },
    {
      name: 'Semerkant & Buhara',
      center: { lat: 39.6542, lng: 66.9597 },
      districts: ['Registan', 'Semerkant Merkez', 'Buhara Eski Şehir'],
    },
  ],

  // Türkmenistan
  tm: [
    {
      name: 'Aşkabat',
      center: { lat: 37.9601, lng: 58.3261 },
      districts: ['Merkez', 'Berkarar', 'Bagtyýarlyk', 'Köpetdag'],
    },
    {
      name: 'Türkmenbaşı & Mary',
      center: { lat: 40.0222, lng: 52.9552 },
      districts: ['Awaza', 'Türkmenbaşı Merkez', 'Mary Merkez'],
    },
  ],

  // Kırgızistan
  kg: [
    {
      name: 'Bişkek',
      center: { lat: 42.8746, lng: 74.5698 },
      districts: ['Pervomay', 'Oktyabr', 'Sverdlov', 'Lenin', 'Asanbay'],
    },
    {
      name: 'Oş',
      center: { lat: 40.514, lng: 72.8161 },
      districts: ['Oş Merkez', 'Süleyman Dağı Çevresi'],
    },
  ],

  // Tacikistan
  tj: [
    {
      name: 'Duşanbe',
      center: { lat: 38.5598, lng: 68.787 },
      districts: ['Rudaki', 'Sino', 'Ismoili Somoni', 'Firdavsi'],
    },
    {
      name: 'Hocent',
      center: { lat: 40.2826, lng: 69.6222 },
      districts: ['Hocent Merkez', 'Panjshanbe'],
    },
  ],

  // Pakistan
  pk: [
    {
      name: 'Lahor',
      center: { lat: 31.5204, lng: 74.3587 },
      districts: ['Gulberg', 'DHA', 'Model Town', 'Johar Town', 'Bahria Town'],
    },
    {
      name: 'Karaçi',
      center: { lat: 24.8607, lng: 67.0011 },
      districts: ['Clifton', 'DHA Karachi', 'Gulshan-e-Iqbal', 'Saddar'],
    },
    {
      name: 'İslamabad',
      center: { lat: 33.6844, lng: 73.0479 },
      districts: ['F-6 Markaz', 'F-7 Jinnah Super', 'F-10', 'Blue Area'],
    },
  ],

  // Bangladeş
  bd: [
    {
      name: 'Dakka',
      center: { lat: 23.8103, lng: 90.4125 },
      districts: ['Gulshan', 'Banani', 'Dhanmondi', 'Uttara', 'Baridhara'],
    },
    {
      name: 'Chattogram (Çitagong)',
      center: { lat: 22.3569, lng: 91.7832 },
      districts: ['Nasirabad', 'GEC Circle', 'Agrabad'],
    },
  ],

  // Sri Lanka
  lk: [
    {
      name: 'Kolombo',
      center: { lat: 6.9271, lng: 79.8612 },
      districts: ['Cinnamon Gardens', 'Kollupitiya', 'Bambalapitiya', 'Galle Face', 'Dehiwala'],
    },
    {
      name: 'Kandy & Galle',
      center: { lat: 7.2906, lng: 80.6337 },
      districts: ['Kandy City', 'Galle Fort', 'Peradeniya'],
    },
  ],

  // Nepal
  np: [
    {
      name: 'Katmandu & Patan',
      center: { lat: 27.7172, lng: 85.324 },
      districts: ['Thamel', 'Patan (Lalitpur)', 'Lazimpat', 'Jhamsikhel', 'Boudha'],
    },
    {
      name: 'Pokhara',
      center: { lat: 28.2096, lng: 83.9856 },
      districts: ['Lakeside', 'Baidam', 'Mahendrapul'],
    },
  ],

  // Myanmar
  mm: [
    {
      name: 'Yangon',
      center: { lat: 16.8409, lng: 96.1735 },
      districts: ['Bahan', 'Dagon', 'Sanchaung', 'Downtown Yangon', 'Yankin'],
    },
    {
      name: 'Mandalay & Naypyidaw',
      center: { lat: 21.9588, lng: 96.0891 },
      districts: ['Chanayethazan', 'Aungmyaythazan', 'Zabuthiri'],
    },
  ],

  // Kamboçya
  kh: [
    {
      name: 'Phnom Penh',
      center: { lat: 11.5564, lng: 104.9282 },
      districts: ['BKK1', 'Daun Penh', 'Toul Kork', 'Chamkarmon', 'Riverside'],
    },
    {
      name: 'Siem Reap',
      center: { lat: 13.3633, lng: 103.8564 },
      districts: ['Pub Street', 'Wat Bo', 'Sala Kamreuk'],
    },
  ],

  // Laos
  la: [
    {
      name: 'Vientiane',
      center: { lat: 17.9757, lng: 102.6331 },
      districts: ['Chanthabouly', 'Sisattanak', 'Sikhottabong', 'Mekong Riverside'],
    },
    {
      name: 'Luang Prabang',
      center: { lat: 19.8856, lng: 102.1347 },
      districts: ['Old Quarter', 'Ban Wat Sene', 'Phousi'],
    },
  ],

  // Moğolistan
  mn: [
    {
      name: 'Ulan Batur',
      center: { lat: 47.8864, lng: 106.9057 },
      districts: ['Sükhbaatar', 'Khan-Uul', 'Bayanzürkh', 'Chingeltei', 'Zaisan'],
    },
    {
      name: 'Darkhan & Erdenet',
      center: { lat: 49.4867, lng: 105.9228 },
      districts: ['Darkhan Merkez', 'Erdenet Merkez'],
    },
  ],

  // Kuzey Kore
  kp: [
    {
      name: 'Pyongyang',
      center: { lat: 39.0392, lng: 125.7625 },
      districts: ['Chung-guyok', 'Moranbong', 'Taedonggang', 'Pothonggang'],
    },
    {
      name: 'Kaesong & Wonsan',
      center: { lat: 37.9706, lng: 126.5544 },
      districts: ['Kaesong Merkez', 'Wonsan Merkez'],
    },
  ],

  // Tayvan
  tw: [
    {
      name: 'Taipei',
      center: { lat: 25.033, lng: 121.5654 },
      districts: ['Xinyi', 'Da’an', 'Zhongshan', 'Ximending', 'Songshan', 'Shilin'],
    },
    {
      name: 'Kaohsiung',
      center: { lat: 22.6273, lng: 120.3014 },
      districts: ['Lingya', 'Gushan', 'Zuoying', 'Pier-2'],
    },
    {
      name: 'Taichung',
      center: { lat: 24.1477, lng: 120.6736 },
      districts: ['Xitun', 'West District', 'Fengjia'],
    },
  ],

  // Brunei
  bn: [
    {
      name: 'Bandar Seri Begawan',
      center: { lat: 4.9031, lng: 114.9398 },
      districts: ['Gadong', 'Kiulap', 'Kampong Ayer', 'Berakas', 'Bandar Merkez'],
    },
    {
      name: 'Kuala Belait & Seria',
      center: { lat: 4.5836, lng: 114.2312 },
      districts: ['Kuala Belait', 'Seria', 'Tutong'],
    },
  ],

  // Maldivler
  mv: [
    {
      name: 'Malé & Hulhumalé',
      center: { lat: 4.1755, lng: 73.5093 },
      districts: ['Henveiru', 'Hulhumalé', 'Galolhu', 'Maafannu', 'Villimalé'],
    },
    {
      name: 'Addu City & Maafushi',
      center: { lat: -0.63, lng: 73.158 },
      districts: ['Hithadhoo', 'Maafushi', 'Feydhoo'],
    },
  ],

  // Bhutan
  bt: [
    {
      name: 'Thimphu',
      center: { lat: 27.4728, lng: 89.639 },
      districts: ['Norzin Lam', 'Motithang', 'Changlimithang', 'Babesa'],
    },
    {
      name: 'Paro & Punakha',
      center: { lat: 27.4286, lng: 89.4167 },
      districts: ['Paro Town', 'Punakha Merkez'],
    },
  ],

  // Doğu Timor
  tl: [
    {
      name: 'Dili',
      center: { lat: -8.5569, lng: 125.5603 },
      districts: ['Colmera', 'Farol', 'Lecidere', 'Fatuhada', 'Becora'],
    },
    {
      name: 'Baucau',
      center: { lat: -8.4711, lng: 126.4583 },
      districts: ['Vila Nova', 'Vila Antiga'],
    },
  ],

  // Suriye
  sy: [
    {
      name: 'Şam',
      center: { lat: 33.5138, lng: 36.2765 },
      districts: ['Malki', 'Abu Rummaneh', 'Shaalan', 'Bab Touma', 'Mezzeh'],
    },
    {
      name: 'Halep & Lazkiye',
      center: { lat: 36.2021, lng: 37.1343 },
      districts: ['Aziziyah', 'Halep Eski Şehir', 'Lazkiye Corniche'],
    },
  ],

  // Yemen
  ye: [
    {
      name: 'Sana',
      center: { lat: 15.3694, lng: 44.191 },
      districts: ['Hadda', 'Old Sana’a', 'Al-Tahrir', 'Al-Sabeen'],
    },
    {
      name: 'Aden',
      center: { lat: 12.7855, lng: 45.0187 },
      districts: ['Crater', 'Khormaksar', 'Al Mansoura'],
    },
  ],

  // Afganistan
  af: [
    {
      name: 'Kabil',
      center: { lat: 34.5553, lng: 69.2075 },
      districts: ['Shahr-e Naw', 'Wazir Akbar Khan', 'Karte Char', 'Karte Seh'],
    },
    {
      name: 'Herat & Mezar-ı Şerif',
      center: { lat: 34.3529, lng: 62.204 },
      districts: ['Herat Merkez', 'Mezar-ı Şerif Merkez'],
    },
  ],
};
