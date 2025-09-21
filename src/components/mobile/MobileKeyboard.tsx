import React, { useEffect, useState } from 'react';
import { MobileServices } from '@/services/mobileServices';
import { useMobile } from '@/hooks/useMobile';

interface MobileKeyboardContextType {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
}

export const MobileKeyboardContext = React.createContext<MobileKeyboardContextType>({
  isKeyboardOpen: false,
  keyboardHeight: 0,
});

interface MobileKeyboardProviderProps {
  children: React.ReactNode;
}

export function MobileKeyboardProvider({ children }: MobileKeyboardProviderProps) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { isNative } = useMobile();

  useEffect(() => {
    if (!isNative) return;

    const handleKeyboardShow = (info: any) => {
      setIsKeyboardOpen(true);
      setKeyboardHeight(info.keyboardHeight || 0);
      
      // Add keyboard open class to body for CSS adjustments
      document.body.classList.add('keyboard-open');
    };

    const handleKeyboardHide = () => {
      setIsKeyboardOpen(false);
      setKeyboardHeight(0);
      
      // Remove keyboard open class
      document.body.classList.remove('keyboard-open');
    };

    // Listen for keyboard events
    MobileServices.onKeyboardShow(handleKeyboardShow);
    MobileServices.onKeyboardHide(handleKeyboardHide);

    return () => {
      document.body.classList.remove('keyboard-open');
    };
  }, [isNative]);

  return (
    <MobileKeyboardContext.Provider value={{ isKeyboardOpen, keyboardHeight }}>
      {children}
    </MobileKeyboardContext.Provider>
  );
}

export function useMobileKeyboard() {
  const context = React.useContext(MobileKeyboardContext);
  if (!context) {
    throw new Error('useMobileKeyboard must be used within a MobileKeyboardProvider');
  }
  return context;
}