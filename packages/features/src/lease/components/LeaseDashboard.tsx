// @ts-nocheck
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FileText, Eye, Download, PenLine, Edit, MapPin, CalendarDays, User,
  ChevronRight, MessageCircle, CheckCircle2,
} from 'lucide-react';
import { useLeaseContracts } from '../hooks/useLeaseContracts';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { downloadFileFromUrl } from '@mzanzihomes/common/lib/download';
import { LeaseDocumentViewer } from './LeaseDocumentViewer';
import { LeaseSignaturePad } from './LeaseSignaturePad';
import { CreateLeaseModal } from './CreateLeaseModal';
import type { LeaseContract } from '@mzanzihomes/common/types/lease';

const PURPLE = '#6366f1';

const STATUS_META: Record<string, { label: string; pill: string }> = {
  draft:            { label: 'Draft',             pill: 'bg-slate-100 text-slate-600' },
  pending_tenant:   { label: 'Pending Signature', pill: 'bg-amber-50 text-amber-700' },
  pending_landlord: { label: 'Awaiting Landlord', pill: 'bg-blue-50 text-blue-700' },
  signed:           { label: 'Signed',            pill: 'bg-emerald-50 text-emerald-700' },
  expired:          { label: 'Expired',           pill: 'bg-red-50 text-red-600' },
  terminated:       { label: 'Ended',             pill: 'bg-slate-100 text-slate-500' },
};
const statusMeta = (s: string) => STATUS_META[s] || { label: s, pill: 'bg-slate-100 text-slate-600' };

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Purple 3D contract illustration: a document being signed by a fountain pen,
 * with a green check, floating papers, a faded house and sparkles. Shared by the
 * hero (large) and the empty state (smaller). */
function ContractDoc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="cdGlow" cx="52%" cy="46%" r="58%">
          <stop offset="0" stopColor="#c7d2fe" stopOpacity="0.9" />
          <stop offset="1" stopColor="#c7d2fe" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cdDoc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1efff" />
        </linearGradient>
        <linearGradient id="cdPen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b7cf6" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="cdCheck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#15a34a" />
        </linearGradient>
        <filter id="cdSoft" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="8" floodColor="#4b3fb0" floodOpacity="0.18" />
        </filter>
      </defs>

      <ellipse cx="110" cy="96" rx="104" ry="90" fill="url(#cdGlow)" />

      <g fill="#dfe4ff">
        <path d="M150 150 L150 96 L182 74 L214 96 L214 150 Z" opacity="0.75" />
        <path d="M144 99 L182 71 L220 99 Z" opacity="0.75" />
        <g opacity="0.6">
          <rect x="36" y="120" width="5" height="22" rx="2.5" />
          <path d="M38 100 l14 24 h-28 z" />
        </g>
      </g>

      <g filter="url(#cdSoft)">
        <rect x="44" y="48" width="72" height="98" rx="9" fill="#eef2ff" transform="rotate(-9 80 97)" />
        <rect x="98" y="44" width="70" height="96" rx="9" fill="#e7e9ff" transform="rotate(7 133 92)" />
      </g>

      <ellipse cx="106" cy="180" rx="62" ry="9" fill="#4b3fb0" opacity="0.14" />

      <g filter="url(#cdSoft)">
        <path d="M64 32 H132 L148 48 V140 q0 12 -12 12 H64 q-12 0 -12 -12 V44 q0 -12 12 -12 Z" fill="url(#cdDoc)" />
        <path d="M132 32 L132 48 L148 48 Z" fill="#c7d2fe" />
        <circle cx="74" cy="58" r="8" fill="#818cf8" />
        <rect x="88" y="53" width="40" height="5" rx="2.5" fill="#dfe4ff" />
        <rect x="88" y="63" width="26" height="5" rx="2.5" fill="#e7eaff" />
        <rect x="64" y="84" width="72" height="5" rx="2.5" fill="#e7eaff" />
        <rect x="64" y="96" width="72" height="5" rx="2.5" fill="#eef1ff" />
        <rect x="64" y="108" width="50" height="5" rx="2.5" fill="#eef1ff" />
        <path d="M66 132 c 7 -11 13 9 21 -1 c 6 -7 11 7 17 0 c 3 -3 7 -1 9 2" stroke="#6366f1" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </g>

      <g filter="url(#cdSoft)">
        <line x1="118" y1="124" x2="180" y2="58" stroke="url(#cdPen)" strokeWidth="12" strokeLinecap="round" />
        <rect x="150" y="86" width="14" height="6" rx="2" fill="#c7d2fe" transform="rotate(-47 157 89)" />
        <path d="M118 124 l -12 12 l 7 3 l 9 -9 z" fill="#4f46e5" />
        <path d="M111 131 l 4 4" stroke="#312e81" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      <g filter="url(#cdSoft)">
        <circle cx="140" cy="140" r="16" fill="url(#cdCheck)" />
        <path d="M132 140 l5 5 l10 -11" stroke="#ffffff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g fill="#a5b4fc">
        <rect x="176" y="40" width="8" height="8" rx="2" transform="rotate(45 180 44)" opacity="0.8" />
        <rect x="44" y="66" width="6" height="6" rx="1.5" transform="rotate(45 47 69)" opacity="0.7" />
        <circle cx="170" cy="120" r="2.4" opacity="0.7" />
      </g>
    </svg>
  );
}

