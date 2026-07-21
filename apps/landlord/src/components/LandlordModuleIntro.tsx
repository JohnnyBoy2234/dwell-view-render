import type { ReactNode } from 'react';
import { Lightbulb, CheckCircle2, FileSignature } from 'lucide-react';
import { EnvelopeArt } from '@mzanzihomes/features/application';
import maintenanceToolbox from '@/assets/maintenance-toolbox.png';
import inventoryFurniture from '@/assets/inventory-furniture.png';
import inspectionHouseCamera from '@/assets/inspection-house-camera.png';
import supportHeadset from '@/assets/support-headset.png';
import paymentsWallet from '@/assets/payments-wallet.png';

export type ModuleKey = 'maintenance' | 'applications' | 'inventory' | 'inspection' | 'leases' | 'payments' | 'support';

interface Tip {
  title: string;
  desc: string;
}
interface ModuleConfig {
  color: string;
  gradient: string;
  illustration: ReactNode;
  title: string;
  subtitle: string;
  tipsTitle: string;
  tips: Tip[];
}

const floatImg = (src: string, cls: string) => (
  <img src={src} alt="" aria-hidden="true" draggable={false} className={`pointer-events-none absolute animate-soft-float ${cls}`} />
);

const CONFIG: Record<ModuleKey, ModuleConfig> = {
  maintenance: {
    color: '#16a34a',
    gradient: 'linear-gradient(135deg, #e3f6e9 0%, #d1eed8 100%)',
    illustration: floatImg(maintenanceToolbox, 'right-2 bottom-0 h-[150px] w-auto'),
    title: 'Maintenance requests',
    subtitle: 'Review and resolve the repair requests your tenants submit.',
    tipsTitle: 'Managing maintenance',
    tips: [
      { title: 'Respond promptly', desc: 'Acknowledge new requests quickly so tenants know they are being handled.' },
      { title: 'Set clear priorities', desc: 'Triage emergencies first and keep tenants updated on timelines.' },
      { title: 'Keep a full record', desc: 'Photos, notes and status changes are stored as a complete maintenance history.' },
      { title: 'Coordinate access', desc: 'Arrange a suitable time with your tenant for contractors to attend.' },
    ],
  },
  applications: {
    color: '#f97316',
    gradient: 'linear-gradient(135deg,#fdeadb 0%, #fbe0cf 100%)',
    illustration: <EnvelopeArt className="pointer-events-none absolute right-2 top-0 bottom-0 my-auto h-[132px] w-[132px] animate-soft-float" />,
    title: 'Rental applications',
    subtitle: 'Review applicants, check documents and move them through to a lease.',
    tipsTitle: 'Reviewing applications',
    tips: [
      { title: 'Check documents carefully', desc: 'Verify ID, income, bank statements and references before deciding.' },
      { title: 'Run affordability checks', desc: 'Compare income against the rent and any existing obligations.' },
      { title: 'Respond to applicants', desc: 'Keep candidates informed to secure good tenants quickly.' },
      { title: 'Move to a lease', desc: 'Approve and generate a digital lease straight from the application.' },
    ],
  },
  inventory: {
    color: '#14b39a',
    gradient: 'linear-gradient(135deg, #e6f6f2 0%, #d3eee8 100%)',
    illustration: floatImg(inventoryFurniture, 'right-2 top-0 bottom-0 my-auto h-[148px] w-auto'),
    title: 'Property inventory',
    subtitle: 'Record the furniture, appliances and items supplied with each property.',
    tipsTitle: 'Managing inventory',
    tips: [
      { title: 'Be thorough', desc: 'List every item, its condition and quantity so nothing is disputed later.' },
      { title: 'Add photos', desc: 'Photograph each item as evidence of its condition at move-in.' },
      { title: 'Keep it current', desc: 'Update the inventory whenever items are added, replaced or removed.' },
      { title: 'Share with tenants', desc: 'Tenants review and acknowledge the inventory for a clear record.' },
    ],
  },
  inspection: {
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #fdecec 0%, #fbe0e1 100%)',
    illustration: floatImg(inspectionHouseCamera, 'right-1 top-0 bottom-0 my-auto h-[150px] w-auto'),
    title: 'Inspection list',
    subtitle: 'Document the property condition with photos, notes and sign-off.',
    tipsTitle: 'Running inspections',
    tips: [
      { title: 'Capture everything', desc: 'Photograph each room at move-in and move-out to support your decisions.' },
      { title: 'Add clear notes', desc: 'Describe anything a photo cannot show, like appliance age or existing wear.' },
      { title: 'Sign off together', desc: 'Both you and the tenant confirm the record so it is legally sound.' },
      { title: 'It becomes permanent', desc: 'Once accepted, photos and notes are locked as tamper-proof evidence.' },
    ],
  },
  payments: {
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg,#e9faf6 0%,#d6f3ec 100%)',
    illustration: floatImg(paymentsWallet, 'right-2 top-0 bottom-0 my-auto h-[140px] w-auto'),
    title: 'Payments',
    subtitle: 'Collect rent, send invoices and track every payment.',
    tipsTitle: 'Managing payments',
    tips: [
      { title: 'Set up rent collection', desc: 'Add your bank details so tenant rent payments reach you.' },
      { title: 'Send invoices', desc: 'Issue professional digital rent invoices to your tenants each cycle.' },
      { title: 'Track every payment', desc: 'See what is paid, pending or overdue for each property at a glance.' },
      { title: 'Keep clean records', desc: 'Every transaction is stored for your accounting and audit trail.' },
    ],
  },
  leases: {
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #efe9fd 0%, #e6dcfb 100%)',
    illustration: <FileSignature className="pointer-events-none absolute right-5 top-0 bottom-0 my-auto h-[120px] w-auto animate-soft-float" style={{ color: 'rgba(124,58,237,0.25)' }} aria-hidden="true" />,
    title: 'Leases & contracts',
    subtitle: 'Create, send and sign legally binding lease agreements online.',
    tipsTitle: 'Managing leases',
    tips: [
      { title: 'Fill in the details', desc: 'Confirm rent, deposit, term and responsibilities before you send.' },
      { title: 'Send for signature', desc: 'Your tenant signs digitally — no printing or scanning needed.' },
      { title: 'Keep copies safe', desc: 'Signed leases are stored securely and available to both parties.' },
      { title: 'Track signatures', desc: 'See who has signed and follow up on anything outstanding.' },
    ],
  },
  support: {
    color: '#f5a623',
    gradient: 'linear-gradient(135deg, #fdf3d9 0%, #faedcb 100%)',
    illustration: floatImg(supportHeadset, 'right-1 top-0 bottom-0 my-auto h-[138px] w-auto'),
    title: 'Support',
    subtitle: 'Get help managing your account, listings and rentals.',
    tipsTitle: 'Getting help',
    tips: [
      { title: 'Browse FAQs', desc: 'Common questions about listings, payments and leases are answered here.' },
      { title: 'Report an issue', desc: 'Let us know about account, payment or platform problems.' },
      { title: 'Contact us', desc: 'Reach the MzanziHomes support team by email or phone.' },
    ],
  },
};

/** Tenant-style hero + tailored tips for a landlord module page. */
export function LandlordModuleIntro({ module }: { module: ModuleKey }) {
  const c = CONFIG[module];
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {/* Hero */}
      <div
        className="relative min-h-[172px] overflow-hidden rounded-[24px] p-5 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.45)]"
        style={{ background: c.gradient }}
      >
        {c.illustration}
        <div className="relative z-10 max-w-[58%]">
          <h2 className="text-[21px] font-extrabold leading-tight text-slate-900">{c.title}</h2>
          <p className="mt-1.5 text-[13px] leading-snug text-slate-600">{c.subtitle}</p>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-[24px] bg-white p-5 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" style={{ color: c.color }} />
          <h3 className="text-[16px] font-extrabold text-slate-900">{c.tipsTitle}</h3>
        </div>
        <div className="mt-4 space-y-3.5">
          {c.tips.map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${c.color}1a` }}>
                <CheckCircle2 className="h-4 w-4" style={{ color: c.color }} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-slate-900">{t.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
