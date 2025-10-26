/* TEMPORARILY DISABLED - Inspection feature not available
 * This page uses inspection tables that don't exist in the database yet
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function TenantInspection() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Inspection Feature Not Available</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            The inspection feature is currently disabled. Database tables need to be created first.
            Please contact support to enable this feature.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
