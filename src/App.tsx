import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, MapPinned } from 'lucide-react';
import { DEFAULT_SETTINGS, MODE_LABELS, STORAGE_KEYS, STORAGE_STATE_LABELS } from './constants';
import { MapView } from './components/MapView';
import { ModeSelector } from './components/ModeSelector';
import { MotorControlPanel } from './components/MotorControlPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusPanel } from './components/StatusPanel';
import { useBluetoothMotor } from './hooks/useBluetoothMotor';
import { useDistanceJudge } from './hooks/useDistanceJudge';
import { useGeolocation } from './hooks/useGeolocation';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { AppMode, Coordinates, Settings, StatusItem, StorageState } from './types';
import { formatCoordinates, formatDistance } from './utils/distance';

const sanitizePositiveInteger = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;

const sanitizeSettings = (settings: Settings): Settings => ({
  thresholdDistanceM: sanitizePositiveInteger(
    settings.thresholdDistanceM,
    DEFAULT_SETTINGS.thresholdDistanceM,
  ),
  locationIntervalMs: sanitizePositiveInteger(
    settings.locationIntervalMs,
    DEFAULT_SETTINGS.locationIntervalMs,
  ),
  consecutiveExceedLimit: sanitizePositiveInteger(
    settings.consecutiveExceedLimit,
    DEFAULT_SETTINGS.consecutiveExceedLimit,
  ),
  retractDurationMs: sanitizePositiveInteger(
    settings.retractDurationMs,
    DEFAULT_SETTINGS.retractDurationMs,
  ),
  releaseDurationMs: sanitizePositiveInteger(
    settings.releaseDurationMs,
    DEFAULT_SETTINGS.releaseDurationMs,
  ),
});

const getBluetoothLabel = (status: string): string => {
  switch (status) {
    case 'connected':
      return '接続済み';
    case 'connecting':
      return '接続中';
    case 'unsupported':
      return '非対応';
    default:
      return '未接続';
  }
};