interface LeaseDashboardProps {
  propertyId?: string;
}

export function LeaseDashboard({ propertyId }: LeaseDashboardProps = {}) {
  const navigate = useNavigate();
  const { contracts, loading } = useLeaseContracts(propertyId);
  const { user, isLandlord } = useAuth();
  const [selectedContract, setSelectedContract] = useState<LeaseContract | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tab, setTab] = useState<'all' | 'draft' | 'pending' | 'signed'>('all');
  const listRef = useRef<HTMLDivElement | null>(null);

  const drafts = useMemo(() => contracts.filter((c) => c.status === 'draft'), [contracts]);
  const pending = useMemo(() => contracts.filter((c) => c.status === 'pending_tenant' || c.status === 'pending_landlord'), [contracts]);
  const signed = useMemo(() => contracts.filter((c) => c.status === 'signed'), [contracts]);

  const canSign = (contract: LeaseContract) => {
    // Tenant signs first; the landlord countersigns once the tenant has signed.
    if (isLandlord) return !!contract.tenant_signed_at && !contract.landlord_signed_at;
    if (!isLandlord && contract.tenant_id === user?.id && !contract.tenant_signed_at) return true;
    return false;
  };

  const handleView = (c: LeaseContract) => setSelectedContract(c);
  const handleSign = (c: LeaseContract) => { setSelectedContract(c); setShowSignaturePad(true); };
  const handleEdit = (c: LeaseContract) => navigate(`/lease/builder/${c.id}`);
  const handleDownload = (c: LeaseContract) => {
    if ((c as any).pdf_url) downloadFileFromUrl((c as any).pdf_url, `${c.title || 'Lease-Agreement'}.pdf`);
    else setSelectedContract(c); // open the viewer to generate/download the PDF
  };

  const heroAction = () => {
    if (isLandlord) setShowCreateModal(true);
    else listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const TABS = [
    { key: 'all' as const, label: 'All', count: contracts.length },
    { key: 'draft' as const, label: 'Draft', count: drafts.length },
    { key: 'pending' as const, label: 'Pending', count: pending.length },
    { key: 'signed' as const, label: 'Signed', count: signed.length },
  ];
  const visible = tab === 'draft' ? drafts : tab === 'pending' ? pending : tab === 'signed' ? signed : contracts;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="h-52 animate-pulse rounded-[28px] bg-white/70" />
        <div className="h-40 animate-pulse rounded-[28px] bg-white/70" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-10 animate-fade-in">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-[28px] p-5 shadow-[0_22px_46px_-28px_rgba(79,70,229,0.5)]"
        style={{ background: 'linear-gradient(135deg,#efeafe 0%,#e6e1fb 100%)' }}
      >
        <ContractDoc className="pointer-events-none absolute right-1 top-1/2 h-[150px] w-[150px] -translate-y-1/2 animate-soft-float" />
        <div className="relative z-10 max-w-[58%]">
          <h2 className="text-[22px] font-extrabold leading-tight text-slate-900">All your important documents in one place</h2>
          <p className="mt-1.5 text-[13.5px] leading-snug text-slate-600">View, sign and manage your lease agreements securely.</p>
          <button
            type="button"
            onClick={heroAction}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold text-white shadow-[0_14px_26px_-10px_rgba(99,102,241,0.8)] transition-transform active:scale-[0.97]"
            style={{ background: PURPLE }}
          >
            {isLandlord ? <><Plus className="h-5 w-5" /> Create contract</> : <>View contracts <ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex rounded-2xl bg-white p-1.5 shadow-sm">
        {TABS.map((t, i) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex flex-1 flex-col items-center gap-1 py-2 transition-colors ${i < TABS.length - 1 ? 'border-r border-slate-100' : ''}`}
            >
              <span className={`flex items-center gap-1.5 text-[13px] ${active ? 'font-bold text-indigo-600' : 'font-semibold text-slate-500'}`}>
                {t.label}
                <span className={`min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-bold leading-[18px] ${active ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{t.count}</span>
              </span>
              <span className={`h-[3px] w-10 rounded-full transition-all ${active ? 'bg-indigo-500' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>

      {/* My contracts */}
      <div ref={listRef} className="mt-6 scroll-mt-24">
        <h3 className="mb-3 text-[18px] font-extrabold tracking-tight text-slate-900">My Contracts</h3>

        {visible.length === 0 ? (
          <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
            <ContractDoc className="mx-auto h-32 w-32 animate-soft-float" />
            <p className="mt-2 text-[17px] font-bold text-slate-900">No contracts yet</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-slate-500">
              {isLandlord
                ? 'Create a lease agreement to send to your tenant for signing.'
                : "Your landlord will send your lease agreement here when it's ready for review and signing."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((c) => {
              const sm = statusMeta(c.status);
              const cd = c.contract_data || {};
              const address = (cd.propertyAddress || '').split(',')[0] || 'Your rental';
              const dates = `${fmtDate(cd.leaseStartDate)} – ${fmtDate(cd.leaseEndDate)}`;
              const signedThis = c.status === 'signed';
              return (
                <div key={c.id} className="rounded-[24px] bg-white p-4 shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)]">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${sm.pill}`}>{sm.label}</span>
                      <h3 className="mt-2 line-clamp-1 text-[16px] font-extrabold text-slate-900">{c.title || 'Lease Agreement'}</h3>
                      <div className="mt-2 space-y-1 text-[12.5px] text-slate-500">
                        <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-400" /><span className="truncate">{address}</span></p>
                        <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-indigo-400" /><span className="truncate">{dates}</span></p>
                        {cd.landlordFullName && (
                          <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 shrink-0 text-indigo-400" /><span className="truncate">{cd.landlordFullName}</span></p>
                        )}
                      </div>
                    </div>
                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
                      <FileText className="h-6 w-6 text-indigo-500" />
                      {signedThis && (
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleView(c)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 px-3.5 py-2 text-[13px] font-bold text-indigo-600 transition-transform active:scale-95"
                    >
                      <Eye className="h-4 w-4" /> View contract
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(c)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3.5 py-2 text-[13px] font-bold text-slate-600 transition-transform active:scale-95"
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                    {c.status === 'draft' && isLandlord && (
                      <button
                        type="button"
                        onClick={() => handleEdit(c)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3.5 py-2 text-[13px] font-bold text-slate-600 transition-transform active:scale-95"
                      >
                        <Edit className="h-4 w-4" /> Edit
                      </button>
                    )}
                    {canSign(c) && (
                      <button
                        type="button"
                        onClick={() => handleSign(c)}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-bold text-white transition-transform active:scale-95"
                        style={{ background: PURPLE }}
                      >
                        <PenLine className="h-4 w-4" /> Sign contract
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help card */}
      <button
        type="button"
        onClick={() => navigate('/messages')}
        className="mt-6 flex w-full items-center gap-3 rounded-[24px] bg-indigo-50/70 p-4 text-left transition-transform active:scale-[0.99]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
          <MessageCircle className="h-5 w-5 text-indigo-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-slate-900">Need help understanding your lease?</p>
          <p className="text-[12.5px] text-slate-500">Questions before signing? Message your landlord directly.</p>
        </div>
        <span className="shrink-0 rounded-full border border-indigo-300 px-3 py-1.5 text-[12.5px] font-bold text-indigo-600">Open Messages</span>
      </button>

      {/* Contract details modal */}
      {selectedContract && !showSignaturePad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedContract(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
            <LeaseDocumentViewer contract={selectedContract} />
          </div>
        </div>
      )}

      {/* Signature pad modal */}
      {selectedContract && showSignaturePad && (
        <LeaseSignaturePad
          contract={selectedContract}
          open={showSignaturePad}
          onOpenChange={setShowSignaturePad}
          onSigned={() => {
            setShowSignaturePad(false);
            setSelectedContract(null);
            window.location.reload();
          }}
        />
      )}

      {/* Create lease modal (landlord) */}
      <CreateLeaseModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}
