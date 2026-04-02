import * as React from 'react';
import { Building, Users, FileText, Banknote, TrendingUp, Home } from 'lucide-react';
import { StatCard } from '@/components/dashboard/shared/StatCard';

interface LandlordMetrics {
  totalProperties: number;
  totalTenants: number;
  pendingApplications: number;
  totalRentDue: number;
  availableProperties: number;
  occupiedProperties: number;
  monthlyRevenue: number;
}

interface MetricsGridProps {
  metrics: LandlordMetrics;
  loading: boolean;
}

export function MetricsGrid({ metrics, loading }: MetricsGridProps) {
  const format = (n: number) => `R${n.toLocaleString()}`;

  return (
    <div className="space-y-3 mb-6">
      {/* Primary row — always 2 cols on mobile, 4 on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Properties"
          value={metrics.totalProperties}
          icon={Building}
          accentColor="hsl(214,100%,52%)"
          loading={loading}
          index={0}
        />
        <StatCard
          title="Active Tenants"
          value={metrics.totalTenants}
          icon={Users}
          accentColor="hsl(142,72%,38%)"
          loading={loading}
          index={1}
        />
        <StatCard
          title="Pending Applications"
          value={metrics.pendingApplications}
          icon={FileText}
          accentColor="hsl(38,95%,52%)"
          loading={loading}
          index={2}
          urgent={metrics.pendingApplications > 0}
        />
        <StatCard
          title="Total Rent Due"
          value={format(metrics.totalRentDue)}
          icon={Banknote}
          accentColor="hsl(0,75%,54%)"
          loading={loading}
          index={3}
          urgent={metrics.totalRentDue > 0}
        />
      </div>

      {/* Secondary row — 3 cols, collapses to 1 on small screens */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Available Properties"
          value={metrics.availableProperties}
          icon={Home}
          accentColor="hsl(214,100%,52%)"
          loading={loading}
          index={4}
        />
        <StatCard
          title="Occupied Properties"
          value={metrics.occupiedProperties}
          icon={Building}
          accentColor="hsl(142,72%,38%)"
          loading={loading}
          index={5}
        />
        <StatCard
          title="Monthly Revenue"
          value={format(metrics.monthlyRevenue)}
          icon={TrendingUp}
          accentColor="hsl(38,95%,52%)"
          loading={loading}
          index={6}
        />
      </div>
    </div>
  );
}
