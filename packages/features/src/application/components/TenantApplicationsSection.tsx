import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { cn } from '@mzanzihomes/common/lib/utils';
import {
  AlertCircle, ChevronRight, FileText, Inbox, Lock, Plus, RefreshCw, Send,
  Mail, Lightbulb, User, BadgeCheck, MessageCircle, Sparkles,
} from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useApplicationInvites, type InviteWithDetails } from '../hooks/useApplicationInvites';
import { useTenantApplications, type TenantApplication } from '../hooks/useTenantApplications';
import { useApplicationDrafts, type ApplicationDraftSummary } from '../hooks/useApplicationDrafts';
import {
  applicationStatusPresentation,
  isInviteExpired,
  trackApplicationsEvent,
} from '../applicationPresentation';
import { RequestApplicationSheet } from './RequestApplicationSheet';
import { applicationTheme } from '@mzanzihomes/common/constants/applicationTheme';

const ORANGE = applicationTheme.primary;

const APPLICATION_DOCS: { title: string; items: string[] }[] = [
  {
    title: 'Required',
    items: [
      'South African ID (or Passport + Visa/Permit if applicable)',
      'Proof of income (latest payslip or employment letter)',
      'Recent bank statements (last 3 months)',
      'Proof of current address',
      'Free credit report (if requested)',
    ],
  },
  {
    title: 'If self-employed',
    items: [
      'Bank statements (last 3–6 months)',
      'Business registration (if applicable)',
    ],
  },
  {
    title: 'Optional but recommended',
    items: [
      'Previous landlord reference',
      'Employer reference',
      'Rental payment history (if available)',
      'Pet information (if applying with pets)',
    ],
  },
];

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** One invitation to apply, regardless of which table it came from: a token
 * invite (application_invites) or a landlord-created applications row with
 * status 'invited'. */
interface InvitationItem {
  key: string;
  propertyId: string;
  propertyTitle: string;
  location: string | null;
  price: number | null;
  invitedOn: string;
  expiresAt: string | null;
  expired: boolean;
  startPath: string;
}

/** A request the tenant sent to a landlord (application_requests). */
interface RequestItem {
  id: string;
  propertyId: string;
  status: string;
  createdAt: string;
  propertyTitle: string;
  location: string | null;
  price: number | null;
}

type TabKey = 'invitations' | 'applications' | 'requests';

/** Titles like "House in Sea Point" already carry the suburb — don't repeat
 * the location line under them. */
function locationLine(title: string, location: string | null): string | null {
  if (!location) return null;
  const suburb = location.split(',')[0].trim().toLowerCase();
  return suburb && title.toLowerCase().includes(suburb) ? null : location;
}

/** Status → pill colour, following the reference: submitted blue, under-review
 * orange, approved green, declined red, expired/closed grey. */
function statusPillClass(status: string): string {
  switch (status) {
    case 'accepted': return 'bg-green-100 text-green-700';
    case 'declined': return 'bg-red-100 text-red-600';
    case 'pending':
    case 'submitted': return 'bg-blue-100 text-blue-700';
    case 'more_info_requested': return 'bg-amber-100 text-amber-700';
    case 'expired':
    case 'withdrawn':
    case 'requested': return 'bg-slate-100 text-slate-500';
    default: return 'bg-orange-100 text-orange-700';
  }
}

const REQUEST_PILL: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-600' },
};

const APPLICATION_TIPS = [
  { icon: User,         label: 'Complete your profile' },
  { icon: FileText,     label: 'Provide accurate information' },
  { icon: BadgeCheck,   label: 'Include supporting documents' },
  { icon: MessageCircle, label: 'Respond quickly to landlords' },
];

const CardSkeleton = () => (
  <Card aria-hidden="true" className="rounded-[24px] border-0 shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
      </div>
    </CardContent>
  </Card>
);

/** Premium 3D open-envelope illustration: a crisp white document (folded
 * top-right corner, profile circle + placeholder lines) rises out of a glossy
 * orange envelope, with a soft contact shadow. Centred in a square viewBox so it
 * never crops. Shared by the hero (large) and the empty states (smaller). */
