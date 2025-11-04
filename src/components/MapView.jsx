import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AttributionControl, MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCheckpoints } from '../hooks/useCheckpoints.js';

const toolbarIconSources = import.meta.glob('../../assets/*.png', {
  eager: true,
  import: 'default'
});

const resolveToolbarIcon = (name) => toolbarIconSources[`../../assets/${name}.png`] ?? null;

const ToolbarButton = ({
  iconName,
  label,
  onClick,
  title,
  isActive = false,
  disabled = false
}) => {
  const iconSrc = resolveToolbarIcon(iconName);
  const baseStyles = 'flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  const activeStyles = isActive
    ? 'border-sky-500 bg-sky-200/95 text-slate-900 focus-visible:ring-sky-400'
    : 'border-slate-300 bg-slate-100/95 text-slate-900 hover:border-slate-400 hover:bg-slate-200/90 focus-visible:ring-slate-500/50';
  const disabledStyles = disabled ? 'opacity-60 pointer-events-none' : '';

  return (
    <button
      type="button"
      className={`${baseStyles} ${activeStyles} ${disabledStyles}`}
      onClick={onClick}
      title={title ?? label}
      aria-label={label}
      disabled={disabled}
    >
      {iconSrc ? (
        <img src={iconSrc} alt="" className="h-5 w-5 object-contain" aria-hidden="true" />
      ) : (
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      )}
    </button>
  );
};

const defaultPosition = [51.505, 10];

const tileProviders = {
  street: {
    id: 'street',
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    minZoom: 3
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://carto.com/attributions">CARTO</a> | Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
    minZoom: 3
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: [],
    maxZoom: 19,
    minZoom: 3
  }
};

const LAYER_SEQUENCE = ['street', 'dark', 'satellite'];

const latLngToTile = (lat, lng, zoom) => {
  const latRad = (lat * Math.PI) / 180;
  const scale = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * scale);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale
  );
  const maxIndex = scale - 1;
  return {
    x: Math.min(Math.max(x, 0), maxIndex),
    y: Math.min(Math.max(y, 0), maxIndex),
    z: zoom
  };
};

const buildTileUrl = (template, subdomains, { x, y, z }) => {
  const domainPool = Array.isArray(subdomains) && subdomains.length > 0 ? subdomains : [''];
  const index = Math.abs((x + y) % domainPool.length);
  const subdomain = domainPool[index];
  return template
    .replace('{s}', subdomain)
    .replace('{x}', x)
    .replace('{y}', y)
    .replace('{z}', z);
};

const createIcon = (color, label) =>
  L.divIcon({
    className: 'flex items-center justify-center rounded-full text-xs font-semibold text-white shadow-lg shadow-slate-900/50',
    html: `<div style="background:${color};width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:9999px;">${label}</div>`
  });

const startIcon = createIcon('#22c55e', 'S');
const endIcon = createIcon('#ef4444', 'F');
const checkpointIcon = createIcon('#3b82f6', '•');

