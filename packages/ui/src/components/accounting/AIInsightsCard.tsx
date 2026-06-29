import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIInsightsCardProps {
  rentCollected: number;
  expenses: number;
  netIncome: number;
  categoryBreakdown: { category: string; amount: number }[];
}

export function AIInsightsCard({ rentCollected, expenses, netIncome, categoryBreakdown }: AIInsightsCardProps) {
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateInsights = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('accounting-ai-assistant', {
        body: {
          action: 'insights',
          data: {
            rentCollected,
            expenses,
            netIncome,
            categoryBreakdown: categoryBreakdown.slice(0, 5), // Top 5 categories
          },
        },
      });

      if (error) throw error;
      setInsights(data.response);
    } catch (error: any) {
      console.error('AI insights error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate insights',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Financial Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!insights ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Get AI-powered insights to improve your property profitability
            </p>
            <Button
              onClick={generateInsights}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="prose prose-sm max-w-none">
              <p className="text-sm whitespace-pre-wrap">{insights}</p>
            </div>
            <Button
              onClick={generateInsights}
              disabled={loading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                'Refresh Insights'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
