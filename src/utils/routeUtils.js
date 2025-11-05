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

const bytesToBinaryString = (bytes) => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return binary;
};

const binaryStringToBytes = (binary) => {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const toBase64Url = (bytes) => {
  const base64 = base64Encode(bytesToBinaryString(bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (code) => {
  const normalised = code.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalised.length % 4 === 0 ? '' : '='.repeat(4 - (normalised.length % 4));
  const decoded = base64Decode(`${normalised}${padding}`);
  return binaryStringToBytes(decoded);
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
const ROUTE_SHARE_SCALE = 1e5;

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

const encodeBinaryRouteShare = (normalised) => {
  const hasStart = Boolean(normalised.start);
  const hasEnd = Boolean(normalised.end);
  const checkpointCount = normalised.checkpoints.length;
  const coordinateCount = (hasStart ? 1 : 0) + (hasEnd ? 1 : 0) + checkpointCount;
  const buffer = new ArrayBuffer(5 + coordinateCount * 8);
  const view = new DataView(buffer);
  let offset = 0;
  view.setUint8(offset, ROUTE_SHARE_VERSION);
  offset += 1;
  const flags = (hasStart ? 1 : 0) | (hasEnd ? 2 : 0);
  view.setUint8(offset, flags);
  offset += 1;
  view.setUint8(offset, normalised.connectVia === 'route' ? 1 : 0);
  offset += 1;
  view.setUint16(offset, checkpointCount, false);
  offset += 2;

  const writeCoordinate = (position) => {
    view.setInt32(offset, Math.round(position.lat * ROUTE_SHARE_SCALE), false);
    offset += 4;
    view.setInt32(offset, Math.round(position.lng * ROUTE_SHARE_SCALE), false);
    offset += 4;
  };

  if (hasStart) {
    writeCoordinate(normalised.start);
  }
  normalised.checkpoints.forEach(writeCoordinate);
  if (hasEnd) {
    writeCoordinate(normalised.end);
  }

  return toBase64Url(new Uint8Array(buffer));
};

const decodeBinaryRouteShare = (code) => {
  try {
    const bytes = fromBase64Url(code);
    if (bytes.length < 5) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;
    const version = view.getUint8(offset);
    offset += 1;
    if (version !== ROUTE_SHARE_VERSION) return null;
    const flags = view.getUint8(offset);
    offset += 1;
    const connectVia = view.getUint8(offset) === 1 ? 'route' : 'direct';
    offset += 1;
    const checkpointCount = view.getUint16(offset, false);
    offset += 2;
    const expectedCoordinates = (flags & 1 ? 1 : 0) + (flags & 2 ? 1 : 0) + checkpointCount;
    const expectedBytes = expectedCoordinates * 8;
    if (bytes.byteLength !== offset + expectedBytes) {
      return null;
    }

    const readCoordinate = () => {
      const lat = view.getInt32(offset, false) / ROUTE_SHARE_SCALE;
      offset += 4;
      const lng = view.getInt32(offset, false) / ROUTE_SHARE_SCALE;
      offset += 4;
      return { lat, lng };
    };

    const start = flags & 1 ? readCoordinate() : null;
    const checkpoints = [];
    for (let index = 0; index < checkpointCount; index += 1) {
      checkpoints.push(readCoordinate());
    }
    const end = flags & 2 ? readCoordinate() : null;

    return {
      version: ROUTE_SHARE_VERSION,
      connectVia,
      start,
      end,
      checkpoints
    };
  } catch (error) {
    return null;
  }
};

export const encodeRouteShare = (snapshot) => {
  const normalised = normaliseRouteShareSnapshot(snapshot);
  if (!normalised) return '';
  return encodeBinaryRouteShare(normalised);
};

export const decodeRouteShare = (code) => {
  if (typeof code !== 'string') return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  const binaryResult = decodeBinaryRouteShare(trimmed);
  if (binaryResult) {
    return normaliseRouteShareSnapshot(binaryResult);
  }
  try {
    const parsed = JSON.parse(base64Decode(trimmed));
    return normaliseRouteShareSnapshot(parsed);
  } catch (error) {
    return null;
  }
};

const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const GEOHASH_BITS = [16, 8, 4, 2, 1];

export const encodeLocationCode = (position, precision = 9) => {
  if (typeof precision !== 'number' || precision < 1 || precision > 12) {
    throw new Error('encodeLocationCode precision must be between 1 and 12.');
  }
  const normalised = normalisePosition(position);
  if (!normalised) return null;

  let minLat = -90;
  let maxLat = 90;
  let minLng = -180;
  let maxLng = 180;
  let evenBit = true;
  let bit = 0;
  let character = 0;
  let hash = '';

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (minLng + maxLng) / 2;
      if (normalised.lng >= mid) {
        character |= GEOHASH_BITS[bit];
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (normalised.lat >= mid) {
        character |= GEOHASH_BITS[bit];
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }

    evenBit = !evenBit;

    if (bit < GEOHASH_BITS.length - 1) {
      bit += 1;
    } else {
      hash += GEOHASH_BASE32[character];
      bit = 0;
      character = 0;
    }
  }

  return hash;
};

export const decodeLocationCode = (hash) => {
  if (typeof hash !== 'string' || hash.length === 0) {
    return null;
  }

  let minLat = -90;
  let maxLat = 90;
  let minLng = -180;
  let maxLng = 180;
  let evenBit = true;

  for (let index = 0; index < hash.length; index += 1) {
    const character = hash[index].toLowerCase();
    const charIndex = GEOHASH_BASE32.indexOf(character);
    if (charIndex === -1) {
      return null;
    }

    for (let bit = 0; bit < GEOHASH_BITS.length; bit += 1) {
      const mask = GEOHASH_BITS[bit];
      if (evenBit) {
        const mid = (minLng + maxLng) / 2;
        if (charIndex & mask) {
          minLng = mid;
        } else {
          maxLng = mid;
        }
      } else {
        const mid = (minLat + maxLat) / 2;
        if (charIndex & mask) {
          minLat = mid;
        } else {
          maxLat = mid;
        }
      }
      evenBit = !evenBit;
    }
  }

  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2
  };
};
