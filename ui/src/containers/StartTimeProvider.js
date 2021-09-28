//@flow
import React, {
  createContext,
  useContext,
  type Node,
  useCallback,
  useState,
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
  const startTimeContext = useContext(StartTimeContext);
  if (!startTimeContext) {
    throw new Error(
      'The useStartingTimeStamp hook can only be used within StartTimeProvider.',
    );
  }
  return startTimeContext;
};

const StartTimeProvider = ({ children }: { children: Node }) => {
  const { duration, frequency } = useMetricsTimeSpan();

  const [currentTime, setCurrentTime] = useState(new Date().getTime());

  const [startingTimeISO, setStartingTimeISO] = useState(
    new Date((currentTime / 1000 - duration) * 1000).toISOString(),
  );

  const updateCurrentTime = useCallback(() => {
    const newCurrentDate = new Date().getTime();
    //In order to always display the same data on the charts over refresh and new entroes comming
    //we round start and end time to frequency factors. Hence for example for a 30 seconds fequency
    //we will rount current time and start time to the previous 30 seconds factor (00, or 30 seconds for each minute)
    const newCurrentTime = newCurrentDate - (newCurrentDate % (frequency * 1000));
    setCurrentTime(newCurrentTime);
    setStartingTimeISO(
      new Date((newCurrentTime / 1000 - duration) * 1000).toISOString(),
    );
  }, [duration, frequency]);

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
      value={{
        startingTimeISO,
        currentTimeISO: new Date(currentTime).toISOString(),
      }}
    >
      {children}
    </StartTimeContext.Provider>
  );
};
export default StartTimeProvider;
