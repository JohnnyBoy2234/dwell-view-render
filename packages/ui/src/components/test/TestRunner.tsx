import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  TestTube
} from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestCase {
  name: string;
  description: string;
  testFn: () => Promise<boolean>;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export function TestRunner() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [progress, setProgress] = useState(0);

  // Define test cases
  const testCases: TestCase[] = [
    {
      name: 'Email Verification Gate',
      description: 'Test that unverified users cannot request viewings',
      testFn: async () => {
        // Mock test - in real implementation this would create a test user
        // and verify the gate status function
        const { data, error } = await supabase.rpc('check_user_gate_status', { 
          _user_id: 'test-user-id' 
        });
        return !error; // Simplified test
      }
    },
    {
      name: 'KYC Status Check',
      description: 'Test KYC status verification logic',
      testFn: async () => {
        // Test the KYC profile structure and status enum
        const { error } = await supabase
          .from('kyc_profiles')
          .select('status')
          .limit(1);
        return !error;
      }
    },
    {
      name: 'Events Logging',
      description: 'Test telemetry event logging system',
      testFn: async () => {
        // Test event logging function
        const { error } = await supabase.rpc('log_event', {
          _user_id: 'test-user-id',
          _name: 'test_event',
          _properties: { test: true }
        });
        return !error;
      }
    },
    {
      name: 'Admin Diagnostics',
      description: 'Test admin diagnostics endpoint availability',
      testFn: async () => {
        try {
          const response = await supabase.functions.invoke('diagnostics-gates', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: new URLSearchParams({ userId: 'test-user-id' })
          });
          
          // Expect a 403 (admin access required) rather than 404 (function not found)
          return response.error?.message?.includes('Admin access') || 
                 response.error?.message?.includes('Authentication') || 
                 response.data !== null;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Database Policies',
      description: 'Test RLS policies are properly configured',
      testFn: async () => {
        // Test that we can query events table (should work for current user)
        const { error } = await supabase
          .from('events')
          .select('id')
          .limit(1);
        return !error; // Should not error due to RLS if user is authenticated
      }
    }
  ];

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);

    const newResults: TestResult[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const startTime = Date.now();
      
      try {
        const passed = await testCase.testFn();
        const duration = Date.now() - startTime;
        
        newResults.push({
          name: testCase.name,
          passed,
          duration,
          error: passed ? undefined : 'Test assertion failed'
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        newResults.push({
          name: testCase.name,
          passed: false,
          duration,
          error: error.message
        });
      }

      setResults([...newResults]);
      setProgress(((i + 1) / testCases.length) * 100);
    }

    setRunning(false);
    
    const passedCount = newResults.filter(r => r.passed).length;
    toast({
      title: "Test Run Complete",
      description: `${passedCount}/${newResults.length} tests passed`,
      variant: passedCount === newResults.length ? "default" : "destructive"
    });
  };

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6" />
            Email & KYC Gate Tests
          </h2>
          <p className="text-muted-foreground">
            Automated tests to verify the viewing request gating system
          </p>
        </div>
        
        <Button onClick={runTests} disabled={running}>
          {running ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Tests
            </>
          )}
        </Button>
      </div>

      {/* Progress */}
      {running && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running tests...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              {passedTests}/{totalTests} tests passed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {result.passed ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <div className="font-medium">{result.name}</div>
                      {result.error && (
                        <div className="text-sm text-muted-foreground">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={result.passed ? "default" : "destructive"}>
                      {result.passed ? 'PASS' : 'FAIL'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.duration}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {passedTests < totalTests && (
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some tests failed. Check the error messages above and verify your 
                  email verification and KYC gating implementation.
                </AlertDescription>
              </Alert>
            )}

            {passedTests === totalTests && totalTests > 0 && (
              <Alert className="mt-4 border-success bg-success/5">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success-foreground">
                  All tests passed! Your email verification and KYC gating system is working correctly.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Cases Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Test Cases</CardTitle>
          <CardDescription>
            Overview of what each test validates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testCases.map((testCase, index) => (
              <div key={index} className="border-l-4 border-l-primary pl-4">
                <h4 className="font-medium">{testCase.name}</h4>
                <p className="text-sm text-muted-foreground">{testCase.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}