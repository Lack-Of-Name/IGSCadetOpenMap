export const parseLineString = (geoJson) => {
  if (!geoJson) return [];
  if (geoJson.type === 'FeatureCollection') {
    const feature = geoJson.features.find((item) => item.geometry?.type === 'LineString');
    return feature?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) ?? [];
  }
  if (geoJson.type === 'Feature' && geoJson.geometry?.type === 'LineString') {
    return geoJson.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  }
  if (geoJson.type === 'LineString') {
    return geoJson.coordinates.map(([lng, lat]) => [lat, lng]);
  }
  return [];
};

export const buildRoutingPayload = (points) => {
  if (!Array.isArray(points) || points.length < 2) return null;
  return {
    coordinates: points.map(([lat, lng]) => [lng, lat])
  };
};

const base64Encode = (value) => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64');
  }
  throw new Error('Base64 encoding is not supported in this environment.');
};

const base64Decode = (value) => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function') {
    return globalThis.atob(value);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf-8');
  }
  throw new Error('Base64 decoding is not supported in this environment.');
};

const clampPrecision = (number) => Math.round(number * 1e6) / 1e6;
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const normalisePosition = (candidate) => {
  if (!candidate || typeof candidate !== 'object') return null;
  const lat = Number(candidate.lat);
  const lng = Number(candidate.lng);
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    lat: clampPrecision(lat),
    lng: clampPrecision(lng)
  };
};

export const ROUTE_SHARE_VERSION = 1;

export const normaliseRouteShareSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const version = typeof snapshot.version === 'number' ? snapshot.version : ROUTE_SHARE_VERSION;
  if (version !== ROUTE_SHARE_VERSION) return null;

  const connectVia = snapshot.connectVia === 'route' ? 'route' : 'direct';
  const start = normalisePosition(snapshot.start);
  const end = normalisePosition(snapshot.end);
  const checkpoints = Array.isArray(snapshot.checkpoints)
    ? snapshot.checkpoints.map(normalisePosition).filter(Boolean)
    : [];

  return {
    version,
    connectVia,
    start,
    end,
    checkpoints
  };
};

export const buildRouteShareSnapshot = ({ start, end, checkpoints, connectVia }) => {
  const snapshot = normaliseRouteShareSnapshot({
    version: ROUTE_SHARE_VERSION,
    connectVia,
    start: start?.position ?? start ?? null,
    end: end?.position ?? end ?? null,
    checkpoints: Array.isArray(checkpoints)
      ? checkpoints.map((checkpoint) => checkpoint?.position ?? checkpoint ?? null)
      : []
  });

  if (!snapshot) return null;
  if (!snapshot.start && !snapshot.end && snapshot.checkpoints.length === 0) {
    return null;
  }

  return snapshot;
};

export const encodeRouteShare = (snapshot) => {
  const normalised = normaliseRouteShareSnapshot(snapshot);
  if (!normalised) return '';
  const payload = {
    version: ROUTE_SHARE_VERSION,
    connectVia: normalised.connectVia,
    start: normalised.start,
    end: normalised.end,
    checkpoints: normalised.checkpoints
  };
  return base64Encode(JSON.stringify(payload));
};

export const decodeRouteShare = (code) => {
  if (typeof code !== 'string') return null;
  try {
    const trimmed = code.trim();
    if (!trimmed) return null;
    const parsed = JSON.parse(base64Decode(trimmed));
    return normaliseRouteShareSnapshot(parsed);
  } catch (error) {
    return null;
  }
};
