import React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@mzanzihomes/common/lib/utils";
import type { UserTypeData } from '@mzanzihomes/common/constants/howItWorksConstants';

interface UserTypeCardProps {
  data: UserTypeData;
  colors: string[];
  type: 'tenant' | 'landlord';
}

/**
 * User type card component for displaying tenant or landlord process steps
 * Shows header, process steps with icons, and call-to-action
 */
export function UserTypeCard({ data, colors, type }: UserTypeCardProps) {
  const IconComponent = data.header.icon;
  
  const cardClassName = cn(
    "shadow-strong overflow-hidden transition-all duration-500 animate-fade-in border-opacity-20",
    type === 'tenant' 
      ? "border-ocean-blue/20 bg-gradient-to-br from-white via-white to-ocean-blue/5"
      : "border-success-green/20 bg-gradient-to-br from-white via-white to-success-green/5"
  );

  const headerClassName = cn(
    "pb-6",
    type === 'tenant'
      ? "bg-gradient-to-r from-ocean-blue/5 to-ocean-blue/0"
      : "bg-gradient-to-r from-success-green/5 to-success-green/0"
  );

  const iconContainerClassName = cn(
    "shadow-soft flex h-10 w-10 items-center justify-center rounded-2xl sm:h-12 sm:w-12",
    type === 'tenant'
      ? "bg-gradient-to-br from-ocean-blue to-ocean-blue-light"
      : "bg-gradient-to-br from-success-green to-success-green-glow"
  );

  const titleClassName = cn(
    "text-xl sm:text-2xl",
    type === 'tenant' ? "text-ocean-blue-dark" : "text-success-green-dark"
  );

  const ctaButtonClassName = cn(
    "w-full text-white shadow-soft text-sm",
    type === 'tenant'
      ? "bg-ocean-blue hover:bg-ocean-blue-dark"
      : "bg-success-green hover:bg-success-green-dark"
  );

  return (
    <Card className={cardClassName}>
      <CardHeader className={headerClassName}>
        <div className="mb-2 flex items-center gap-3">
          <div className={iconContainerClassName}>
            <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <CardTitle className={titleClassName}>
              {data.header.title}
            </CardTitle>
            <Badge variant="outline" className="mt-1 text-xs">
              {data.header.subtitle}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-foreground sm:text-base">
          {data.header.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {data.steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <div className="flex gap-3" key={index}>
              <div
                className={cn(
                  "shadow-soft flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br",
                  colors[index]
                )}
              >
                <StepIcon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-base font-semibold sm:text-lg">
                  {step.title}
                </h3>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {step.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {step.badges.map((badge, i) => (
                    <Badge variant="secondary" className="text-xs" key={i}>
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <div className="border-t pt-3">
          <Link to={data.cta.link}>
            <Button className={ctaButtonClassName}>
              {data.cta.text}
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}