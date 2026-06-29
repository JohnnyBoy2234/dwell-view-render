// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Flag, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { format } from 'date-fns';

interface PropertyReport {
  id: string;
  property_id: string;
  reporter_id?: string;
  reporter_email?: string;
  issue_type: string;
  description: string;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  properties?: {
    title?: string;
    location: string;
    price: number;
  };
  profiles?: {
    display_name: string;
  };
}

export default function PropertyReports() {
  const [reports, setReports] = useState<PropertyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<PropertyReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      // First get the reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('property_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Then get property and profile data separately
      const reportsWithDetails = await Promise.all(
        (reportsData || []).map(async (report) => {
          // Get property details
          const { data: property } = await supabase
            .from('properties')
            .select('title, location, price')
            .eq('id', report.property_id)
            .single();

          // Get reporter profile if reporter_id exists
          let profile = null;
          if (report.reporter_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', report.reporter_id)
              .single();
            profile = profileData;
          }

          return {
            ...report,
            properties: property,
            profiles: profile,
          };
        })
      );

      setReports(reportsWithDetails as PropertyReport[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load property reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('property_reports')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Report Updated",
        description: `Report marked as ${status}`,
      });
      
      fetchReports();
      setSelectedReport(null);
    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: "Error",
        description: "Failed to update report",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      inappropriate_content: 'Inappropriate Content',
      misleading_info: 'Misleading Information',
      duplicate_listing: 'Duplicate Listing',
      pricing_issue: 'Pricing Issue',
      scam_listing: 'Suspected Scam / Fake Listing',
      fake_listing: 'Fake Listing',
      other: 'Other',
    };
    return labels[type] || type;
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Flag className="h-6 w-6 text-destructive" />
        <h1 className="text-2xl font-bold">Property Reports</h1>
        <Badge variant="secondary">{reports.length} Total</Badge>
      </div>

      <div className="grid gap-4">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Flag className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No property reports found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">
                        {getIssueTypeLabel(report.issue_type)}
                      </CardTitle>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Property: {report.properties?.location} - R{report.properties?.price?.toLocaleString()}/month</p>
                      <p>
                        Reported by: {
                          report.profiles?.display_name || 
                          report.reporter_email || 
                          'Anonymous'
                        }
                      </p>
                      <p>Date: {format(new Date(report.created_at), 'PPpp')}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/property/${report.property_id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Property
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Description:</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {report.description}
                    </p>
                  </div>
                  
                  {report.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => updateReportStatus(report.id, 'resolved')}
                        disabled={updating}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReportStatus(report.id, 'dismissed')}
                        disabled={updating}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                  
                  {report.reviewed_at && (
                    <p className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Reviewed on {format(new Date(report.reviewed_at), 'PPpp')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}