import { LeasePack } from "../types";

interface LeaseSchedulePreviewProps {
  leasePack: LeasePack;
}

export function LeaseSchedulePreview({ leasePack }: LeaseSchedulePreviewProps) {
  const { core, parties } = leasePack;
  
  if (!core || !parties) {
    return <div className="text-muted-foreground">No lease data available</div>;
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      {/* Key Information */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Lease ID:</span>
          <div className="text-muted-foreground">{core.leaseId}</div>
        </div>
        <div>
          <span className="font-medium">Property Type:</span>
          <div className="text-muted-foreground capitalize">{core.propertyType}</div>
        </div>
      </div>

      {/* Parties */}
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Landlord:</span>
          <div className="text-muted-foreground">
            {parties.landlord.fullName}<br />
            ID: {parties.landlord.idNumber}<br />
            {parties.landlord.email}
          </div>
        </div>
        <div>
          <span className="font-medium">Tenant:</span>
          <div className="text-muted-foreground">
            {parties.tenant.fullName}<br />
            ID: {parties.tenant.idNumber}<br />
            {parties.tenant.email}
          </div>
        </div>
      </div>

      {/* Property */}
      <div>
        <span className="font-medium text-sm">Property:</span>
        <div className="text-muted-foreground text-sm mt-1">{core.propertyAddress}</div>
      </div>

      {/* Lease Terms Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y">
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Lease Term</td>
              <td className="px-3 py-2">{formatDate(core.startDate)} → {formatDate(core.endDate)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Notice Period</td>
              <td className="px-3 py-2">{core.noticeDays} days</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Monthly Rent</td>
              <td className="px-3 py-2 font-medium text-primary">{formatCurrency(core.monthlyRentZAR)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Due Day</td>
              <td className="px-3 py-2">
                {core.rentDueDay}{core.rentDueDay === 1 ? 'st' : core.rentDueDay === 2 ? 'nd' : core.rentDueDay === 3 ? 'rd' : 'th'} of each month
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Payment Method</td>
              <td className="px-3 py-2">{core.paymentMethod}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Security Deposit</td>
              <td className="px-3 py-2">{formatCurrency(core.depositZAR)} (Held in: {core.depositHeldIn})</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Deposit Refund</td>
              <td className="px-3 py-2">Within {core.depositRefundDays} days</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Utilities</td>
              <td className="px-3 py-2">
                Water: {core.utilities.water} • Electricity: {core.utilities.electricity} • Refuse: {core.utilities.refuse}
                {core.utilities.internet && ` • Internet: ${core.utilities.internet}`}
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Max Occupants</td>
              <td className="px-3 py-2">{core.maxOccupants}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Pets</td>
              <td className="px-3 py-2">{core.petsAllowed ? 'Allowed per written consent' : 'Not allowed'}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Minor Repair Limit</td>
              <td className="px-3 py-2">{formatCurrency(core.maintenanceMinorRepairLimitZAR)} (Tenant responsibility)</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Condition Report</td>
              <td className="px-3 py-2">{core.conditionReportRequired ? 'Required' : 'Not required'}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">House Rules</td>
              <td className="px-3 py-2">{core.houseRulesUrl || 'N/A'}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium bg-muted/50">Governing Law</td>
              <td className="px-3 py-2">{core.governingLaw}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Move-in Cost Summary */}
      <div className="bg-primary/10 p-4 rounded-lg">
        <div className="font-medium text-primary mb-2">Total Move-in Cost</div>
        <div className="text-2xl font-bold text-primary">
          {formatCurrency(core.monthlyRentZAR + core.depositZAR)}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {formatCurrency(core.monthlyRentZAR)} rent + {formatCurrency(core.depositZAR)} deposit
        </div>
      </div>
    </div>
  );
}