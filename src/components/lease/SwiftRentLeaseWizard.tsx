import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ArrowRight, Calendar, Banknote, Users, Home, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SwiftRentLeaseWizardProps {
  propertyId: string;
  onBack: () => void;
  onComplete: () => void;
  selectedTenant?: { id: string; name: string } | null;
}

type AccountType = "Cheque" | "Savings";

export const SwiftRentLeaseWizard = ({ propertyId, onBack, onComplete, selectedTenant }: SwiftRentLeaseWizardProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [landlord, setLandlord] = useState({
    fullName: "",
    idNumber: "",
    email: "",
    phone: "",
    address: "",
  });

  const [tenants, setTenants] = useState<Array<{ fullName: string; idNumber: string; email: string; phone: string; address: string }>>([
    { fullName: selectedTenant?.name || "", idNumber: "", email: "", phone: "", address: "" },
  ]);

  const [premises, setPremises] = useState({
    address: "",
    parkingNo: "",
    maxOccupants: 1,
    petsAllowed: false,
    petsNotes: "",
  });

  const [rent, setRent] = useState({
    amount: "",
    amountWords: "",
    dueRule: "on/before first working day",
    lateFee: "250.00",
    annualIncreaseType: "%" as "%" | "R",
    annualIncreaseValue: "",
  });

  const [deposit, setDeposit] = useState({ amount: "", amountWords: "" });

  const [term, setTerm] = useState({ startDate: "", endDate: "" });

  const [landlordBank, setLandlordBank] = useState({ bank: "", holder: "", number: "", branch: "", type: "Cheque" as AccountType });

  const [attachments, setAttachments] = useState({ incomingInspection: null as File | null, rules: null as File | null, rider: null as File | null });

  // Clauses
  const standardClauses = [
    { id: 'rent-payment', title: 'Rent Payment', body: 'The tenant agrees to pay the monthly rent on or before the first working day of each month.' },
    { id: 'deposit', title: 'Security Deposit', body: 'The security deposit will be held in an interest-bearing account and returned less lawful deductions.' },
    { id: 'maintenance', title: 'Maintenance & Repairs', body: 'The tenant shall keep the premises reasonably clean and report defects promptly.' },
    { id: 'inspection', title: 'Inspections', body: 'The landlord may inspect the premises with reasonable notice and at reasonable times.' },
    { id: 'subletting', title: 'Subletting', body: 'No subletting or assignment is permitted without the landlord’s prior written consent.' },
  ];
  const [selectedClauseIds, setSelectedClauseIds] = useState<string[]>(standardClauses.map(c => c.id));
  const [customClausesText, setCustomClausesText] = useState("");

  const numberToWords = (n: number) => {
    // Minimal ZAR converter; can be improved later
    try {
      const intl = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n).replace("ZAR", "").trim();
      const parts = intl.split(".");
      const rands = parts[0].replace(/[,\s]/g, "");
      const cents = parts[1] || "00";
      const randsInt = parseInt(rands, 10) || 0;
      const toWords = new (window as any).numToWords || ((x: number) => x.toString());
      return `${toWords(randsInt)} rand${cents !== "00" ? ` and ${cents}/100` : ""}`;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (rent.amount) {
      const v = parseFloat(rent.amount);
      if (!isNaN(v)) setRent((p) => ({ ...p, amountWords: numberToWords(v) }));
    }
  }, [rent.amount]);

  useEffect(() => {
    if (deposit.amount) {
      const v = parseFloat(deposit.amount);
      if (!isNaN(v)) setDeposit((p) => ({ ...p, amountWords: numberToWords(v) }));
    }
  }, [deposit.amount]);

  useEffect(() => {
    // Prefill premises from property
    (async () => {
      const { data } = await supabase.from("properties").select("location").eq("id", propertyId).maybeSingle();
      if (data?.location) setPremises((p) => ({ ...p, address: data.location }));
    })();
  }, [propertyId]);

  // Prefill landlord and tenant from profiles/screening details
  useEffect(() => {
    (async () => {
      try {
        // Landlord profile (name best-effort)
        if (user) {
          const { data: lprof } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .maybeSingle();
          setLandlord((prev) => ({
            ...prev,
            fullName: prev.fullName || lprof?.display_name || prev.fullName,
            email: prev.email || (user.email ?? ""),
          }));
        }

        // Tenant screening details
        if (selectedTenant?.id) {
          const [{ data: sdet }, { data: tprof }] = await Promise.all([
            supabase
              .from('screening_details')
              .select('full_name, id_number, phone, current_address')
              .eq('user_id', selectedTenant.id)
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', selectedTenant.id)
              .maybeSingle(),
          ]);
          const name = sdet?.full_name || selectedTenant.name || tprof?.display_name || "";
          setTenants([{ 
            fullName: name, 
            idNumber: sdet?.id_number || "", 
            email: "", 
            phone: sdet?.phone || "", 
            address: sdet?.current_address || "" 
          }]);
        }
      } catch {
        // ignore
      }
    })();
  }, [user?.id, selectedTenant?.id]);

  const valid = useMemo(() => {
    if (!landlord.fullName || !landlord.idNumber || !landlord.email || !landlord.phone || !landlord.address) return false;
    // Relax tenant requirements: email and phone optional (auto-filled where possible)
    if (!tenants.length || tenants.some((t) => !t.fullName || !t.idNumber || !t.address)) return false;
    if (!premises.address || !premises.maxOccupants || premises.maxOccupants < 1) return false;
    if (!rent.amount || !deposit.amount) return false;
    if (!term.startDate || !term.endDate) return false;
    if (!landlordBank.bank || !landlordBank.holder || !landlordBank.number || !landlordBank.branch || !landlordBank.type) return false;
    return true;
  }, [landlord, tenants, premises, rent, deposit, term, landlordBank]);

  // Step-specific validation
  const isStepValid = (stepNumber: number) => {
    switch (stepNumber) {
      case 1: // Parties
        return landlord.fullName && landlord.idNumber && landlord.email && landlord.phone && landlord.address &&
               tenants.length > 0 && tenants.every(t => t.fullName && t.idNumber && t.address);
      case 2: // Premises
        return premises.address && premises.maxOccupants && premises.maxOccupants >= 1;
      case 3: // Rent
        return rent.amount && deposit.amount;
      case 4: // Term
        return term.startDate && term.endDate;
      case 5: // Banking
        return landlordBank.bank && landlordBank.holder && landlordBank.number && landlordBank.branch && landlordBank.type;
      case 6: // Clauses
        return true; // Clauses are optional
      case 7: // Review
        return valid;
      default:
        return false;
    }
  };

  const next = () => {
    if (isStepValid(step) && step < 7) {
      setStep(step + 1);
    } else {
      toast.error("Please complete all required fields before proceeding");
    }
  };
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const handleAddTenant = () => setTenants((ts) => [...ts, { fullName: "", idNumber: "", email: "", phone: "", address: "" }]);

  const generate = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    if (!valid) {
      toast.error("Please complete all required fields");
      return;
    }
    setLoading(true);
    try {
      if (!selectedTenant?.id) {
        toast.error("Please select a tenant from applications first");
        setLoading(false);
        return;
      }

      // Prepare lease data in the new format
      const selectedClauses = standardClauses.filter(c => selectedClauseIds.includes(c.id));
      const customClauses = customClausesText
        .split(/\n\n+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map((text, i) => ({ id: `custom-${i+1}`, title: 'Additional Terms', body: text }));

      const leaseData = {
        landlord: {
          name: landlord.fullName,
          id_number: landlord.idNumber,
          company: '', // Add company field if needed
          email: landlord.email,
          phone: landlord.phone,
          address: landlord.address,
        },
        tenant: {
          name: tenants[0]?.fullName || '',
          id_number: tenants[0]?.idNumber || '',
          email: selectedTenant?.email || '', // Use selected tenant's email from application
          phone: tenants[0]?.phone || '',
          current_address: tenants[0]?.address || '',
          occupants: tenants.slice(1).map(t => ({
            name: t.fullName,
            relationship: 'Additional Occupant',
            age: 'N/A'
          }))
        },
        property: {
          address: premises.address,
          unit: '',
          city: 'Cape Town', // You might want to extract this from address
          province: 'Western Cape',
          postal_code: '',
          type: 'apartment' as 'apartment' | 'house' | 'townhouse',
          parking: premises.parkingNo ? `${premises.parkingNo} bay(s)` as '1 bay' | '2 bays' : 'N/A' as 'N/A',
        },
        term: {
          start_date: term.startDate,
          end_date: term.endDate,
          option_to_renew: true,
          notice_period_days: 30,
        },
        rent: {
          monthly_rent: parseFloat(rent.amount),
          due_day: 1,
          payment_method: 'EFT' as 'EFT' | 'Cash' | 'Cheque',
          late_fee_policy: {
            grace_days: 7,
            late_fee_fixed: parseFloat(rent.lateFee),
            late_fee_percent: 0,
          },
        },
        deposit: {
          amount: parseFloat(deposit.amount),
          return_days: 30,
        },
        utilities: {
          water: 'tenant' as 'tenant' | 'landlord' | 'included',
          electricity: 'tenant' as 'tenant' | 'landlord' | 'included',
          internet: 'tenant' as 'tenant' | 'landlord' | 'included',
          other: '',
        },
        maintenance: {
          tenant_minor_repairs_cap: 500,
          landlord_responsible: ['Structural repairs', 'Plumbing issues', 'Electrical problems'],
        },
        access: {
          entry_notice_hours: 24,
        },
        governing_law: 'South African law',
        attachments: {
          move_in_inspection_required: !!attachments.incomingInspection,
          annexures: [
            ...(attachments.incomingInspection ? ['Move-in Inspection Report'] : []),
            ...(attachments.rules ? ['Property Rules'] : []),
            ...(attachments.rider ? ['Additional Rider'] : []),
          ],
        },
        branding: {
          logo_url: 'https://swiftrent.co.za/logo.png',
          primary_hex: '#2563eb',
          secondary_hex: '#1d4ed8',
          font_family: 'Helvetica'
        },
        clauses: [...selectedClauses, ...customClauses],
      };

      // Use the new lease management system
      const { data, error } = await supabase.functions.invoke('lease-management', {
        body: {
          action: 'generate',
          property_id: propertyId,
          tenant_user_id: selectedTenant.id,
          lease_data: leaseData
        }
      });

      if (error || (data as any)?.error) throw new Error((error as any)?.message || (data as any)?.error || 'Failed');
      toast.success("Lease generated and sent for signing");
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate lease");
    } finally {
      setLoading(false);
    }
  };

  const StepHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      <span className="font-semibold">{title}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Options
        </Button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {step} of 7</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-1">
            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${(step / 7) * 100}%` }} />
          </div>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle><StepHeader icon={Users} title="Parties" /></CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Landlord Full Name</Label>
                <Input value={landlord.fullName} onChange={(e) => setLandlord({ ...landlord, fullName: e.target.value })} required />
              </div>
              <div>
                <Label>Landlord ID/Passport</Label>
                <Input value={landlord.idNumber} onChange={(e) => setLandlord({ ...landlord, idNumber: e.target.value })} required />
              </div>
              <div>
                <Label>Landlord Email</Label>
                <Input type="email" value={landlord.email} onChange={(e) => setLandlord({ ...landlord, email: e.target.value })} required />
              </div>
              <div>
                <Label>Landlord Cell</Label>
                <Input value={landlord.phone} onChange={(e) => setLandlord({ ...landlord, phone: e.target.value })} required />
              </div>
              <div className="md:col-span-2">
                <Label>Landlord Address (domicilium)</Label>
                <Textarea value={landlord.address} onChange={(e) => setLandlord({ ...landlord, address: e.target.value })} required />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tenant(s)</Label>
                <Button variant="outline" size="sm" onClick={handleAddTenant}>Add Tenant</Button>
              </div>
              {tenants.map((t, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-lg">
                  <Input placeholder="Full Name" value={t.fullName} onChange={(e) => setTenants(ts => ts.map((x,i) => i===idx? { ...x, fullName: e.target.value }: x))} required />
                  <Input placeholder="ID/Passport" value={t.idNumber} onChange={(e) => setTenants(ts => ts.map((x,i) => i===idx? { ...x, idNumber: e.target.value }: x))} required />
                  <Input placeholder="Cell (optional)" value={t.phone} onChange={(e) => setTenants(ts => ts.map((x,i) => i===idx? { ...x, phone: e.target.value }: x))} />
                  <div className="md:col-span-2">
                    <Textarea placeholder="Tenant Address (domicilium)" value={t.address} onChange={(e) => setTenants(ts => ts.map((x,i) => i===idx? { ...x, address: e.target.value }: x))} required />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle><StepHeader icon={Home} title="Premises" /></CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Premises Address</Label>
                <Input value={premises.address} onChange={(e) => setPremises({ ...premises, address: e.target.value })} required />
              </div>
              <div>
                <Label>Garage/Parking No.</Label>
                <Input value={premises.parkingNo} onChange={(e) => setPremises({ ...premises, parkingNo: e.target.value })} />
              </div>
              <div>
                <Label>Max Occupants</Label>
                <Input type="number" min={1} value={premises.maxOccupants} onChange={(e) => setPremises({ ...premises, maxOccupants: parseInt(e.target.value || '1', 10) })} required />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={premises.petsAllowed} onCheckedChange={(v: any) => setPremises({ ...premises, petsAllowed: !!v })} />
                <Label>Pets Allowed</Label>
              </div>
              {premises.petsAllowed && (
                <div className="md:col-span-2">
                  <Label>Pet Conditions (optional)</Label>
                  <Textarea value={premises.petsNotes} onChange={(e) => setPremises({ ...premises, petsNotes: e.target.value })} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle><StepHeader icon={Banknote} title="Rent & Deposit" /></CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Monthly Rental (R)</Label>
                <Input value={rent.amount} onChange={(e) => setRent({ ...rent, amount: e.target.value })} required />
                <p className="text-xs text-muted-foreground mt-1">In words: {rent.amountWords}</p>
              </div>
              <div>
                <Label>Deposit Amount (R)</Label>
                <Input value={deposit.amount} onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })} required />
                <p className="text-xs text-muted-foreground mt-1">In words: {deposit.amountWords}</p>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Due Date Rule</Label>
                  <Input value={rent.dueRule} onChange={(e) => setRent({ ...rent, dueRule: e.target.value })} />
                </div>
                <div>
                  <Label>Late Fee (R)</Label>
                  <Input value={rent.lateFee} onChange={(e) => setRent({ ...rent, lateFee: e.target.value })} />
                </div>
                <div>
                  <Label>Annual Increase</Label>
                  <RadioGroup value={rent.annualIncreaseType} onValueChange={(v) => setRent({ ...rent, annualIncreaseType: v as any })} className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="%" id="pct" />
                      <Label htmlFor="pct">Percentage (%)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="R" id="zar" />
                      <Label htmlFor="zar">Fixed amount (R)</Label>
                    </div>
                  </RadioGroup>
                  <Input className="mt-2" placeholder={rent.annualIncreaseType === '%' ? 'e.g., 8' : 'e.g., 500'} value={rent.annualIncreaseValue} onChange={(e) => setRent({ ...rent, annualIncreaseValue: e.target.value })} required />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader><CardTitle><StepHeader icon={FileText} title="Clauses & Additional Terms" /></CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium">Standard Clauses</Label>
              <p className="text-sm text-muted-foreground mb-3">Select the standard clauses to include:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {standardClauses.map((c) => (
                  <div key={c.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={c.id}
                      checked={selectedClauseIds.includes(c.id)}
                      onCheckedChange={() => setSelectedClauseIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                    />
                    <div className="flex-1">
                      <Label htmlFor={c.id} className="font-medium">{c.title}</Label>
                      <p className="text-sm text-muted-foreground">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Custom Clauses (optional)</Label>
              <Textarea
                placeholder="Enter any additional terms. Separate clauses with a blank line."
                value={customClausesText}
                onChange={(e) => setCustomClausesText(e.target.value)}
                rows={8}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader><CardTitle><StepHeader icon={Calendar} title="Term" /></CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Lease Start</Label>
                <Input type="date" value={term.startDate} onChange={(e) => setTerm({ ...term, startDate: e.target.value })} required />
              </div>
              <div>
                <Label>Lease End</Label>
                <Input type="date" value={term.endDate} onChange={(e) => setTerm({ ...term, endDate: e.target.value })} required />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card>
          <CardHeader><CardTitle><StepHeader icon={Banknote} title="Banking" /></CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Bank</Label>
                <Input value={landlordBank.bank} onChange={(e) => setLandlordBank({ ...landlordBank, bank: e.target.value })} required />
              </div>
              <div>
                <Label>Account Holder</Label>
                <Input value={landlordBank.holder} onChange={(e) => setLandlordBank({ ...landlordBank, holder: e.target.value })} required />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input value={landlordBank.number} onChange={(e) => setLandlordBank({ ...landlordBank, number: e.target.value })} required />
              </div>
              <div>
                <Label>Branch Code</Label>
                <Input value={landlordBank.branch} onChange={(e) => setLandlordBank({ ...landlordBank, branch: e.target.value })} required />
              </div>
              <div>
                <Label>Account Type</Label>
                <RadioGroup value={landlordBank.type} onValueChange={(v) => setLandlordBank({ ...landlordBank, type: v as AccountType })}>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Cheque" id="cheque" /><Label htmlFor="cheque">Cheque</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Savings" id="savings" /><Label htmlFor="savings">Savings</Label></div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 7 && (
        <Card>
          <CardHeader><CardTitle><StepHeader icon={FileText} title="Review & Sign" /></CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/40 rounded-lg text-sm">
              <div className="font-medium mb-2">Summary</div>
              <div>Landlord: {landlord.fullName}</div>
              <div>Tenants: {tenants.map(t => t.fullName).join(', ')}</div>
              <div>Premises: {premises.address}</div>
              <div>Rent: R{rent.amount} ({rent.amountWords}) • Deposit: R{deposit.amount} ({deposit.amountWords})</div>
              <div>Term: {term.startDate} → {term.endDate}</div>
              {selectedClauseIds.length > 0 && (
                <div className="mt-2">Included clauses: {selectedClauseIds.length}</div>
              )}
            </div>
            <Button disabled={!valid || loading} onClick={generate} className="w-full">
              {loading ? 'Generating...' : 'Generate & Send for Signing'}
            </Button>
            {!valid && (
              <p className="mt-2 text-xs text-destructive">Please complete all required fields in previous steps.</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={prev} disabled={step === 1}>Previous</Button>
        {step < 7 && (
          <Button onClick={next}>Next<ArrowRight className="h-4 w-4 ml-2" /></Button>
        )}
      </div>
    </div>
  );
};

export default SwiftRentLeaseWizard;


