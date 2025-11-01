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
