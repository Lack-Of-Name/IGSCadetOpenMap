import { useCallback, useEffect, useRef, useState } from 'react';

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const toDegrees = (radians) => (radians * 180) / Math.PI;

export const calculateBearing = (from, to) => {
  if (!from || !to) return null;

  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLong = toRadians(to.lng - from.lng);

  const y = Math.sin(deltaLong) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLong);
  const brng = Math.atan2(y, x);
  return (toDegrees(brng) + 360) % 360;
};

export const calculateDistance = (from, to) => {
  if (!from || !to) return null;

  const earthRadius = 6371000; // meters
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

export const calculateRelativeBearing = (heading, bearing) => {
  if (heading == null || bearing == null) return null;
  const diff = (bearing - heading + 360) % 360;
  return diff;
};

export const useCompass = (targetPosition) => {
  const [heading, setHeading] = useState(null);
  const [geolocation, setGeolocation] = useState(null);
  const [error, setError] = useState(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [hasLocationFix, setHasLocationFix] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const watchId = useRef(null);
  const orientationEvent = useRef(null);
  const geolocationSupport = useRef(typeof navigator !== 'undefined' && 'geolocation' in navigator);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (typeof DeviceOrientationEvent === 'undefined') {
      setIsSupported(false);
      setError((previous) => previous ?? 'Compass not supported on this device');
      return undefined;
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      setNeedsPermission(true);
    }

    return undefined;
  }, []);

  const handleOrientation = useCallback((event) => {
    if (typeof event.alpha === 'number') {
      const headingValue = event.webkitCompassHeading ?? (360 - event.alpha);
      setHeading((headingValue + 360) % 360);
    }
  }, []);

  const startGeolocation = useCallback(() => {
    if (!geolocationSupport.current) {
      setError('Geolocation not supported');
      return false;
    }
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    const handleSuccess = (position) => {
      const { latitude, longitude } = position.coords;
      setGeolocation({ lat: latitude, lng: longitude });
      setLocationEnabled(true);
      setHasLocationFix(true);
      setIsRequestingLocation(false);
      setError(null);
    };

    const handleError = (geoError) => {
      if (geoError?.code === 1) {
        setError('Location permission denied');
        setLocationEnabled(false);
      } else if (geoError?.code === 2) {
        setError('Location unavailable');
      } else if (geoError?.code === 3) {
        setError('Location request timed out');
      } else {
        setError(geoError?.message ?? 'Unable to access location');
      }
      setHasLocationFix(false);
      setLocationEnabled(false);
      setIsRequestingLocation(false);
      if (watchId.current !== null && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };

    try {
      setIsRequestingLocation(true);
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      });
      watchId.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      });
      return true;
    } catch (geoError) {
      setError(geoError.message ?? 'Unable to access location');
      setIsRequestingLocation(false);
      setLocationEnabled(false);
      return false;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          window.removeEventListener('deviceorientation', handleOrientation);
          window.addEventListener('deviceorientation', handleOrientation);
          orientationEvent.current = 'deviceorientation';
          startGeolocation();
          setNeedsPermission(false);
        } else {
          setError('Compass permission denied');
        }
      } catch (permissionError) {
        setError(permissionError.message ?? 'Compass permission error');
      }
    }
  }, [handleOrientation, startGeolocation]);

  useEffect(() => {
    if (!geolocationSupport.current) {
      return () => {};
    }

    if (typeof window === 'undefined' || !window.isSecureContext) {
      return () => {};
    }
    let cancelled = false;
    const maybeAutoStart = async () => {
      if (!navigator.permissions?.query) return;
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (cancelled) return;
        if (status.state === 'granted') {
          startGeolocation();
        } else if (status.state === 'denied') {
          setError((prev) => prev ?? 'Location permission denied');
        }
        status.onchange = () => {
          if (cancelled) return;
          if (status.state === 'granted') {
            startGeolocation();
          } else if (status.state === 'denied') {
            setError('Location permission denied');
            setLocationEnabled(false);
            setHasLocationFix(false);
          }
        };
      } catch (permissionError) {
        setError((prev) => prev ?? permissionError.message ?? 'Geolocation unavailable');
      }
    };
    maybeAutoStart();
    return () => {
      if (watchId.current !== null && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      watchId.current = null;
      cancelled = true;
    };
  }, [startGeolocation]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }
    if (!isSupported) {
      return () => {};
    }

    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }

    const eventName = 'ondeviceorientationabsolute' in window
      ? 'deviceorientationabsolute'
      : 'deviceorientation';
    window.addEventListener(eventName, handleOrientation);
    orientationEvent.current = eventName;

    return () => {
      if (orientationEvent.current) {
        window.removeEventListener(orientationEvent.current, handleOrientation);
      }
    };
  }, [handleOrientation, isSupported]);

  const bearing = calculateBearing(geolocation, targetPosition);
  const distance = calculateDistance(geolocation, targetPosition);

  return {
    heading,
    bearing,
    distance,
    geolocation,
    error,
    needsPermission,
    isSupported,
    locationEnabled,
    hasLocationFix,
    isRequestingLocation,
    requestPermission,
    startGeolocation
  };
};
