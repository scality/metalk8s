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
  const { metricsTimeSpan } = useMetricsTimeSpan();

  const [currentTime, setCurrentTime] = useState(new Date()); //the number of milliseconds
  const [currentTimeISO, setCurrentTimeISO] = useState(
    //TODO: check if toISOString is needed
    currentTime.toISOString(),
  );

  const [startingTimeISO, setStartingTimeISO] = useState(
    new Date((currentTime / 1000 - metricsTimeSpan) * 1000).toISOString(),
  );

  const updateCurrentTime = useCallback(() => {
    const newCurrentDate = new Date();
    setCurrentTime(newCurrentDate);
    setCurrentTimeISO(newCurrentDate.toISOString());
    setStartingTimeISO(
      new Date((newCurrentDate / 1000 - metricsTimeSpan) * 1000).toISOString(),
    );
    return {
      currentTime: newCurrentDate,
      currentTimeISO: newCurrentDate.toISOString(),
      startingTimeISO: new Date(
        (newCurrentDate / 1000 - metricsTimeSpan) * 1000,
      ).toISOString(),
    };
  }, [metricsTimeSpan]);

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
    <StartTimeContext.Provider value={{ startingTimeISO, currentTimeISO }}>
      {children}
    </StartTimeContext.Provider>
  );
};
export default StartTimeProvider;
