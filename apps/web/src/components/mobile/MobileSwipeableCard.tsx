import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MobileServices } from '@/services/mobileServices';
import { useMobile } from '@/hooks/useMobile';

interface MobileSwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  swipeThreshold?: number;
}

export function MobileSwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  className,
  swipeThreshold = 100 
}: MobileSwipeableCardProps) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { isNative } = useMobile();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isNative) return;
    
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setCurrentX(touch.clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isNative) return;
    
    const touch = e.touches[0];
    setCurrentX(touch.clientX);
    
    if (cardRef.current) {
      const deltaX = touch.clientX - startX;
      cardRef.current.style.transform = `translateX(${deltaX}px)`;
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging || !isNative) return;
    
    const deltaX = currentX - startX;
    
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateX(0px)';
    }
    
    if (Math.abs(deltaX) > swipeThreshold) {
      await MobileServices.vibrateLight();
      
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        'transition-transform duration-200 ease-out',
        isDragging && 'transition-none',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </Card>
  );
}