import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Smartphone, 
  Camera, 
  MapPin, 
  Bell,
  Fingerprint,
  Wifi
} from 'lucide-react';
import { MobileServices } from '@/services/mobileServices';
import { useMobile } from '@/hooks/useMobile';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  icon: React.ReactNode;
}

export function MobileTestRunner() {
  const { isNative, platform } = useMobile();
  const [isRunning, setIsRunning] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Platform Detection', status: 'pending', icon: <Smartphone className="h-4 w-4" /> },
    { name: 'Camera Access', status: 'pending', icon: <Camera className="h-4 w-4" /> },
    { name: 'Location Services', status: 'pending', icon: <MapPin className="h-4 w-4" /> },
    { name: 'Push Notifications', status: 'pending', icon: <Bell className="h-4 w-4" /> },
    { name: 'Biometric Auth', status: 'pending', icon: <Fingerprint className="h-4 w-4" /> },
    { name: 'Network Status', status: 'pending', icon: <Wifi className="h-4 w-4" /> },
  ]);

  const updateTestStatus = (index: number, status: TestResult['status'], message?: string) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message } : test
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    
    // Test 1: Platform Detection
    updateTestStatus(0, 'running');
    await new Promise(resolve => setTimeout(resolve, 500));
    updateTestStatus(0, isNative ? 'passed' : 'failed', 
      isNative ? `Running on ${platform}` : 'Not running on native platform');

    if (!isNative) {
      setIsRunning(false);
      toast.error('Tests can only run on native mobile platforms');
      return;
    }

    // Test 2: Camera Access
    updateTestStatus(1, 'running');
    try {
      const permissions = await MobileServices.requestCameraPermissions();
      updateTestStatus(1, permissions ? 'passed' : 'failed', 
        permissions ? 'Camera permissions granted' : 'Camera permissions denied');
    } catch (error) {
      updateTestStatus(1, 'failed', 'Camera test failed');
    }

    // Test 3: Location Services
    updateTestStatus(2, 'running');
    try {
      const location = await MobileServices.getCurrentLocation();
      updateTestStatus(2, location.success ? 'passed' : 'failed',
        location.success ? 'Location access working' : 'Location access failed');
    } catch (error) {
      updateTestStatus(2, 'failed', 'Location test failed');
    }

    // Test 4: Push Notifications
    updateTestStatus(3, 'running');
    try {
      const pushResult = await MobileServices.requestNotificationPermissions();
      updateTestStatus(3, pushResult ? 'passed' : 'failed',
        pushResult ? 'Push notifications enabled' : 'Push notifications disabled');
    } catch (error) {
      updateTestStatus(3, 'failed', 'Push notification test failed');
    }

    // Test 5: Biometric Auth
    updateTestStatus(4, 'running');
    try {
      const biometricAvailable = await MobileServices.isBiometricAvailable();
      updateTestStatus(4, biometricAvailable ? 'passed' : 'failed',
        biometricAvailable ? 'Biometric authentication available' : 'Biometric not available');
    } catch (error) {
      updateTestStatus(4, 'failed', 'Biometric test failed');
    }

    // Test 6: Network Status
    updateTestStatus(5, 'running');
    try {
      const networkStatus = await MobileServices.getNetworkStatus();
      updateTestStatus(5, 'passed', 
        `Network: ${networkStatus.connected ? 'Connected' : 'Disconnected'} (${networkStatus.connectionType})`);
    } catch (error) {
      updateTestStatus(5, 'failed', 'Network test failed');
    }

    setIsRunning(false);
    toast.success('Mobile feature tests completed');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      passed: 'default',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status]} className="ml-auto">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Mobile Feature Tests
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running Tests
              </>
            ) : (
              'Run Tests'
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isNative && (
          <Alert>
            <AlertDescription>
              Mobile tests can only be run on native iOS or Android platforms. 
              Export your project and run `npx cap run ios` or `npx cap run android` to test on a device.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {tests.map((test, index) => (
            <div key={test.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {test.icon}
                <div>
                  <div className="font-medium">{test.name}</div>
                  {test.message && (
                    <div className="text-sm text-muted-foreground">{test.message}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(test.status)}
                {getStatusBadge(test.status)}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <strong>Platform:</strong> {platform} | <strong>Native:</strong> {isNative ? 'Yes' : 'No'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}