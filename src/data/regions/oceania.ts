import type { ProvinceLocation } from '../turkeyProvinces';

// Okyanusya kıtasındaki tüm 14 ülkenin bölgeleri, şehirleri, ilçe/semt ve mahalleleri
export const OCEANIA_COUNTRY_PROVINCES: Record<string, ProvinceLocation[]> = {
  // Avustralya
  au: [
    {
      name: 'Sidney',
      center: { lat: -33.8688, lng: 151.2093 },
      districts: [
        'Surry Hills', 'CBD', 'Bondi', 'Newtown', 'Paddington',
        'Darlinghurst', 'Manly', 'Parramatta', 'Balmain', 'Barangaroo',
      ],
    },
    {
      name: 'Melbourne',
      center: { lat: -37.8136, lng: 144.9631 },
      districts: ['Fitzroy', 'Carlton', 'South Yarra', 'St Kilda', 'Collingwood', 'CBD', 'Richmond', 'Brunswick'],
    },
    {
      name: 'Brisbane',
      center: { lat: -27.4705, lng: 153.026 },
      districts: ['South Bank', 'New Farm', 'Fortitude Valley', 'West End', 'Paddington'],
    },
    {
      name: 'Perth',
      center: { lat: -31.9505, lng: 115.8605 },
      districts: ['Perth CBD', 'Northbridge', 'Fremantle', 'Subiaco', 'Leederville'],
    },
    {
      name: 'Adelaide',
      center: { lat: -34.9285, lng: 138.6007 },
      districts: ['Adelaide CBD', 'North Adelaide', 'Glenelg', 'Norwood'],
    },
  ],

  // Yeni Zelanda
  nz: [
    {
      name: 'Auckland',
      center: { lat: -36.8485, lng: 174.7633 },
      districts: ['Ponsonby', 'CBD', 'Parnell', 'Newmarket', 'Grey Lynn', 'Devonport', 'Viaduct Harbour'],
    },
    {
      name: 'Wellington',
      center: { lat: -41.2865, lng: 174.7762 },
      districts: ['Te Aro', 'Cuba Street', 'Thorndon', 'Oriental Bay', 'Kelburn'],
    },
    {
      name: 'Christchurch',
      center: { lat: -43.5321, lng: 172.6362 },
      districts: ['Central City', 'Riccarton', 'Merivale', 'Sumner'],
    },
    {
      name: 'Queenstown',
      center: { lat: -45.0312, lng: 168.6626 },
      districts: ['Queenstown Central', 'Frankton', 'Arrowtown'],
    },
  ],

  // Fiji
  fj: [
    {
      name: 'Suva',
      center: { lat: -18.1416, lng: 178.4419 },
      districts: ['Suva Central', 'Flagstaff', 'Tamavua', 'Samabula'],
    },
    {
      name: 'Nadi & Lautoka',
      center: { lat: -17.7765, lng: 177.4356 },
      districts: ['Nadi Town', 'Denarau Island', 'Namaka', 'Lautoka City'],
    },
  ],

  // Papua Yeni Gine
  pg: [
    {
      name: 'Port Moresby',
      center: { lat: -9.4438, lng: 147.1803 },
      districts: ['Waigani', 'Boroko', 'Town', 'Gordons', 'Ela Beach'],
    },
    {
      name: 'Lae',
      center: { lat: -6.7303, lng: 147.0008 },
      districts: ['Top Town', 'Eriku', 'Butibam'],
    },
  ],

  // Samoa
  ws: [
    {
      name: 'Apia (Upolu)',
      center: { lat: -13.8507, lng: -171.7514 },
      districts: ['Apia Central', 'Vaitele', 'Moto’otua', 'Mulinu’u'],
    },
    {
      name: 'Salelologa (Savai’i)',
      center: { lat: -13.7417, lng: -172.2167 },
      districts: ['Salelologa', 'Lalomalava', 'Asau'],
    },
  ],

  // Tonga
  to: [
    {
      name: 'Nuku’alofa (Tongatapu)',
      center: { lat: -21.1393, lng: -175.2049 },
      districts: ['Kolofo’ou', 'Ma’ufanga', 'Kolomotu’a', 'Sopu'],
    },
    {
      name: 'Neiafu (Vava’u)',
      center: { lat: -18.6507, lng: -173.984 },
      districts: ['Neiafu Merkez', 'Toula', 'Utui'],
    },
  ],

  // Vanuatu
  vu: [
    {
      name: 'Port Vila (Efate)',
      center: { lat: -17.7333, lng: 168.3273 },
      districts: ['Port Vila', 'Nambatu', 'Seaside', 'Pango'],
    },
    {
      name: 'Luganville (Espiritu Santo)',
      center: { lat: -15.5144, lng: 167.1778 },
      districts: ['Luganville Merkez', 'Chapuis', 'Sarakata'],
    },
  ],

  // Solomon Adaları
  sb: [
    {
      name: 'Honiara (Guadalcanal)',
      center: { lat: -9.4456, lng: 159.9729 },
      districts: ['Point Cruz', 'Kukum', 'Chinatown', 'Rove'],
    },
    {
      name: 'Gizo & Auki',
      center: { lat: -8.1031, lng: 156.8419 },
      districts: ['Gizo Merkez', 'Auki Merkez', 'Munda'],
    },
  ],

  // Mikronezya
  fm: [
    {
      name: 'Palikir & Kolonia (Pohnpei)',
      center: { lat: 6.9248, lng: 158.1611 },
      districts: ['Palikir', 'Kolonia', 'Sokehs', 'Nett'],
    },
    {
      name: 'Weno (Chuuk) & Colonia (Yap)',
      center: { lat: 7.4481, lng: 151.8492 },
      districts: ['Weno', 'Colonia Yap', 'Tofol Kosrae'],
    },
  ],

  // Palau
  pw: [
    {
      name: 'Ngerulmud & Koror',
      center: { lat: 7.5004, lng: 134.6242 },
      districts: ['Koror', 'Melekeok', 'Ngerulmud', 'Airai', 'Meyuns'],
    },
  ],

  // Marshall Adaları
  mh: [
    {
      name: 'Majuro',
      center: { lat: 7.1164, lng: 171.1858 },
      districts: ['Delap', 'Uliga', 'Djarrit (Rita)', 'Laura'],
    },
    {
      name: 'Ebeye (Kwajalein)',
      center: { lat: 8.7808, lng: 167.7375 },
      districts: ['Ebeye Merkez', 'Kwajalein'],
    },
  ],

  // Kiribati
  ki: [
    {
      name: 'Güney Tarawa',
      center: { lat: 1.3382, lng: 173.0176 },
      districts: ['Bairiki', 'Betio', 'Bikenibeu', 'Ambo'],
    },
    {
      name: 'Kiritimati (Christmas Island)',
      center: { lat: 1.8721, lng: -157.4278 },
      districts: ['London', 'Tabwakea', 'Banana'],
    },
  ],

  // Nauru
  nr: [
    {
      name: 'Yaren & Çevre Bölgeler',
      center: { lat: -0.5477, lng: 166.9209 },
      districts: ['Yaren', 'Aiwo', 'Meneng', 'Denigomodu', 'Anibare'],
    },
  ],

  // Tuvalu
  tv: [
    {
      name: 'Funafuti',
      center: { lat: -8.5243, lng: 179.1942 },
      districts: ['Vaiaku', 'Fongafale', 'Alapi', 'Senala', 'Lofeagai'],
    },
  ],
};
