import {
  ALL_COUNTRY_HUBS,
  CONTINENTS,
  COUNTRY_HUBS_BY_CONTINENT,
} from '../data/countries';

import { isTurkeyCityId } from '../utils/adminScope';

interface CountrySelectOptionsProps {
  includeAllOption?: boolean;
  allLabel?: string;
  excludeTurkey?: boolean;
  lang?: 'tr' | 'en';
}

export function CountrySelectOptions({
  includeAllOption = false,
  allLabel,
  excludeTurkey = false,
  lang = 'tr',
}: CountrySelectOptionsProps) {
  const totalCount = excludeTurkey
    ? ALL_COUNTRY_HUBS.length - 1
    : ALL_COUNTRY_HUBS.length;
  const resolvedAllLabel =
    allLabel ??
    (lang === 'en'
      ? `All Regions (${totalCount} Countries)`
      : `Tüm Dünya (${totalCount} Ülke & Bölge)`);

  return (
    <>
      {includeAllOption && <option value="all">{resolvedAllLabel}</option>}
      {CONTINENTS.map((cont) => {
        const hubs = excludeTurkey
          ? COUNTRY_HUBS_BY_CONTINENT[cont.id].filter(
              (hub) => !isTurkeyCityId(hub.id)
            )
          : COUNTRY_HUBS_BY_CONTINENT[cont.id];
        if (hubs.length === 0) return null;
        return (
          <optgroup
            key={cont.id}
            label={`${cont.label} (${hubs.length})`}
          >
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.country} — {hub.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}
