import React, { useEffect } from 'react';
import { MobileServices } from '@/services/mobileServices';
import { useMobile } from '@/hooks/useMobile';
import { useLocation } from 'react-router-dom';

interface MobileStatusBarProps {
  style?: 'light' | 'dark';
  backgroundColor?: string;
}

export function MobileStatusBar({ style = 'light', backgroundColor }: MobileStatusBarProps) {
  const { isNative } = useMobile();
  const location = useLocation();

  useEffect(() => {
    if (!isNative) return;

    const updateStatusBar = async () => {
      try {
        // Set status bar style based on current route or prop
        const isDarkRoute = location.pathname.includes('/auth') || 
                           location.pathname.includes('/kyc') ||
                           location.pathname.includes('/lease');
        
        const statusBarStyle = style === 'dark' || isDarkRoute ? 'dark' : 'light';
        
        if (statusBarStyle === 'dark') {
          await MobileServices.setStatusBarDark();
        } else {
          await MobileServices.setStatusBarLight();
        }

        // Set background color if provided
        if (backgroundColor) {
          await MobileServices.setStatusBarBackground(backgroundColor);
        }
      } catch (error) {
        console.error('Failed to update status bar:', error);
      }
    };

    updateStatusBar();
  }, [isNative, location.pathname, style, backgroundColor]);

  return null; // This component doesn't render anything visible
}