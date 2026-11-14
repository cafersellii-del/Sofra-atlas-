import {
  ALL_COUNTRY_HUBS,
  CONTINENTS,
  COUNTRY_HUBS_BY_CONTINENT,
} from '../data/countries';

interface CountrySelectOptionsProps {
  includeAllOption?: boolean;
  allLabel?: string;
}

export function CountrySelectOptions({
  includeAllOption = false,
  allLabel = `Tüm Dünya (${ALL_COUNTRY_HUBS.length} Ülke & Bölge)`,
}: CountrySelectOptionsProps) {
  return (
    <>
      {includeAllOption && <option value="all">{allLabel}</option>}
      {CONTINENTS.map((cont) => (
        <optgroup
          key={cont.id}
          label={`${cont.label} (${COUNTRY_HUBS_BY_CONTINENT[cont.id].length})`}
        >
          {COUNTRY_HUBS_BY_CONTINENT[cont.id].map((hub) => (
            <option key={hub.id} value={hub.id}>
              {hub.country} — {hub.name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
