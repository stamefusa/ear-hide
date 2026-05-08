import { useCallback, useEffect, useState } from 'react';
import { MIN_LOCATION_INTERVAL_MS } from '../constants';
import type { Coordinates, LocationError } from '../types';

interface UseGeolocationOptions {
  enabled: boolean;
  intervalMs: number;
}

const getErrorMessage = (error: GeolocationPositionError): string => {
  if (error.code === error.PERMISSION_DENIED) {
    return '位置情報が許可されていません';
  }

  return '現在地を取得できません';
};

export const useGeolocation = ({ enabled, intervalMs }: UseGeolocationOptions) => {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const requestLocation = useCallback(() => {
    if (!enabled) {
      return;
    }

    if (!navigator.geolocation) {
      setError({ message: '位置情報がこのブラウザで利用できません' });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.coords.accuracy,
          timestamp: result.timestamp,
        });
        setError(null);
        setIsLocating(false);
      },
      (geoError) => {
        setError({
          code: geoError.code,
          message: getErrorMessage(geoError),
        });
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: Math.max(8000, intervalMs - 500),
        maximumAge: 0,
      },
    );
  }, [enabled, intervalMs]);

  useEffect(() => {
    if (!enabled) {
      setIsLocating(false);
      return undefined;
    }

    requestLocation();
    const intervalId = window.setInterval(
      requestLocation,
      Math.max(MIN_LOCATION_INTERVAL_MS, intervalMs),
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, intervalMs, requestLocation]);

  return {
    position,
    error,
    isLocating,
    requestLocation,
  };
};
