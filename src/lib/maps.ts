import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { ALL_COUNTRY_HUBS } from '../data/countries';
import type { CityId } from '../types/food';

declare const __SOFRA_MAPS_API_KEY__: string | undefined;

export const GOOGLE_MAPS_API_KEY: string =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  (typeof __SOFRA_MAPS_API_KEY__ !== 'undefined' ? __SOFRA_MAPS_API_KEY__ : '');

export const GOOGLE_MAPS_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];
export const DEFAULT_MAP_ID = 'DEMO_MAP_ID';

export interface CityAnchor {
  id: Exclude<CityId, 'all'>;
  name: string;
  center: { lat: number; lng: number };
  regionCode: string;
}

export const CITY_HUB_ANCHORS: Record<string, CityAnchor> = Object.fromEntries(
  ALL_COUNTRY_HUBS.map((hub) => [
    hub.id,
    {
      id: hub.id,
      name: `${hub.name}, ${hub.country}`,
      center: hub.center,
      regionCode: hub.countryCode,
    },
  ])
);

export function isQuotaOrAuthError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
      ? err
      : JSON.stringify(err);
  const upper = msg.toUpperCase();
  return (
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('OVER_QUERY_LIMIT') ||
    upper.includes('QUOTA') ||
    upper.includes('429')
  );
}

export function notifyQuotaExceededIfNeeded(err: unknown): boolean {
  if (isQuotaOrAuthError(err)) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  return false;
}

export interface UseAutocompleteSuggestionsResult {
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isLoading: boolean;
  error: string | null;
  resetSession: () => void;
}

/**
 * Modern Places API (New) autocomplete hook using AutocompleteSuggestion + AutocompleteSessionToken.
 * Reference: https://developers.google.com/maps/documentation/javascript/place-autocomplete-data?utm_campaign=gmp_mcp_codeassist_v1_aistudio
 */
export function usePlacesAutocomplete(
  inputString: string,
  locationBias?: google.maps.LatLngLiteral | null,
  includedRegionCodes?: string[]
): UseAutocompleteSuggestionsResult {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = inputString.trim();
    if (!placesLib || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: google.maps.places.AutocompleteRequest = {
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          language: 'tr',
          ...(locationBias ? { locationBias } : {}),
          ...(includedRegionCodes && includedRegionCodes.length > 0
            ? { includedRegionCodes }
            : {}),
        };

        const res =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (!cancelled) {
          setSuggestions(res?.suggestions ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          notifyQuotaExceededIfNeeded(err);
          setSuggestions([]);
          setError('Adres önerileri şu anda yüklenemedi.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, inputString, locationBias?.lat, locationBias?.lng, includedRegionCodes?.join(',')]);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
  }, []);

  return { suggestions, isLoading, error, resetSession };
}
