import * as React from 'react';
import { Building, Users, FileText, DollarSign, TrendingUp, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  gradient, 
  textColor,
  loading 
}: { 
  title: string;
  value: string | number;
  icon: any;
  gradient: string;
  textColor: string;
  loading: boolean;
}) => (
  <Card className={`hover-scale shadow-medium border-ocean-blue/20 ${gradient} animate-fade-in`}>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center justify-between text-sm font-medium">
        <span className="text-muted-foreground">{title}</span>
        <Icon className={`h-5 w-5 ${textColor}`} />
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="h-8 bg-muted animate-pulse rounded" />
      ) : (
        <div className={`text-2xl font-bold ${textColor}`}>
          {typeof value === 'number' && title.includes('Rent') 
            ? `R${value.toLocaleString()}` 
            : value}
        </div>
      )}
    </CardContent>
  </Card>
);

export function MetricsGrid({ metrics, loading }: MetricsGridProps) {
  const metricCards = [
    {
      title: 'Total Properties',
      value: metrics.totalProperties,
      icon: Building,
      gradient: 'bg-gradient-to-br from-white to-ocean-blue/20',
      textColor: 'text-ocean-blue',
    },
    {
      title: 'Active Tenants',
      value: metrics.totalTenants,
      icon: Users,
      gradient: 'bg-gradient-to-br from-white to-success-green/20',
      textColor: 'text-success-green',
    },
    {
      title: 'Pending Applications',
      value: metrics.pendingApplications,
      icon: FileText,
      gradient: 'bg-gradient-to-br from-white to-earth-warm/20',
      textColor: 'text-earth-warm',
    },
    {
      title: 'Total Rent Due',
      value: metrics.totalRentDue,
      icon: DollarSign,
      gradient: 'bg-gradient-to-br from-white to-destructive/20',
      textColor: 'text-destructive',
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metricCards.map((metric) => (
        <MetricCard key={metric.title} {...metric} loading={loading} />
      ))}
      
      {/* Additional metrics row for larger screens */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:col-span-4 gap-4 mt-4">
        <MetricCard 
          title="Available Properties"
          value={metrics.availableProperties}
          icon={Home}
          gradient="bg-gradient-to-br from-white to-ocean-blue/10"
          textColor="text-ocean-blue"
          loading={loading}
        />
        <MetricCard 
          title="Occupied Properties"
          value={metrics.occupiedProperties}
          icon={Building}
          gradient="bg-gradient-to-br from-white to-success-green/10"
          textColor="text-success-green"
          loading={loading}
        />
        <MetricCard 
          title="Monthly Revenue"
          value={metrics.monthlyRevenue}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-white to-earth-warm/10"
          textColor="text-earth-warm"
          loading={loading}
        />
      </div>
    </div>
  );
}