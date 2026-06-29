import { jsPDF } from "jspdf";
import { Button } from "@mzanzihomes/ui/components/button";
import { Download } from "lucide-react";

interface InvoiceItem {
  description: string;
  amount: number;
}

interface Invoice {
  invoiceNumber: string;
  invoiceDate: string;
  landlordName: string;
  landlordAddress: string;
  landlordContact: string;
  vatNumber?: string;
  tenantName: string;
  rentalProperty: string;
  rentalPeriod: string;
  items: InvoiceItem[];
  totalAmount: number;
  bank: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
  paymentDueDate: string;
}

interface InvoiceDownloadButtonProps {
  invoice: Invoice;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export default function InvoiceDownloadButton({ 
  invoice, 
  variant = "default", 
  size = "sm",
  className = ""
}: InvoiceDownloadButtonProps) {
  const downloadPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RENTAL INVOICE", 105, 20, { align: "center" });

    // Invoice details
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 40);
    doc.text(`Invoice Date: ${invoice.invoiceDate}`, 20, 48);

    // Landlord Details
    doc.setFont("helvetica", "bold");
    doc.text("Landlord Details:", 20, 65);
    doc.setFont("helvetica", "normal");
    const landlordLines = invoice.landlordAddress.split('\n');
    doc.text(`${invoice.landlordName}`, 25, 72);
    let yPos = 79;
    landlordLines.forEach(line => {
      doc.text(line.trim(), 25, yPos);
      yPos += 7;
    });
    doc.text(`${invoice.landlordContact}`, 25, yPos);
    if (invoice.vatNumber) {
      yPos += 7;
      doc.text(`VAT: ${invoice.vatNumber}`, 25, yPos);
    }

    // Tenant Details
    doc.setFont("helvetica", "bold");
    doc.text("Tenant Details:", 120, 65);
    doc.setFont("helvetica", "normal");
    doc.text(`${invoice.tenantName}`, 125, 72);
    doc.text(`${invoice.rentalProperty}`, 125, 79);

    // Rental period
    doc.setFont("helvetica", "bold");
    doc.text(`Rental Period: ${invoice.rentalPeriod}`, 20, 110);

    // Items Table Header
    let y = 125;
    doc.setFont("helvetica", "bold");
    doc.text("Description", 20, y);
    doc.text("Amount (ZAR)", 160, y, { align: "right" });
    
    // Draw line under header
    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    // Items
    doc.setFont("helvetica", "normal");
    invoice.items.forEach((item) => {
      doc.text(item.description, 20, y);
      doc.text(`R ${item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 160, y, { align: "right" });
      y += 8;
    });

    // Total line
    y += 5;
    doc.line(20, y, 190, y);
    y += 10;

    // Total Amount
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount Due: R ${invoice.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 20, y);

    // Payment Details
    y += 20;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Details:", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Bank: ${invoice.bank}`, 25, y);
    y += 7;
    doc.text(`Account Holder: ${invoice.accountHolder}`, 25, y);
    y += 7;
    doc.text(`Account Number: ${invoice.accountNumber}`, 25, y);
    y += 7;
    doc.text(`Branch Code: ${invoice.branchCode}`, 25, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text(`Payment Due Date: ${invoice.paymentDueDate}`, 25, y);

    // Footer
    y += 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Please ensure payment is made by the due date to avoid late fees.", 105, y, { align: "center" });

    // Save file
    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
  };

  return (
    <Button 
      onClick={downloadPDF} 
      variant={variant}
      size={size}
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      Export PDF
    </Button>
  );
}
