import type { ProvinceLocation } from '../turkeyProvinces';

// Kuzey, Orta ve Güney Amerika kıtalarındaki tüm 35 ülkenin bölgeleri, şehirleri, ilçe/semt ve mahalleleri
export const AMERICAS_COUNTRY_PROVINCES: Record<string, ProvinceLocation[]> = {
  // ================= KUZEY & ORTA AMERİKA (23 ÜLKE) =================
  // ABD
  newyork: [
    {
      name: 'New York',
      center: { lat: 40.7233, lng: -74.003 },
      districts: [
        'SoHo', 'West Village', 'Williamsburg', 'Tribeca', 'Upper West Side',
        'Midtown', 'Chelsea', 'Upper East Side', 'DUMBO', 'Astoria', 'Greenwich Village',
      ],
    },
    {
      name: 'Los Angeles',
      center: { lat: 34.0522, lng: -118.2437 },
      districts: ['Beverly Hills', 'Santa Monica', 'Silver Lake', 'Venice', 'Downtown LA', 'Hollywood', 'Pasadena'],
    },
    {
      name: 'Chicago',
      center: { lat: 41.8781, lng: -87.6298 },
      districts: ['The Loop', 'West Loop', 'Lincoln Park', 'Wicker Park', 'River North', 'Hyde Park'],
    },
    {
      name: 'Miami',
      center: { lat: 25.7617, lng: -80.1918 },
      districts: ['Brickell', 'Wynwood', 'South Beach', 'Coral Gables', 'Coconut Grove', 'Design District'],
    },
    {
      name: 'San Francisco',
      center: { lat: 37.7749, lng: -122.4194 },
      districts: ['Mission District', 'SoMa', 'North Beach', 'Hayes Valley', 'Marina', 'Pacific Heights'],
    },
    {
      name: 'Austin',
      center: { lat: 30.2672, lng: -97.7431 },
      districts: ['Downtown Austin', 'South Congress', 'East Austin', 'Zilker'],
    },
    {
      name: 'Boston',
      center: { lat: 42.3601, lng: -71.0589 },
      districts: ['Back Bay', 'North End', 'Beacon Hill', 'Seaport', 'Cambridge'],
    },
    {
      name: 'Seattle',
      center: { lat: 47.6062, lng: -122.3321 },
      districts: ['Capitol Hill', 'Ballard', 'Pike Place', 'Queen Anne', 'Fremont'],
    },
  ],

  // Kanada
  ca: [
    {
      name: 'Toronto',
      center: { lat: 43.6532, lng: -79.3832 },
      districts: ['Downtown', 'Yorkville', 'Queen West', 'Kensington', 'Liberty Village', 'Distillery District', 'Annex'],
    },
    {
      name: 'Vancouver',
      center: { lat: 49.2827, lng: -123.1207 },
      districts: ['Yaletown', 'Gastown', 'Kitsilano', 'Coal Harbour', 'Mount Pleasant', 'West End'],
    },
    {
      name: 'Montreal',
      center: { lat: 45.5017, lng: -73.5673 },
      districts: ['Plateau-Mont-Royal', 'Old Montreal', 'Griffintown', 'Mile End', 'Downtown'],
    },
    {
      name: 'Calgary',
      center: { lat: 51.0447, lng: -114.0719 },
      districts: ['Beltline', 'Kensington', 'Inglewood', 'Downtown Calgary'],
    },
    {
      name: 'Ottawa',
      center: { lat: 45.4215, lng: -75.6972 },
      districts: ['ByWard Market', 'The Glebe', 'Centretown', 'Westboro'],
    },
  ],

  // Meksika
  mx: [
    {
      name: 'Meksiko',
      center: { lat: 19.4326, lng: -99.1332 },
      districts: ['Roma Norte', 'Condesa', 'Polanco', 'Coyoacán', 'Juárez', 'Centro Histórico', 'Santa Fe'],
    },
    {
      name: 'Guadalajara',
      center: { lat: 20.6597, lng: -103.3496 },
      districts: ['Americana', 'Providencia', 'Chapultepec', 'Zapopan Centro'],
    },
    {
      name: 'Monterrey',
      center: { lat: 25.6866, lng: -100.3161 },
      districts: ['San Pedro Garza García', 'Barrio Antiguo', 'Valle Oriente'],
    },
    {
      name: 'Cancún & Tulum',
      center: { lat: 21.1619, lng: -86.8515 },
      districts: ['Zona Hotelera', 'Cancún Centro', 'Playa del Carmen', 'Tulum Pueblo'],
    },
    {
      name: 'Oaxaca',
      center: { lat: 17.0732, lng: -96.7266 },
      districts: ['Centro', 'Jalatlaco', 'Xochimilco', 'Reforma'],
    },
  ],

  // Küba
  cu: [
    {
      name: 'Havana',
      center: { lat: 23.1136, lng: -82.3666 },
      districts: ['Vedado', 'Habana Vieja', 'Miramar', 'Centro Habana', 'Siboney'],
    },
    {
      name: 'Santiago de Cuba',
      center: { lat: 20.0247, lng: -75.8219 },
      districts: ['Centro Histórico', 'Vista Alegre', 'Tivolí'],
    },
    {
      name: 'Varadero & Trinidad',
      center: { lat: 23.1536, lng: -81.2442 },
      districts: ['Varadero', 'Trinidad Centro'],
    },
  ],

  // Dominik Cumhuriyeti
  do: [
    {
      name: 'Santo Domingo',
      center: { lat: 18.4861, lng: -69.9312 },
      districts: ['Zona Colonial', 'Piantini', 'Naco', 'Gazcue', 'Bella Vista'],
    },
    {
      name: 'Punta Cana & Santiago',
      center: { lat: 18.5601, lng: -68.3725 },
      districts: ['Bávaro', 'Cap Cana', 'Santiago Centro'],
    },
  ],

  // Jamaika
  jm: [
    {
      name: 'Kingston',
      center: { lat: 18.0179, lng: -76.8099 },
      districts: ['New Kingston', 'Liguanea', 'Half Way Tree', 'Port Royal'],
    },
    {
      name: 'Montego Bay',
      center: { lat: 18.4762, lng: -77.8939 },
      districts: ['Hip Strip', 'Rose Hall', 'Fairview'],
    },
  ],

  // Kosta Rika
  cr: [
    {
      name: 'San José',
      center: { lat: 9.9281, lng: -84.0907 },
      districts: ['Escalante', 'Escazú', 'Sabana', 'Santa Ana', 'Los Yoses'],
    },
    {
      name: 'Heredia & Tamarindo',
      center: { lat: 10.0024, lng: -84.1165 },
      districts: ['Heredia Centro', 'Alajuela', 'Tamarindo'],
    },
  ],

  // Panama
  pa: [
    {
      name: 'Panama Şehri',
      center: { lat: 8.9824, lng: -79.5199 },
      districts: ['Casco Viejo', 'Punta Pacífica', 'Obarrio', 'Costa del Este', 'San Francisco'],
    },
    {
      name: 'Colón & Boquete',
      center: { lat: 9.3545, lng: -79.9001 },
      districts: ['Colón Centro', 'Boquete', 'David'],
    },
  ],

  // Guatemala
  gt: [
    {
      name: 'Guatemala Şehri',
      center: { lat: 14.6349, lng: -90.5069 },
      districts: ['Zona 10', 'Zona 4', 'Cayalá', 'Zona 14', 'Zona 1'],
    },
    {
      name: 'Antigua Guatemala',
      center: { lat: 14.5586, lng: -90.7295 },
      districts: ['Parque Central', 'Santa Catalina', 'San Cristóbal'],
    },
  ],

  // Honduras
  hn: [
    {
      name: 'Tegucigalpa',
      center: { lat: 14.0723, lng: -87.1921 },
      districts: ['Palmira', 'Lomas del Guijarro', 'Tepeyac', 'Boulevard Morazán'],
    },
    {
      name: 'San Pedro Sula',
      center: { lat: 15.505, lng: -88.025 },
      districts: ['Río de Piedras', 'Jardines del Valle', 'El Centro'],
    },
  ],

  // El Salvador
  sv: [
    {
      name: 'San Salvador',
      center: { lat: 13.6929, lng: -89.2182 },
      districts: ['Escalón', 'San Benito', 'Santa Elena', 'Antiguo Cuscatlán'],
    },
    {
      name: 'Santa Ana & El Tunco',
      center: { lat: 13.9942, lng: -89.5597 },
      districts: ['Santa Ana Centro', 'El Tunco', 'Santa Tecla'],
    },
  ],

  // Nikaragua
  ni: [
    {
      name: 'Managua',
      center: { lat: 12.1149, lng: -86.2362 },
      districts: ['Las Colinas', 'Los Robles', 'Villa Fontana', 'Santo Domingo'],
    },
    {
      name: 'Granada & León',
      center: { lat: 11.9344, lng: -85.956 },
      districts: ['La Calzada (Granada)', 'León Centro'],
    },
  ],

  // Belize
  bz: [
    {
      name: 'Belize City',
      center: { lat: 17.5046, lng: -88.1962 },
      districts: ['Fort George', 'King’s Park', 'Buttonwood Bay'],
    },
    {
      name: 'San Pedro & Belmopan',
      center: { lat: 17.9214, lng: -87.9611 },
      districts: ['San Pedro (Ambergris Caye)', 'Belmopan Merkez'],
    },
  ],

  // Bahamalar
  bs: [
    {
      name: 'Nassau (New Providence)',
      center: { lat: 25.0443, lng: -77.3504 },
      districts: ['Downtown Nassau', 'Cable Beach', 'Paradise Island', 'Lyford Cay'],
    },
    {
      name: 'Freeport (Grand Bahama)',
      center: { lat: 26.5285, lng: -78.6966 },
      districts: ['Port Lucaya', 'Freeport Central'],
    },
  ],

  // Barbados
  bb: [
    {
      name: 'Bridgetown & Christ Church',
      center: { lat: 13.1132, lng: -59.5988 },
      districts: ['Hastings', 'Bridgetown Central', 'St. Lawrence Gap', 'Worthing'],
    },
    {
      name: 'Holetown (St. James)',
      center: { lat: 13.1867, lng: -59.6381 },
      districts: ['Holetown', 'Speightstown', 'Paynes Bay'],
    },
  ],

  // Trinidad ve Tobago
  tt: [
    {
      name: 'Port of Spain',
      center: { lat: 10.6603, lng: -61.5086 },
      districts: ['Woodbrook', 'St. Clair', 'Maraval', 'Westmoorings'],
    },
    {
      name: 'San Fernando & Tobago',
      center: { lat: 10.2805, lng: -61.4494 },
      districts: ['San Fernando Merkez', 'Scarborough (Tobago)', 'Crown Point'],
    },
  ],

  // Haiti
  ht: [
    {
      name: 'Port-au-Prince & Pétion-Ville',
      center: { lat: 18.5944, lng: -72.3074 },
      districts: ['Pétion-Ville', 'Turgeau', 'Delmas', 'Pacot'],
    },
    {
      name: 'Cap-Haïtien',
      center: { lat: 19.7594, lng: -72.1982 },
      districts: ['Centre Ville', 'Labadee Çevresi'],
    },
  ],

  // Antigua ve Barbuda
  ag: [
    {
      name: 'St. John’s & English Harbour',
      center: { lat: 17.1274, lng: -61.8468 },
      districts: ['Heritage Quay', 'Dickenson Bay', 'English Harbour', 'Jolly Harbour'],
    },
  ],

  // Dominika
  dm: [
    {
      name: 'Roseau & Portsmouth',
      center: { lat: 15.3092, lng: -61.3794 },
      districts: ['Roseau Merkez', 'Pottersville', 'Portsmouth'],
    },
  ],

  // Grenada
  gd: [
    {
      name: 'St. George’s & Grand Anse',
      center: { lat: 12.0561, lng: -61.7488 },
      districts: ['Carenage', 'Grand Anse', 'Lance aux Epines', 'True Blue'],
    },
  ],

  // Saint Kitts ve Nevis
  kn: [
    {
      name: 'Basseterre & Charlestown',
      center: { lat: 17.3026, lng: -62.7177 },
      districts: ['Basseterre', 'Frigate Bay', 'Charlestown (Nevis)'],
    },
  ],

  // Saint Lucia
  lc: [
    {
      name: 'Castries & Gros Islet',
      center: { lat: 14.0101, lng: -60.9875 },
      districts: ['Castries', 'Rodney Bay', 'Soufrière', 'Marigot Bay'],
    },
  ],

  // Saint Vincent ve Grenadinler
  vc: [
    {
      name: 'Kingstown & Bequia',
      center: { lat: 13.1587, lng: -61.2248 },
      districts: ['Kingstown', 'Villa', 'Arnos Vale', 'Port Elizabeth (Bequia)'],
    },
  ],

  // ================= GÜNEY AMERİKA (12 ÜLKE) =================
  // Brezilya
  br: [
    {
      name: 'São Paulo',
      center: { lat: -23.5505, lng: -46.6333 },
      districts: ['Jardins', 'Pinheiros', 'Vila Madalena', 'Itaim Bibi', 'Moema', 'Bela Vista', 'Vila Olímpia'],
    },
    {
      name: 'Rio de Janeiro',
      center: { lat: -22.9068, lng: -43.1729 },
      districts: ['Ipanema', 'Copacabana', 'Leblon', 'Botafogo', 'Barra da Tijuca', 'Santa Teresa'],
    },
    {
      name: 'Brasília',
      center: { lat: -15.7975, lng: -47.8919 },
      districts: ['Asa Sul', 'Asa Norte', 'Lago Sul', 'Sudoeste'],
    },
    {
      name: 'Belo Horizonte',
      center: { lat: -19.9167, lng: -43.9345 },
      districts: ['Savassi', 'Lourdes', 'Pampulha', 'Funcionários'],
    },
    {
      name: 'Curitiba',
      center: { lat: -25.4284, lng: -49.2733 },
      districts: ['Batel', 'Centro', 'Água Verde', 'Bigorrilho'],
    },
    {
      name: 'Salvador',
      center: { lat: -12.9714, lng: -38.5014 },
      districts: ['Pelourinho', 'Barra', 'Rio Vermelho', 'Ondina'],
    },
  ],

  // Arjantin
  ar: [
    {
      name: 'Buenos Aires',
      center: { lat: -34.6037, lng: -58.3816 },
      districts: ['Palermo', 'Recoleta', 'San Telmo', 'Puerto Madero', 'Belgrano', 'Villa Crespo', 'Retiro'],
    },
    {
      name: 'Córdoba',
      center: { lat: -31.4201, lng: -64.1888 },
      districts: ['Nueva Córdoba', 'Güemes', 'Cerro de las Rosas', 'General Paz'],
    },
    {
      name: 'Mendoza',
      center: { lat: -32.8895, lng: -68.8458 },
      districts: ['Quinta Sección', 'Centro', 'Chacras de Coria'],
    },
    {
      name: 'Rosario',
      center: { lat: -32.9442, lng: -60.6505 },
      districts: ['Centro', 'Pichincha', 'Fisherton'],
    },
  ],

  // Kolombiya
  co: [
    {
      name: 'Bogotá',
      center: { lat: 4.711, lng: -74.0721 },
      districts: ['Zona T', 'Chapinero', 'Usaquén', 'La Candelaria', 'Chicó', 'Zona G'],
    },
    {
      name: 'Medellín',
      center: { lat: 6.2442, lng: -75.5812 },
      districts: ['El Poblado', 'Laureles', 'Envigado', 'Provenza'],
    },
    {
      name: 'Cartagena',
      center: { lat: 10.391, lng: -75.4794 },
      districts: ['Ciudad Amurallada', 'Getsemaní', 'Bocagrande'],
    },
    {
      name: 'Cali',
      center: { lat: 3.4516, lng: -76.532 },
      districts: ['San Antonio', 'Granada', 'Ciudad Jardín'],
    },
  ],

  // Şili
  cl: [
    {
      name: 'Santiago',
      center: { lat: -33.4489, lng: -70.6693 },
      districts: ['Providencia', 'Las Condes', 'Lastarria', 'Vitacura', 'Ñuñoa', 'Bellavista'],
    },
    {
      name: 'Valparaíso & Viña del Mar',
      center: { lat: -33.0472, lng: -71.6127 },
      districts: ['Cerro Alegre', 'Cerro Concepción', 'Viña del Mar Centro', 'Reñaca'],
    },
  ],

  // Peru
  pe: [
    {
      name: 'Lima',
      center: { lat: -12.0464, lng: -77.0428 },
      districts: ['Miraflores', 'Barranco', 'San Isidro', 'Surco', 'Centro Histórico'],
    },
    {
      name: 'Cusco & Arequipa',
      center: { lat: -13.5319, lng: -71.9675 },
      districts: ['Plaza de Armas (Cusco)', 'San Blas', 'Yanahuara (Arequipa)'],
    },
  ],

  // Ekvador
  ec: [
    {
      name: 'Quito',
      center: { lat: -0.1807, lng: -78.4678 },
      districts: ['La Floresta', 'Centro Histórico', 'Cumbayá', 'La Carolina', 'La Mariscal'],
    },
    {
      name: 'Guayaquil & Cuenca',
      center: { lat: -2.171, lng: -79.9224 },
      districts: ['Samborondón', 'Las Peñas', 'Puerto Santa Ana', 'Cuenca Centro'],
    },
  ],

  // Uruguay
  uy: [
    {
      name: 'Montevideo',
      center: { lat: -34.9011, lng: -56.1645 },
      districts: ['Pocitos', 'Punta Carretas', 'Ciudad Vieja', 'Carrasco', 'Cordón'],
    },
    {
      name: 'Punta del Este',
      center: { lat: -34.9667, lng: -54.95 },
      districts: ['Península', 'La Barra', 'Manantiales'],
    },
  ],

  // Paraguay
  py: [
    {
      name: 'Asunción',
      center: { lat: -25.2637, lng: -57.5759 },
      districts: ['Villa Morra', 'Carmelitas', 'Las Mercedes', 'Centro', 'Recoleta'],
    },
    {
      name: 'Ciudad del Este & Encarnación',
      center: { lat: -25.5097, lng: -54.6111 },
      districts: ['Area 1', 'Costanera Encarnación'],
    },
  ],

  // Bolivya
  bo: [
    {
      name: 'La Paz',
      center: { lat: -16.4897, lng: -68.1193 },
      districts: ['Sopocachi', 'Zona Sur', 'San Miguel', 'Calacoto', 'Centro'],
    },
    {
      name: 'Santa Cruz & Cochabamba',
      center: { lat: -17.7833, lng: -63.1821 },
      districts: ['Equipetrol', 'Las Palmas', 'Cochabamba Norte'],
    },
  ],

  // Venezuela
  ve: [
    {
      name: 'Karakas',
      center: { lat: 10.4806, lng: -66.9036 },
      districts: ['Las Mercedes', 'Altamira', 'Chacao', 'Los Palos Grandes', 'El Hatillo'],
    },
    {
      name: 'Valencia & Maracaibo',
      center: { lat: 10.162, lng: -68.0077 },
      districts: ['El Viñedo', 'Tierra Negra', 'Bella Vista'],
    },
  ],

  // Guyana
  gy: [
    {
      name: 'Georgetown',
      center: { lat: 6.8013, lng: -58.1551 },
      districts: ['Kingston', 'Stabroek', 'Cummingsburg', 'Queenstown', 'Kitty'],
    },
    {
      name: 'New Amsterdam & Linden',
      center: { lat: 6.2479, lng: -57.5171 },
      districts: ['New Amsterdam Merkez', 'Mackenzie (Linden)'],
    },
  ],

  // Surinam
  sr: [
    {
      name: 'Paramaribo',
      center: { lat: 5.852, lng: -55.2038 },
      districts: ['Centrum', 'Rainville', 'Zorg en Hoop', 'Blauwgrond', 'Maretraite'],
    },
    {
      name: 'Nieuw Nickerie & Wanica',
      center: { lat: 5.9261, lng: -56.973 },
      districts: ['Nieuw Nickerie', 'Lelydorp'],
    },
  ],
};
