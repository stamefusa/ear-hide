import { useEffect, useMemo, useState } from 'react';
import type { Coordinates } from '../types';
import { calculateHaversineDistance } from '../utils/distance';

interface UseDistanceJudgeOptions {
  centerPoint: Coordinates | null;
  currentPosition: Coordinates | null;
  thresholdDistanceM: number;
  consecutiveExceedLimit: number;
  enabled: boolean;
}

export const useDistanceJudge = ({
  centerPoint,
  currentPosition,
  thresholdDistanceM,
  consecutiveExceedLimit,
  enabled,
}: UseDistanceJudgeOptions) => {
  const [consecutiveExceedCount, setConsecutiveExceedCount] = useState(0);

  const currentDistanceM = useMemo(() => {
    if (!centerPoint || !currentPosition) {
      return null;
    }

    return calculateHaversineDistance(centerPoint, currentPosition);
  }, [centerPoint, currentPosition]);

  const isExceedingThreshold =
    currentDistanceM !== null && currentDistanceM >= thresholdDistanceM;

  useEffect(() => {
    setConsecutiveExceedCount(0);
  }, [centerPoint, thresholdDistanceM, consecutiveExceedLimit, enabled]);

  useEffect(() => {
    if (!enabled || currentDistanceM === null || !currentPosition?.timestamp) {
      return;
    }

    setConsecutiveExceedCount((previous) =>
      currentDistanceM >= thresholdDistanceM ? previous + 1 : 0,
    );
  }, [currentDistanceM, currentPosition?.timestamp, enabled, thresholdDistanceM]);

  return {
    currentDistanceM,
    isExceedingThreshold,
    consecutiveExceedCount,
    shouldAutoRetract:
      enabled &&
      isExceedingThreshold &&
      consecutiveExceedCount >= Math.max(1, consecutiveExceedLimit),
  };
};
