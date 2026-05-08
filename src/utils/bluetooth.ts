import { BLE_DEVICE_NAME, COMMAND_CHAR_UUID, SERVICE_UUID } from '../constants';

export const isBluetoothSupported = (): boolean =>
  typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);

export const requestMotorDevice = async (): Promise<BluetoothDevice> => {
  if (!navigator.bluetooth) {
    throw new Error('BLEがこのブラウザで利用できません');
  }

  return navigator.bluetooth.requestDevice({
    filters: [{ name: BLE_DEVICE_NAME }],
    optionalServices: [SERVICE_UUID],
  });
};

export const getCommandCharacteristic = async (
  device: BluetoothDevice,
): Promise<BluetoothRemoteGATTCharacteristic> => {
  const server = await device.gatt?.connect();
  if (!server) {
    throw new Error('BLE接続に失敗しました');
  }

  const service = await server.getPrimaryService(SERVICE_UUID);
  return service.getCharacteristic(COMMAND_CHAR_UUID);
};
