import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Send, Eye, CheckCircle, AlertCircle, Calendar, Users, Home } from 'lucide-react';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
import type { LeaseContract, LeaseContractData } from '@/types/lease';

interface ContractReviewProps {
  data: LeaseContractData;
  contract?: LeaseContract | null;
  onGeneratePDF?: () => void;
}

export function ContractReview({ data, contract, onGeneratePDF }: ContractReviewProps) {
  const [generating, setGenerating] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: data.rentCurrency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateTotalDeposits = () => {
    return (data.securityDeposit || 0) + (data.petDeposit || 0) + (data.keyDeposit || 0);
  };

  const getContractDuration = () => {
    if (!data.leaseStartDate || !data.leaseEndDate) return 'Not specified';
    const months = Math.ceil(
      (new Date(data.leaseEndDate).getTime() - new Date(data.leaseStartDate).getTime()) 
      / (1000 * 60 * 60 * 24 * 30.44)
    );
    return `${months} months`;
  };

  const isContractComplete = () => {
    return !!(
      data.propertyAddress &&
      data.propertyType &&
      data.rentAmount &&
      data.landlordName &&
      data.landlordEmail &&
      data.leaseStartDate &&
      data.leaseEndDate
    );
  };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      await onGeneratePDF?.();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contract Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {isContractComplete() ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            <span>Contract Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">
                {isContractComplete() ? 'Ready for Generation' : 'Incomplete Information'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isContractComplete() 
                  ? 'All required information has been provided. You can generate the PDF.'
                  : 'Please complete all required fields in previous steps.'
                }
              </p>
            </div>
            <Badge variant={isContractComplete() ? 'default' : 'secondary'}>
              {contract?.status || 'Draft'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Property Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Home className="h-5 w-5" />
            <span>Property Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Property Details</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Address:</strong> {data.propertyAddress || 'Not specified'}</p>
                <p><strong>Type:</strong> {data.propertyType || 'Not specified'}</p>
                <p><strong>Furnished:</strong> {data.furnishedStatus || 'Not specified'}</p>
                {data.parkingSpaces && data.parkingSpaces > 0 && (
                  <p><strong>Parking:</strong> {data.parkingSpaces} space(s)</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Property Rules</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <Badge variant={data.petsAllowed ? 'default' : 'secondary'} className="text-xs">
                    Pets {data.petsAllowed ? 'Allowed' : 'Not Allowed'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={data.smokingAllowed ? 'default' : 'secondary'} className="text-xs">
                    Smoking {data.smokingAllowed ? 'Allowed' : 'Not Allowed'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={data.sublettingAllowed ? 'default' : 'secondary'} className="text-xs">
                    Subletting {data.sublettingAllowed ? 'Allowed' : 'Not Allowed'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RIcon className="h-7 w-7" />
            <span>Financial Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Rental Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Monthly Rent:</span>
                  <span className="font-medium">{formatCurrency(data.rentAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Payment Frequency:</span>
                  <span className="capitalize">{data.rentPaymentFrequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Due Day:</span>
                  <span>{data.rentDueDay}{data.rentDueDay === 1 ? 'st' : data.rentDueDay === 2 ? 'nd' : data.rentDueDay === 3 ? 'rd' : 'th'} of each month</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Deposits</h4>
              <div className="space-y-2">
                {data.securityDeposit ? (
                  <div className="flex justify-between">
                    <span className="text-sm">Security Deposit:</span>
                    <span className="font-medium">{formatCurrency(data.securityDeposit)}</span>
                  </div>
                ) : null}
                {data.petDeposit ? (
                  <div className="flex justify-between">
                    <span className="text-sm">Pet Deposit:</span>
                    <span className="font-medium">{formatCurrency(data.petDeposit)}</span>
                  </div>
                ) : null}
                {data.keyDeposit ? (
                  <div className="flex justify-between">
                    <span className="text-sm">Key Deposit:</span>
                    <span className="font-medium">{formatCurrency(data.keyDeposit)}</span>
                  </div>
                ) : null}
                <Separator className="my-4" />
                <div className="flex justify-between font-medium">
                  <span>Total Deposits:</span>
                  <span>{formatCurrency(calculateTotalDeposits())}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parties Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Parties Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">Landlord</h4>
              <div className="text-sm space-y-1">
                <p>{data.landlordName || 'Not specified'}</p>
                <p>{data.landlordEmail || 'Not specified'}</p>
                {data.landlordPhone && <p>{data.landlordPhone}</p>}
                {data.landlordAddress && <p>{data.landlordAddress}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Tenant</h4>
              <div className="text-sm space-y-1">
                {data.tenantName ? (
                  <>
                    <p>{data.tenantName}</p>
                    {data.tenantEmail && <p>{data.tenantEmail}</p>}
                    {data.tenantPhone && <p>{data.tenantPhone}</p>}
                    {data.tenantAddress && <p>{data.tenantAddress}</p>}
                  </>
                ) : (
                  <p className="text-muted-foreground italic">
                    Tenant information will be completed when contract is sent
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Lease Duration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Start Date</Label>
              <p className="text-sm">{data.leaseStartDate ? formatDate(data.leaseStartDate) : 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">End Date</Label>
              <p className="text-sm">{data.leaseEndDate ? formatDate(data.leaseEndDate) : 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Duration</Label>
              <p className="text-sm">{getContractDuration()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Clauses */}
      {data.additionalClauses && data.additionalClauses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Lease Clauses</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.additionalClauses
                .slice()
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((clause, index) => (
                  <section key={clause.id} className="space-y-1">
                    <h4 className="text-base font-semibold leading-tight">
                      {index + 1}. {clause.title}
                    </h4>
                    <p className="text-sm leading-relaxed">
                      {clause.content}
                    </p>
                  </section>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Utilities Summary */}
      {(data.utilitiesIncluded?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Utilities & Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Included in Rent:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.utilitiesIncluded?.map((utility) => (
                    <Badge key={utility} variant="secondary" className="text-xs">
                      {utility}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Generate Contract</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a professional PDF of this lease contract. The document will include all terms, 
            conditions, and will be ready for electronic signatures.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleGeneratePDF}
              disabled={!isContractComplete() || generating}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Generate PDF'}
            </Button>

            {contract?.pdf_url && (
              <Button variant="outline" asChild>
                <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview PDF
                </a>
              </Button>
            )}
          </div>

          {!isContractComplete() && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                Complete all required information in the previous steps to generate the contract PDF.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}