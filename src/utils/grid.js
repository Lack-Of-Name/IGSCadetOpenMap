const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const toDegrees = (radians) => (radians * 180) / Math.PI;
const normalizeLongitude = (longitude) => ((longitude + 540) % 360) - 180;

const clampPrecision = (precision) => {
  if (precision === 3 || precision === 4) {
    return precision;
  }
  throw new Error('Unsupported grid precision. Use 3 or 4 figure references.');
};

export const precisionToUnitMeters = (precision) => {
  const value = clampPrecision(precision);
  if (value === 3) {
    return 100; // 3-figure (6-digit) references resolve to 100 m squares
  }
  return 10; // 4-figure (8-digit) references resolve to 10 m squares
};

export const normaliseGridDigits = (value, precision) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error('Grid references must contain digits only.');
  }
  if (trimmed.length !== precision) {
    throw new Error(`Expected ${precision} digits for this precision setting.`);
  }
  return parseInt(trimmed, 10);
};

const projectOffset = ({ lat, lng }, eastOffset, northOffset) => {
  const latRad = toRadians(lat);
  const newLat = lat + (northOffset / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const newLng =
    lng +
    ((eastOffset / (EARTH_RADIUS_METERS * Math.cos(latRad))) * 180) /
      Math.PI;
  return { lat: newLat, lng: newLng };
};

export const destinationFromBearing = ({ origin, bearingDegrees, distanceMeters }) => {
  if (!origin) {
    throw new Error('Provide a valid origin location first.');
  }
  if (bearingDegrees == null || Number.isNaN(bearingDegrees)) {
    throw new Error('Bearing must be a number.');
  }
  if (distanceMeters == null || Number.isNaN(distanceMeters) || distanceMeters < 0) {
    throw new Error('Distance must be a non-negative number.');
  }

  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearingRad = toRadians(bearingDegrees);
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngular = Math.sin(angularDistance);
  const cosAngular = Math.cos(angularDistance);

  const lat2 = Math.asin(
    sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearingRad)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * sinAngular * cosLat1,
      cosAngular - sinLat1 * Math.sin(lat2)
    );

  return {
    lat: toDegrees(lat2),
    lng: normalizeLongitude(toDegrees(lng2))
  };
};

export const milsToDegrees = (mils) => (mils * 360) / 6400;
export const degreesToMils = (degrees) => (degrees * 6400) / 360;

export const gridReferenceToLatLng = ({
  origin,
  originReference,
  targetReference,
  precision
}) => {
  if (!origin) {
    throw new Error('Set a grid origin location first.');
  }
  if (!originReference) {
    throw new Error('Set a grid origin reference first.');
  }

  const resolvedPrecision = clampPrecision(
    precision ?? originReference.precision ?? targetReference?.precision ?? 3
  );

  const originEast = normaliseGridDigits(originReference.easting, resolvedPrecision);
  const originNorth = normaliseGridDigits(originReference.northing, resolvedPrecision);
  const targetEast = normaliseGridDigits(targetReference.easting, resolvedPrecision);
  const targetNorth = normaliseGridDigits(targetReference.northing, resolvedPrecision);

  const unitMeters = precisionToUnitMeters(resolvedPrecision);
  const eastOffset = (targetEast - originEast) * unitMeters;
  const northOffset = (targetNorth - originNorth) * unitMeters;

  return projectOffset(origin, eastOffset, northOffset);
};

export const latLngToGridReference = ({
  origin,
  originReference,
  point,
  precision
}) => {
  if (!origin || !originReference) {
    throw new Error('Grid origin must be configured.');
  }
  const resolvedPrecision = clampPrecision(
    precision ?? originReference.precision ?? 3
  );
  const unitMeters = precisionToUnitMeters(resolvedPrecision);

  const latRad = (origin.lat * Math.PI) / 180;
  const deltaNorth = ((point.lat - origin.lat) * Math.PI * EARTH_RADIUS_METERS) / 180;
  const deltaEast =
    ((point.lng - origin.lng) * Math.PI * EARTH_RADIUS_METERS * Math.cos(latRad)) /
    180;

  const eastDigits = Math.round(originReference.easting + deltaEast / unitMeters);
  const northDigits = Math.round(originReference.northing + deltaNorth / unitMeters);

  const pad = (value) => value.toString().padStart(resolvedPrecision, '0');

  return {
    easting: pad(eastDigits),
    northing: pad(northDigits),
    precision: resolvedPrecision
  };
};