export function EnvelopeArt({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 220 224" className="h-full w-full" role="img" aria-label="Open envelope with a document">
        <defs>
          <linearGradient id="ap-doc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#f6f8fb" />
          </linearGradient>
          <linearGradient id="ap-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffce7e" />
            <stop offset="1" stopColor="#ffb14a" />
          </linearGradient>
          <linearGradient id="ap-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd089" />
            <stop offset="1" stopColor="#ffb54f" />
          </linearGradient>
          <linearGradient id="ap-right" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffc267" />
            <stop offset="1" stopColor="#fca02b" />
          </linearGradient>
          <linearGradient id="ap-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffc35c" />
            <stop offset="1" stopColor="#fb8c00" />
          </linearGradient>
          <filter id="ap-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="7" stdDeviation="8" floodColor="#c8721f" floodOpacity="0.16" />
          </filter>
        </defs>

        {/* soft contact shadow */}
        <ellipse cx="110" cy="210" rx="82" ry="11" fill="#e79a3f" opacity="0.22" />

        {/* envelope back / interior */}
        <rect x="28" y="106" width="164" height="96" rx="18" fill="url(#ap-back)" />

        {/* document rising out of the envelope */}
        <g filter="url(#ap-soft)">
          <path
            d="M64 30 H150 L166 46 V162 q0 10 -10 10 H64 q-10 0 -10 -10 V40 q0 -10 10 -10 Z"
            fill="url(#ap-doc)"
          />
          {/* folded top-right corner */}
          <path d="M150 30 L150 46 L166 46 Z" fill="#fcd7a0" />
          {/* profile circle + short lines */}
          <circle cx="80" cy="64" r="15" fill="#ffa726" />
          <rect x="102" y="57" width="46" height="6" rx="3" fill="#e6e9ee" />
          <rect x="102" y="70" width="34" height="6" rx="3" fill="#eceff3" />
          {/* placeholder lines */}
          <rect x="66" y="96" width="94" height="7" rx="3.5" fill="#e6e9ee" />
          <rect x="66" y="112" width="94" height="7" rx="3.5" fill="#eceff3" />
          <rect x="66" y="128" width="70" height="7" rx="3.5" fill="#eceff3" />
        </g>

        {/* envelope front flaps (cover the lower half of the document) */}
        <g clipPath="url(#ap-clip)">
          <path d="M28 110 L110 168 L28 202 Z" fill="url(#ap-left)" />
          <path d="M192 110 L110 168 L192 202 Z" fill="url(#ap-right)" />
          <path d="M28 202 L110 168 L192 202 Z" fill="url(#ap-front)" />
          {/* subtle seams + apex highlight for depth */}
          <path d="M28 110 L110 168 L192 110" stroke="#e88b1e" strokeWidth="1.4" fill="none" opacity="0.35" />
          <path d="M28 202 L110 168 L192 202" stroke="#d9791a" strokeWidth="1.4" fill="none" opacity="0.3" />
          <path d="M110 168 L86 202 L134 202 Z" fill="#ffffff" opacity="0.12" />
        </g>
        <clipPath id="ap-clip"><rect x="28" y="106" width="164" height="96" rx="18" /></clipPath>

        {/* floating particles */}
        <g fill="#ffb74d" opacity="0.6">
          <circle cx="40" cy="70" r="2.4" />
          <circle cx="182" cy="86" r="2" />
          <circle cx="196" cy="150" r="2.4" />
          <circle cx="30" cy="150" r="2" />
        </g>
      </svg>
    </div>
  );
}

function EmptyState({ title, paragraph }: { title: string; paragraph: string }) {
  return (
    <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
      <EnvelopeArt className="mx-auto h-32 w-32 animate-soft-float" />
      <h2 className="mt-3 text-[19px] font-extrabold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-slate-500">{paragraph}</p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3"
    >
      <span className="flex items-center gap-2 text-sm">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
        {message}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" /> Try again
      </Button>
    </div>
  );
}

/** Icon tile used on every list row (orange-tinted rounded square). */
function IconTile({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
      <Icon className="h-[20px] w-[20px] text-orange-500" />
    </span>
  );
}

