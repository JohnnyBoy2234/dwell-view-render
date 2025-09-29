import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 24,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottom: '2 solid #0ea5e9',
    paddingBottom: 15,
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0ea5e9',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottom: '1 solid #d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderBottom: '0.5 solid #e5e7eb',
  },
  tableCell: {
    fontSize: 10,
    flex: 1,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
  },
  tableCellRight: {
    fontSize: 10,
    flex: 1,
    textAlign: 'right',
  },
  total: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '2 solid #374151',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 24,
    right: 24,
    textAlign: 'center',
    fontSize: 10,
    color: '#6b7280',
  },
});

interface ExpenseTransaction {
  id: string;
  date: string;
  property_title?: string;
  vendor?: string;
  category: string;
  amount: number;
  vat_percent: number;
  billable: boolean;
  description?: string;
}

interface ExpenseSummaryPDFProps {
  month: string;
  landlordDetails: {
    name: string;
    idNumber: string;
    contact: string;
    address: string;
  };
  transactions: ExpenseTransaction[];
  categoryTotals: Record<string, number>;
  grandTotal: number;
}

// Expense Summary PDF Document
const ExpenseSummaryPDF: React.FC<ExpenseSummaryPDFProps> = ({
  month,
  landlordDetails,
  transactions,
  categoryTotals,
  grandTotal,
}) => {
  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Landlord Expense Summary</Text>
            <Text style={styles.subtitle}>{month}</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 'bold' }}>SwiftRent</Text>
        </View>

        {/* Landlord Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Landlord Details</Text>
          <View style={styles.row}>
            <Text style={{ fontSize: 12 }}>Name:</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{landlordDetails.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ fontSize: 12 }}>ID/Tax Number:</Text>
            <Text style={{ fontSize: 12 }}>{landlordDetails.idNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ fontSize: 12 }}>Contact:</Text>
            <Text style={{ fontSize: 12 }}>{landlordDetails.contact}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ fontSize: 12 }}>Address:</Text>
            <Text style={{ fontSize: 12 }}>{landlordDetails.address}</Text>
          </View>
        </View>

        {/* Expense Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellHeader}>Date</Text>
              <Text style={styles.tableCellHeader}>Property</Text>
              <Text style={styles.tableCellHeader}>Vendor</Text>
              <Text style={styles.tableCellHeader}>Category</Text>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>Amount</Text>
              <Text style={[styles.tableCellHeader, { textAlign: 'center' }]}>VAT %</Text>
              <Text style={[styles.tableCellHeader, { textAlign: 'center' }]}>Billable</Text>
            </View>
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.tableRow}>
                <Text style={styles.tableCell}>{format(new Date(transaction.date), 'dd/MM/yyyy')}</Text>
                <Text style={styles.tableCell}>{transaction.property_title || 'No Property'}</Text>
                <Text style={styles.tableCell}>{transaction.vendor || '-'}</Text>
                <Text style={styles.tableCell}>{transaction.category}</Text>
                <Text style={styles.tableCellRight}>{formatCurrency(transaction.amount)}</Text>
                <Text style={[styles.tableCell, { textAlign: 'center' }]}>{transaction.vat_percent}%</Text>
                <Text style={[styles.tableCell, { textAlign: 'center' }]}>{transaction.billable ? 'Y' : 'N'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category Totals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary by Category</Text>
          {Object.entries(categoryTotals).map(([category, total]) => (
            <View key={category} style={styles.row}>
              <Text style={{ fontSize: 12 }}>{category}:</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{formatCurrency(total)}</Text>
            </View>
          ))}
          <View style={[styles.row, styles.total]}>
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>Total Expenses:</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          SwiftRent.co.za – Safe, Simple, Commission-Free Renting
        </Text>
      </Page>
    </Document>
  );
};

interface TaxInvoiceLineItem {
  id: string;
  description: string;
  amountExclVat: number;
  vatPercent: number;
  vatAmount: number;
  totalInclVat: number;
}

interface TaxInvoicePDFProps {
  invoiceData: {
    landlordName: string;
    landlordAddress: string;
    landlordVatReg: string;
    tenantName: string;
    tenantAddress: string;
    invoiceNumber: string;
    invoiceDate: string;
    propertyAddress: string;
    lineItems: TaxInvoiceLineItem[];
    bankName: string;
    accountNumber: string;
    reference: string;
  };
  totals: {
    totalExclVat: number;
    totalVat: number;
    totalInclVat: number;
  };
}

// Tax Invoice PDF Document
const TaxInvoicePDF: React.FC<TaxInvoicePDFProps> = ({ invoiceData, totals }) => {
  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 'bold' }}>SwiftRent</Text>
          <Text style={styles.title}>TAX INVOICE</Text>
        </View>

        {/* Invoice Details */}
        <View style={[styles.section, { flexDirection: 'row', justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>From:</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>{invoiceData.landlordName}</Text>
            <Text style={{ fontSize: 10, marginBottom: 2 }}>{invoiceData.landlordAddress}</Text>
            {invoiceData.landlordVatReg && (
              <Text style={{ fontSize: 10 }}>VAT Reg: {invoiceData.landlordVatReg}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>To:</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>{invoiceData.tenantName}</Text>
            <Text style={{ fontSize: 10 }}>{invoiceData.tenantAddress}</Text>
          </View>
        </View>

        {/* Invoice Info */}
        <View style={[styles.section, { flexDirection: 'row', justifyContent: 'space-between' }]}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Invoice Number: {invoiceData.invoiceNumber}</Text>
            <Text style={{ fontSize: 12 }}>Date: {format(new Date(invoiceData.invoiceDate), 'dd/MM/yyyy')}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 12 }}>Property: {invoiceData.propertyAddress}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.section}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Description</Text>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>Amount Excl. VAT</Text>
              <Text style={[styles.tableCellHeader, { textAlign: 'center' }]}>VAT %</Text>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>VAT Amount</Text>
              <Text style={[styles.tableCellHeader, { textAlign: 'right' }]}>Total Incl. VAT</Text>
            </View>
            {invoiceData.lineItems.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.description}</Text>
                <Text style={styles.tableCellRight}>{formatCurrency(item.amountExclVat)}</Text>
                <Text style={[styles.tableCell, { textAlign: 'center' }]}>{item.vatPercent}%</Text>
                <Text style={styles.tableCellRight}>{formatCurrency(item.vatAmount)}</Text>
                <Text style={styles.tableCellRight}>{formatCurrency(item.totalInclVat)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={[styles.section, { alignItems: 'flex-end' }]}>
          <View style={{ width: 200 }}>
            <View style={styles.row}>
              <Text style={{ fontSize: 12 }}>Subtotal (Excl. VAT):</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{formatCurrency(totals.totalExclVat)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={{ fontSize: 12 }}>VAT:</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{formatCurrency(totals.totalVat)}</Text>
            </View>
            <View style={[styles.row, styles.total]}>
              <Text style={{ fontSize: 14, fontWeight: 'bold' }}>Total (Incl. VAT):</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{formatCurrency(totals.totalInclVat)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Instructions</Text>
          <Text style={{ fontSize: 12, marginBottom: 2 }}>Bank: {invoiceData.bankName}</Text>
          <Text style={{ fontSize: 12, marginBottom: 2 }}>Account: {invoiceData.accountNumber}</Text>
          <Text style={{ fontSize: 12 }}>Reference: {invoiceData.reference}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          SwiftRent.co.za – Safe, Simple, Commission-Free Renting
        </Text>
      </Page>
    </Document>
  );
};

// Export functions to generate PDFs
export const generateExpenseSummaryPDF = async (props: ExpenseSummaryPDFProps) => {
  const blob = await pdf(<ExpenseSummaryPDF {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expense-summary-${props.month}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

export const generateTaxInvoicePDF = async (props: TaxInvoicePDFProps) => {
  const blob = await pdf(<TaxInvoicePDF {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const filename = `tax-invoice-${props.invoiceData.invoiceNumber}.pdf`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { blob, filename };
};