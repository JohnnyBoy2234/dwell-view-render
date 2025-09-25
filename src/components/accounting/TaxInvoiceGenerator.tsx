import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { Download, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface LineItem {
  id: string;
  description: string;
  amountExclVat: number;
  vatPercent: number;
  vatAmount: number;
  totalInclVat: number;
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
      }
    ],
    bankName: '',
    accountNumber: '',
    reference: '',
  });

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
    const totalExclVat = invoiceData.lineItems.reduce((sum, item) => sum + item.amountExclVat, 0);
    const totalVat = invoiceData.lineItems.reduce((sum, item) => sum + item.vatAmount, 0);
    const totalInclVat = invoiceData.lineItems.reduce((sum, item) => sum + item.totalInclVat, 0);
    
    return { totalExclVat, totalVat, totalInclVat };
  };

  const generatePDF = async () => {
    // Generate PDF using react-pdf
    const { generateTaxInvoicePDF } = await import('@/components/accounting/PDFGenerator');
    
    await generateTaxInvoicePDF({
      invoiceData,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Generate Tax Invoice</h2>
          <div className="flex items-center mt-2">
            <img 
              src="/favicon-32x32.png" 
              alt="SwiftRent Logo" 
              className="h-6 w-6 mr-2" 
            />
            <span className="text-sm text-muted-foreground">
              SwiftRent.co.za – Safe, Simple, Commission-Free Renting
            </span>
          </div>
        </div>
      </div>

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
                      <div>VAT Amount: {formatCurrency(item.vatAmount)}</div>
                      <div>Total Incl. VAT: {formatCurrency(item.totalInclVat)}</div>
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

          {/* Generate PDF */}
          <Card>
            <CardContent className="pt-6">
              <Button onClick={generatePDF} className="w-full" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Generate PDF Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}