function SectionHeading({ title, showViewAll, expanded, onToggle }: {
  title: string; showViewAll: boolean; expanded: boolean; onToggle: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-[18px] font-extrabold tracking-tight text-slate-900">{title}</h3>
      {showViewAll && (
        <button type="button" onClick={onToggle} className="text-[13px] font-bold text-orange-600 active:opacity-70">
          {expanded ? 'Show less' : 'View all'}
        </button>
      )}
    </div>
  );
}

export const TenantApplicationsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { invites, loading: invitesLoading, error: invitesError, refresh: refreshInvites } = useApplicationInvites();
  const {
    applications,
    loading: applicationsLoading,
    error: applicationsError,
    refresh: refreshApplications
  } = useTenantApplications();
  const { drafts, loading: draftsLoading, refresh: refreshDrafts } = useApplicationDrafts();

  const [tab, setTab] = useState<TabKey>('invitations');
  const [showAll, setShowAll] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  useEffect(() => {
    trackApplicationsEvent(user?.id, 'applications_page_viewed', {});
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase.from('application_requests') as any)
        .select('id, property_id, status, created_at')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });
      const rows = (data ?? []) as any[];
      const ids = [...new Set(rows.map((r) => r.property_id))];
      let propsById = new Map<string, any>();
      if (ids.length > 0) {
        const { data: props } = await (supabase.from('properties') as any)
          .select('id, title, location, price')
          .in('id', ids);
        propsById = new Map(((props ?? []) as any[]).map((p) => [p.id, p]));
      }
      setRequests(rows.map((r) => {
        const prop = propsById.get(r.property_id);
        return {
          id: r.id,
          propertyId: r.property_id,
          status: r.status,
          createdAt: r.created_at,
          propertyTitle: prop?.title ?? 'Property',
          location: prop?.location ?? null,
          price: prop?.price ?? null,
        };
      }));
    })();
  }, [user?.id, requestOpen]);

  const pendingRequestPropertyIds = useMemo(
    () => requests.filter((r) => r.status === 'pending').map((r) => r.propertyId),
    [requests]
  );

  const draftByPropertyId = useMemo(
    () => new Map(drafts.map((d) => [d.property_id, d])),
    [drafts]
  );

  // Invitations come from two sources; token invites win when both exist for
  // a property. Expired ones stay visible but are not actionable.
  const invitationItems = useMemo<InvitationItem[]>(() => {
    // Once the tenant has actually applied (a submitted/under-review application
    // exists — status is no longer the pre-fill 'invited'), the invitation is
    // fulfilled and should disappear from the invitations list and the hero.
    const appliedPropertyIds = new Set(
      applications.filter((a) => a.status && a.status !== 'invited').map((a) => a.property_id)
    );
    const fromTokens: InvitationItem[] = invites
      .filter((inv: InviteWithDetails) => !appliedPropertyIds.has(inv.property_id))
      .map((inv: InviteWithDetails) => ({
        key: `invite-${inv.id}`,
        propertyId: inv.property_id,
        propertyTitle: inv.property?.title ?? 'Property',
        location: inv.property?.location ?? null,
        price: inv.property?.price ?? null,
        invitedOn: inv.created_at,
        expiresAt: inv.expires_at ?? null,
        expired: isInviteExpired(inv),
        startPath: `/apply/invite/${inv.token}`
      }));
    const tokenPropertyIds = new Set(fromTokens.map((i) => i.propertyId));

    const fromApplications: InvitationItem[] = applications
      .filter((app) => app.status === 'invited' && !tokenPropertyIds.has(app.property_id))
      .map((app: TenantApplication) => ({
        key: `application-${app.id}`,
        propertyId: app.property_id,
        propertyTitle: app.property?.title ?? 'Property',
        location: app.property?.location ?? null,
        price: app.property?.price ?? null,
        invitedOn: app.created_at,
        expiresAt: null,
        expired: false,
        startPath: `/rental-application/${app.property_id}?landlord=${app.landlord_id}`
      }));

    return [...fromTokens, ...fromApplications];
  }, [invites, applications]);

  const applicationRecords = useMemo(
    () => applications.filter((app) => app.status !== 'invited'),
    [applications]
  );
  // A draft becomes a submitted application on the same property; don't show both.
  const applicationPropertyIds = useMemo(
    () => new Set(applicationRecords.map((a) => a.property_id)),
    [applicationRecords]
  );
  const draftRecords = useMemo(
    () => drafts.filter((d) => !applicationPropertyIds.has(d.property_id)),
    [drafts, applicationPropertyIds]
  );

  const activeInvitationCount = invitationItems.filter((i) => !i.expired).length;
  const applicationCount = applicationRecords.length + draftRecords.length;

  const openRequestSheet = () => {
    trackApplicationsEvent(user?.id, 'manual_application_request_opened', {});
    setRequestOpen(true);
  };

  const changeTab = (value: TabKey) => {
    setTab(value);
    setShowAll(false);
    trackApplicationsEvent(user?.id, 'applications_tab_changed', { tab: value });
  };

  const continueDraft = (draft: ApplicationDraftSummary) =>
    navigate(`/rental-application/${draft.property_id}?landlord=${draft.landlord_id}`);

  const SEGMENTS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; count: number }[] = [
    { key: 'invitations',  label: 'Invitations',  icon: Inbox,    count: activeInvitationCount },
    { key: 'applications', label: 'Applications', icon: FileText, count: applicationCount },
    { key: 'requests',     label: 'Requests',     icon: Send,     count: pendingRequestPropertyIds.length },
  ];

  // Combined applications list (drafts first, then submitted) for the preview/View-all cut.
  const appList = useMemo(
    () => [
      ...draftRecords.map((d) => ({ kind: 'draft' as const, data: d })),
      ...applicationRecords.map((a) => ({ kind: 'app' as const, data: a })),
    ],
    [draftRecords, applicationRecords]
  );

  const activeInvites = invitationItems.filter((i) => !i.expired);
  const hasInvite = activeInvites.length > 0;
  const visInvites = showAll ? invitationItems : invitationItems.slice(0, 3);
  const visApps = showAll ? appList : appList.slice(0, 3);
  const visRequests = showAll ? requests : requests.slice(0, 3);

  // Workflow-aware hero status for a tenant who already has application(s) and
  // no pending invite — instead of the generic "Find your next home" message.
  const appStatuses = applicationRecords.map((a) => a.status);
  const heroStatus = appStatuses.includes('accepted')
    ? { pill: 'Approved', title: 'Application approved', body: 'Great news — a landlord approved your application. Check your applications for next steps.' }
    : appStatuses.some((s) => ['pending', 'submitted', 'pending_credit_check', 'more_info_requested'].includes(s))
      ? { pill: 'Under review', title: 'Application submitted', body: "Awaiting landlord review — we'll notify you the moment there's an update." }
      : appStatuses.includes('declined')
        ? { pill: 'Update', title: 'Application not approved', body: "One of your applications wasn't successful this time. Keep exploring other homes." }
        : { pill: 'In progress', title: 'Your applications', body: 'Track the status of your applications here.' };

  return (
    <section className="mx-auto w-full max-w-2xl pb-28 md:pb-10 animate-fade-in" aria-label="Your applications">
      {/* Hero */}
      <div
        className="relative min-h-[176px] overflow-hidden rounded-[28px] p-5 shadow-[0_20px_44px_-28px_rgba(200,90,20,0.5)]"
        style={{ background: 'linear-gradient(135deg,#fdeadb 0%, #fbe0cf 100%)' }}
      >
        <EnvelopeArt className="pointer-events-none absolute right-2 top-0 bottom-0 my-auto h-[150px] w-[150px] animate-soft-float" />
        <div className="relative z-10 max-w-[62%]">
          {hasInvite ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-orange-700">
                <Sparkles className="h-3 w-3" /> {activeInvites.length === 1 ? "You're invited" : `${activeInvites.length} invitations`}
              </span>
              <h2 className="mt-2 text-[23px] font-extrabold leading-tight text-slate-900">You've been invited to apply</h2>
              <p className="mt-1.5 text-[13.5px] leading-snug text-slate-600">Fill in your application now — it only takes about 10 minutes.</p>
              <button
                type="button"
                onClick={() => {
                  const inv = activeInvites[0];
                  if (!inv) return changeTab('invitations');
                  const draft = draftByPropertyId.get(inv.propertyId);
                  trackApplicationsEvent(user?.id, draft ? 'application_continue_clicked' : 'application_start_clicked', { source: 'hero_invite' });
                  navigate(draft ? `/rental-application/${inv.propertyId}?landlord=${draft.landlord_id}` : inv.startPath);
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold text-white shadow-[0_14px_26px_-10px_rgba(249,115,22,0.8)] transition-transform active:scale-[0.97]"
                style={{ background: ORANGE }}
              >
                Fill in the form now →
              </button>
            </>
          ) : applicationRecords.length > 0 ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-orange-700">
                {heroStatus.pill}
              </span>
              <h2 className="mt-2 text-[23px] font-extrabold leading-tight text-slate-900">{heroStatus.title}</h2>
              <p className="mt-1.5 text-[13.5px] leading-snug text-slate-600">{heroStatus.body}</p>
              <button
                type="button"
                onClick={() => changeTab('applications')}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold text-white shadow-[0_14px_26px_-10px_rgba(249,115,22,0.8)] transition-transform active:scale-[0.97]"
                style={{ background: ORANGE }}
              >
                View my applications →
              </button>
            </>
          ) : (
            <>
              <h2 className="text-[23px] font-extrabold leading-tight text-slate-900">Find your next home</h2>
              <p className="mt-1.5 text-[13.5px] leading-snug text-slate-600">Track invitations, submit applications and stay updated.</p>
              <button
                type="button"
                onClick={openRequestSheet}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold text-white shadow-[0_14px_26px_-10px_rgba(249,115,22,0.8)] transition-transform active:scale-[0.97]"
                style={{ background: ORANGE }}
              >
                <Plus className="h-5 w-5" /> Request an application
              </button>
            </>
          )}
        </div>
      </div>

      {/* Segmented tabs */}
      <div className="mt-4 flex rounded-2xl bg-white p-1.5 shadow-sm" role="tablist" aria-label="Application views">
        {SEGMENTS.map((seg, i) => {
          const active = tab === seg.key;
          return (
            <button
              key={seg.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => changeTab(seg.key)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1.5 py-2.5 transition-colors',
                i < SEGMENTS.length - 1 && 'border-r border-slate-100'
              )}
            >
              <seg.icon className={cn('h-6 w-6', active ? 'text-orange-500' : 'text-slate-400')} />
              <span className={cn('flex items-center gap-1.5 text-[13.5px]', active ? 'font-bold text-orange-600' : 'font-semibold text-slate-500')}>
                {seg.label}
                <span className={cn(
                  'min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-bold leading-[18px]',
                  active ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                )}>
                  {seg.count}
                </span>
              </span>
              <span className={cn('h-[3px] w-12 rounded-full transition-all', active ? 'bg-orange-500' : 'bg-transparent')} />
            </button>
          );
        })}
      </div>

      {/* Invitations */}
      {tab === 'invitations' && (
        <div className="mt-6">
          <SectionHeading title="Invitations" showViewAll={invitationItems.length > 3} expanded={showAll} onToggle={() => setShowAll((s) => !s)} />
          {invitesError && <ErrorBanner message="We could not load your invitations." onRetry={refreshInvites} />}
          {invitesLoading && invitationItems.length === 0 ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading invitations">
              <CardSkeleton /><CardSkeleton />
            </div>
          ) : invitationItems.length === 0 && !invitesError ? (
            <EmptyState
              title="No invitations yet"
              paragraph="When a landlord invites you to apply for a property, it will appear here."
            />
          ) : (
            <div className="space-y-3">
              {visInvites.map((item) => {
                const draft = draftByPropertyId.get(item.propertyId);
                const ctaLabel = item.expired ? null : draft ? 'Continue' : 'View invitation';
                const dateLine = item.expired
                  ? `Expired ${item.expiresAt ? shortDate(item.expiresAt) : ''}`.trim()
                  : `Invited ${shortDate(item.invitedOn)}`;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={item.expired}
                    onClick={() => {
                      trackApplicationsEvent(user?.id, draft ? 'application_continue_clicked' : 'application_start_clicked', { source: 'invitation' });
                      navigate(draft ? `/rental-application/${item.propertyId}?landlord=${draft.landlord_id}` : item.startPath);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[24px] p-4 text-left transition-transform active:scale-[0.99] disabled:opacity-70',
                      item.expired
                        ? 'bg-white shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)]'
                        : 'border-2 border-orange-300 bg-orange-50 shadow-[0_18px_38px_-24px_rgba(249,115,22,0.55)]'
                    )}
                  >
                    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', item.expired ? 'bg-slate-100 text-slate-400' : 'text-white')} style={item.expired ? undefined : { background: ORANGE }}>
                      <Mail className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {!item.expired && (
                        <span className="mb-0.5 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                          Invited to apply
                        </span>
                      )}
                      <p className="truncate text-[14.5px] font-bold text-slate-900">{item.propertyTitle}</p>
                      <p className="truncate text-[12.5px] text-slate-500">{dateLine}</p>
                    </div>
                    {ctaLabel ? (
                      <span className="shrink-0 rounded-full border border-orange-400 px-3.5 py-1.5 text-[12.5px] font-bold text-orange-600">{ctaLabel}</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-bold text-slate-500">Expired</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Applications */}
      {tab === 'applications' && (
        <div className="mt-6">
          <SectionHeading title="My applications" showViewAll={appList.length > 3} expanded={showAll} onToggle={() => setShowAll((s) => !s)} />
          {applicationsError && <ErrorBanner message="We could not load your applications." onRetry={refreshApplications} />}
          {(applicationsLoading || draftsLoading) && applicationCount === 0 ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading applications">
              <CardSkeleton /><CardSkeleton />
            </div>
          ) : applicationCount === 0 && !applicationsError ? (
            <EmptyState
              title="No applications submitted"
              paragraph="Applications you've submitted will appear here so you can easily track their progress."
            />
          ) : (
            <div className="space-y-3">
              {visApps.map((row) => {
                if (row.kind === 'draft') {
                  const draft = row.data;
                  return (
                    <button
                      key={`draft-${draft.id}`}
                      type="button"
                      onClick={() => {
                        trackApplicationsEvent(user?.id, 'application_continue_clicked', { source: 'draft' });
                        continueDraft(draft);
                      }}
                      className="w-full rounded-[24px] bg-white p-4 text-left shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)] transition-transform active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <IconTile icon={FileText} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-bold text-slate-900">{draft.property?.title ?? 'Property'}</p>
                          <p className="truncate text-[12.5px] text-slate-500">Updated {shortDate(draft.updated_at)}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-[11.5px] font-bold text-orange-700">Draft</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                      </div>
                      <div className="mt-3 space-y-1">
                        <Progress value={draft.completionPercentage} aria-label="Application progress" className="h-1.5" />
                        <p className="text-[11px] text-slate-400">{draft.completionPercentage}% complete · Tap to continue</p>
                      </div>
                    </button>
                  );
                }
                const app = row.data;
                const presentation = applicationStatusPresentation(app.status);
                const dateLine =
                  app.status === 'pending' || app.status === 'submitted'
                    ? `Submitted on ${shortDate(app.created_at)}`
                    : `Updated ${shortDate(app.updated_at ?? app.created_at)}`;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      trackApplicationsEvent(user?.id, 'application_status_viewed', { status: app.status });
                      navigate(`/application/${app.id}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-[24px] bg-white p-4 text-left shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)] transition-transform active:scale-[0.99]"
                  >
                    <IconTile icon={FileText} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-bold text-slate-900">{app.property?.title ?? 'Property'}</p>
                      <p className="truncate text-[12.5px] text-slate-500">{dateLine}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold', statusPillClass(app.status))}>{presentation.label}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Requests */}
      {tab === 'requests' && (
        <div className="mt-6">
          <SectionHeading title="Requests" showViewAll={requests.length > 3} expanded={showAll} onToggle={() => setShowAll((s) => !s)} />
          {requests.length === 0 ? (
            <EmptyState
              title="No requests yet"
              paragraph="Application requests you've sent to landlords will appear here."
            />
          ) : (
            <div className="space-y-3">
              {visRequests.map((req) => {
                const pill = REQUEST_PILL[req.status] ?? { label: req.status, className: 'bg-slate-100 text-slate-500' };
                return (
                  <div
                    key={req.id}
                    className="flex w-full items-center gap-3 rounded-[24px] bg-white p-4 text-left shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)]"
                  >
                    <IconTile icon={Send} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-bold text-slate-900">{req.propertyTitle}</p>
                      <p className="truncate text-[12.5px] text-slate-500">Requested {shortDate(req.createdAt)}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold', pill.className)}>{pill.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Application tips */}
      <button
        type="button"
        onClick={() => setTipsOpen(true)}
        className="mt-6 w-full rounded-[28px] bg-white p-5 text-left shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)] transition-transform active:scale-[0.99]"
      >
        <div className="flex items-start gap-3">
          <IconTile icon={Lightbulb} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold text-slate-900">Application tips</p>
            <p className="text-[12.5px] font-semibold text-orange-600">Improve your chances</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">Follow our tips to make your application stand out.</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-orange-400" />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {APPLICATION_TIPS.map((tip) => (
            <div key={tip.label} className="flex flex-col items-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50">
                <tip.icon className="h-5 w-5 text-orange-500" />
              </span>
              <p className="mt-1.5 text-[10.5px] leading-tight text-slate-500">{tip.label}</p>
            </div>
          ))}
        </div>
      </button>

      {/* What you'll need to apply */}
      <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-500" />
          <h3 className="text-[16px] font-extrabold text-slate-900">What you'll need to apply</h3>
        </div>
        {APPLICATION_DOCS.map((group) => (
          <div key={group.title} className="mt-4">
            <p className="text-[11.5px] font-bold uppercase tracking-wide text-orange-600">{group.title}</p>
            <ul className="mt-2 space-y-2">
              {group.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  <span className="text-[13px] leading-snug text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <Lock className="h-3.5 w-3.5" /> Your data is secure and only visible to you.
      </p>

      {/* Application tips dialog */}
      <Dialog open={tipsOpen} onOpenChange={setTipsOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Application tips</DialogTitle>
          </DialogHeader>
          <ol className="space-y-4 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100"><User className="h-4 w-4 text-orange-600" /></span>
              <span><b className="text-slate-900">Complete your profile.</b> Landlords trust applicants whose details are filled in.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100"><FileText className="h-4 w-4 text-orange-600" /></span>
              <span><b className="text-slate-900">Provide accurate information.</b> Double-check your income and employment details.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100"><BadgeCheck className="h-4 w-4 text-orange-600" /></span>
              <span><b className="text-slate-900">Include supporting documents.</b> Payslips and ID speed up the landlord's decision.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100"><MessageCircle className="h-4 w-4 text-orange-600" /></span>
              <span><b className="text-slate-900">Respond quickly.</b> Reply to landlord messages to keep your application moving.</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>

      {user && (
        <RequestApplicationSheet
          open={requestOpen}
          onOpenChange={setRequestOpen}
          userId={user.id}
          duplicateContext={{
            activeInvitePropertyIds: invitationItems.filter((i) => !i.expired).map((i) => i.propertyId),
            applications: applications.map((a) => ({ property_id: a.property_id, status: a.status })),
            draftPropertyIds: drafts.map((d) => d.property_id),
            pendingRequestPropertyIds
          }}
          onDuplicateAction={(action, propertyId) => {
            if (action === 'view-invitation') {
              changeTab('invitations');
            } else if (action === 'continue-application') {
              const draft = draftByPropertyId.get(propertyId);
              if (draft) continueDraft(draft);
            } else {
              const app = applications.find((a) => a.property_id === propertyId);
              if (app) navigate(`/application/${app.id}`);
            }
          }}
          onRequestSent={() => {
            void refreshApplications();
            void refreshInvites();
            void refreshDrafts();
          }}
        />
      )}
    </section>
  );
};
