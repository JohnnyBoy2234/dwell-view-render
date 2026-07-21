import { useState } from 'react';
import {
  Lightbulb,
  ChevronDown,
  FileText,
  PenLine,
  ShieldCheck,
  BadgeCheck,
  FileStack,
  History,
  CheckCircle2,
} from 'lucide-react';

const VIOLET = '#7c3aed';

const TIPS: string[] = [
  'Review your contract carefully before signing to make sure all the details are correct.',
  'Keep your contracts, inspection reports, inventories and supporting documents together in one secure place.',
  'Keeping accurate rental records helps protect both landlords and tenants throughout the tenancy.',
  "While most tenancies run smoothly, having a complete history of your rental documents ensures important information is available if it's ever needed.",
  'Export your complete property history before closing your Digital Property Office.',
  "Once your Digital Property Office is closed, your documents will only be retained for a limited period in accordance with South Africa's POPIA requirements. Please export your records before closing your account.",
  'Keep inspection reports and inventories up to date to maintain a complete history of your property.',
];

interface Feature {
  h: string;
  d: string;
}
interface Section {
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  items: Feature[];
}

const SECTIONS: Section[] = [
  {
    title: 'Contracts & Storage',
    icon: FileText,
    items: [
      { h: 'Never lose a contract again.', d: 'Your signed documents are stored securely in your account.' },
      { h: 'Access your contracts anytime.', d: 'View, search and download your records whenever you need them.' },
      { h: 'Everything in one place.', d: 'Keep contracts, contract updates, inspections, notices and supporting documents together.' },
      { h: 'Built for long-term record keeping.', d: 'Your documents remain available while your subscription is active.' },
      { h: 'Export whenever you need to.', d: 'Download your complete property or tenancy history with a single click.' },
      { h: 'Secure cloud storage.', d: 'Your records stay safe even if you replace your phone or computer.' },
    ],
  },
  {
    title: 'Digital Signing',
    icon: PenLine,
    items: [
      { h: 'Sign from anywhere.', d: 'Complete contracts securely online.' },
      { h: 'Legally recognised.', d: 'Standard residential contracts can be signed electronically under South African law.' },
      { h: 'Every signature is recorded.', d: 'Each signing includes a secure audit trail.' },
      { h: 'Protected after signing.', d: 'Once completed, contracts are securely locked to help protect everyone involved.' },
      { h: 'Everyone receives a copy.', d: 'Landlords and tenants can download the final signed contract at any time.' },
    ],
  },
  {
    title: 'Security & Trust',
    icon: ShieldCheck,
    items: [
      { h: 'Protected against tampering.', d: 'Important records cannot be secretly changed after signing.' },
      { h: 'Know exactly what happened.', d: 'Every important action is recorded with timestamps.' },
      { h: 'Cloud-backed protection.', d: 'Your records stay secure even if you lose your device.' },
      { h: 'Complete rental timeline.', d: 'Follow every important event from application to move-out.' },
      { h: 'Transparent history.', d: 'See who completed each action and when.' },
    ],
  },
  {
    title: 'Compliance',
    icon: BadgeCheck,
    items: [
      { h: 'Designed for South Africa.', d: 'Built with South African rental and electronic transaction requirements in mind.' },
      { h: 'Easy to search.', d: 'Find the document you need within seconds.' },
      { h: 'Ready when you need it.', d: 'Access records for disputes, inspections or legal processes.' },
      { h: 'Reliable record keeping.', d: 'Every important event is securely stored for future reference.' },
    ],
  },
];

const DOCUMENTS: string[] = [
  'Contracts',
  'Contract Updates',
  'Inspection Reports',
  'Condition Reports',
  'Rental Notices',
  'Supporting Documents',
  'POPIA Consent Records',
  'Credit Check Consent Records',
];

const TIMELINE: string[] = [
  'Rental Application',
  'Credit Check',
  'Contract',
  'Contract Updates',
  'Inspection Reports',
  'Condition Reports',
  'Notices',
  'Maintenance History',
  'Move-Out Records',
];

/**
 * Contracts tips card for the landlord Leases/Contracts page. Shows the helpful
 * tips list plus an expandable "Learn more about MzanziHomes" panel with the
 * full contracts marketing / guidance copy. No hero — the Lease dashboard below
 * already owns the page hero.
 */
export function LandlordContractsTips() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-[24px] bg-white p-5 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" style={{ color: VIOLET }} />
          <h3 className="text-[16px] font-extrabold text-slate-900">Helpful Tips</h3>
        </div>

        {/* Tips list */}
        <div className="mt-4 space-y-3.5">
          {TIPS.map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: `${VIOLET}1a` }}
              >
                <Lightbulb className="h-4 w-4" style={{ color: VIOLET }} />
              </span>
              <p className="text-[12.5px] leading-snug text-slate-600">{t}</p>
            </div>
          ))}
        </div>

        {/* Learn more toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[13.5px] font-bold text-white transition-transform active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, #8b5cf6 0%, ${VIOLET} 100%)`, boxShadow: '0 12px 26px -14px rgba(124,58,237,0.7)' }}
        >
          Learn more about MzanziHomes
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Expandable info panel */}
        {open && (
          <div className="mt-5 space-y-6 border-t border-slate-100 pt-5">
            {/* Intro */}
            <div>
              <h4 className="text-[17px] font-extrabold text-slate-900">Your Contracts, Protected</h4>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
                Never lose an important rental document again. MzanziHomes securely stores your
                contracts and important rental records in one place, making them easy to find, view
                and download whenever you need them.
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
                Your signed contracts and related documents remain available for as long as your
                subscription is active. You can also export your complete property or tenancy history
                at any time.
              </p>
            </div>

            {/* Feature sections */}
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title}>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${VIOLET}1a` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: VIOLET }} />
                    </span>
                    <h5 className="text-[14px] font-extrabold text-slate-900">{s.title}</h5>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {s.items.map((it, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: VIOLET }} />
                        <p className="text-[12.5px] leading-snug text-slate-600">
                          <span className="font-bold text-slate-900">{it.h}</span> {it.d}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Documents you can store */}
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${VIOLET}1a` }}
                >
                  <FileStack className="h-4 w-4" style={{ color: VIOLET }} />
                </span>
                <h5 className="text-[14px] font-extrabold text-slate-900">Documents You Can Store</h5>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {DOCUMENTS.map((d) => (
                  <span
                    key={d}
                    className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold"
                    style={{ background: `${VIOLET}12`, color: '#5b21b6' }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Complete property timeline */}
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${VIOLET}1a` }}
                >
                  <History className="h-4 w-4" style={{ color: VIOLET }} />
                </span>
                <h5 className="text-[14px] font-extrabold text-slate-900">Complete Property Timeline</h5>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-slate-600">
                Every rental automatically builds a secure timeline showing:
              </p>
              <ol className="mt-3 space-y-2">
                {TIMELINE.map((t, i) => (
                  <li key={t} className="flex items-center gap-3">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: VIOLET }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[12.5px] font-semibold text-slate-800">{t}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[12.5px] leading-relaxed text-slate-600">
                Everything is organised chronologically, giving landlords and tenants a complete
                history of the tenancy.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
