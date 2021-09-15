//@flow
import React, {
  createContext,
  useContext,
  type Node,
  useState,
  useCallback,
} from 'react';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import { REFRESH_METRICS_GRAPH } from '../constants';
import { useEffect } from 'react';
import { useMemo } from 'react';

const StartTimeContext = createContext<{
  startingTimeISO: string,
  currentTimeISO: string,
} | null>(null);

export const useStartingTimeStamp = (): {
  startingTimeISO: string,
  currentTimeISO: string,
} => {
  const { startingTimeISO, currentTimeISO } = useContext(StartTimeContext);
  if (!startingTimeISO || !currentTimeISO) {
    throw new Error(
      'The useStartingTimeStamp hook can only be used within StartTimeProvider.',
    );
  }
  return { startingTimeISO, currentTimeISO };
};

const StartTimeProvider = ({ children }: { children: Node }) => {
  const { duration } = useMetricsTimeSpan();

  const [currentTime, setCurrentTime] = useState(new Date());

  const [startingTimeISO, setStartingTimeISO] = useState(
    new Date((currentTime / 1000 - duration) * 1000).toISOString(),
  );

  const updateCurrentTime = useCallback(() => {
    const newCurrentDate = new Date();
    setCurrentTime(newCurrentDate);
    setStartingTimeISO(
      new Date((newCurrentDate / 1000 - duration) * 1000).toISOString(),
    );
  }, [duration]);

  useMemo(() => {
    updateCurrentTime();
  }, [updateCurrentTime]);

  useEffect(() => {
    const refreshStartTimeInterval = setInterval(() => {
      updateCurrentTime();
    }, REFRESH_METRICS_GRAPH);

    return () => {
      clearInterval(refreshStartTimeInterval);
    };
  }, [updateCurrentTime]);

  return (
    <StartTimeContext.Provider
      value={{ startingTimeISO, currentTimeISO: currentTime.toISOString() }}
    >
      {children}
    </StartTimeContext.Provider>
  );
};
export default StartTimeProvider;
