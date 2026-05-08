import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import { Crosshair, LocateFixed } from 'lucide-react';
import type { Coordinates } from '../types';

interface MapViewProps {
  centerPoint: Coordinates | null;
  currentPosition: Coordinates | null;
  thresholdDistanceM: number;
  visible: boolean;
  onCenterPointChange: (coordinates: Coordinates) => void;
  onUseCurrentLocation: () => void;
  canUseCurrentLocation: boolean;
}

const FALLBACK_CENTER: [number, number] = [35.681236, 139.767125];

const MapClickHandler = ({
  onCenterPointChange,
}: {
  onCenterPointChange: (coordinates: Coordinates) => void;
}) => {
  useMapEvents({
    click(event) {
      onCenterPointChange({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
};

export const MapView = ({
  centerPoint,
  currentPosition,
  thresholdDistanceM,
  visible,
  onCenterPointChange,
  onUseCurrentLocation,
  canUseCurrentLocation,
}: MapViewProps) => {
  if (!visible) {
    return (
      <section className="map-shell inactive-map" aria-labelledby="map-title">
        <div className="panel-heading">
          <h2 id="map-title">地図</h2>
        </div>
        <div className="map-placeholder">
          <Crosshair size={28} aria-hidden />
          <span>モータ動作テスト中</span>
        </div>
      </section>
    );
  }

  const initialCenter = currentPosition
    ? ([currentPosition.lat, currentPosition.lng] as [number, number])
    : FALLBACK_CENTER;

  return (
    <section className="map-shell" aria-labelledby="map-title">
      <div className="map-heading">
        <h2 id="map-title">地図</h2>
        <button
          type="button"
          className="compact-button"
          onClick={onUseCurrentLocation}
          disabled={!canUseCurrentLocation}
          title="現在地を中心点にする"
        >
          <LocateFixed size={17} aria-hidden />
          <span>現在地を中心点にする</span>
        </button>
      </div>
      <MapContainer center={initialCenter} zoom={14} className="map-canvas" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onCenterPointChange={onCenterPointChange} />
        {centerPoint && (
          <>
            <Circle
              center={[centerPoint.lat, centerPoint.lng]}
              radius={thresholdDistanceM}
              pathOptions={{ color: '#227c6d', fillColor: '#4ec7a0', fillOpacity: 0.12, weight: 2 }}
            />
            <CircleMarker
              center={[centerPoint.lat, centerPoint.lng]}
              radius={9}
              pathOptions={{ color: '#0f5f54', fillColor: '#2da58e', fillOpacity: 0.95, weight: 2 }}
            >
              <Tooltip direction="top">中心点</Tooltip>
            </CircleMarker>
          </>
        )}
        {currentPosition && (
          <CircleMarker
            center={[currentPosition.lat, currentPosition.lng]}
            radius={8}
            pathOptions={{ color: '#9a5a00', fillColor: '#f2a516', fillOpacity: 0.95, weight: 2 }}
          >
            <Tooltip direction="top">現在地</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </section>
  );
};
