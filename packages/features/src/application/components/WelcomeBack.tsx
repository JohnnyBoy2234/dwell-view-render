import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@mzanzihomes/ui/components/alert-dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Progress } from '@mzanzihomes/ui/components/progress';

interface WelcomeBackProps {
  firstName?: string;
  percentage: number;
  lastSectionTitle: string | null;
  lastSavedAt: string | null;
  onContinue: () => void;
  onStartOver: () => Promise<void>;
}

export function WelcomeBack({
  firstName,
  percentage,
  lastSectionTitle,
  lastSavedAt,
  onContinue,
  onStartOver
}: WelcomeBackProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Welcome back{firstName ? `, ${firstName}` : ''}</CardTitle>
        <CardDescription>
          Your rental application is {percentage}% complete.
          {lastSectionTitle ? ` You last completed the ${lastSectionTitle} section.` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Progress value={percentage} />
          {lastSavedAt && (
            <p className="text-xs text-muted-foreground">
              Last saved {new Date(lastSavedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1" onClick={onContinue}>
            Continue where you left off
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(true)}>
            Start over
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start over?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to start over? Your current draft information and uploaded
              documents for this application will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetting}
              onClick={async (e) => {
                e.preventDefault();
                setResetting(true);
                try {
                  await onStartOver();
                  setConfirmOpen(false);
                } finally {
                  setResetting(false);
                }
              }}
            >
              {resetting ? 'Removing…' : 'Yes, start over'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
