import React, { ReactNode, createContext, useState } from 'react';
import {
  Toast,
  ToastProps,
} from '@scality/core-ui/dist/components/toast/Toast.component';

type ToastContextState = Omit<ToastProps, 'onClose'>;

export interface ToastContextType {
  showToast: (toastProps: ToastContextState) => void;
}

if (!window.shellContexts) {
  //@ts-ignore
  window.shellContexts = {};
}
if (!window.shellContexts.ToastContext) {
  window.shellContexts.ToastContext = createContext<
    ToastContextType | undefined
  >(undefined);
}

export const ToastContext = window.shellContexts.ToastContext;

interface ToastProviderProps {
  children: ReactNode;
}

const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toastProps, setToastProps] = useState<ToastContextState | null>(null);

  const showToast = (toastProps: ToastContextState) => {
    setToastProps(toastProps);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastProps && (
        <Toast {...toastProps} onClose={() => setToastProps(null)} />
      )}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
