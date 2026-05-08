import { useCallback, useEffect, useRef, useState } from 'react';
import type { BluetoothStatus } from '../types';
import { createMotorCommand, createPingCommand, createStopCommand } from '../utils/command';
import { getCommandCharacteristic, isBluetoothSupported, requestMotorDevice } from '../utils/bluetooth';

const writeCommand = async (
  characteristic: BluetoothRemoteGATTCharacteristic,
  command: string,
) => {
  const payload = new TextEncoder().encode(command);

  if (characteristic.writeValueWithResponse) {
    await characteristic.writeValueWithResponse(payload);
    return;
  }

  await characteristic.writeValue(payload);
};

export const useBluetoothMotor = () => {
  const [status, setStatus] = useState<BluetoothStatus>(() =>
    isBluetoothSupported() ? 'disconnected' : 'unsupported',
  );
  const [error, setError] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string>('未送信');
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const handleDisconnected = useCallback(() => {
    characteristicRef.current = null;
    setStatus(isBluetoothSupported() ? 'disconnected' : 'unsupported');
  }, []);

  const connect = useCallback(async () => {
    if (!isBluetoothSupported()) {
      setStatus('unsupported');
      setError('BLEがこのブラウザで利用できません');
      return false;
    }

    try {
      setStatus('connecting');
      setError(null);
      const device = await requestMotorDevice();
      deviceRef.current?.removeEventListener('gattserverdisconnected', handleDisconnected);
      device.addEventListener('gattserverdisconnected', handleDisconnected);
      deviceRef.current = device;
      characteristicRef.current = await getCommandCharacteristic(device);
      setStatus('connected');
      await writeCommand(characteristicRef.current, createPingCommand());
      setLastCommand(createPingCommand());
      return true;
    } catch (connectError) {
      const message =
        connectError instanceof Error ? connectError.message : 'BLE接続に失敗しました';
      setError(message);
      characteristicRef.current = null;
      setStatus(isBluetoothSupported() ? 'disconnected' : 'unsupported');
      return false;
    }
  }, [handleDisconnected]);

  const disconnect = useCallback(() => {
    try {
      deviceRef.current?.gatt?.disconnect();
    } finally {
      characteristicRef.current = null;
      setStatus(isBluetoothSupported() ? 'disconnected' : 'unsupported');
    }
  }, []);

  const sendCommand = useCallback(
    async (command: string) => {
      if (!characteristicRef.current || status !== 'connected') {
        setError('BLE未接続のためコマンド送信できません');
        return false;
      }

      try {
        await writeCommand(characteristicRef.current, command);
        setLastCommand(command);
        setError(null);
        return true;
      } catch (sendError) {
        const message =
          sendError instanceof Error ? sendError.message : 'BLEコマンド送信に失敗しました';
        setError(message);
        return false;
      }
    },
    [status],
  );

  const retract = useCallback(
    (durationMs: number) => sendCommand(createMotorCommand('RETRACT', durationMs)),
    [sendCommand],
  );

  const releaseTape = useCallback(
    (durationMs: number) => sendCommand(createMotorCommand('RELEASE', durationMs)),
    [sendCommand],
  );

  const stop = useCallback(() => sendCommand(createStopCommand()), [sendCommand]);

  useEffect(
    () => () => {
      deviceRef.current?.removeEventListener('gattserverdisconnected', handleDisconnected);
      deviceRef.current?.gatt?.disconnect();
    },
    [handleDisconnected],
  );

  return {
    status,
    isConnected: status === 'connected',
    error,
    lastCommand,
    connect,
    disconnect,
    sendCommand,
    retract,
    releaseTape,
    stop,
  };
};
