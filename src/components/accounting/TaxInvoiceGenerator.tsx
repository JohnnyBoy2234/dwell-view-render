import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { Download, Plus, Trash2, Send, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AccountingNav } from './AccountingNav';
import { PROPERTY_CARD_STYLES } from '@/constants/propertyCardConstants';

interface LineItem {
  id: string;
  description: string;
  amountExclVat: number;
  vatPercent: number;
  vatAmount: number;
  totalInclVat: number;
  type?: 'charge' | 'expense';
}

interface InvoiceData {
  landlordName: string;
  landlordAddress: string;
  landlordVatReg: string;
  tenantName: string;
  tenantAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  propertyAddress: string;
  lineItems: LineItem[];
  bankName: string;
  accountNumber: string;
  reference: string;
}

export function TaxInvoiceGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    landlordName: '',
    landlordAddress: '',
    landlordVatReg: '',
    tenantName: '',
    tenantAddress: '',
    invoiceNumber: `INV-${format(new Date(), 'yyyyMMdd')}-001`,
    invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    propertyAddress: '',
    lineItems: [
      {
        id: '1',
        description: `Monthly Rental – ${format(new Date(), 'MMMM yyyy')}`,
        amountExclVat: 0,
        vatPercent: 0,
        vatAmount: 0,
        totalInclVat: 0,
        type: 'charge',
      }
    ],
    bankName: '',
    accountNumber: '',
    reference: '',
  });

  // Autofill landlord and tenant details from recent tenancy/profile
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        if (!user) return;
        
        // Get landlord profile details
        const { data: landlordProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        // Try get an active tenancy for tenant details and property
        const { data: tenancy } = await supabase
          .from('tenancies')
          .select('id, tenant_id, property_id')
          .eq('landlord_id', user.id)
          .eq('status', 'active')
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        let tenantName = '';
        let propertyAddress = '';
        if (tenancy) {
          const [{ data: tenantProfile }, { data: property }] = await Promise.all([
            supabase.from('profiles').select('display_name').eq('user_id', tenancy.tenant_id).maybeSingle(),
            supabase.from('properties').select('title,location').eq('id', tenancy.property_id).maybeSingle(),
          ]);
          tenantName = tenantProfile?.display_name || '';
          propertyAddress = property?.title || property?.location || '';
        }
        
        setInvoiceData(prev => ({
          ...prev,
          landlordName: landlordProfile?.display_name || prev.landlordName,
          tenantName: tenantName || prev.tenantName,
          propertyAddress: propertyAddress || prev.propertyAddress,
        }));
      } catch (e) {
        // Silent fail; user can fill manually
        console.log('TaxInvoice autofill skipped:', e);
      }
    };
    void loadDefaults();
  }, [user?.id]);

  const calculateLineItem = (item: LineItem, field: string, value: number): LineItem => {
    const updatedItem = { ...item };
    
    if (field === 'amountExclVat') {
      updatedItem.amountExclVat = value;
      updatedItem.vatAmount = (value * updatedItem.vatPercent) / 100;
      updatedItem.totalInclVat = value + updatedItem.vatAmount;
    } else if (field === 'vatPercent') {
      updatedItem.vatPercent = value;
      updatedItem.vatAmount = (updatedItem.amountExclVat * value) / 100;
      updatedItem.totalInclVat = updatedItem.amountExclVat + updatedItem.vatAmount;
    }
    
    return updatedItem;
  };

  const updateLineItem = (id: string, field: string, value: string | number) => {
    setInvoiceData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id === id) {
          if (field === 'description') {
            return { ...item, description: value as string };
          } else {
            return calculateLineItem(item, field, value as number);
          }
        }
        return item;
      })
    }));
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      amountExclVat: 0,
      vatPercent: 15,
      vatAmount: 0,
      totalInclVat: 0,
      type: 'charge',
    };
    setInvoiceData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));
  };

  const removeLineItem = (id: string) => {
    setInvoiceData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }));
  };

  const calculateTotals = () => {
    const totalExclVat = invoiceData.lineItems.reduce((sum, item) => {
      const sign = item.type === 'expense' ? -1 : 1;
      return sum + sign * (item.amountExclVat || 0);
    }, 0);
    const totalVat = invoiceData.lineItems.reduce((sum, item) => {
      const sign = item.type === 'expense' ? -1 : 1;
      return sum + sign * (item.vatAmount || 0);
    }, 0);
    const totalInclVat = invoiceData.lineItems.reduce((sum, item) => {
      const sign = item.type === 'expense' ? -1 : 1;
      return sum + sign * (item.totalInclVat || 0);
    }, 0);
    return { totalExclVat, totalVat, totalInclVat };
  };

  const generatePDF = async () => {
    // Generate PDF using react-pdf
    const { generateTaxInvoicePDF } = await import('@/components/accounting/PDFGenerator');
    // Adjust line items: expenses become negative in PDF display
    const adjustedItems = invoiceData.lineItems.map((it) =>
      it.type === 'expense'
        ? { ...it, amountExclVat: -Math.abs(it.amountExclVat || 0), vatAmount: -Math.abs(it.vatAmount || 0), totalInclVat: -Math.abs(it.totalInclVat || 0) }
        : it
    );
    await generateTaxInvoicePDF({
      invoiceData: { ...invoiceData, lineItems: adjustedItems as any },
      totals,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totals = calculateTotals();

  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/enhancedlandlorddashboard');
  };

  // Handle add income/expense from nav
  const handleAddIncome = () => {
    navigate('/dashboard/accounting', { state: { showIncomeModal: true } });
  };

  const handleAddExpense = () => {
    navigate('/dashboard/accounting', { state: { showExpenseModal: true } });
  };

  // Override the back button in the header to go to management tools
  useEffect(() => {
    const handleBackButton = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleBackButton);
    return () => {
      window.removeEventListener('keydown', handleBackButton);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Subtitle and Content Card */}
      <Card className={PROPERTY_CARD_STYLES.CARD}>
        <div className="p-6 space-y-4">
          {/* Subtitle */}
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl font-normal text-black dark:text-white">Tax Invoice</h2>
            <p className="text-black/80 dark:text-white/80">Create and manage tax invoices</p>
          </div>
          
          {/* Navigation */}
          <AccountingNav 
            onAddIncome={handleAddIncome}
            onAddExpense={handleAddExpense}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Invoice Details */}
        <div className="space-y-6">
          {/* Landlord Details */}
          <Card>
            <CardHeader>
              <CardTitle>Landlord Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="landlordName">Name</Label>
                <Input
                  id="landlordName"
                  value={invoiceData.landlordName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, landlordName: e.target.value }))}
                  placeholder="Enter landlord name"
                />
              </div>
              <div>
                <Label htmlFor="landlordAddress">Address</Label>
                <Textarea
                  id="landlordAddress"
                  value={invoiceData.landlordAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, landlordAddress: e.target.value }))}
                  placeholder="Enter landlord address"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="landlordVatReg">VAT Registration Number (Optional)</Label>
                <Input
                  id="landlordVatReg"
                  value={invoiceData.landlordVatReg}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, landlordVatReg: e.target.value }))}
                  placeholder="VAT registration number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tenant Details */}
          <Card>
            <CardHeader>
              <CardTitle>Tenant Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tenantName">Name</Label>
                <Input
                  id="tenantName"
                  value={invoiceData.tenantName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, tenantName: e.target.value }))}
                  placeholder="Enter tenant name"
                />
              </div>
              <div>
                <Label htmlFor="tenantAddress">Address</Label>
                <Textarea
                  id="tenantAddress"
                  value={invoiceData.tenantAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, tenantAddress: e.target.value }))}
                  placeholder="Enter tenant address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceData.invoiceNumber}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="invoiceDate">Date</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="propertyAddress">Property Address</Label>
                <Input
                  id="propertyAddress"
                  value={invoiceData.propertyAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, propertyAddress: e.target.value }))}
                  placeholder="Enter property address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={invoiceData.bankName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="Enter bank name"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={invoiceData.accountNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="Enter account number"
                />
              </div>
              <div>
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={invoiceData.reference}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Payment reference"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Line Items */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button onClick={addLineItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoiceData.lineItems.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Item {index + 1}</span>
                      {invoiceData.lineItems.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeLineItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Enter description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Type</Label>
                        <select
                          className="w-full border rounded h-10 px-2 text-sm"
                          value={item.type || 'charge'}
                          onChange={(e) => updateLineItem(item.id, 'type', e.target.value as 'charge' | 'expense')}
                        >
                          <option value="charge">Charge</option>
                          <option value="expense">Expense/Credit</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Amount (Excl. VAT)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.amountExclVat || ''}
                          onChange={(e) => updateLineItem(item.id, 'amountExclVat', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>VAT %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={item.vatPercent}
                          onChange={(e) => updateLineItem(item.id, 'vatPercent', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <div>VAT Amount: {formatCurrency((item.type === 'expense' ? -1 : 1) * (item.vatAmount || 0))}</div>
                      <div>Total Incl. VAT: {formatCurrency((item.type === 'expense' ? -1 : 1) * (item.totalInclVat || 0))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal (Excl. VAT):</span>
                  <span className="font-medium">{formatCurrency(totals.totalExclVat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT:</span>
                  <span className="font-medium">{formatCurrency(totals.totalVat)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total (Incl. VAT):</span>
                  <span>{formatCurrency(totals.totalInclVat)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate / Send PDF */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button onClick={generatePDF} size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF Invoice
                </Button>
                <Button variant="outline" size="lg" onClick={async () => {
                  try {
                    const { generateTaxInvoicePDF } = await import('@/components/accounting/PDFGenerator');
                    const adjustedItems = invoiceData.lineItems.map((it) =>
                      it.type === 'expense'
                        ? { ...it, amountExclVat: -Math.abs(it.amountExclVat || 0), vatAmount: -Math.abs(it.vatAmount || 0), totalInclVat: -Math.abs(it.totalInclVat || 0) }
                        : it
                    );
                    const result = await generateTaxInvoicePDF({ invoiceData: { ...invoiceData, lineItems: adjustedItems as any }, totals });
                    if (!result?.blob) return;
                    // Resolve tenant id by display name (basic heuristic); in production, prefer explicit selection
                    const { data: prof } = await supabase
                      .from('profiles')
                      .select('user_id')
                      .ilike('display_name', invoiceData.tenantName)
                      .limit(1)
                      .maybeSingle();
                    const tenantId = prof?.user_id;
                    if (!tenantId) {
                      toast({ variant: 'destructive', title: 'Tenant not found', description: 'Please ensure the tenant profile exists and name matches.' });
                      return;
                    }
                    const path = `invoices/${tenantId}/${result.filename}`;
                    const upload = await supabase.storage.from('income-documents').upload(path, result.blob, { upsert: true, contentType: 'application/pdf' });
                    if (upload.error) throw upload.error;
                    await supabase.from('documents').insert({ user_id: tenantId, document_type: 'invoice', file_path: `income-documents/${path}`, file_type: 'application/pdf', status: 'uploaded' });
                    const { error: fnErr } = await supabase.functions.invoke('send-invoice-to-tenant', { body: { tenant_id: tenantId, property_id: '', filename: result.filename, file_path: `income-documents/${path}` } });
                    if (fnErr) throw fnErr;
                    toast({ title: 'Invoice sent to tenant', description: 'Email sent and document added to Proof of Payments.' });
                  } catch (e: any) {
                    toast({ variant: 'destructive', title: 'Failed to send invoice', description: e?.message || 'Please try again.' });
                  }
                }}>
                  <Send className="w-4 h-4 mr-2" />
                  Send to Tenant
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}