import type { AppMode, Settings, StorageState } from './types';

export const BLE_DEVICE_NAME = 'EarController';
export const SERVICE_UUID = '7b15f8d0-7f5b-4c4b-9a5f-7f0f2c2c0001';
export const COMMAND_CHAR_UUID = '7b15f8d0-7f5b-4c4b-9a5f-7f0f2c2c0002';

export const DEFAULT_SETTINGS: Settings = {
  thresholdDistanceM: 2000,
  locationIntervalMs: 5000,
  consecutiveExceedLimit: 3,
  retractDurationMs: 1500,
  releaseDurationMs: 800,
};

export const DEFAULT_CENTER: null = null;

export const MODE_LABELS: Record<AppMode, string> = {
  production: '本番',
  'distance-test': '距離判定テスト',
  'motor-test': 'モータ動作テスト',
};

export const STORAGE_STATE_LABELS: Record<StorageState, string> = {
  READY: '未収納',
  RETRACTED: '収納済み',
  ERROR: 'エラー',
};

export const STORAGE_KEYS = {
  settings: 'ear-controller:settings',
  centerPoint: 'ear-controller:center-point',
  mode: 'ear-controller:mode',
} as const;

export const MIN_LOCATION_INTERVAL_MS = 1000;
