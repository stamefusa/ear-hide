import {
  Bluetooth,
  BluetoothOff,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Square,
} from 'lucide-react';
import type { BluetoothStatus, StorageState } from '../types';

interface MotorControlPanelProps {
  bluetoothStatus: BluetoothStatus;
  storageState: StorageState;
  bluetoothActionsEnabled: boolean;
  canRetract: boolean;
  canRelease: boolean;
  canStop: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRetract: () => void;
  onRelease: () => void;
  onStop: () => void;
  onResetState: () => void;
}

export const MotorControlPanel = ({
  bluetoothStatus,
  storageState,
  bluetoothActionsEnabled,
  canRetract,
  canRelease,
  canStop,
  onConnect,
  onDisconnect,
  onRetract,
  onRelease,
  onStop,
  onResetState,
}: MotorControlPanelProps) => {
  const isConnecting = bluetoothStatus === 'connecting';
  const isConnected = bluetoothStatus === 'connected';
  const canUseBluetooth = bluetoothActionsEnabled && bluetoothStatus !== 'unsupported';

  return (
    <section className="panel controls-panel" aria-labelledby="controls-title">
      <div className="panel-heading">
        <h2 id="controls-title">操作</h2>
      </div>
      <div className="button-grid">
        <button
          type="button"
          className="action-button primary"
          onClick={onConnect}
          disabled={!canUseBluetooth || isConnected || isConnecting}
          title="BLE接続"
        >
          <Bluetooth size={18} aria-hidden />
          <span>{isConnecting ? '接続中' : 'BLE接続'}</span>
        </button>
        <button
          type="button"
          className="action-button"
          onClick={onDisconnect}
          disabled={!bluetoothActionsEnabled || !isConnected}
          title="BLE切断"
        >
          <BluetoothOff size={18} aria-hidden />
          <span>BLE切断</span>
        </button>
        <button
          type="button"
          className="action-button strong"
          onClick={onRetract}
          disabled={!canRetract}
          title="巻き取り"
        >
          <RotateCw size={18} aria-hidden />
          <span>巻き取り</span>
        </button>
        <button
          type="button"
          className="action-button"
          onClick={onRelease}
          disabled={!canRelease}
          title="ゆるめ"
        >
          <RotateCcw size={18} aria-hidden />
          <span>ゆるめ</span>
        </button>
        <button
          type="button"
          className="action-button danger"
          onClick={onStop}
          disabled={!canStop}
          title="停止"
        >
          <Square size={18} aria-hidden />
          <span>停止</span>
        </button>
        <button
          type="button"
          className="action-button"
          onClick={onResetState}
          disabled={storageState === 'READY'}
          title="状態リセット"
        >
          {storageState === 'RETRACTED' ? (
            <RefreshCcw size={18} aria-hidden />
          ) : (
            <ShieldCheck size={18} aria-hidden />
          )}
          <span>状態リセット</span>
        </button>
      </div>
    </section>
  );
};
