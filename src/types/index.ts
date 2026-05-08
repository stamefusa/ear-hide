export type AppMode = 'production' | 'distance-test' | 'motor-test';

export type StorageState = 'READY' | 'RETRACTED' | 'ERROR';

export type BluetoothStatus =
  | 'unsupported'
  | 'disconnected'
  | 'connecting'
  | 'connected';

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

export interface Settings {
  thresholdDistanceM: number;
  locationIntervalMs: number;
  consecutiveExceedLimit: number;
  retractDurationMs: number;
  releaseDurationMs: number;
}

export interface LocationError {
  code?: number;
  message: string;
}

export type MotorCommandKind = 'RETRACT' | 'RELEASE' | 'STOP' | 'PING';

export interface StatusItem {
  label: string;
  value: string;
  tone?: 'normal' | 'good' | 'warn' | 'danger';
}
