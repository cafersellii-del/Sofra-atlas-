import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import {
  Globe,
  Compass,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Star,
  Store,
  X,
} from 'lucide-react';
import {
  CITY_HUBS,
  CONTINENTS,
  COUNTRY_HUBS_BY_CONTINENT,
  FEATURED_GLOBAL_HUBS,
} from '../data/catalog';
import {
  CITY_HUB_ANCHORS,
  DEFAULT_MAP_ID,
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_ATTRIBUTION_IDS,
  notifyQuotaExceededIfNeeded,
  usePlacesAutocomplete,
} from '../lib/maps';
import type { CityHub, CityId, ContinentId, RestaurantProfile } from '../types/food';
import { CountrySelectOptions } from './CountrySelectOptions';

interface WorldMapSectionProps {
  selectedCity: CityId;
  onSelectCity: (cityId: CityId) => void;
  onExploreMenu: () => void;
  activeRestaurants: RestaurantProfile[];
  onFilterRestaurant: (restaurantName: string) => void;
  isMapsProviderActive: boolean;
}

interface DiscoveredPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsURI?: string | null;
  attributions?: google.maps.places.Attribution[];
}

interface DeliveryDestination {
  label: string;
  location: google.maps.LatLngLiteral;
}

interface RouteMetrics {
  distanceKm: number;
  durationMinutes: number;
}

function toLatLngLiteral(
  loc: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined
): google.maps.LatLngLiteral | null {
  if (!loc) return null;
  if (typeof (loc as google.maps.LatLng).lat === 'function') {
    const ll = loc as google.maps.LatLng;
    return { lat: ll.lat(), lng: ll.lng() };
  }
  const lit = loc as google.maps.LatLngLiteral;
  if (typeof lit.lat === 'number' && typeof lit.lng === 'number') {
    return { lat: lit.lat, lng: lit.lng };
  }
  return null;
}

