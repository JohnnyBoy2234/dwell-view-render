import { useNavigate } from "react-router-dom";
import { useCallback } from "react";

/**
 * Custom hook for property navigation handling
 * Provides consistent navigation behavior with keyboard support
 */
export function usePropertyNavigation(propertyId: string) {
  const navigate = useNavigate();

  const navigateToProperty = useCallback(() => {
    navigate(`/property/${propertyId}`);
  }, [navigate, propertyId]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateToProperty();
    }
  }, [navigateToProperty]);

  return {
    navigateToProperty,
    handleKeyDown,
  };
}