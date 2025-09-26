import { useState } from 'react';

/**
 * Custom hook for managing user type toggle state
 */
export function useUserTypeToggle(initialType: 'tenant' | 'landlord' = 'tenant') {
  const [userType, setUserType] = useState<'tenant' | 'landlord'>(initialType);
  
  const isTenant = userType === 'tenant';
  
  const toggle = () => {
    setUserType(isTenant ? 'landlord' : 'tenant');
  };
  
  return {
    userType,
    isTenant,
    toggle,
  };
}