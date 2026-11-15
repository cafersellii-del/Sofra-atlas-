import type { User } from 'firebase/auth';
import { getProvincesForCountry } from '../data/locations';
import type { AdminUserRecord, CityId } from '../types/food';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'cafersellii@gmail.com';
export const REGIONAL_NON_TURKEY_ADMIN_EMAIL = 'tayactacyvonne02@gmail.com';
export const REGIONAL_NON_TURKEY_ADMIN_UID = 'qVBbf293ecY6F9H5Tn6aHWCUqL42';
export const TURKEY_CITY_ID: Exclude<CityId, 'all'> = 'istanbul';

export type AdminRegionScope = 'all' | 'non_turkey';

const TURKEY_PROVINCE_NAME_SET = new Set(
  getProvincesForCountry(TURKEY_CITY_ID).map((p) =>
    p.name.trim().toLocaleLowerCase('tr')
  )
);
TURKEY_PROVINCE_NAME_SET.add('türkiye');
TURKEY_PROVINCE_NAME_SET.add('turkey');

export function isTurkeyCityId(cityId: CityId | string | undefined | null): boolean {
  return cityId === TURKEY_CITY_ID;
}

export function isNonTurkeyCityId(cityId: CityId | string | undefined | null): boolean {
  return Boolean(cityId) && cityId !== 'all' && cityId !== TURKEY_CITY_ID;
}

export function isTurkeyProvinceName(name: string | undefined | null): boolean {
  if (!name) return false;
  return TURKEY_PROVINCE_NAME_SET.has(name.trim().toLocaleLowerCase('tr'));
}

export function isBootstrappedSuperAdmin(user: User | null | undefined): boolean {
  if (!user || !user.emailVerified) return false;
  return user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;
}

export function isHardcodedNonTurkeyAdmin(user: User | null | undefined): boolean {
  if (!user || !user.emailVerified) return false;
  return (
    user.uid === REGIONAL_NON_TURKEY_ADMIN_UID &&
    user.email?.toLowerCase() === REGIONAL_NON_TURKEY_ADMIN_EMAIL
  );
}

export function resolveAdminDocScope(
  adminDoc: Partial<AdminUserRecord> | null | undefined
): AdminRegionScope | null {
  if (!adminDoc) return null;
  return adminDoc.regionScope === 'non_turkey' ? 'non_turkey' : 'all';
}

export function canAccessCityInScope(
  scope: AdminRegionScope | null | undefined,
  cityId: CityId | string | undefined | null
): boolean {
  if (!scope) return false;
  if (scope === 'all') return true;
  return isNonTurkeyCityId(cityId);
}

export function getAdminScopeLabel(
  scope: AdminRegionScope | null,
  lang: 'tr' | 'en' = 'tr'
): string {
  if (lang === 'en') {
    if (scope === 'non_turkey') {
      return 'Regional Admin · All Non-Turkey Regions (196 Countries)';
    }
    if (scope === 'all') {
      return 'Full Access · Turkey + Global (197 Countries)';
    }
    return 'Unauthorized';
  }
  if (scope === 'non_turkey') {
    return 'Bölge Yetkilisi · Türkiye Harici Tüm Bölgeler (196 Ülke)';
  }
  if (scope === 'all') {
    return 'Tam Yetki · Türkiye + Tüm Dünya (197 Ülke)';
  }
  return 'Yetkisiz';
}
