import type { Coordinates } from '../types';

const EARTH_RADIUS_M = 6371008.8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const calculateHaversineDistance = (
  from: Coordinates,
  to: Coordinates,
): number => {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
};

export const formatCoordinates = (value: Coordinates | null): string => {
  if (!value) {
    return '未設定';
  }

  return `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`;
};

export const formatDistance = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return '未計算';
  }

  return value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${Math.round(value)} m`;
};
