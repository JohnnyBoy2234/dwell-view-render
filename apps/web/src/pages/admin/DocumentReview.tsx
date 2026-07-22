import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@mzanzihomes/ui/components/dialog';
import { Label } from '@mzanzihomes/ui/components/label';
import { Eye, CheckCircle, XCircle, Clock, FileText, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@mzanzihomes/ui/components/skeleton';

export default function DocumentReview() {
  const documents: any[] = [];
  const loading = false;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-success-green" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-earth-warm" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success-green-light text-success-green border-success-green/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'pending':
        return 'bg-earth-light text-earth-warm border-earth-warm/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };


  const getDocumentIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Document Review</h1>
            <p className="text-muted-foreground">
              Review and approve user uploaded documents
            </p>
          </div>

          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Review</h1>
          <p className="text-muted-foreground">
            Review and approve user uploaded documents
          </p>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Document Review Disabled</h3>
            <p className="text-muted-foreground">
              Document verification has been removed from the application flow.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}