import React from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  // ID verification has been removed from the auth flow; allow access and rely on route-level auth elsewhere.
  return <>{children}</>;
}
