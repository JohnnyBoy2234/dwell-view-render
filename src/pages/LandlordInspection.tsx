import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Mic, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandlordInspection() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Property Inspection</h1>
        <p className="text-muted-foreground">Capture photos and voice notes for inspections. Media is shared with your tenant.</p>
      </div>

      <Card className="bg-gradient-to-r from-ocean-blue/5 to-success-green/5 border-ocean-blue/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ocean-blue">
            <FileText className="h-5 w-5" />
            Start Inspection
          </CardTitle>
          <CardDescription>Begin a new inspection session for a property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Use your device camera and microphone to document condition.
            </div>
            <Button onClick={() => navigate('/enhancedlandlorddashboard/inspection/start')} className="bg-ocean-blue hover:bg-ocean-blue-dark">
              <Camera className="h-4 w-4 mr-2" />
              Start Inspection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Inspection Guidance
          </CardTitle>
          <CardDescription>Tips to ensure your inspection is complete</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc ml-5 space-y-1">
            <li>Capture wide shots and close-ups of issues</li>
            <li>Add short voice notes to describe context</li>
            <li>Include meters, appliances, walls, floors, and fixtures</li>
            <li>Submit promptly so your tenant can review</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