function App() {
  const [mode, setMode] = useLocalStorage<AppMode>(STORAGE_KEYS.mode, 'production');
  const [settings, setSettings] = useLocalStorage<Settings>(
    STORAGE_KEYS.settings,
    DEFAULT_SETTINGS,
  );
  const [centerPoint, setCenterPoint] = useLocalStorage<Coordinates | null>(
    STORAGE_KEYS.centerPoint,
    null,
  );
  const [storageState, setStorageState] = useState<StorageState>('READY');
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const autoRetractLockRef = useRef(false);

  const safeSettings = useMemo(() => sanitizeSettings(settings), [settings]);
  const locationEnabled = mode !== 'motor-test';
  const bluetoothEnabledForMode = mode !== 'distance-test';

  const {
    position,
    error: locationError,
    isLocating,
    requestLocation,
  } = useGeolocation({
    enabled: locationEnabled,
    intervalMs: safeSettings.locationIntervalMs,
  });

  const {
    status: bluetoothStatus,
    isConnected: isBluetoothConnected,
    error: bluetoothError,
    lastCommand,
    connect,
    disconnect,
    retract,
    releaseTape,
    stop,
  } = useBluetoothMotor();

  const judge = useDistanceJudge({
    centerPoint,
    currentPosition: position,
    thresholdDistanceM: safeSettings.thresholdDistanceM,
    consecutiveExceedLimit: safeSettings.consecutiveExceedLimit,
    enabled: locationEnabled && Boolean(centerPoint),
  });

  const updateMode = useCallback(
    (nextMode: AppMode) => {
      setMode(nextMode);
      setRuntimeError(null);
      autoRetractLockRef.current = false;
    },
    [setMode],
  );

  const updateSettings = useCallback(
    (nextSettings: Settings) => {
      setSettings(nextSettings);
      setRuntimeError(null);
      autoRetractLockRef.current = false;
    },
    [setSettings],
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (!position) {
      setRuntimeError('現在地を取得できません');
      requestLocation();
      return;
    }

    setCenterPoint(position);
    setRuntimeError(null);
    autoRetractLockRef.current = false;
  }, [position, requestLocation, setCenterPoint]);

  const resetStorageState = useCallback(() => {
    setStorageState('READY');
    setRuntimeError(null);
    autoRetractLockRef.current = false;
  }, []);

  const handleRetract = useCallback(async () => {
    try {
      await retract(safeSettings.retractDurationMs);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : '巻き取りを実行できません');
    }
  }, [retract, safeSettings.retractDurationMs]);

  const handleRelease = useCallback(async () => {
    try {
      await releaseTape(safeSettings.releaseDurationMs);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'ゆるめを実行できません');
    }
  }, [releaseTape, safeSettings.releaseDurationMs]);

  const handleStop = useCallback(async () => {
    await stop();
  }, [stop]);

  useEffect(() => {
    if (mode !== 'production') {
      return;
    }

    if (!centerPoint) {
      return;
    }

    if (!position) {
      return;
    }

    if (storageState !== 'READY') {
      return;
    }

    if (!isBluetoothConnected) {
      return;
    }

    if (!judge.shouldAutoRetract || autoRetractLockRef.current) {
      return;
    }

    autoRetractLockRef.current = true;
    void retract(safeSettings.retractDurationMs).then((sent) => {
      if (sent) {
        setStorageState('RETRACTED');
        setRuntimeError(null);
        return;
      }

      setStorageState('ERROR');
      setRuntimeError('自動収納コマンドを送信できません');
      autoRetractLockRef.current = false;
    });
  }, [
    centerPoint,
    isBluetoothConnected,
    judge.shouldAutoRetract,
    mode,
    position,
    retract,
    safeSettings.retractDurationMs,
    storageState,
  ]);

  const settingError = useMemo(() => {
    const values = Object.values(settings);
    return values.every((value) => Number.isFinite(value) && value > 0)
      ? null
      : '設定値が不正です';
  }, [settings]);

  const statusItems: StatusItem[] = useMemo(
    () => [
      { label: '現在のモード', value: MODE_LABELS[mode] },
      {
        label: 'BLE接続状態',
        value: bluetoothEnabledForMode ? getBluetoothLabel(bluetoothStatus) : '未使用',
        tone:
          bluetoothStatus === 'connected'
            ? 'good'
            : bluetoothStatus === 'unsupported'
              ? 'danger'
              : 'normal',
      },
      {
        label: '現在地',
        value: formatCoordinates(position),
        tone: position ? 'good' : 'warn',
      },
      {
        label: '中心点',
        value: formatCoordinates(centerPoint),
        tone: centerPoint ? 'good' : 'warn',
      },
      {
        label: '現在距離',
        value: formatDistance(judge.currentDistanceM),
        tone: judge.isExceedingThreshold ? 'warn' : 'normal',
      },
      {
        label: 'しきい値距離',
        value: `${safeSettings.thresholdDistanceM} m`,
      },
      {
        label: '連続しきい値超過回数',
        value: `${judge.consecutiveExceedCount} / ${safeSettings.consecutiveExceedLimit}`,
        tone: judge.consecutiveExceedCount > 0 ? 'warn' : 'normal',
      },
      {
        label: '収納状態',
        value: STORAGE_STATE_LABELS[storageState],
        tone:
          storageState === 'READY'
            ? 'good'
            : storageState === 'ERROR'
              ? 'danger'
              : 'warn',
      },
      {
        label: '最後に送信したBLEコマンド',
        value: lastCommand,
      },
    ],
    [
      bluetoothStatus,
      bluetoothEnabledForMode,
      centerPoint,
      judge.consecutiveExceedCount,
      judge.currentDistanceM,
      judge.isExceedingThreshold,
      mode,
      position,
      lastCommand,
      safeSettings.consecutiveExceedLimit,
      safeSettings.thresholdDistanceM,
      storageState,
    ],
  );

  const errors = [
    settingError,
    runtimeError,
    locationEnabled ? locationError?.message ?? null : null,
    bluetoothEnabledForMode ? bluetoothError : null,
    mode === 'production' && !centerPoint ? '中心点が未設定です' : null,
  ].filter((error): error is string => Boolean(error));

  const isConnected = isBluetoothConnected && bluetoothEnabledForMode;
  const canRetract = isConnected && mode === 'motor-test';
  const canRelease = isConnected;
  const canStop = isConnected;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-icon" aria-hidden>
            <MapPinned size={26} />
          </div>
          <div>
            <p className="eyebrow">BLE Location Controller</p>
            <h1>EarController</h1>
          </div>
        </div>
        <div className={`system-pill ${storageState.toLowerCase()}`}>
          <Activity size={17} aria-hidden />
          <span>{STORAGE_STATE_LABELS[storageState]}</span>
        </div>
      </header>

      <main className="main-layout">
        <section className="top-strip" aria-label="モード">
          <ModeSelector value={mode} onChange={updateMode} />
          {settingError && (
            <div className="inline-status danger">
              <AlertTriangle size={16} aria-hidden />
              <span>{settingError}</span>
            </div>
          )}
        </section>

        <div className="workspace-grid">
          <div className="map-column">
            <MapView
              centerPoint={centerPoint}
              currentPosition={position}
              thresholdDistanceM={safeSettings.thresholdDistanceM}
              visible={mode !== 'motor-test'}
              onCenterPointChange={(coordinates) => {
                setCenterPoint(coordinates);
                setRuntimeError(null);
                autoRetractLockRef.current = false;
              }}
              onUseCurrentLocation={handleUseCurrentLocation}
              canUseCurrentLocation={Boolean(position)}
            />
            {isLocating && mode !== 'motor-test' && (
              <div className="map-inline-status">
                <div className="inline-status">
                  <Activity size={16} aria-hidden />
                  <span>位置取得中</span>
                </div>
              </div>
            )}
          </div>
          <aside className="side-stack">
            <StatusPanel
              items={statusItems}
              errors={errors}
              thresholdNotice={mode === 'distance-test' && judge.isExceedingThreshold}
            />
            <SettingsPanel settings={settings} onChange={updateSettings} />
            <MotorControlPanel
              bluetoothStatus={bluetoothStatus}
              storageState={storageState}
              bluetoothActionsEnabled={bluetoothEnabledForMode}
              canRetract={canRetract}
              canRelease={canRelease}
              canStop={canStop}
              onConnect={connect}
              onDisconnect={disconnect}
              onRetract={handleRetract}
              onRelease={handleRelease}
              onStop={handleStop}
              onResetState={resetStorageState}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
