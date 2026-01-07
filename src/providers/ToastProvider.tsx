import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ToastNotification from '../../components/ToastNotification';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  onPress?: () => void;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [duration, setDuration] = useState(4000);
  const [onPress, setOnPress] = useState<(() => void) | undefined>(undefined);

  const showToast = useCallback(({ message, type = 'info', duration = 4000, onPress }: ToastOptions) => {
    setMessage(message);
    setType(type);
    setDuration(duration);
    setOnPress(() => onPress);
    setVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastNotification
        visible={visible}
        message={message}
        type={type}
        duration={duration}
        onDismiss={hideToast}
        onPress={onPress}
      />
    </ToastContext.Provider>
  );
};