const createUserIcon = (heading) =>
  L.divIcon({
    className: 'user-heading-icon',
    html: `
      <div style="position:relative;width:44px;height:44px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(14,165,233,0.12);border:2px solid rgba(56,189,248,0.9);box-shadow:0 0 8px rgba(56,189,248,0.4);"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(${heading}deg);transform-origin:center;">
          <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:18px solid #fbbf24;"></div>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });

const PlacementHandler = () => {
  const {
    placementMode,
    setStart,
    setEnd,
    addCheckpoint,
    setPlacementMode
  } = useCheckpoints();

  useMapEvents({
    click: (event) => {
      if (!placementMode) return;

      const { latlng } = event;
      if (placementMode === 'start') {
        setStart({ lat: latlng.lat, lng: latlng.lng });
      } else if (placementMode === 'end') {
        setEnd({ lat: latlng.lat, lng: latlng.lng });
      } else if (placementMode === 'checkpoint') {
        addCheckpoint({ lat: latlng.lat, lng: latlng.lng });
      }
      setPlacementMode(null);
    }
  });

  return null;
};

const MapView = ({
  userLocation,
  userHeading,
  targets = [],
  onEnableLocation,
  locationEnabled,
  hasLocationFix,
  isRequestingLocation,
  locationRequestToken = 0,
  baseLayer = 'street',
  onBaseLayerChange,
  onToggleMenu,
  onOpenCompass,
  onOpenRoute,
  isMenuOpen = false
}) => {
  const {
    start,
    end,
    checkpoints,
    connectVia,
    selectedId,
    selectCheckpoint,
    updateCheckpoint,
    setPlacementMode,
    toggleConnectMode
  } = useCheckpoints();
  const mapRef = useRef(null);
  const hasCenteredRef = useRef(false);
  const lastRequestTokenRef = useRef(0);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [isCaching, setIsCaching] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const cacheStatusTimeoutRef = useRef(null);

  const tileProvider = tileProviders[baseLayer] ?? tileProviders.street;

  const toolbarPositionStyle = useMemo(
    () => ({
      top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
      right: 'calc(env(safe-area-inset-right, 0px) + 1rem)'
    }),
    []
  );

  const layerControlsPositionStyle = useMemo(
    () => ({
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
      right: 'calc(env(safe-area-inset-right, 0px) + 1rem)'
    }),
    []
  );

  const showCacheStatus = useCallback(
    (message, tone = 'info', duration = 4000) => {
      if (cacheStatusTimeoutRef.current && typeof window !== 'undefined') {
        window.clearTimeout(cacheStatusTimeoutRef.current);
        cacheStatusTimeoutRef.current = null;
      }
      setCacheStatus(message ? { message, tone } : null);
      if (message && duration !== null && typeof window !== 'undefined') {
        cacheStatusTimeoutRef.current = window.setTimeout(() => {
          setCacheStatus(null);
          cacheStatusTimeoutRef.current = null;
        }, duration);
      }
    },
    []
  );

  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });
  }, []);

  useEffect(() => {
    showCacheStatus(null);
    setIsCaching(false);
  }, [baseLayer, showCacheStatus]);

  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    if (hasCenteredRef.current) return;
    mapRef.current.setView([userLocation.lat, userLocation.lng], 16);
    hasCenteredRef.current = true;
  }, [userLocation]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (locationRequestToken === undefined || locationRequestToken === lastRequestTokenRef.current) {
      return;
    }
    lastRequestTokenRef.current = locationRequestToken;
    hasCenteredRef.current = false;
    if (userLocation) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], Math.max(mapRef.current.getZoom(), 16), {
        animate: true
      });
      hasCenteredRef.current = true;
    }
  }, [locationRequestToken, userLocation]);

  const userIcon = useMemo(() => createUserIcon(userHeading ?? 0), [userHeading]);

  const recenterMap = useCallback(() => {
    if (!mapRef.current || !userLocation) return;

    const map = mapRef.current;
    const points = [[userLocation.lat, userLocation.lng]];

    if (start?.position) points.push([start.position.lat, start.position.lng]);
    if (end?.position) points.push([end.position.lat, end.position.lng]);
    checkpoints.forEach((checkpoint) => {
      if (checkpoint?.position) {
        points.push([checkpoint.position.lat, checkpoint.position.lng]);
      }
    });

    if (points.length === 1) {
      map.flyTo(
        [userLocation.lat, userLocation.lng],
        Math.max(map.getZoom(), 16),
        { animate: true }
      );
      hasCenteredRef.current = true;
      return;
    }

    const bounds = L.latLngBounds(points);
    map.flyToBounds(bounds, {
      animate: true,
      padding: [72, 72],
      maxZoom: 18
    });
    hasCenteredRef.current = true;
  }, [checkpoints, end, start, userLocation]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.getContainer().classList.remove('mapview-attribution-offset');
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => () => {
    if (cacheStatusTimeoutRef.current && typeof window !== 'undefined') {
      window.clearTimeout(cacheStatusTimeoutRef.current);
    }
  }, []);

  const handleEnableLocation = useCallback(() => {
    if (typeof onEnableLocation === 'function') {
      return onEnableLocation();
    }
    return false;
  }, [onEnableLocation]);

  const handleToggleMenu = useCallback(() => {
    if (typeof onToggleMenu === 'function') {
      onToggleMenu();
    }
  }, [onToggleMenu]);

  const handleOpenCompass = useCallback(() => {
    if (typeof onOpenCompass === 'function') {
      onOpenCompass();
    }
  }, [onOpenCompass]);

  const handleOpenRoute = useCallback(() => {
    if (typeof onOpenRoute === 'function') {
      onOpenRoute();
    }
  }, [onOpenRoute]);

  const handleCycleLayer = useCallback(() => {
    const currentIndex = LAYER_SEQUENCE.indexOf(baseLayer);
    const nextLayer = LAYER_SEQUENCE[(currentIndex + 1) % LAYER_SEQUENCE.length];
    handleBaseLayerToggle(nextLayer);
  }, [baseLayer, handleBaseLayerToggle]);

  const handleZoomToLocation = useCallback(() => {
    if (userLocation) {
      recenterMap();
      return;
    }
    const started = handleEnableLocation();
    if (!started) {
      showCacheStatus('Enable location permissions to zoom to your position.', 'warning');
    } else {
      showCacheStatus('Requesting location fix…', 'info', 2500);
    }
  }, [handleEnableLocation, recenterMap, showCacheStatus, userLocation]);

  const handleBaseLayerToggle = useCallback(
    (nextLayer) => {
      if (nextLayer === baseLayer) return;
      if (typeof onBaseLayerChange === 'function') {
        onBaseLayerChange(nextLayer);
      }
    },
    [baseLayer, onBaseLayerChange]
  );

  const handlePrefetchTiles = useCallback(async () => {
    if (!isMapReady || !mapRef.current) {
      showCacheStatus('Map not ready yet.', 'warning');
      return;
    }
    if (baseLayer !== 'satellite') {
      showCacheStatus('Switch to satellite view to cache imagery.', 'warning');
      return;
    }
    if (typeof window === 'undefined' || !('caches' in window)) {
      showCacheStatus('Tile caching not supported in this browser.', 'error');
      return;
    }

    const map = mapRef.current;
    const zoom = Math.round(map.getZoom());
    const center = map.getCenter();
    const radius = 1;
    const tiles = [];
    const centerTile = latLngToTile(center.lat, center.lng, zoom);
    const scale = 2 ** zoom;

    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        const x = Math.min(Math.max(centerTile.x + dx, 0), scale - 1);
        const y = Math.min(Math.max(centerTile.y + dy, 0), scale - 1);
        tiles.push({ x, y, z: zoom });
      }
    }

    try {
      setIsCaching(true);
      showCacheStatus('Caching satellite tiles nearby…', 'info', null);
      const cache = await caches.open('cadet-map-tile-cache');
      let successCount = 0;
      const errors = [];

      await Promise.all(
        tiles.map(async (tile) => {
          const url = buildTileUrl(tileProvider.url, tileProvider.subdomains, tile);
          try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok && response.type !== 'opaque') {
              throw new Error(`HTTP ${response.status}`);
            }
            await cache.put(url, response.clone());
            successCount += 1;
          } catch (error) {
            errors.push(error.message ?? 'Unknown error');
          }
        })
      );

      if (errors.length === tiles.length) {
        showCacheStatus('Unable to cache tiles. Please try again later.', 'error');
      } else {
        const issueNote = errors.length
          ? ` (skipped ${errors.length} tile${errors.length === 1 ? '' : 's'})`
          : '';
        showCacheStatus(
          `Cached ${successCount} satellite tile${successCount === 1 ? '' : 's'}${issueNote}.`,
          errors.length ? 'warning' : 'success'
        );
      }
    } catch (cacheError) {
      showCacheStatus(cacheError.message ?? 'Tile caching failed.', 'error');
    } finally {
      setIsCaching(false);
    }
  }, [baseLayer, isMapReady, showCacheStatus, tileProvider.subdomains, tileProvider.url]);

  const directPath = useMemo(() => {
    const path = [];
    if (start) path.push([start.position.lat, start.position.lng]);
    checkpoints.forEach((checkpoint) => {
      path.push([checkpoint.position.lat, checkpoint.position.lng]);
    });
    if (end) path.push([end.position.lat, end.position.lng]);
    return path;
  }, [start, checkpoints, end]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={userLocation ? [userLocation.lat, userLocation.lng] : defaultPosition}
        zoom={13}
        className="h-full w-full"
        preferCanvas
        attributionControl={false}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
          mapInstance.getContainer().classList.add('mapview-attribution-offset');
          setIsMapReady(true);
        }}
      >
        <AttributionControl position="bottomleft" prefix={false} />
        <TileLayer
          key={tileProvider.id}
          url={tileProvider.url}
          attribution={tileProvider.attribution}
          subdomains={tileProvider.subdomains}
          minZoom={tileProvider.minZoom}
          maxZoom={tileProvider.maxZoom}
        />
        <PlacementHandler />

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
            interactive={false}
          />
        )}

        {start && (
          <Marker
            position={[start.position.lat, start.position.lng]}
            icon={startIcon}
            eventHandlers={{
              click: () => selectCheckpoint('start')
            }}
          />
        )}

        {end && (
          <Marker
            position={[end.position.lat, end.position.lng]}
            icon={endIcon}
            eventHandlers={{
              click: () => selectCheckpoint('end')
            }}
          />
        )}

        {checkpoints.map((checkpoint) => (
          <Marker
            key={checkpoint.id}
            position={[checkpoint.position.lat, checkpoint.position.lng]}
            icon={checkpointIcon}
            draggable
            eventHandlers={{
              click: () => selectCheckpoint(checkpoint.id),
              dragend: (event) => {
                const { lat, lng } = event.target.getLatLng();
                updateCheckpoint(checkpoint.id, { lat, lng });
              }
            }}
          />
        ))}

        {connectVia === 'direct' && directPath.length >= 2 && (
          <Polyline
            positions={directPath}
            pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.7 }}
          />
        )}

        {connectVia === 'route' && directPath.length >= 2 && (
          <Polyline
            positions={directPath}
            pathOptions={{ color: '#f97316', weight: 4, dashArray: '10 6', opacity: 0.8 }}
          />
        )}

        {userLocation &&
          targets
            .filter((target) => target.position)
            .map((target) => (
            <Polyline
              key={`user-target-${target.id}`}
              positions={[
                [userLocation.lat, userLocation.lng],
                [target.position.lat, target.position.lng]
              ]}
              pathOptions={{ color: '#818cf8', weight: 2, dashArray: '4 6', opacity: 0.4 }}
            />
            ))}
      </MapContainer>

      {cacheStatus && (
        <div
          className={`pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-wide ${
            cacheStatus.tone === 'success'
              ? 'border-emerald-300 bg-emerald-100/95 text-emerald-900'
              : cacheStatus.tone === 'warning'
                ? 'border-amber-300 bg-amber-100/95 text-amber-900'
                : cacheStatus.tone === 'error'
                  ? 'border-rose-300 bg-rose-100/95 text-rose-900'
                  : 'border-sky-300 bg-sky-100/95 text-slate-900'
          }`}
        >
          {cacheStatus.message}
        </div>
      )}

      <div
        className="pointer-events-none absolute z-[990] flex flex-col items-end gap-3"
        style={toolbarPositionStyle}
      >
        <div className="pointer-events-auto flex flex-col gap-2 rounded-3xl border border-slate-200 bg-slate-100/95 p-2 text-slate-900">
          <ToolbarButton
            iconName="menu"
            label="Menu"
            onClick={handleToggleMenu}
            title="Toggle navigation menu"
            isActive={isMenuOpen}
          />
          <ToolbarButton
            iconName="compass"
            label="Compass"
            onClick={handleOpenCompass}
            title="Open compass overlay"
          />
          <ToolbarButton
            iconName="route"
            label="Route"
            onClick={handleOpenRoute}
            title="Open route tools"
          />
          <ToolbarButton
            iconName="layer"
            label={`Layer (${tileProvider.label})`}
            onClick={handleCycleLayer}
            title={`Switch map layer (current: ${tileProvider.label})`}
            isActive={baseLayer !== 'street'}
          />
          <ToolbarButton
            iconName="zoom"
            label="Zoom"
            onClick={handleZoomToLocation}
            title="Zoom to current location and show checkpoints"
          />
        </div>
        {(isRequestingLocation || (locationEnabled && !hasLocationFix)) && (
          <div className="pointer-events-none rounded-full border border-slate-300 bg-slate-100/95 px-3 py-1 text-[10px] font-semibold text-slate-700">
            {isRequestingLocation ? 'Getting location…' : 'GPS active, awaiting fix'}
          </div>
        )}
      </div>

      <div
        className="pointer-events-none absolute z-[980] flex flex-col items-end gap-2"
        style={layerControlsPositionStyle}
      >
        <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-100/95 p-3 text-slate-900">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Satellite imagery</span>
          <button
            type="button"
            className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${
              baseLayer !== 'satellite' || isCaching
                ? 'border-slate-300 bg-slate-200/70 text-slate-500 opacity-80'
                : 'border-amber-400 bg-amber-200/90 text-amber-900 hover:bg-amber-200'
            }`}
            onClick={handlePrefetchTiles}
            disabled={baseLayer !== 'satellite' || isCaching}
            title="Cache nearby satellite tiles"
          >
            {isCaching ? 'Caching tiles…' : 'Cache imagery'}
          </button>
        </div>
      </div>

      {selectedId && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 w-64 -translate-x-1/2 rounded-lg bg-slate-900/80 p-3 text-center text-sm font-semibold text-sky-200 shadow-lg shadow-slate-950">
          Selected: {selectedId === 'start' ? 'Start' : selectedId === 'end' ? 'End' : 'Checkpoint'}
        </div>
      )}
    </div>
  );
};

export default MapView;
