import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Headset, HelpCircle, AlertTriangle, FileText, Phone, Mail, Search,
  ChevronRight, ChevronDown, ChevronLeft, Wrench, CreditCard, FileSignature,
  User, Bug, HelpingHand, Clock,
} from 'lucide-react';
import TileDetailLayout from '@/components/TileDetailLayout';
import headsetUrl from '@/assets/support-headset.png';

const GOLD = '#f5a623';

// The app's current support contact details (previously hard-coded in this
// page). Centralised here as the single source; wired to real mailto:/tel:
// actions rather than shown as static text.
const SUPPORT_CONFIG = {
  email: 'support@mzanzihomes.com',
  phone: '+27 11 123 4567',
  phoneHref: 'tel:+27111234567',
  hours: 'Mon–Fri, 08:00–17:00 (SAST)',
  responseTime: 'Typically within 24 hours',
};

const FAQ_ITEMS = [
  {
    id: '1',
    question: 'How do I pay my rent?',
    answer:
      'Pay your rent from the Payments section — by card via Paystack, or set up a recurring payment. Receipts are saved automatically.',
  },
  {
    id: '2',
    question: 'How do I submit a maintenance request?',
    answer:
      'Open the Maintenance section and tap “New request”. Describe the issue, set a priority and add photos. You’ll get status updates as it’s resolved.',
  },
  {
    id: '3',
    question: 'Where can I find my lease agreement?',
    answer:
      'Your signed lease and related documents live in Contracts / Lease Documents, where you can view and download them.',
  },
  {
    id: '4',
    question: 'How do I contact my landlord?',
    answer:
      'Message your landlord securely from the Messages section. Every message is kept as a permanent record.',
  },
  {
    id: '5',
    question: 'What should I do in an emergency?',
    answer:
      'For immediate danger (fire, gas leak, flooding) call emergency services first, then your landlord. For urgent repairs, submit a high-priority maintenance request.',
  },
  {
    id: '6',
    question: 'Can I make changes to the property?',
    answer:
      'Any modifications need your landlord’s written approval first. Request permission through the Messages section before making changes.',
  },
];

const RENTAL_GUIDE = [
  { id: 'apply', title: 'Applying for a property', body: 'Complete your profile and submit applications from the Applications section. Keep your documents ready to speed up approval.' },
  { id: 'viewing', title: 'Preparing for a viewing', body: 'Arrive on time, note the condition of each room, and ask about deposits, utilities and the lease term while you’re there.' },
  { id: 'deposit', title: 'Understanding deposits', body: 'Your deposit is held as security against damage and unpaid rent. The move-in inspection records the property’s condition so it can be returned fairly.' },
  { id: 'rent', title: 'Paying rent on time', body: 'Set up a recurring payment in the Payments section so rent is never late. You’ll get reminders before it’s due.' },
  { id: 'lease', title: 'Reading your lease', body: 'Check the rent amount, due date, deposit, notice period and your maintenance responsibilities before signing in the Contracts section.' },
  { id: 'movein', title: 'Move-in & inspections', body: 'Complete the move-in inspection with photos and notes. Both you and your landlord sign it off — it protects your deposit at move-out.' },
];

/** Tenant Support landing — golden redesign. Every visible action works:
 * FAQ, a Report-an-issue triage that redirects property repairs to Maintenance,
 * a rental guide, and real mailto:/tel: contact channels. */
export default function TenantSupport() {
  const navigate = useNavigate();
  const [view, setView] = useState<'home' | 'faq' | 'report' | 'guide' | 'contact'>('home');

  const body =
    view === 'home' ? (
      <HomeView onNavigate={setView} onContact={() => setView('contact')} />
    ) : view === 'faq' ? (
      <FaqView onBack={() => setView('home')} />
    ) : view === 'report' ? (
      <ReportView onBack={() => setView('home')} onContact={() => setView('contact')} onMaintenance={() => navigate('/tenant/maintenance')} />
    ) : view === 'guide' ? (
      <GuideView onBack={() => setView('home')} />
    ) : (
      <ContactView onBack={() => setView('home')} />
    );

  return (
    <TileDetailLayout icon={Headset} accent={GOLD} title="Support" subtitle="Get help and find answers">
      {body}
    </TileDetailLayout>
  );
}

