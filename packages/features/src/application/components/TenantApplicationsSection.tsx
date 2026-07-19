import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { cn } from '@mzanzihomes/common/lib/utils';
import {
  AlertCircle, ChevronRight, FileText, Inbox, Lock, Plus, RefreshCw, Send,
  Mail, Lightbulb, User, BadgeCheck, MessageCircle,
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

const ORANGE = '#f97316';

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

/** Premium orange open-envelope illustration: a letter carrying a house emblem
 * emerges from the envelope, with soft hills, trees and sparkles behind. Shared
 * by the hero (large) and the empty states (smaller). */
function EnvelopeArt({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 240 200" className="h-full w-full" role="img" aria-label="Open envelope with a letter">
        <defs>
          <radialGradient id="ap-glow" cx="50%" cy="46%" r="55%">
            <stop offset="0%" stopColor="#fbbf77" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#fbbf77" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ap-doc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#fff3e8" />
          </linearGradient>
          <linearGradient id="ap-pocket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fcd4a6" />
            <stop offset="1" stopColor="#f7a94f" />
          </linearGradient>
          <linearGradient id="ap-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f9be74" />
            <stop offset="1" stopColor="#f39b3c" />
          </linearGradient>
          <linearGradient id="ap-right" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7ad57" />
            <stop offset="1" stopColor="#ef8a2b" />
          </linearGradient>
          <filter id="ap-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#c8721f" floodOpacity="0.18" />
          </filter>
          <clipPath id="ap-body"><rect x="48" y="100" width="144" height="80" rx="16" /></clipPath>
        </defs>

        <ellipse cx="120" cy="98" rx="108" ry="90" fill="url(#ap-glow)" />

        {/* hills */}
        <path d="M18 168 Q60 128 104 168 Z" fill="#fbe0c4" opacity="0.8" />
        <path d="M120 170 Q170 124 226 170 Z" fill="#fbdcbb" opacity="0.7" />

        {/* faint trees */}
        <g opacity="0.6">
          <rect x="45" y="150" width="4" height="12" rx="2" fill="#eec59a" />
          <path d="M47 131 l11 21 h-22 z" fill="#f2d0a8" />
          <rect x="198" y="150" width="4" height="12" rx="2" fill="#eec59a" />
          <path d="M200 136 l9 16 h-18 z" fill="#f2d0a8" />
        </g>

        {/* soft shadow under the envelope */}
        <ellipse cx="120" cy="190" rx="66" ry="8" fill="#c8721f" opacity="0.14" />

        {/* letter with a house emblem */}
        <g filter="url(#ap-soft)">
          <rect x="80" y="46" width="80" height="96" rx="10" fill="url(#ap-doc)" />
          <path d="M120 60 L136 73 L104 73 Z" fill="#f59e0b" />
          <rect x="108" y="72" width="24" height="18" rx="2" fill="#fcae3d" />
          <rect x="116" y="80" width="9" height="10" rx="1" fill="#ffffff" />
          <rect x="94" y="100" width="52" height="5" rx="2.5" fill="#fde3c6" />
          <rect x="94" y="111" width="52" height="5" rx="2.5" fill="#fde7d2" />
          <rect x="94" y="122" width="34" height="5" rx="2.5" fill="#fde7d2" />
        </g>

        {/* envelope front */}
        <g clipPath="url(#ap-body)">
          <path d="M48 100 L120 138 L48 180 Z" fill="url(#ap-left)" />
          <path d="M192 100 L120 138 L192 180 Z" fill="url(#ap-right)" />
          <path d="M48 180 L120 138 L192 180 Z" fill="url(#ap-pocket)" />
          <path d="M48 100 L120 138 L192 100 Z" fill="#8a4c12" opacity="0.10" />
        </g>

        {/* sparkles */}
        <g strokeLinecap="round" fill="none">
          <path d="M70 74 l0 8 M66 78 l8 0" stroke="#f7a94f" strokeWidth="2.4" opacity="0.75" />
          <path d="M156 96 l0 6 M153 99 l6 0" stroke="#fbbf24" strokeWidth="2.2" opacity="0.75" />
          <path d="M92 52 l0 6 M89 55 l6 0" stroke="#fdba74" strokeWidth="2" opacity="0.7" />
          <circle cx="150" cy="58" r="2" fill="#fb923c" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}

function EmptyState({ title, paragraph }: { title: string; paragraph: string }) {
  return (
    <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
      <EnvelopeArt className="mx-auto h-28 w-32 animate-soft-float" />
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
    const fromTokens: InvitationItem[] = invites.map((inv: InviteWithDetails) => ({
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

  const visInvites = showAll ? invitationItems : invitationItems.slice(0, 3);
  const visApps = showAll ? appList : appList.slice(0, 3);
  const visRequests = showAll ? requests : requests.slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-2xl pb-28 md:pb-10 animate-fade-in" aria-label="Your applications">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-[28px] p-5 shadow-[0_20px_44px_-28px_rgba(200,90,20,0.5)]"
        style={{ background: 'linear-gradient(135deg,#fdeadb 0%, #fbe0cf 100%)' }}
      >
        <EnvelopeArt className="pointer-events-none absolute -right-2 top-1/2 h-[150px] w-[176px] -translate-y-1/2 animate-soft-float" />
        <div className="relative z-10 max-w-[58%]">
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
                    className="flex w-full items-center gap-3 rounded-[24px] bg-white p-4 text-left shadow-[0_16px_34px_-26px_rgba(20,50,90,0.5)] transition-transform active:scale-[0.99] disabled:opacity-70"
                  >
                    <IconTile icon={Mail} />
                    <div className="min-w-0 flex-1">
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
