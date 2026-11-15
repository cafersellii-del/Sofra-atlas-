import { ALL_COUNTRY_HUBS, findCountryHub } from './countries';
import { AFRICA_COUNTRY_PROVINCES } from './regions/africa';
import { AMERICAS_COUNTRY_PROVINCES } from './regions/americas';
import { ASIA_COUNTRY_PROVINCES } from './regions/asia';
import { EUROPE_COUNTRY_PROVINCES } from './regions/europe';
import { OCEANIA_COUNTRY_PROVINCES } from './regions/oceania';
import { type ProvinceLocation, TURKEY_PROVINCES } from './turkeyProvinces';

export type { ProvinceLocation };
export { TURKEY_PROVINCES };

// 197 ülkenin tamamı (Türkiye 81 il + 196 dünya ülkesi) için bölgeler, şehirler, ilçe/semt ve mahalleler
export const MAJOR_COUNTRY_PROVINCES: Record<string, ProvinceLocation[]> = {
  ...EUROPE_COUNTRY_PROVINCES,
  ...ASIA_COUNTRY_PROVINCES,
  ...AMERICAS_COUNTRY_PROVINCES,
  ...AFRICA_COUNTRY_PROVINCES,
  ...OCEANIA_COUNTRY_PROVINCES,
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
