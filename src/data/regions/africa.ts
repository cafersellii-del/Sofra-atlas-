import type { ProvinceLocation } from '../turkeyProvinces';

// Afrika kıtasındaki tüm 54 ülkenin bölgeleri, şehirleri, ilçe/semt ve mahalleleri
export const AFRICA_COUNTRY_PROVINCES: Record<string, ProvinceLocation[]> = {
  // Mısır
  eg: [
    {
      name: 'Kahire',
      center: { lat: 30.0444, lng: 31.2357 },
      districts: ['Zamalek', 'Maadi', 'Downtown', 'New Cairo', 'Heliopolis', 'Nasr City', 'Garden City'],
    },
    {
      name: 'İskenderiye',
      center: { lat: 31.2001, lng: 29.9187 },
      districts: ['Smouha', 'Stanley', 'Glim', 'San Stefano', 'Roushdy', 'Sidi Gaber'],
    },
    {
      name: 'Giza',
      center: { lat: 30.0131, lng: 31.2089 },
      districts: ['Dokki', 'Mohandessin', 'Sheikh Zayed', '6th of October', 'Agouza'],
    },
    {
      name: 'Şarm El-Şeyh & Hurghada',
      center: { lat: 27.9158, lng: 34.3299 },
      districts: ['Naama Bay', 'SOHO Square', 'El Gouna', 'Marina Hurghada'],
    },
  ],

  // Fas
  ma: [
    {
      name: 'Kazablanka',
      center: { lat: 33.5731, lng: -7.5898 },
      districts: ['Anfa', 'Gauthier', 'Maârif', 'Ain Diab', 'Racine', 'Bourgogne'],
    },
    {
      name: 'Marakeş',
      center: { lat: 31.6295, lng: -7.9811 },
      districts: ['Médina', 'Guéliz', 'Hivernage', 'Palmeraie', 'Agdal'],
    },
    {
      name: 'Rabat',
      center: { lat: 34.0209, lng: -6.8416 },
      districts: ['Agdal', 'Hassan', 'Hay Riad', 'Souissi'],
    },
    {
      name: 'Tanca & Fes',
      center: { lat: 35.7595, lng: -5.834 },
      districts: ['Tanca Marina', 'Marshan', 'Fès el-Bali', 'Ville Nouvelle'],
    },
  ],

  // Güney Afrika
  za: [
    {
      name: 'Cape Town',
      center: { lat: -33.9249, lng: 18.4241 },
      districts: ['City Bowl', 'Sea Point', 'Camps Bay', 'Kloof Street', 'Waterfront', 'Green Point', 'Constantia'],
    },
    {
      name: 'Johannesburg',
      center: { lat: -26.2041, lng: 28.0473 },
      districts: ['Sandton', 'Rosebank', 'Melville', 'Maboneng', 'Parkhurst', 'Bryanston'],
    },
    {
      name: 'Durban',
      center: { lat: -29.8587, lng: 31.0218 },
      districts: ['Umhlanga', 'Morningside', 'Glenwood', 'Berea'],
    },
    {
      name: 'Pretoria',
      center: { lat: -25.7479, lng: 28.2293 },
      districts: ['Hatfield', 'Menlyn', 'Brooklyn', 'Waterkloof'],
    },
  ],

  // Nijerya
  ng: [
    {
      name: 'Lagos',
      center: { lat: 6.5244, lng: 3.3792 },
      districts: ['Victoria Island', 'Ikoyi', 'Lekki Phase 1', 'Ikeja GRA', 'Yaba', 'Surulere'],
    },
    {
      name: 'Abuja',
      center: { lat: 9.0765, lng: 7.3986 },
      districts: ['Maitama', 'Wuse II', 'Garki', 'Asokoro', 'Jabi'],
    },
    {
      name: 'Port Harcourt',
      center: { lat: 4.8156, lng: 7.0498 },
      districts: ['New GRA', 'Old GRA', 'Trans Amadi'],
    },
  ],

  // Kenya
  ke: [
    {
      name: 'Nairobi',
      center: { lat: -1.2921, lng: 36.8219 },
      districts: ['Westlands', 'Kilimani', 'Karen', 'Lavington', 'Kileleshwa', 'CBD'],
    },
    {
      name: 'Mombasa',
      center: { lat: -4.0435, lng: 39.6682 },
      districts: ['Nyali', 'Mombasa Island', 'Bamburi', 'Diani'],
    },
  ],

  // Tunus
  tn: [
    {
      name: 'Tunus Şehri',
      center: { lat: 36.8065, lng: 10.1815 },
      districts: ['La Marsa', 'Lac 1', 'Médina', 'Carthage', 'Sidi Bou Saïd', 'Menzah'],
    },
    {
      name: 'Sousse & Sfax',
      center: { lat: 35.8256, lng: 10.6084 },
      districts: ['Port El Kantaoui', 'Sousse Médina', 'Sfax Merkez'],
    },
  ],

  // Cezayir
  dz: [
    {
      name: 'Cezayir (Algiers)',
      center: { lat: 36.7538, lng: 3.0588 },
      districts: ['Hydra', 'Alger Centre', 'Sidi Yahia', 'El Biar', 'Bab El Oued', 'Kouba'],
    },
    {
      name: 'Oran & Konstantin',
      center: { lat: 35.6977, lng: -0.6308 },
      districts: ['Oran Centre', 'Canastel', 'Konstantin Merkez'],
    },
  ],

  // Libya
  ly: [
    {
      name: 'Trablus',
      center: { lat: 32.8872, lng: 13.1913 },
      districts: ['Hay Al-Andalus', 'Gargaresh', 'Eski Medine', 'Ben Ashour', 'Souq Al Juma'],
    },
    {
      name: 'Bingazi & Misrata',
      center: { lat: 32.1194, lng: 20.0868 },
      districts: ['Al-Sabri', 'Al-Fwayhat', 'Misrata Merkez'],
    },
  ],

  // Etiyopya
  et: [
    {
      name: 'Addis Ababa',
      center: { lat: 9.032, lng: 38.7469 },
      districts: ['Bole', 'Kazanchis', 'Piazza', 'Old Airport', 'Sarbet'],
    },
    {
      name: 'Bahir Dar & Hawassa',
      center: { lat: 11.5742, lng: 37.3614 },
      districts: ['Bahir Dar Merkez', 'Hawassa Lakefront'],
    },
  ],

  // Gana
  gh: [
    {
      name: 'Akra',
      center: { lat: 5.6037, lng: -0.187 },
      districts: ['Osu', 'East Legon', 'Airport Residential', 'Cantonments', 'Labone'],
    },
    {
      name: 'Kumasi',
      center: { lat: 6.6885, lng: -1.6244 },
      districts: ['Adum', 'Ahodwo', 'Nhyiaeso'],
    },
  ],

  // Senegal
  sn: [
    {
      name: 'Dakar',
      center: { lat: 14.7167, lng: -17.4677 },
      districts: ['Plateau', 'Almadies', 'Mermoz', 'Ngor', 'Point E'],
    },
    {
      name: 'Saint-Louis & Saly',
      center: { lat: 16.0179, lng: -16.4896 },
      districts: ['Île de Saint-Louis', 'Saly Portudal', 'Thiès'],
    },
  ],

  // Fildişi Sahili
  ci: [
    {
      name: 'Abidjan',
      center: { lat: 5.36, lng: -4.0083 },
      districts: ['Cocody', 'Plateau', 'Marcory', 'Zone 4', 'Deux Plateaux'],
    },
    {
      name: 'Yamoussoukro',
      center: { lat: 6.8276, lng: -5.2893 },
      districts: ['Habitat', 'Millionnaire', 'Centre'],
    },
  ],

  // Tanzanya
  tz: [
    {
      name: 'Darüsselam',
      center: { lat: -6.7924, lng: 39.2083 },
      districts: ['Masaki', 'Oysterbay', 'Mikocheni', 'Upanga', 'Kariakoo'],
    },
    {
      name: 'Zanzibar (Stone Town) & Arusha',
      center: { lat: -6.1659, lng: 39.2026 },
      districts: ['Stone Town', 'Paje', 'Arusha CBD'],
    },
  ],

  // Uganda
  ug: [
    {
      name: 'Kampala',
      center: { lat: 0.3476, lng: 32.5825 },
      districts: ['Kololo', 'Nakasero', 'Bugolobi', 'Naguru', 'Ntinda'],
    },
    {
      name: 'Entebbe & Jinja',
      center: { lat: 0.0512, lng: 32.4637 },
      districts: ['Entebbe Merkez', 'Jinja Town'],
    },
  ],

  // Ruanda
  rw: [
    {
      name: 'Kigali',
      center: { lat: -1.9441, lng: 30.0619 },
      districts: ['Kiyovu', 'Kimihurura', 'Nyarutarama', 'Kacyiru', 'Remera'],
    },
    {
      name: 'Gisenyi (Rubavu) & Musanze',
      center: { lat: -1.7028, lng: 29.2564 },
      districts: ['Rubavu Waterfront', 'Musanze Merkez'],
    },
  ],

  // Kamerun
  cm: [
    {
      name: 'Yaoundé',
      center: { lat: 3.848, lng: 11.5021 },
      districts: ['Bastos', 'Centre Ville', 'Mvan', 'Nlongkak'],
    },
    {
      name: 'Douala',
      center: { lat: 4.0511, lng: 9.7679 },
      districts: ['Bonanjo', 'Akwa', 'Bonapriso', 'Makepe'],
    },
  ],

  // Angola
  ao: [
    {
      name: 'Luanda',
      center: { lat: -8.839, lng: 13.2894 },
      districts: ['Miramar', 'Talatona', 'Ilha', 'Maianga', 'Ingombota'],
    },
    {
      name: 'Benguela & Lubango',
      center: { lat: -12.5763, lng: 13.4055 },
      districts: ['Benguela Centro', 'Lobito', 'Lubango'],
    },
  ],

  // Mozambik
  mz: [
    {
      name: 'Maputo',
      center: { lat: -25.9692, lng: 32.5732 },
      districts: ['Polana', 'Sommerschield', 'Baixa', 'Costa do Sol'],
    },
    {
      name: 'Beira & Nampula',
      center: { lat: -19.8436, lng: 34.8389 },
      districts: ['Beira Merkez', 'Macuti', 'Nampula'],
    },
  ],

  // Zambiya
  zm: [
    {
      name: 'Lusaka',
      center: { lat: -15.3875, lng: 28.3228 },
      districts: ['Kabulonga', 'Rhodes Park', 'Roma', 'Woodlands'],
    },
    {
      name: 'Livingstone & Ndola',
      center: { lat: -17.8419, lng: 25.8542 },
      districts: ['Livingstone Merkez', 'Ndola CBD'],
    },
  ],

  // Zimbabve
  zw: [
    {
      name: 'Harare',
      center: { lat: -17.8252, lng: 31.0335 },
      districts: ['Borrowdale', 'Avondale', 'Mount Pleasant', 'Newlands'],
    },
    {
      name: 'Bulawayo & Victoria Falls',
      center: { lat: -20.1325, lng: 28.6265 },
      districts: ['Bulawayo CBD', 'Suburbs', 'Victoria Falls'],
    },
  ],

  // Botsvana
  bw: [
    {
      name: 'Gaborone',
      center: { lat: -24.6282, lng: 25.9231 },
      districts: ['CBD', 'Phakalane', 'Main Mall', 'Extension 9'],
    },
    {
      name: 'Francistown & Maun',
      center: { lat: -21.17, lng: 27.5079 },
      districts: ['Francistown Central', 'Maun'],
    },
  ],

  // Namibya
  na: [
    {
      name: 'Windhoek',
      center: { lat: -22.5609, lng: 17.0658 },
      districts: ['Klein Windhoek', 'CBD', 'Ludwigsdorf', 'Eros'],
    },
    {
      name: 'Swakopmund & Walvis Bay',
      center: { lat: -22.6467, lng: 14.5053 },
      districts: ['Swakopmund Central', 'Walvis Bay Lagoon'],
    },
  ],

  // Mauritius
  mu: [
    {
      name: 'Port Louis & Kuzey',
      center: { lat: -20.1609, lng: 57.5012 },
      districts: ['Caudan', 'Grand Baie', 'Pereybere', 'Ebene'],
    },
    {
      name: 'Curepipe & Flic en Flac',
      center: { lat: -20.3167, lng: 57.5167 },
      districts: ['Curepipe', 'Quatre Bornes', 'Flic en Flac', 'Tamarin'],
    },
  ],

  // Madagaskar
  mg: [
    {
      name: 'Antananarivo',
      center: { lat: -18.8792, lng: 47.5079 },
      districts: ['Analakely', 'Isoraka', 'Ivandry', 'Ankorondrano'],
    },
    {
      name: 'Nosy Be & Toamasina',
      center: { lat: -13.33, lng: 48.26 },
      districts: ['Ambatoloaka', 'Hell-Ville', 'Toamasina Merkez'],
    },
  ],

  // Sudan
  sd: [
    {
      name: 'Hartum & Omdurman',
      center: { lat: 15.5007, lng: 32.5599 },
      districts: ['Al-Amarat', 'Riyadh', 'Al-Manshiya', 'Bahri', 'Omdurman'],
    },
    {
      name: 'Port Sudan',
      center: { lat: 19.6158, lng: 37.2164 },
      districts: ['Port Sudan Merkez', 'Deim'],
    },
  ],

  // Güney Sudan
  ss: [
    {
      name: 'Juba',
      center: { lat: 4.8594, lng: 31.5713 },
      districts: ['Hai Cinema', 'Tongping', 'Hai Jalaba', 'Konyo Konyo'],
    },
    {
      name: 'Wau & Malakal',
      center: { lat: 7.7029, lng: 27.9953 },
      districts: ['Wau Merkez', 'Malakal Merkez'],
    },
  ],

  // Somali
  so: [
    {
      name: 'Mogadişu',
      center: { lat: 2.0469, lng: 45.3182 },
      districts: ['Hamar Weyne', 'Hodan', 'Wadajir', 'Shangani'],
    },
    {
      name: 'Hargeisa & Bosaso',
      center: { lat: 9.56, lng: 44.065 },
      districts: ['Hargeisa Merkez', 'Jigjiga Yar', 'Bosaso'],
    },
  ],

  // Cibuti
  dj: [
    {
      name: 'Cibuti Şehri',
      center: { lat: 11.5721, lng: 43.1456 },
      districts: ['Plateau', 'Heron', 'Quartier 1', 'Balbala'],
    },
    {
      name: 'Tadjoura & Ali Sabieh',
      center: { lat: 11.7853, lng: 42.8844 },
      districts: ['Tadjoura Merkez', 'Ali Sabieh'],
    },
  ],

  // Eritre
  er: [
    {
      name: 'Asmara',
      center: { lat: 15.3229, lng: 38.9251 },
      districts: ['Maekel', 'Sembel', 'Tiravolo', 'Gheza Banda'],
    },
    {
      name: 'Massawa & Keren',
      center: { lat: 15.6081, lng: 39.4746 },
      districts: ['Massawa Adası', 'Keren Merkez'],
    },
  ],

  // Mali
  ml: [
    {
      name: 'Bamako',
      center: { lat: 12.6392, lng: -8.0029 },
      districts: ['Hamdallaye', 'ACI 2000', 'Badalabougou', 'Hippodrome'],
    },
    {
      name: 'Sikasso & Ségou',
      center: { lat: 11.3176, lng: -5.6665 },
      districts: ['Sikasso Merkez', 'Ségou Merkez'],
    },
  ],

  // Nijer
  ne: [
    {
      name: 'Niamey',
      center: { lat: 13.5116, lng: 2.1254 },
      districts: ['Plateau', 'Yantala', 'Recasement', 'Lamordé'],
    },
    {
      name: 'Zinder & Maradi',
      center: { lat: 13.8072, lng: 8.9881 },
      districts: ['Zinder Merkez', 'Maradi Merkez'],
    },
  ],

  // Burkina Faso
  bf: [
    {
      name: 'Ouagadougou',
      center: { lat: 12.3714, lng: -1.5197 },
      districts: ['Ouaga 2000', 'Zone du Bois', 'Koulouba', 'Gounghin'],
    },
    {
      name: 'Bobo-Dioulasso',
      center: { lat: 11.1771, lng: -4.2979 },
      districts: ['Dioulassoba', 'Koko', 'Sarfalao'],
    },
  ],

  // Çad
  td: [
    {
      name: 'N’Djamena',
      center: { lat: 12.1348, lng: 15.0557 },
      districts: ['Klémat', 'Moursal', 'Sabangali', 'Chagoua'],
    },
    {
      name: 'Moundou & Abéché',
      center: { lat: 8.5667, lng: 16.0833 },
      districts: ['Moundou Merkez', 'Abéché Merkez'],
    },
  ],

  // Moritanya
  mr: [
    {
      name: 'Nuakşot',
      center: { lat: 18.0735, lng: -15.9582 },
      districts: ['Tevragh-Zeina', 'Ksar', 'Teyarett', 'Arafat'],
    },
    {
      name: 'Nouadhibou',
      center: { lat: 20.9319, lng: -17.0347 },
      districts: ['Cansado', 'Nouadhibou Centre'],
    },
  ],

  // Gambiya
  gm: [
    {
      name: 'Banjul & Serekunda',
      center: { lat: 13.4549, lng: -16.579 },
      districts: ['Kololi', 'Senegambia', 'Fajara', 'Bakau', 'Banjul Central'],
    },
    {
      name: 'Brikama',
      center: { lat: 13.2714, lng: -16.6494 },
      districts: ['Brikama Central', 'Sanyang'],
    },
  ],

  // Gine
  gn: [
    {
      name: 'Konakri',
      center: { lat: 9.6412, lng: -13.5784 },
      districts: ['Kaloum', 'Kipé', 'Ratoma', 'Dixinn', 'Taouyah'],
    },
    {
      name: 'Kankan & Labé',
      center: { lat: 10.3854, lng: -9.3057 },
      districts: ['Kankan Merkez', 'Labé Merkez'],
    },
  ],

  // Gine-Bissau
  gw: [
    {
      name: 'Bissau',
      center: { lat: 11.8817, lng: -15.6178 },
      districts: ['Bissau Velho', 'Bairro Militar', 'Ajuda', 'Enterramento'],
    },
    {
      name: 'Bafatá & Gabú',
      center: { lat: 12.1717, lng: -14.6575 },
      districts: ['Bafatá Merkez', 'Gabú Merkez'],
    },
  ],

  // Sierra Leone
  sl: [
    {
      name: 'Freetown',
      center: { lat: 8.4657, lng: -13.2317 },
      districts: ['Aberdeen', 'Lumley', 'Wilberforce', 'Hill Station', 'Central'],
    },
    {
      name: 'Bo & Kenema',
      center: { lat: 7.9647, lng: -11.7383 },
      districts: ['Bo Town', 'Kenema Central'],
    },
  ],

  // Liberya
  lr: [
    {
      name: 'Monrovia',
      center: { lat: 6.3156, lng: -10.8074 },
      districts: ['Sinkor', 'Mamba Point', 'Congo Town', 'Paynesville'],
    },
    {
      name: 'Buchanan & Gbarnga',
      center: { lat: 5.8808, lng: -10.0467 },
      districts: ['Buchanan Merkez', 'Gbarnga Merkez'],
    },
  ],

  // Togo
  tg: [
    {
      name: 'Lomé',
      center: { lat: 6.1319, lng: 1.2228 },
      districts: ['Tokoin', 'Bè', 'Adidogomé', 'Nyékonakpoè', 'Kodjoviakopé'],
    },
    {
      name: 'Kara & Sokodé',
      center: { lat: 9.5511, lng: 1.1861 },
      districts: ['Kara Merkez', 'Sokodé Merkez'],
    },
  ],

  // Benin
  bj: [
    {
      name: 'Cotonou',
      center: { lat: 6.3703, lng: 2.3912 },
      districts: ['Haie Vive', 'Ganhi', 'Cadjehoun', 'Fidjrossè'],
    },
    {
      name: 'Porto-Novo & Parakou',
      center: { lat: 6.4969, lng: 2.6289 },
      districts: ['Porto-Novo Merkez', 'Parakou Merkez'],
    },
  ],

  // Kongo Cumhuriyeti
  cg: [
    {
      name: 'Brazzaville',
      center: { lat: -4.2634, lng: 15.2429 },
      districts: ['Poto-Poto', 'Bacongo', 'Plateau', 'Moungali'],
    },
    {
      name: 'Pointe-Noire',
      center: { lat: -4.7692, lng: 11.8664 },
      districts: ['Centre Ville', 'Côte Sauvage', 'Tié-Tié'],
    },
  ],

  // Kongo DC
  cd: [
    {
      name: 'Kinşasa',
      center: { lat: -4.4419, lng: 15.2663 },
      districts: ['Gombe', 'Ngaliema', 'Bandalungwa', 'Lingwala', 'Limete'],
    },
    {
      name: 'Lubumbashi & Goma',
      center: { lat: -11.6876, lng: 27.5026 },
      districts: ['Lubumbashi Centro', 'Golf', 'Goma Himbi'],
    },
  ],

  // Gabon
  ga: [
    {
      name: 'Libreville',
      center: { lat: 0.4162, lng: 9.4673 },
      districts: ['Louis', 'Sablière', 'Batterie IV', 'Glass', 'Akanda'],
    },
    {
      name: 'Port-Gentil & Franceville',
      center: { lat: -0.7193, lng: 8.7815 },
      districts: ['Port-Gentil Merkez', 'Franceville Merkez'],
    },
  ],

  // Ekvator Ginesi
  gq: [
    {
      name: 'Malabo',
      center: { lat: 3.7504, lng: 8.7371 },
      districts: ['Malabo II', 'Ela Nguema', 'Caracolas', 'Centro'],
    },
    {
      name: 'Bata',
      center: { lat: 1.8639, lng: 9.7658 },
      districts: ['Paseo Marítimo', 'Bata Centro'],
    },
  ],

  // Orta Afrika Cumhuriyeti
  cf: [
    {
      name: 'Bangui',
      center: { lat: 4.3947, lng: 18.5582 },
      districts: ['Centre', 'Sica', 'PK5', 'Lakouanga'],
    },
    {
      name: 'Bimbo & Berbérati',
      center: { lat: 4.2567, lng: 18.4158 },
      districts: ['Bimbo Merkez', 'Berbérati Merkez'],
    },
  ],

  // Burundi
  bi: [
    {
      name: 'Gitega & Bujumbura',
      center: { lat: -3.4264, lng: 29.9306 },
      districts: ['Gitega Merkez', 'Bujumbura Rohero', 'Kiriri', 'Kigobe'],
    },
  ],

  // Malavi
  mw: [
    {
      name: 'Lilongwe',
      center: { lat: -13.9626, lng: 33.7741 },
      districts: ['Area 10', 'City Centre', 'Area 47', 'Old Town'],
    },
    {
      name: 'Blantyre',
      center: { lat: -15.7861, lng: 35.0058 },
      districts: ['Nyambadwe', 'Sunnyside', 'Limbe'],
    },
  ],

  // Esvatini
  sz: [
    {
      name: 'Mbabane & Manzini',
      center: { lat: -26.3054, lng: 31.1367 },
      districts: ['Mbabane CBD', 'Ezulwini', 'Manzini Central', 'Matsapha'],
    },
  ],

  // Lesotho
  ls: [
    {
      name: 'Maseru',
      center: { lat: -29.3167, lng: 27.4833 },
      districts: ['Maseru West', 'Pioneer', 'Kingsway', 'Hillsview'],
    },
    {
      name: 'Teyateyaneng & Leribe',
      center: { lat: -29.1472, lng: 27.7489 },
      districts: ['Teyateyaneng', 'Hlotse (Leribe)'],
    },
  ],

  // Yeşil Burun Adaları
  cv: [
    {
      name: 'Praia (Santiago)',
      center: { lat: 14.933, lng: -23.5133 },
      districts: ['Plateau', 'Achada Santo António', 'Prainha', 'Quebra Canela'],
    },
    {
      name: 'Mindelo (São Vicente) & Sal',
      center: { lat: 16.8901, lng: -24.9804 },
      districts: ['Mindelo Merkez', 'Santa Maria (Sal)'],
    },
  ],

  // Komorlar
  km: [
    {
      name: 'Moroni (Grande Comore)',
      center: { lat: -11.7172, lng: 43.2473 },
      districts: ['Médina', 'Volovolo', 'Itsandra', 'Oasis'],
    },
    {
      name: 'Mutsamudu (Anjouan)',
      center: { lat: -12.1667, lng: 44.4 },
      districts: ['Mutsamudu Merkez', 'Domoni'],
    },
  ],

  // São Tomé ve Príncipe
  st: [
    {
      name: 'São Tomé',
      center: { lat: 0.3365, lng: 6.7273 },
      districts: ['Água Grande', 'Riboque', 'Quinta Santo António', 'Pantufo'],
    },
    {
      name: 'Santo António (Príncipe)',
      center: { lat: 1.6373, lng: 7.4178 },
      districts: ['Santo António', 'Sundi'],
    },
  ],

  // Seyşeller
  sc: [
    {
      name: 'Victoria & Mahé',
      center: { lat: -4.6191, lng: 55.4513 },
      districts: ['Victoria', 'Beau Vallon', 'Eden Island', 'Anse Royale'],
    },
    {
      name: 'Praslin & La Digue',
      center: { lat: -4.3215, lng: 55.7365 },
      districts: ['Baie Sainte Anne', 'Anse Volbert', 'La Passe'],
    },
  ],
};
