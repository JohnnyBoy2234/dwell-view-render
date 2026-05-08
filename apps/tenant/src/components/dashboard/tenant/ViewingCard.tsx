import * as React from 'react';
import { Eye, Calendar, ArrowRight, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface ViewingCardProps {
  upcomingViewings: Array<{
    id: string;
    start_time: string;
    end_time: string;
    properties: {
      title: string;
      location: string;
    };
  }>;
}

export function ViewingCard({ upcomingViewings }: ViewingCardProps) {
  const navigate = useNavigate();

  const nextViewing = upcomingViewings[0];

  return (
    <Card className="hover-scale cursor-pointer shadow-medium border-ocean-blue/20 bg-gradient-to-br from-white to-earth-warm/20 animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5 text-earth-warm" />
          Property Viewings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextViewing && nextViewing.properties ? (
          <>
            <div className="p-3 bg-gradient-to-r from-background to-earth-light/40 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  Next Viewing
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(nextViewing.start_time), 'MMM dd')}
                </span>
              </div>
              <h4 className="font-semibold text-sm truncate">
                {nextViewing.properties?.title || 'Property Title'}
              </h4>
              <p className="text-xs text-muted-foreground truncate">
                {nextViewing.properties?.location || 'Location'}
              </p>
              <p className="text-xs text-earth-warm font-medium mt-1">
                {format(new Date(nextViewing.start_time), 'h:mm a')} - {format(new Date(nextViewing.end_time), 'h:mm a')}
              </p>
            </div>

            {upcomingViewings.length > 1 && (
              <p className="text-xs text-muted-foreground">
                +{upcomingViewings.length - 1} more viewing{upcomingViewings.length - 1 > 1 ? 's' : ''}
              </p>
            )}

            <Button 
              variant="ghost" 
              size="sm"
              className="w-full text-earth-warm hover:bg-earth-warm/10"
              onClick={() => navigate('/tenant/viewings')}
            >
              View All Viewings
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <Calendar className="h-12 w-12 text-earth-warm mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No upcoming viewings</p>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-earth-warm hover:bg-earth-warm/10"
              onClick={() => navigate('/properties')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Browse Properties
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}