function HubMarkerWithInfo({
  hub,
  position,
  isSelected,
  isInfoOpen,
  onSelect,
  onCloseInfo,
  onFilterCityMenu,
}: {
  hub: CityHub;
  position: google.maps.LatLngLiteral;
  isSelected: boolean;
  isInfoOpen: boolean;
  onSelect: () => void;
  onCloseInfo: () => void;
  onFilterCityMenu: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        onClick={onSelect}
        title={`${hub.name} — ${hub.districtLabel}`}
        zIndex={isSelected ? 30 : 10}
      >
        <Pin
          background={isSelected ? '#D9043D' : '#141413'}
          borderColor={isSelected ? '#9A032B' : '#2C2B28'}
          glyphColor="#FAF9F7"
          scale={isSelected ? 1.2 : 1.0}
        />
      </AdvancedMarker>

      {isInfoOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo} maxWidth={260}>
          <div className="p-1 text-[#141413] font-sans">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#575550]">
              {hub.country} · {hub.kitchenCount} Mutfak
            </p>
            <h4 className="font-display text-base font-semibold text-[#141413] mt-0.5">
              {hub.name}
            </h4>
            <p className="text-xs text-[#575550] mt-1">{hub.districtLabel}</p>
            <p className="font-mono tabular-nums text-xs text-[#D9043D] mt-2">
              Ort. Teslimat: {hub.avgDelivery}
            </p>
            <button
              type="button"
              onClick={onFilterCityMenu}
              className="mt-3 w-full px-3 py-1.5 rounded-md bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] transition-colors cursor-pointer"
            >
              {hub.name} Menüsünü Aç
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function DiscoveredPlaceMarker({
  place,
  isInfoOpen,
  onSelect,
  onCloseInfo,
}: {
  place: DiscoveredPlace;
  isInfoOpen: boolean;
  onSelect: () => void;
  onCloseInfo: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.location}
        onClick={onSelect}
        title={place.displayName}
        zIndex={20}
      >
        <Pin
          background="#FAF9F7"
          borderColor="#D9043D"
          glyphColor="#D9043D"
          scale={0.95}
        />
      </AdvancedMarker>

      {isInfoOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo} maxWidth={260}>
          <div className="p-1 text-[#141413] font-sans">
            <h4 className="font-display text-sm font-semibold text-[#141413]">
              {place.displayName}
            </h4>
            {place.formattedAddress && (
              <p className="text-xs text-[#575550] mt-1">
                {place.formattedAddress}
              </p>
            )}
            {typeof place.rating === 'number' && (
              <p className="font-mono tabular-nums text-xs text-[#141413] mt-1.5">
                ★ {place.rating.toFixed(1)}
                {typeof place.userRatingCount === 'number'
                  ? ` (${place.userRatingCount} değerlendirme)`
                  : ''}
              </p>
            )}
            {place.attributions && place.attributions.length > 0 && (
              <p className="text-[10px] text-[#575550] mt-1">
                {place.attributions
                  .map((a) => a.provider)
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {place.googleMapsURI && (
              <a
                href={place.googleMapsURI}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[#D9043D] hover:underline"
              >
                <span>Google Haritalar’da Aç</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface ComputeRoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    durationMillis?: number;
    viewport?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
    createPolylines?: () => google.maps.Polyline[];
  }>;
}

interface RouteStaticApi {
  computeRoutes: (req: {
    origin: google.maps.LatLngLiteral;
    destination: google.maps.LatLngLiteral;
    travelMode: string;
    fields: string[];
  }) => Promise<ComputeRoutesResponse>;
}

function DeliveryRouteLayer({
  origin,
  destination,
  onMetricsChange,
  onRouteError,
}: {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral | null;
  onMetricsChange: (metrics: RouteMetrics | null) => void;
  onRouteError: (errMsg: string | null) => void;
}) {
  const map = useMap('sofra-world-map');
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    onMetricsChange(null);
    onRouteError(null);

    if (!routesLib || !map || !destination) return;

    let cancelled = false;
    const RouteClass = routesLib.Route as unknown as RouteStaticApi | undefined;
    if (!RouteClass?.computeRoutes) return;

    RouteClass.computeRoutes({
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    })
      .then((res) => {
        if (cancelled) return;
        const primary = res?.routes?.[0];
        if (!primary) {
          onRouteError('Seçilen nokta için kara yolu rotası hesaplanamadı.');
          return;
        }

        if (typeof primary.createPolylines === 'function') {
          const lines = primary.createPolylines();
          lines.forEach((line) => {
            line.setOptions({
              strokeColor: '#D9043D',
              strokeOpacity: 0.9,
              strokeWeight: 5,
            });
            line.setMap(map);
          });
          polylinesRef.current = lines;
        }

        if (primary.viewport) {
          map.fitBounds(primary.viewport, 48);
        }

        onMetricsChange({
          distanceKm: (primary.distanceMeters ?? 0) / 1000,
          durationMinutes: Math.max(
            1,
            Math.round((primary.durationMillis ?? 0) / 60000)
          ),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        notifyQuotaExceededIfNeeded(err);
        onRouteError(
          'Teslimat rotası hesaplanamadı. Lütfen aynı şehir sınırları içinde bir konum seçin.'
        );
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [
    routesLib,
    map,
    origin.lat,
    origin.lng,
    destination?.lat,
    destination?.lng,
    onMetricsChange,
    onRouteError,
  ]);

  return null;
}

function MapCameraSync({
  selectedCity,
  selectedContinent,
}: {
  selectedCity: CityId;
  selectedContinent: 'all' | ContinentId;
}) {
  const map = useMap('sofra-world-map');

  useEffect(() => {
    if (!map) return;
    if (selectedCity !== 'all') {
      const anchor = CITY_HUB_ANCHORS[selectedCity];
      if (anchor) {
        map.panTo(anchor.center);
        map.setZoom(12);
      }
    } else if (selectedContinent !== 'all') {
      const cont = CONTINENTS.find((c) => c.id === selectedContinent);
      if (cont) {
        map.panTo(cont.center);
        map.setZoom(cont.zoom);
      }
    } else {
      map.panTo({ lat: 24.0, lng: 18.0 });
      map.setZoom(2);
    }
  }, [map, selectedCity, selectedContinent]);

  return null;
}

function WorldMapInteractive({
  selectedCity,
  selectedContinent,
  onSelectCity,
  onExploreMenu,
  activeRestaurants,
  onFilterRestaurant,
}: Omit<WorldMapSectionProps, 'isMapsProviderActive'> & {
  selectedContinent: 'all' | ContinentId;
}) {
  const apiStatus = useApiLoadingStatus();
  const map = useMap('sofra-world-map');
  const placesLib = useMapsLibrary('places');

  const focusedCityId: Exclude<CityId, 'all'> =
    selectedCity === 'all' ? 'istanbul' : selectedCity;
  const activeAnchor =
    CITY_HUB_ANCHORS[focusedCityId] ?? CITY_HUB_ANCHORS.istanbul;
  const activeHub =
    CITY_HUBS.find((h) => h.id === focusedCityId) ?? CITY_HUBS[0];

  const visibleHubs = useMemo(() => {
    const base =
      selectedContinent === 'all'
        ? FEATURED_GLOBAL_HUBS
        : COUNTRY_HUBS_BY_CONTINENT[selectedContinent];
    const mapById = new Map(base.map((h) => [h.id, h]));

    if (selectedCity !== 'all' && !mapById.has(activeHub.id)) {
      mapById.set(activeHub.id, activeHub);
    }

    for (const r of activeRestaurants) {
      if (!mapById.has(r.cityId)) {
        const hub = CITY_HUBS.find((h) => h.id === r.cityId);
        if (
          hub &&
          (selectedContinent === 'all' || hub.continent === selectedContinent)
        ) {
          mapById.set(hub.id, hub);
        }
      }
    }

    return Array.from(mapById.values());
  }, [selectedContinent, selectedCity, activeHub, activeRestaurants]);

  const [openHubInfoId, setOpenHubInfoId] = useState<string | null>(null);
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);

  // Places API (New) Text Search state
  const [placeQuery, setPlaceQuery] = useState('');
  const [discoveredPlaces, setDiscoveredPlaces] = useState<DiscoveredPlace[]>(
    []
  );
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  // Delivery Autocomplete & Route Estimation state
  const [addressQuery, setAddressQuery] = useState('');
  const [destinationPin, setDestinationPin] =
    useState<DeliveryDestination | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const {
    suggestions,
    isLoading: suggestionsLoading,
    resetSession,
  } = usePlacesAutocomplete(
    addressQuery,
    activeAnchor.center,
    selectedCity === 'all' ? undefined : [activeAnchor.regionCode]
  );

  // Clear route & discovered places when switching city cleanly
  useEffect(() => {
    setDiscoveredPlaces([]);
    setPlacesError(null);
    setOpenPlaceId(null);
    setDestinationPin(null);
    setRouteMetrics(null);
    setRouteError(null);
  }, [selectedCity]);

  const handleSearchNearbyPlaces = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!placesLib) return;

      setPlacesLoading(true);
      setPlacesError(null);

      const queryText = placeQuery.trim()
        ? `${placeQuery.trim()} ${activeHub.name}`
        : `${activeHub.name} popüler restoranlar`;

      try {
        const request: google.maps.places.SearchByTextRequest = {
          textQuery: queryText,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'businessStatus',
            'googleMapsURI',
          ],
          includedType: 'restaurant',
          locationBias: activeAnchor.center,
          maxResultCount: 6,
          language: 'tr',
          region: activeAnchor.regionCode,
          internalUsageAttributionIds: GOOGLE_MAPS_ATTRIBUTION_IDS,
        };

        const { places } = await placesLib.Place.searchByText(request);
        const mapped: DiscoveredPlace[] = (places ?? [])
          .map((p): DiscoveredPlace | null => {
            const loc = toLatLngLiteral(p.location);
            if (!loc) return null;
            return {
              id: p.id,
              displayName: p.displayName ?? 'Restoran',
              formattedAddress: p.formattedAddress ?? '',
              location: loc,
              rating: p.rating,
              userRatingCount: p.userRatingCount,
              googleMapsURI: p.googleMapsURI,
              attributions: p.attributions,
            };
          })
          .filter((item): item is DiscoveredPlace => item !== null);

        setDiscoveredPlaces(mapped);

        if (mapped.length === 0) {
          setPlacesError('Bu bölgede eşleşen restoran sonucu bulunamadı.');
        } else if (map && mapped[0]) {
          map.panTo(mapped[0].location);
          map.setZoom(13);
        }
      } catch (err) {
        notifyQuotaExceededIfNeeded(err);
        setPlacesError(
          'Google Places restoran araması şu anda tamamlanamadı.'
        );
      } finally {
        setPlacesLoading(false);
      }
    },
    [placesLib, placeQuery, activeHub.name, activeAnchor, map]
  );

  const handleSelectSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
      });
      const loc = toLatLngLiteral(place.location);
      if (loc) {
        const label =
          place.formattedAddress ||
          place.displayName ||
          suggestion.placePrediction.text.text;
        setDestinationPin({ label, location: loc });
        setAddressQuery(label);
        if (map) {
          if (place.viewport) {
            map.fitBounds(place.viewport);
          } else {
            map.panTo(loc);
            map.setZoom(14);
          }
        }
      }
      resetSession();
    } catch (err) {
      notifyQuotaExceededIfNeeded(err);
      setRouteError('Seçilen adres koordinatları alınamadı.');
    }
  };

  const handleMapClick = (ev: { detail: { latLng: google.maps.LatLngLiteral | null } }) => {
    const clicked = ev.detail?.latLng;
    if (!clicked) return;
    setOpenHubInfoId(null);
    setOpenPlaceId(null);
    if (selectedCity !== 'all') {
      setDestinationPin({
        label: `Haritada İşaretlenen Konum (${clicked.lat.toFixed(4)}, ${clicked.lng.toFixed(4)})`,
        location: clicked,
      });
    }
  };

  const cityPartners = useMemo(
    () =>
      selectedCity === 'all'
        ? activeRestaurants
        : activeRestaurants.filter((r) => r.cityId === selectedCity),
    [activeRestaurants, selectedCity]
  );

  const handleFocusPlace = (place: DiscoveredPlace) => {
    setOpenPlaceId(place.id);
    if (map) {
      map.panTo(place.location);
      map.setZoom(15);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left: Interactive Google Map (8 cols) */}
      <div className="lg:col-span-8 flex flex-col">
        <div className="relative h-[440px] lg:h-[520px] w-full rounded-xl overflow-hidden border border-[#E6E4DF] bg-[#EFECE6]">
          {apiStatus === APILoadingStatus.FAILED ||
          apiStatus === APILoadingStatus.AUTH_FAILURE ? (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-white">
              <Compass className="w-8 h-8 text-[#575550] mb-3" />
              <p className="font-display text-lg font-medium text-[#141413]">
                Google Harita katmanı şu anda yüklenemiyor
              </p>
              <p className="text-sm text-[#575550] mt-1 max-w-md">
                Harita API anahtarı veya bağlantı ayarlarını kontrol ettikten sonra sayfayı yenileyebilirsiniz.
              </p>
            </div>
          ) : (
            <GoogleMap
              id="sofra-world-map"
              mapId={DEFAULT_MAP_ID}
              defaultCenter={{ lat: 31.5, lng: 28.0 }}
              defaultZoom={2}
              gestureHandling="cooperative"
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={true}
              internalUsageAttributionIds={GOOGLE_MAPS_ATTRIBUTION_IDS}
              onClick={handleMapClick}
              style={{ width: '100%', height: '100%' }}
            >
              <MapCameraSync
                selectedCity={selectedCity}
                selectedContinent={selectedContinent}
              />

              {visibleHubs.map((hub) => {
                const anchor = CITY_HUB_ANCHORS[hub.id];
                if (!anchor) return null;
                const isSelected = selectedCity === hub.id;
                return (
                  <HubMarkerWithInfo
                    key={hub.id}
                    hub={hub}
                    position={anchor.center}
                    isSelected={isSelected}
                    isInfoOpen={openHubInfoId === hub.id}
                    onSelect={() => {
                      onSelectCity(hub.id);
                      setOpenHubInfoId(hub.id);
                      setOpenPlaceId(null);
                    }}
                    onCloseInfo={() => setOpenHubInfoId(null)}
                    onFilterCityMenu={() => {
                      onSelectCity(hub.id);
                      onExploreMenu();
                    }}
                  />
                );
              })}

              {discoveredPlaces.map((place) => (
                <DiscoveredPlaceMarker
                  key={place.id}
                  place={place}
                  isInfoOpen={openPlaceId === place.id}
                  onSelect={() => {
                    setOpenPlaceId(place.id);
                    setOpenHubInfoId(null);
                  }}
                  onCloseInfo={() => setOpenPlaceId(null)}
                />
              ))}

              {destinationPin && (
                <AdvancedMarker
                  position={destinationPin.location}
                  title={destinationPin.label}
                  zIndex={40}
                >
                  <Pin
                    background="#B45309"
                    borderColor="#78350F"
                    glyphColor="#FFFBEB"
                    scale={1.1}
                  />
                </AdvancedMarker>
              )}

              {selectedCity !== 'all' && destinationPin && (
                <DeliveryRouteLayer
                  origin={activeAnchor.center}
                  destination={destinationPin.location}
                  onMetricsChange={setRouteMetrics}
                  onRouteError={setRouteError}
                />
              )}
            </GoogleMap>
          )}
        </div>

        {/* Route summary bar directly below map when active */}
        {selectedCity !== 'all' && (destinationPin || routeError) && (
          <div className="mt-3 px-4 py-3 rounded-xl bg-white border border-[#E6E4DF] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <Navigation className="w-4 h-4 text-[#D9043D] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#141413] truncate">
                  {activeHub.name} → {destinationPin?.label}
                </p>
                {routeMetrics && (
                  <p className="font-mono tabular-nums text-xs text-[#D9043D] mt-0.5">
                    Tahmini Kurye Mesafesi: {routeMetrics.distanceKm.toFixed(1)} km ·{' '}
                    ~{routeMetrics.durationMinutes} dk sürüş
                  </p>
                )}
                {routeError && (
                  <p className="text-xs text-red-700 mt-0.5">{routeError}</p>
                )}
              </div>
            </div>
            {destinationPin && (
              <button
                type="button"
                onClick={() => {
                  setDestinationPin(null);
                  setRouteMetrics(null);
                  setRouteError(null);
                  setAddressQuery('');
                }}
                className="inline-flex items-center gap-1 text-xs text-[#575550] hover:text-[#141413] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Rotayı Temizle</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Places Search, Address Autocomplete & Partner List (4 cols) */}
      <div className="lg:col-span-4 bg-white border border-[#E6E4DF] rounded-xl p-5 flex flex-col justify-between space-y-5">
        <div className="space-y-5">
          {/* Active city summary */}
          <div className="pb-4 border-b border-[#E6E4DF]">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#575550]">
              {selectedCity === 'all'
                ? 'Odak Şehir (Varsayılan)'
                : 'Seçili Teslimat Merkezi'}
            </p>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <h3 className="font-display text-xl font-semibold text-[#141413]">
                {activeHub.name}, {activeHub.country}
              </h3>
              <span className="font-mono tabular-nums text-xs text-[#D9043D] font-medium">
                {activeHub.avgDelivery}
              </span>
            </div>
            <p className="text-xs text-[#575550] mt-1">
              {activeHub.districtLabel}
            </p>
          </div>

          {/* 1. Delivery Address Autocomplete */}
          <div>
            <label
              htmlFor="map-address-search"
              className="block text-xs font-semibold text-[#141413] mb-1.5"
            >
              Teslimat Adresi & Rota Hesapla
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#575550] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="map-address-search"
                type="text"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                placeholder={`${activeHub.name} içinde cadde veya semt yazın...`}
                className="w-full pl-9 pr-8 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs text-[#141413] placeholder:text-[#8A8780] focus:border-[#D9043D]"
              />
              {suggestionsLoading && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#575550] absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {suggestions.length > 0 && (
              <ul className="mt-1.5 border border-[#E6E4DF] rounded-lg bg-white divide-y divide-[#E6E4DF] max-h-44 overflow-y-auto">
                {suggestions.map((sug, idx) => (
                  <li key={`${sug.placePrediction?.placeId ?? idx}`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCity === 'all') {
                          onSelectCity(focusedCityId);
                        }
                        void handleSelectSuggestion(sug);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#141413] hover:bg-[#FAF9F7] transition-colors cursor-pointer"
                    >
                      {sug.placePrediction?.text.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-[#8A8780] mt-1.5">
              Veya şehir seçiliyken haritaya doğrudan tıklayarak teslimat noktası işaretleyin.
            </p>
          </div>

          {/* 2. Live Places API (New) Restaurant Search */}
          <form onSubmit={handleSearchNearbyPlaces} className="space-y-2">
            <label
              htmlFor="map-places-search"
              className="block text-xs font-semibold text-[#141413]"
            >
              Google Haritalar ile Bölgedeki Mekanlar
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#575550] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="map-places-search"
                  type="text"
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  placeholder="Örn: ramen, pizza, bistro..."
                  className="w-full pl-8 pr-3 py-2 min-h-[38px] rounded-lg border border-[#E6E4DF] bg-[#FAF9F7] text-xs text-[#141413] placeholder:text-[#8A8780]"
                />
              </div>
              <button
                type="submit"
                disabled={placesLoading || !placesLib}
                className="px-3.5 py-2 min-h-[38px] rounded-lg bg-[#D9043D] text-white text-xs font-medium hover:bg-[#B80032] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {placesLoading ? 'Aranıyor...' : 'Ara'}
              </button>
            </div>
          </form>

          {placesError && (
            <p className="text-xs text-[#575550] bg-[#FAF9F7] border border-[#E6E4DF] rounded-lg px-3 py-2">
              {placesError}
            </p>
          )}

          {discoveredPlaces.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {discoveredPlaces.map((place) => (
                <div
                  key={place.id}
                  onClick={() => handleFocusPlace(place)}
                  className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    openPlaceId === place.id
                      ? 'border-[#D9043D] bg-[#FAF9F7]'
                      : 'border-[#E6E4DF] hover:border-[#D9043D]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-[#141413] leading-snug">
                      {place.displayName}
                    </p>
                    {typeof place.rating === 'number' && (
                      <span className="inline-flex items-center gap-0.5 font-mono tabular-nums text-[11px] text-[#141413] shrink-0">
                        <Star className="w-3 h-3 fill-[#B45309] text-[#B45309]" />
                        {place.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {place.formattedAddress && (
                    <p className="text-[11px] text-[#575550] truncate mt-0.5">
                      {place.formattedAddress}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Registered Sofra Atlas Partners in City */}
        <div className="pt-4 border-t border-[#E6E4DF]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141413]">
              <Store className="w-3.5 h-3.5 text-[#D9043D]" />
              <span>Üye Mutfaklar ({cityPartners.length})</span>
            </span>
            <button
              type="button"
              onClick={onExploreMenu}
              className="text-xs font-medium text-[#D9043D] hover:underline cursor-pointer"
            >
              Menüye Git
            </button>
          </div>
          {cityPartners.length === 0 ? (
            <p className="text-xs text-[#575550]">
              Bu şehirdeki tüm Sofra Atlas imza mutfakları aşağıdaki katalogda listelenmektedir.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {cityPartners.slice(0, 4).map((partner) => (
                <button
                  key={partner.id}
                  type="button"
                  onClick={() => {
                    onFilterRestaurant(partner.name);
                    onExploreMenu();
                  }}
                  className="px-2.5 py-1 rounded-md border border-[#E6E4DF] bg-[#FAF9F7] text-xs text-[#141413] hover:border-[#D9043D] transition-colors cursor-pointer"
                >
                  {partner.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WorldMapSection({
  selectedCity,
  onSelectCity,
  onExploreMenu,
  activeRestaurants,
  onFilterRestaurant,
  isMapsProviderActive,
}: WorldMapSectionProps) {
  const [selectedContinent, setSelectedContinent] = useState<'all' | ContinentId>('all');

  return (
    <section
      id="harita"
      className="border-b border-[#E6E4DF] bg-[#FAF9F7] py-14"
    >
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#575550] mb-2">
              Google Maps · Küresel Teslimat Ağı ({CITY_HUBS.length} Ülke)
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl font-semibold text-[#141413] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              6 kıtada tüm ülkeleri, merkezleri ve teslimat rotasını haritada keşfedin
            </h2>
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <Globe className="w-4 h-4 text-[#D9043D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => {
                const nextId = e.target.value as CityId;
                onSelectCity(nextId);
                if (nextId !== 'all') {
                  const found = CITY_HUBS.find((h) => h.id === nextId);
                  if (found) setSelectedContinent(found.continent);
                }
              }}
              aria-label="Haritada ülke seç"
              className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg bg-white border border-[#E6E4DF] text-xs font-medium text-[#141413] focus:border-[#D9043D]"
            >
              <CountrySelectOptions
                includeAllOption
                allLabel={`Tüm Dünya (${CITY_HUBS.length} Ülke)`}
              />
            </select>
          </div>
        </div>

        {/* Continent tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-4">
          <button
            type="button"
            onClick={() => {
              setSelectedContinent('all');
              onSelectCity('all');
            }}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedContinent === 'all' && selectedCity === 'all'
                ? 'bg-[#141413] text-white'
                : 'bg-white border border-[#E6E4DF] text-[#575550] hover:text-[#141413]'
            }`}
          >
            Tüm Dünya ({CITY_HUBS.length})
          </button>
          {CONTINENTS.map((cont) => {
            const count = COUNTRY_HUBS_BY_CONTINENT[cont.id].length;
            const active = selectedContinent === cont.id;
            return (
              <button
                key={cont.id}
                type="button"
                onClick={() => {
                  setSelectedContinent(cont.id);
                  onSelectCity('all');
                }}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#141413] text-white'
                    : 'bg-white border border-[#E6E4DF] text-[#575550] hover:text-[#141413]'
                }`}
              >
                {cont.label} ({count})
              </button>
            );
          })}
        </div>

        {isMapsProviderActive && GOOGLE_MAPS_API_KEY ? (
          <WorldMapInteractive
            selectedCity={selectedCity}
            selectedContinent={selectedContinent}
            onSelectCity={onSelectCity}
            onExploreMenu={onExploreMenu}
            activeRestaurants={activeRestaurants}
            onFilterRestaurant={onFilterRestaurant}
          />
        ) : (
          <div className="h-[360px] rounded-xl border border-[#E6E4DF] bg-white flex flex-col items-center justify-center p-8 text-center">
            <Compass className="w-8 h-8 text-[#D9043D] mb-3" />
            <p className="font-display text-lg font-semibold text-[#141413]">
              Google Maps entegrasyonu hazır
            </p>
            <p className="text-sm text-[#575550] mt-1 max-w-md">
              İnteraktif haritanın görüntülenmesi için ortam değişkenlerinde Google Maps API anahtarının tanımlı olması gerekir.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
