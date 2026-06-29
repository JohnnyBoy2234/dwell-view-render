import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Switch } from '@mzanzihomes/ui/components/switch';
import { useUserProperties } from '@/hooks/useUserProperties';
import { WizardIncomeData, INCOME_CATEGORIES, calculateVATExclusive, calculateVATInclusive } from '@mzanzihomes/common/types/accounting';
import { format } from 'date-fns';

interface IncomeStepProps {
  initialData: WizardIncomeData | null;
  onComplete: (data: WizardIncomeData) => void;
  onSkip: () => void;
}

export function IncomeStep({ initialData, onComplete, onSkip }: IncomeStepProps) {
  const { properties } = useUserProperties();
  
  const [formData, setFormData] = useState<WizardIncomeData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    vatPercent: 0,
    isVATInclusive: true,
    category: '',
    property_id: null,
    vendor: '',
    description: '',
    ...initialData
  });

  const [vatExclusive, setVatExclusive] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);

  // Calculate VAT amounts when form data changes
  useEffect(() => {
    if (formData.amount && formData.vatPercent) {
      if (formData.isVATInclusive) {
        const exclusive = calculateVATExclusive(formData.amount, formData.vatPercent);
        setVatExclusive(exclusive);
        setVatAmount(formData.amount - exclusive);
      } else {
        const inclusive = calculateVATInclusive(formData.amount, formData.vatPercent);
        setVatExclusive(formData.amount);
        setVatAmount(inclusive - formData.amount);
      }
    } else {
      setVatExclusive(formData.amount);
      setVatAmount(0);
    }
  }, [formData.amount, formData.vatPercent, formData.isVATInclusive]);

  const handleInputChange = (field: keyof WizardIncomeData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || formData.amount <= 0) {
      return;
    }
    onComplete(formData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const finalAmount = formData.isVATInclusive 
    ? formData.amount 
    : calculateVATInclusive(formData.amount, formData.vatPercent);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Income Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>

              {/* VAT Inclusive/Exclusive Toggle */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label>Amount Entry Type</Label>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${!formData.isVATInclusive ? 'font-medium' : 'text-muted-foreground'}`}>
                      VAT Exclusive
                    </span>
                    <Switch
                      checked={formData.isVATInclusive}
                      onCheckedChange={(checked) => handleInputChange('isVATInclusive', checked)}
                    />
                    <span className={`text-sm ${formData.isVATInclusive ? 'font-medium' : 'text-muted-foreground'}`}>
                      VAT Inclusive
                    </span>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Amount ({formData.isVATInclusive ? 'VAT Inclusive' : 'VAT Exclusive'}) (ZAR)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount || ''}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                {/* VAT Percentage */}
                <div className="space-y-2">
                  <Label htmlFor="vat">VAT %</Label>
                  <Input
                    id="vat"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.vatPercent}
                    onChange={(e) => handleInputChange('vatPercent', parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* VAT Breakdown */}
                {formData.vatPercent > 0 && formData.amount > 0 && (
                  <div className="space-y-2 text-sm bg-muted p-3 rounded">
                    <div className="flex justify-between">
                      <span>VAT Exclusive Amount:</span>
                      <span className="font-medium">{formatCurrency(vatExclusive)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT Amount ({formData.vatPercent}%):</span>
                      <span className="font-medium">{formatCurrency(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">VAT Inclusive Total:</span>
                      <span className="font-bold">{formatCurrency(finalAmount)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Property */}
              <div className="space-y-2">
                <Label htmlFor="property">Property</Label>
                <Select value={formData.property_id || 'none'} onValueChange={(value) => handleInputChange('property_id', value === 'none' ? null : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Property</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor */}
              <div className="space-y-2">
                <Label htmlFor="vendor">Source/Payer</Label>
                <Input
                  id="vendor"
                  value={formData.vendor || ''}
                  onChange={(e) => handleInputChange('vendor', e.target.value)}
                  placeholder="Enter payer name"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <div className="flex space-x-4">
                <Button type="submit" className="flex-1" disabled={!formData.category || formData.amount <= 0}>
                  Save Income & Continue
                </Button>
                <Button type="button" variant="outline" onClick={onSkip}>
                  Skip Income
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Income Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date:</span>
                <span>{formData.date || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category:</span>
                <span>{formData.category || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-success-green">
                  {formData.amount > 0 ? formatCurrency(finalAmount) : '-'}
                </span>
              </div>
              {formData.property_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Property:</span>
                  <span>{properties.find(p => p.id === formData.property_id)?.title || '-'}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}