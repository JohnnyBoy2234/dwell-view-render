import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SmartTransactionInputProps {
  value: string;
  onChange: (value: string) => void;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  vendor?: string;
}

export function SmartTransactionInput({
  value,
  onChange,
  type,
  category,
  amount,
  vendor,
}: SmartTransactionInputProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateDescription = async () => {
    if (!category || !amount) {
      toast({
        title: 'Missing Information',
        description: 'Please select a category and enter an amount first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke('accounting-ai-assistant', {
        body: {
          action: 'suggest-description',
          data: { type, category, amount, vendor },
        },
      });

      if (error) throw error;
      onChange(data.response.trim());
    } catch (error: any) {
      console.error('AI description error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate description',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter description..."
        className="flex-1"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={generateDescription}
        disabled={generating}
        title="Generate AI description"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
