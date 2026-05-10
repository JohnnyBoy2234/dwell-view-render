import React from 'react';
import { MobileTestRunner } from '@/components/mobile/MobileTestRunner';
import { MobileBackButton } from '@/components/mobile/MobileBackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileTest() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <MobileBackButton fallbackPath="/" />
          <h1 className="text-2xl font-bold">Mobile App Testing</h1>
        </div>

        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This page helps test mobile-specific features of your MzanziHomes app. 
            For full testing, export your project and run it on a physical device or emulator.
          </AlertDescription>
        </Alert>

        {/* Test Runner */}
        <MobileTestRunner />

        {/* Development Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Development & Deployment Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">Local Development</h3>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Export project to GitHub</li>
                  <li>Run <code className="bg-muted px-1 rounded">npm install</code></li>
                  <li>Run <code className="bg-muted px-1 rounded">npm run build</code></li>
                  <li>Run <code className="bg-muted px-1 rounded">npx cap sync</code></li>
                  <li>Run <code className="bg-muted px-1 rounded">npx cap run ios</code> or <code className="bg-muted px-1 rounded">npx cap run android</code></li>
                </ol>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Store Deployment</h3>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Complete all feature tests</li>
                  <li>Update app icons and splash screens</li>
                  <li>Configure app store metadata</li>
                  <li>Test on multiple devices</li>
                  <li>Submit to App Store/Play Store</li>
                </ol>
              </div>
            </div>

            <div className="pt-4 border-t flex gap-2">
              <Button variant="outline" asChild>
                <a 
                  href="https://capacitorjs.com/docs/getting-started" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Capacitor Docs
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a 
                  href="https://developer.apple.com/app-store/review/guidelines/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  App Store Guidelines
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a 
                  href="https://developer.android.com/distribute/console" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Google Play Console
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}