import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type GuardianDrawerContextValue = {
  isOpen: boolean;
  toggle: () => void;
};

const GuardianDrawerContext = createContext<GuardianDrawerContextValue>({
  isOpen: false,
  toggle: () => {},
});

export const GuardianDrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const value = useMemo(() => ({ isOpen, toggle }), [isOpen, toggle]);

  return (
    <GuardianDrawerContext.Provider value={value}>
      {children}
    </GuardianDrawerContext.Provider>
  );
};

export const useGuardianDrawer = () => useContext(GuardianDrawerContext);
