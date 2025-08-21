import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient?: string;
  textColor?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  gradient = 'bg-gradient-to-br from-white to-ocean-blue/20',
  textColor = 'text-ocean-blue',
  loading = false,
  onClick
}: StatCardProps) {
  return (
    <Card 
      className={`hover-scale shadow-medium border-ocean-blue/20 ${gradient} animate-fade-in transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
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
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}