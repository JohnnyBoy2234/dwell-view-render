import React from 'react';
import { LeaseDashboard as LeaseDashboardComponent } from '@/components/lease/LeaseDashboard';

export function LeaseDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LeaseDashboardComponent />
      </div>
    </div>
  );
}