function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 active:opacity-70">
      <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {label}
    </button>
  );
}

function HomeView({ onNavigate, onContact }: { onNavigate: (v: 'faq' | 'report' | 'guide' | 'contact') => void; onContact: () => void }) {
  const rows = [
    { icon: HelpCircle, title: 'Frequently asked questions', subtitle: 'Browse common questions', onClick: () => onNavigate('faq') },
    { icon: AlertTriangle, title: 'Report an issue', subtitle: 'Let us know about a problem', onClick: () => onNavigate('report') },
    { icon: FileText, title: 'Rental guide', subtitle: 'Tips for a smooth rental experience', onClick: () => onNavigate('guide') },
    { icon: Phone, title: 'Contact us', subtitle: 'Reach our support team', onClick: () => onNavigate('contact') },
  ];
  return (
    <div className="space-y-5 [animation:fadeUp_0.5s_ease-out]">
      {/* Hero */}
      <div
        className="relative min-h-[192px] overflow-hidden rounded-[24px] p-5 shadow-[0_18px_38px_-26px_rgba(245,166,35,0.5)]"
        style={{ background: 'linear-gradient(135deg, #fdf3d9 0%, #faedcb 100%)' }}
      >
        <img
          src={headsetUrl}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute bottom-0 right-1 top-0 my-auto h-[150px] w-auto animate-soft-float"
        />
        <div className="relative z-10 max-w-[56%]">
          <h2 className="text-[23px] font-extrabold leading-tight text-slate-900">How can we help?</h2>
          <p className="mt-1.5 text-[13.5px] leading-snug text-slate-600">We’re here to make renting easier.</p>
          <button
            onClick={onContact}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold text-white shadow-[0_14px_26px_-10px_rgba(245,166,35,0.85)] transition-transform active:scale-[0.97]"
            style={{ background: GOLD }}
          >
            Contact support
          </button>
        </div>
      </div>

      {/* Help & resources */}
      <section>
        <h3 className="mb-3 text-[16px] font-extrabold tracking-tight text-slate-900">Help &amp; resources</h3>
        <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          {rows.map((row, i) => (
            <button
              key={row.title}
              onClick={row.onClick}
              aria-label={row.title}
              className={`flex w-full items-center gap-3.5 px-4 py-4 text-left transition active:bg-amber-50/60 ${i > 0 ? 'border-t border-slate-100' : ''}`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100/70">
                <row.icon className="h-[22px] w-[22px]" style={{ color: GOLD }} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-slate-900">{row.title}</p>
                <p className="truncate text-[12.5px] text-slate-500">{row.subtitle}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function FaqView({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string[]>([]);
  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return FAQ_ITEMS;
    return FAQ_ITEMS.filter((i) => i.question.toLowerCase().includes(t) || i.answer.toLowerCase().includes(t));
  }, [query]);

  return (
    <div className="space-y-4 [animation:fadeUp_0.4s_ease-out]">
      <BackBar label="Support" onBack={onBack} />
      <h2 className="text-[20px] font-extrabold text-slate-900">Frequently asked questions</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          aria-label="Search FAQ"
          className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-[14px] text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-[24px] bg-white p-8 text-center shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          <p className="text-[15px] font-bold text-slate-900">No matching answers found</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-slate-500">Try another search or contact our support team for help.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          {filtered.map((item, i) => {
            const isOpen = open.includes(item.id);
            return (
              <div key={item.id} className={i > 0 ? 'border-t border-slate-100' : ''}>
                <button
                  onClick={() => setOpen((p) => (p.includes(item.id) ? p.filter((x) => x !== item.id) : [...p, item.id]))}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left active:bg-amber-50/40"
                >
                  <span className="text-[14.5px] font-semibold text-slate-900">{item.question}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {isOpen && <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-slate-600">{item.answer}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const REPORT_OPTIONS = [
  { icon: User, label: 'MzansiHomes account or app', kind: 'platform' as const },
  { icon: FileText, label: 'Application or viewing', kind: 'platform' as const },
  { icon: CreditCard, label: 'Payment, invoice or receipt', kind: 'platform' as const },
  { icon: FileSignature, label: 'Contract or document', kind: 'platform' as const },
  { icon: Wrench, label: 'Physical problem at the property', kind: 'maintenance' as const },
  { icon: Bug, label: 'Something else', kind: 'platform' as const },
];

function ReportView({ onBack, onContact, onMaintenance }: { onBack: () => void; onContact: () => void; onMaintenance: () => void }) {
  const [redirect, setRedirect] = useState(false);
  return (
    <div className="space-y-4 [animation:fadeUp_0.4s_ease-out]">
      <BackBar label="Support" onBack={onBack} />
      <h2 className="text-[20px] font-extrabold text-slate-900">What do you need help with?</h2>
      {redirect ? (
        <div className="rounded-[24px] bg-white p-5 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100">
            <Wrench className="h-6 w-6 text-orange-500" aria-hidden="true" />
          </div>
          <p className="mt-3 text-[15px] font-bold text-slate-900">This belongs in Maintenance</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">
            Property repairs should be reported through Maintenance so your landlord can track and resolve them.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={onMaintenance} className="rounded-full px-4 py-2.5 text-[13px] font-bold text-white active:scale-[0.98]" style={{ background: '#16a34a' }}>
              Go to Maintenance
            </button>
            <button onClick={() => setRedirect(false)} className="rounded-full bg-slate-100 px-4 py-2.5 text-[13px] font-bold text-slate-600 active:scale-[0.98]">
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          {REPORT_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => (opt.kind === 'maintenance' ? setRedirect(true) : onContact())}
              className={`flex w-full items-center gap-3.5 px-4 py-4 text-left transition active:bg-amber-50/60 ${i > 0 ? 'border-t border-slate-100' : ''}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100/70">
                <opt.icon className="h-5 w-5" style={{ color: GOLD }} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 text-[14.5px] font-semibold text-slate-900">{opt.label}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GuideView({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-4 [animation:fadeUp_0.4s_ease-out]">
      <BackBar label="Support" onBack={onBack} />
      <h2 className="text-[20px] font-extrabold text-slate-900">Rental guide</h2>
      <p className="text-[13.5px] text-slate-500">Tips for a smooth rental experience.</p>
      <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
        {RENTAL_GUIDE.map((g, i) => {
          const isOpen = open === g.id;
          return (
            <div key={g.id} className={i > 0 ? 'border-t border-slate-100' : ''}>
              <button
                onClick={() => setOpen(isOpen ? null : g.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left active:bg-amber-50/40"
              >
                <span className="text-[14.5px] font-semibold text-slate-900">{g.title}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {isOpen && <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-slate-600">{g.body}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContactView({ onBack }: { onBack: () => void }) {
  const mailto = `mailto:${SUPPORT_CONFIG.email}?subject=${encodeURIComponent('MzansiHomes support request')}`;
  return (
    <div className="space-y-4 [animation:fadeUp_0.4s_ease-out]">
      <BackBar label="Support" onBack={onBack} />
      <h2 className="text-[20px] font-extrabold text-slate-900">Contact us</h2>
      <div className="space-y-2.5">
        <a
          href={mailto}
          className="flex items-center gap-3.5 rounded-[20px] bg-white p-4 shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)] active:scale-[0.99]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100/70">
            <Mail className="h-[22px] w-[22px]" style={{ color: GOLD }} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-slate-900">Email us</p>
            <p className="truncate text-[12.5px] text-slate-500">{SUPPORT_CONFIG.email}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
        </a>
        <a
          href={SUPPORT_CONFIG.phoneHref}
          className="flex items-center gap-3.5 rounded-[20px] bg-white p-4 shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)] active:scale-[0.99]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100/70">
            <Phone className="h-[22px] w-[22px]" style={{ color: GOLD }} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-slate-900">Call us</p>
            <p className="truncate text-[12.5px] text-slate-500">{SUPPORT_CONFIG.phone}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
        </a>
      </div>
      <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/70 px-4 py-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden="true" />
        <div>
          <p className="text-[13px] font-semibold text-slate-700">{SUPPORT_CONFIG.hours}</p>
          <p className="text-[12.5px] text-slate-500">{SUPPORT_CONFIG.responseTime}</p>
        </div>
      </div>
      <div className="flex items-start gap-2.5 px-1">
        <HelpingHand className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <p className="text-[12px] leading-relaxed text-slate-500">
          For property repairs, please use the Maintenance section so your landlord can track and resolve them.
        </p>
      </div>
    </div>
  );
}
