import type { MotorCommandKind } from '../types';

export const isPositiveDuration = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

export const normalizeDuration = (value: number): number =>
  Math.max(1, Math.round(value));

export const createMotorCommand = (
  kind: Extract<MotorCommandKind, 'RETRACT' | 'RELEASE'>,
  durationMs: number,
): string => {
  if (!isPositiveDuration(durationMs)) {
    throw new Error('駆動時間が不正です');
  }

  return `${kind}:${normalizeDuration(durationMs)}`;
};

export const createStopCommand = () => 'STOP';

export const createPingCommand = () => 'PING';
