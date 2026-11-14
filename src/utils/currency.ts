import { CITY_HUBS } from '../data/catalog';
import type { CityId, CurrencyMode } from '../types/food';

export function formatPrice(
  amountTry: number,
  cityId: Exclude<CityId, 'all'>,
  currencyMode: CurrencyMode
): string {
  if (currencyMode === 'TRY') {
    return `${Math.round(amountTry).toLocaleString('tr-TR')} ₺`;
  }

  const hub = CITY_HUBS.find((c) => c.id === cityId);
  if (!hub || hub.currencyCode === 'TRY') {
    return `${Math.round(amountTry).toLocaleString('tr-TR')} ₺`;
  }

  const converted = amountTry * hub.rateToTry;
  if (hub.rateToTry >= 10) {
    const rounded = Math.round(converted / 10) * 10;
    return `${hub.currencySymbol}${rounded.toLocaleString('tr-TR')}`;
  }
  if (hub.rateToTry >= 1) {
    return `${hub.currencySymbol}${Math.round(converted).toLocaleString('tr-TR')}`;
  }

  return `${hub.currencySymbol}${converted.toFixed(2).replace('.', ',')}`;
}
