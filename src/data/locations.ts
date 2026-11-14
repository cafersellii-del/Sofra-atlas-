import { ALL_COUNTRY_HUBS, findCountryHub } from './countries';
import { type ProvinceLocation, TURKEY_PROVINCES } from './turkeyProvinces';

export type { ProvinceLocation };
export { TURKEY_PROVINCES };

export const MAJOR_COUNTRY_PROVINCES: Record<string, ProvinceLocation[]> = {
  // Almanya
  de: [
    {
      name: 'Berlin',
      center: { lat: 52.52, lng: 13.405 },
      districts: ['Mitte', 'Kreuzberg', 'Charlottenburg', 'Prenzlauer Berg', 'Neukölln', 'Friedrichshain'],
    },
    {
      name: 'Münih',
      center: { lat: 48.1351, lng: 11.582 },
      districts: ['Altstadt-Lehel', 'Schwabing', 'Maxvorstadt', 'Haidhausen', 'Bogenhausen'],
    },
    {
      name: 'Hamburg',
      center: { lat: 53.5511, lng: 9.9937 },
      districts: ['Altona', 'Eimsbüttel', 'St. Pauli', 'HafenCity', 'Winterhude'],
    },
    {
      name: 'Frankfurt',
      center: { lat: 50.1109, lng: 8.6821 },
      districts: ['Innenstadt', 'Sachsenhausen', 'Westend', 'Nordend', 'Bornheim'],
    },
    {
      name: 'Köln',
      center: { lat: 50.9375, lng: 6.9603 },
      districts: ['Innenstadt', 'Ehrenfeld', 'Belgisches Viertel', 'Lindenthal', 'Nippes'],
    },
  ],
  // Birleşik Krallık
  gb: [
    {
      name: 'Londra',
      center: { lat: 51.5074, lng: -0.1278 },
      districts: ['Soho', 'Shoreditch', 'Covent Garden', 'Kensington', 'Camden', 'Mayfair', 'Greenwich'],
    },
    {
      name: 'Manchester',
      center: { lat: 53.4808, lng: -2.2426 },
      districts: ['Northern Quarter', 'Deansgate', 'Ancoats', 'Didsbury', 'Salford Quays'],
    },
    {
      name: 'Edinburgh',
      center: { lat: 55.9533, lng: -3.1883 },
      districts: ['Old Town', 'New Town', 'Stockbridge', 'Leith', 'Morningside'],
    },
    {
      name: 'Birmingham',
      center: { lat: 52.4862, lng: -1.8904 },
      districts: ['Jewellery Quarter', 'Digbeth', 'Edgbaston', 'Moseley'],
    },
  ],
  // Fransa
  paris: [
    {
      name: 'Paris',
      center: { lat: 48.8566, lng: 2.3522 },
      districts: ['Le Marais', 'Saint-Germain-des-Prés', 'Montmartre', 'Canal Saint-Martin', 'Bastille', 'Opéra'],
    },
    {
      name: 'Lyon',
      center: { lat: 45.764, lng: 4.8357 },
      districts: ['Presqu’île', 'Vieux Lyon', 'Croix-Rousse', 'Part-Dieu'],
    },
    {
      name: 'Marsilya',
      center: { lat: 43.2965, lng: 5.3698 },
      districts: ['Vieux-Port', 'Le Panier', 'Castellane', 'Prado'],
    },
    {
      name: 'Nice',
      center: { lat: 43.7102, lng: 7.262 },
      districts: ['Vieux Nice', 'Promenade des Anglais', 'Cimiez', 'Port Lympia'],
    },
  ],
  // İtalya
  napoli: [
    {
      name: 'Napoli',
      center: { lat: 40.8518, lng: 14.2681 },
      districts: ['Centro Storico', 'Chiaia', 'Vomero', 'San Ferdinando', 'Posillipo'],
    },
    {
      name: 'Roma',
      center: { lat: 41.9028, lng: 12.4964 },
      districts: ['Trastevere', 'Centro Storico', 'Prati', 'Monti', 'Testaccio'],
    },
    {
      name: 'Milano',
      center: { lat: 45.4642, lng: 9.19 },
      districts: ['Brera', 'Navigli', 'Porta Nuova', 'Isola', 'Quadrilatero'],
    },
    {
      name: 'Floransa',
      center: { lat: 43.7696, lng: 11.2558 },
      districts: ['Duomo', 'Oltrarno', 'Santa Croce', 'San Lorenzo'],
    },
    {
      name: 'Venedik',
      center: { lat: 45.4408, lng: 12.3155 },
      districts: ['San Marco', 'Cannaregio', 'Dorsoduro', 'Rialto'],
    },
  ],
  // ABD
  newyork: [
    {
      name: 'New York',
      center: { lat: 40.7233, lng: -74.003 },
      districts: ['SoHo', 'West Village', 'Williamsburg', 'Tribeca', 'Upper West Side', 'Midtown'],
    },
    {
      name: 'Los Angeles',
      center: { lat: 34.0522, lng: -118.2437 },
      districts: ['Beverly Hills', 'Santa Monica', 'Silver Lake', 'Venice', 'Downtown LA'],
    },
    {
      name: 'Chicago',
      center: { lat: 41.8781, lng: -87.6298 },
      districts: ['The Loop', 'West Loop', 'Lincoln Park', 'Wicker Park', 'River North'],
    },
    {
      name: 'Miami',
      center: { lat: 25.7617, lng: -80.1918 },
      districts: ['Brickell', 'Wynwood', 'South Beach', 'Coral Gables'],
    },
    {
      name: 'San Francisco',
      center: { lat: 37.7749, lng: -122.4194 },
      districts: ['Mission District', 'SoMa', 'North Beach', 'Hayes Valley'],
    },
  ],
  // İspanya
  es: [
    {
      name: 'Madrid',
      center: { lat: 40.4168, lng: -3.7038 },
      districts: ['Sol', 'Salamanca', 'Malasaña', 'Chueca', 'Retiro'],
    },
    {
      name: 'Barselona',
      center: { lat: 41.3874, lng: 2.1686 },
      districts: ['Eixample', 'El Born', 'Barri Gòtic', 'Gràcia', 'Barceloneta'],
    },
    {
      name: 'Sevilla',
      center: { lat: 37.3891, lng: -5.9845 },
      districts: ['Santa Cruz', 'Triana', 'Nervión', 'Alameda'],
    },
    {
      name: 'Valensiya',
      center: { lat: 39.4699, lng: -0.3763 },
      districts: ['Ciutat Vella', 'Ruzafa', 'El Carmen', 'Benimaclet'],
    },
  ],
  // Japonya
  tokyo: [
    {
      name: 'Tokyo',
      center: { lat: 35.6595, lng: 139.7004 },
      districts: ['Shibuya', 'Ginza', 'Daikanyama', 'Aoyama', 'Shinjuku', 'Roppongi'],
    },
    {
      name: 'Osaka',
      center: { lat: 34.6937, lng: 135.5023 },
      districts: ['Namba', 'Umeda', 'Shinsaibashi', 'Tennoji'],
    },
    {
      name: 'Kyoto',
      center: { lat: 35.0116, lng: 135.7681 },
      districts: ['Gion', 'Kawaramachi', 'Arashiyama', 'Nakagyo'],
    },
    {
      name: 'Fukuoka',
      center: { lat: 33.5902, lng: 130.4017 },
      districts: ['Hakata', 'Tenjin', 'Daimyo'],
    },
  ],
  // Güney Kore
  kr: [
    {
      name: 'Seul',
      center: { lat: 37.5665, lng: 126.978 },
      districts: ['Gangnam', 'Itaewon', 'Hongdae', 'Myeongdong', 'Jongno'],
    },
    {
      name: 'Busan',
      center: { lat: 35.1796, lng: 129.0756 },
      districts: ['Haeundae', 'Seomyeon', 'Nampo-dong', 'Gwangalli'],
    },
    {
      name: 'İncheon',
      center: { lat: 37.4563, lng: 126.7052 },
      districts: ['Songdo', 'Bupyeong', 'Namdong'],
    },
  ],
  // Birleşik Arap Emirlikleri
  ae: [
    {
      name: 'Dubai',
      center: { lat: 25.2048, lng: 55.2708 },
      districts: ['DIFC', 'Downtown Dubai', 'Dubai Marina', 'Jumeirah', 'Business Bay'],
    },
    {
      name: 'Abu Dabi',
      center: { lat: 24.4539, lng: 54.3773 },
      districts: ['Al Maryah Island', 'Corniche', 'Yas Island', 'Saadiyat'],
    },
    {
      name: 'Şarika',
      center: { lat: 25.3463, lng: 55.4209 },
      districts: ['Al Majaz', 'Al Khan', 'Muwaileh'],
    },
  ],
  // Azerbaycan
  az: [
    {
      name: 'Bakü',
      center: { lat: 40.4093, lng: 49.8671 },
      districts: ['Nizami', 'İçərişəhər', 'Nərimanov', 'Yasamal', 'Səbail', 'Xətai'],
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
  ],
  // Kanada
  ca: [
    {
      name: 'Toronto',
      center: { lat: 43.6532, lng: -79.3832 },
      districts: ['Downtown', 'Yorkville', 'Queen West', 'Kensington', 'Liberty Village'],
    },
    {
      name: 'Vancouver',
      center: { lat: 49.2827, lng: -123.1207 },
      districts: ['Yaletown', 'Gastown', 'Kitsilano', 'Coal Harbour'],
    },
    {
      name: 'Montreal',
      center: { lat: 45.5017, lng: -73.5673 },
      districts: ['Plateau-Mont-Royal', 'Old Montreal', 'Griffintown', 'Mile End'],
    },
  ],
  // Brezilya
  br: [
    {
      name: 'São Paulo',
      center: { lat: -23.5505, lng: -46.6333 },
      districts: ['Jardins', 'Pinheiros', 'Vila Madalena', 'Itaim Bibi', 'Moema'],
    },
    {
      name: 'Rio de Janeiro',
      center: { lat: -22.9068, lng: -43.1729 },
      districts: ['Ipanema', 'Copacabana', 'Leblon', 'Botafogo'],
    },
    {
      name: 'Brasília',
      center: { lat: -15.7975, lng: -47.8919 },
      districts: ['Asa Sul', 'Asa Norte', 'Lago Sul'],
    },
  ],
  // Meksika
  mx: [
    {
      name: 'Meksiko',
      center: { lat: 19.4326, lng: -99.1332 },
      districts: ['Roma Norte', 'Condesa', 'Polanco', 'Coyoacán', 'Juárez'],
    },
    {
      name: 'Guadalajara',
      center: { lat: 20.6597, lng: -103.3496 },
      districts: ['Americana', 'Providencia', 'Chapultepec'],
    },
    {
      name: 'Monterrey',
      center: { lat: 25.6866, lng: -100.3161 },
      districts: ['San Pedro Garza García', 'Barrio Antiguo', 'Valle Oriente'],
    },
  ],
  // Mısır
  eg: [
    {
      name: 'Kahire',
      center: { lat: 30.0444, lng: 31.2357 },
      districts: ['Zamalek', 'Maadi', 'Downtown', 'New Cairo', 'Heliopolis'],
    },
    {
      name: 'İskenderiye',
      center: { lat: 31.2001, lng: 29.9187 },
      districts: ['Smouha', 'Stanley', 'Glim', 'San Stefano'],
    },
    {
      name: 'Giza',
      center: { lat: 30.0131, lng: 31.2089 },
      districts: ['Dokki', 'Mohandessin', 'Sheikh Zayed'],
    },
  ],
  // Avustralya
  au: [
    {
      name: 'Sidney',
      center: { lat: -33.8688, lng: 151.2093 },
      districts: ['Surry Hills', 'CBD', 'Bondi', 'Newtown', 'Paddington'],
    },
    {
      name: 'Melbourne',
      center: { lat: -37.8136, lng: 144.9631 },
      districts: ['Fitzroy', 'Carlton', 'South Yarra', 'St Kilda'],
    },
    {
      name: 'Brisbane',
      center: { lat: -27.4705, lng: 153.026 },
      districts: ['South Bank', 'New Farm', 'Fortitude Valley'],
    },
  ],
  // Rusya
  ru: [
    {
      name: 'Moskova',
      center: { lat: 55.7558, lng: 37.6173 },
      districts: ['Tverskoy', 'Arbat', 'Patriarch Ponds', 'Zamoskvorechye'],
    },
    {
      name: 'Sankt-Peterburg',
      center: { lat: 59.9311, lng: 30.3609 },
      districts: ['Tsentralny', 'Petrogradsky', 'Vasileostrovsky'],
    },
    {
      name: 'Kazan',
      center: { lat: 55.7961, lng: 49.1064 },
      districts: ['Vakhitovsky', 'Novo-Savinovsky'],
    },
  ],
  // Hollanda
  nl: [
    {
      name: 'Amsterdam',
      center: { lat: 52.3676, lng: 4.9041 },
      districts: ['Centrum', 'Jordaan', 'De Pijp', 'Oud-West'],
    },
    {
      name: 'Rotterdam',
      center: { lat: 51.9244, lng: 4.4777 },
      districts: ['Centrum', 'Kralingen', 'Kop van Zuid'],
    },
    {
      name: 'Lahey',
      center: { lat: 52.0705, lng: 4.3007 },
      districts: ['Centrum', 'Scheveningen', 'Zeeheldenkwartier'],
    },
  ],
  // İsviçre
  ch: [
    {
      name: 'Zürih',
      center: { lat: 47.3769, lng: 8.5417 },
      districts: ['Altstadt', 'Seefeld', 'Kreis 4', 'Enge'],
    },
    {
      name: 'Cenevre',
      center: { lat: 46.2044, lng: 6.1432 },
      districts: ['Vieille Ville', 'Eaux-Vives', 'Carouge'],
    },
    {
      name: 'Basel',
      center: { lat: 47.5596, lng: 7.5886 },
      districts: ['Grossbasel', 'Kleinbasel', 'St. Alban'],
    },
  ],
  // Suudi Arabistan
  sa: [
    {
      name: 'Riyad',
      center: { lat: 24.7136, lng: 46.6753 },
      districts: ['Olaya', 'Al Malqa', 'Diplomatic Quarter', 'Hittin'],
    },
    {
      name: 'Cidde',
      center: { lat: 21.4858, lng: 39.1925 },
      districts: ['Al Rawdah', 'Al Hamra', 'Obhur'],
    },
    {
      name: 'Mekke',
      center: { lat: 21.3891, lng: 39.8579 },
      districts: ['Al Aziziyah', 'Al Haram', 'Al Shawqiyyah'],
    },
  ],
  // Tayland
  bangkok: [
    {
      name: 'Bangkok',
      center: { lat: 13.7367, lng: 100.5608 },
      districts: ['Sukhumvit', 'Thonglor', 'Ari', 'Silom', 'Siam'],
    },
    {
      name: 'Chiang Mai',
      center: { lat: 18.7883, lng: 98.9853 },
      districts: ['Nimman', 'Old City', 'Santitham'],
    },
    {
      name: 'Phuket',
      center: { lat: 7.8804, lng: 98.3923 },
      districts: ['Phuket Town', 'Patong', 'Kata'],
    },
  ],
  // Çin
  cn: [
    {
      name: 'Şanghay',
      center: { lat: 31.2304, lng: 121.4737 },
      districts: ['Jing’an', 'French Concession', 'Pudong', 'Xuhui'],
    },
    {
      name: 'Pekin',
      center: { lat: 39.9042, lng: 116.4074 },
      districts: ['Chaoyang', 'Sanlitun', 'Dongcheng', 'Haidian'],
    },
    {
      name: 'Shenzhen',
      center: { lat: 22.5431, lng: 114.0579 },
      districts: ['Futian', 'Nanshan', 'Luohu'],
    },
  ],
  // Hong Kong
  hk: [
    {
      name: 'Hong Kong Adası',
      center: { lat: 22.2819, lng: 114.1588 },
      districts: ['Central', 'SoHo', 'Causeway Bay', 'Wan Chai', 'Admiralty', 'Sheung Wan'],
    },
    {
      name: 'Kowloon',
      center: { lat: 22.2988, lng: 114.1722 },
      districts: ['Tsim Sha Tsui', 'Mong Kok', 'Yau Ma Tei', 'West Kowloon', 'Hung Hom'],
    },
    {
      name: 'New Territories',
      center: { lat: 22.3814, lng: 114.1886 },
      districts: ['Sha Tin', 'Tsuen Wan', 'Sai Kung', 'Tai Po'],
    },
  ],
  // Hindistan
  in: [
    {
      name: 'Mumbai',
      center: { lat: 19.076, lng: 72.8777 },
      districts: ['Bandra', 'Colaba', 'Lower Parel', 'Juhu'],
    },
    {
      name: 'Yeni Delhi',
      center: { lat: 28.6139, lng: 77.209 },
      districts: ['Connaught Place', 'Hauz Khas', 'Khan Market', 'Saket'],
    },
    {
      name: 'Bengaluru',
      center: { lat: 12.9716, lng: 77.5946 },
      districts: ['Indiranagar', 'Koramangala', 'MG Road'],
    },
  ],
  // Arjantin
  ar: [
    {
      name: 'Buenos Aires',
      center: { lat: -34.6037, lng: -58.3816 },
      districts: ['Palermo', 'Recoleta', 'San Telmo', 'Puerto Madero'],
    },
    {
      name: 'Córdoba',
      center: { lat: -31.4201, lng: -64.1888 },
      districts: ['Nueva Córdoba', 'Güemes', 'Cerro de las Rosas'],
    },
  ],
  // Güney Afrika
  za: [
    {
      name: 'Cape Town',
      center: { lat: -33.9249, lng: 18.4241 },
      districts: ['City Bowl', 'Sea Point', 'Camps Bay', 'Kloof Street'],
    },
    {
      name: 'Johannesburg',
      center: { lat: -26.2041, lng: 28.0473 },
      districts: ['Sandton', 'Rosebank', 'Melville', 'Maboneng'],
    },
  ],
};

export function getProvincesForCountry(countryId: string): ProvinceLocation[] {
  if (countryId === 'istanbul') {
    return TURKEY_PROVINCES;
  }
  const major = MAJOR_COUNTRY_PROVINCES[countryId];
  if (major && major.length > 0) {
    return major;
  }
  const hub = findCountryHub(countryId) ?? ALL_COUNTRY_HUBS[0];
  return [
    {
      name: hub.name,
      center: hub.center,
      districts: hub.neighborhoods.length > 0 ? hub.neighborhoods : ['Merkez'],
    },
  ];
}

export function getDistrictsForProvince(
  countryId: string,
  provinceName: string
): string[] {
  const provinces = getProvincesForCountry(countryId);
  const found = provinces.find(
    (p) => p.name.toLocaleLowerCase('tr') === provinceName.toLocaleLowerCase('tr')
  );
  if (found && found.districts.length > 0) {
    return found.districts;
  }
  return provinces[0]?.districts ?? ['Merkez'];
}

export function getCenterForProvince(
  countryId: string,
  provinceName?: string
): { lat: number; lng: number } {
  const provinces = getProvincesForCountry(countryId);
  if (provinceName) {
    const found = provinces.find(
      (p) =>
        p.name.toLocaleLowerCase('tr') === provinceName.toLocaleLowerCase('tr')
    );
    if (found) return found.center;
  }
  const hub = findCountryHub(countryId);
  return hub?.center ?? provinces[0]?.center ?? { lat: 41.0082, lng: 28.9784 };
}
