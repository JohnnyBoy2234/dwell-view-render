import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { RecordCard, type RecordCardDetail } from '@mzanzihomes/ui/components/RecordCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { cn } from '@mzanzihomes/common/lib/utils';
import {
  AlertCircle, ChevronRight, FileText, Inbox, Info, Lock, Plus, RefreshCw, Send,
} from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useApplicationInvites, type InviteWithDetails } from '../hooks/useApplicationInvites';
import { useTenantApplications, type TenantApplication } from '../hooks/useTenantApplications';
import { useApplicationDrafts, type ApplicationDraftSummary } from '../hooks/useApplicationDrafts';
import {
  applicationStatusPresentation,
  DRAFT_PRESENTATION,
  EXPIRED_INVITE_PRESENTATION,
  INVITE_PRESENTATION,
  isInviteExpired,
  trackApplicationsEvent,
  type StatusPresentation
} from '../applicationPresentation';
import { RequestApplicationSheet } from './RequestApplicationSheet';

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

function propertyDetails(title: string, location: string | null, price: number | null): RecordCardDetail[] {
  const details: RecordCardDetail[] = [];
  if (price) details.push({ label: 'Rent', value: `R${price.toLocaleString()}/month` });
  const loc = locationLine(title, location);
  if (loc) details.push({ label: 'Location', value: loc });
  return details;
}

const presentationBadge = (presentation: StatusPresentation) => ({
  label: presentation.label,
  variant: presentation.badgeVariant,
  className: presentation.badgeClassName
});

const REQUEST_BADGE: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'bg-amber-100 text-amber-700 border-transparent' },
  accepted: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700 border-transparent' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-600 border-transparent' },
};

const CardSkeleton = () => (
  <Card aria-hidden="true">
    <CardContent className="p-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
      <div className="h-8 w-36 rounded bg-muted animate-pulse" />
    </CardContent>
  </Card>
);

/** Illustrated empty state, matching the tile-page design reference. */
/** Premium 3D open-envelope illustration with a letter emerging, a soft blue
 * glow, sparkles and a notification badge — the Invitations empty-state art. */
function InvitationEnvelope() {
  return (
    <div className="mx-auto w-44 animate-soft-float">
      <svg viewBox="0 0 240 200" className="h-auto w-full" role="img" aria-label="Open envelope with a letter">
        <defs>
          <radialGradient id="env-glow" cx="50%" cy="46%" r="55%">
            <stop offset="0%" stopColor="#7ea4f0" stopOpacity="0.38" />
            <stop offset="55%" stopColor="#7ea4f0" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#7ea4f0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="env-doc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#eef4fe" />
          </linearGradient>
          <linearGradient id="env-pocket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2edfc" />
            <stop offset="1" stopColor="#b7d0f8" />
          </linearGradient>
          <linearGradient id="env-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#adc8f7" />
            <stop offset="1" stopColor="#89aef2" />
          </linearGradient>
          <linearGradient id="env-right" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9cbdf5" />
            <stop offset="1" stopColor="#7aa1ef" />
          </linearGradient>
          <linearGradient id="env-bell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4f8dff" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
          <clipPath id="env-body">
            <rect x="56" y="104" width="128" height="62" rx="16" />
          </clipPath>
          <filter id="env-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#3b5bab" floodOpacity="0.16" />
          </filter>
          <filter id="env-blur"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>

        {/* Soft blue glow behind everything */}
        <ellipse cx="120" cy="98" rx="104" ry="86" fill="url(#env-glow)" />

        {/* Gentle floating shadow (soft, not harsh) */}
        <ellipse cx="120" cy="178" rx="60" ry="8" fill="#5c7fc0" opacity="0.16" filter="url(#env-blur)" />

        {/* Back flap hint behind the letter */}
        <path d="M64 106 Q120 74 176 106 L176 120 L64 120 Z" fill="#cfe0fb" opacity="0.7" />

        {/* Letter emerging from the envelope */}
        <g filter="url(#env-soft)">
          <rect x="80" y="50" width="80" height="92" rx="10" fill="url(#env-doc)" />
          <circle cx="99" cy="72" r="9" fill="#3b82f6" />
          <rect x="113" y="66" width="34" height="5" rx="2.5" fill="#cfe0fb" />
          <rect x="113" y="76" width="24" height="5" rx="2.5" fill="#dfeafc" />
          <rect x="90" y="97" width="60" height="5" rx="2.5" fill="#dfeafc" />
          <rect x="90" y="108" width="60" height="5" rx="2.5" fill="#dfeafc" />
          <rect x="90" y="119" width="40" height="5" rx="2.5" fill="#dfeafc" />
        </g>

        {/* Envelope front — side flaps + centre pocket (clipped for rounded base) */}
        <g clipPath="url(#env-body)">
          <path d="M56 104 L120 128 L56 166 Z" fill="url(#env-left)" />
          <path d="M184 104 L120 128 L184 166 Z" fill="url(#env-right)" />
          <path d="M56 166 L120 128 L184 166 Z" fill="url(#env-pocket)" />
          {/* subtle inner shadow where the letter meets the opening */}
          <path d="M56 104 L120 128 L184 104 Z" fill="#2b3f6b" opacity="0.10" />
        </g>

        {/* Notification badge */}
        <g filter="url(#env-soft)">
          <circle cx="182" cy="66" r="16" fill="url(#env-bell)" />
          <path
            d="M182 59 a5 5 0 0 1 5 5 c0 4 1.6 5.4 2.6 6.2 a0.8 0.8 0 0 1 -0.5 1.4 h-14.2 a0.8 0.8 0 0 1 -0.5 -1.4 c1 -0.8 2.6 -2.2 2.6 -6.2 a5 5 0 0 1 5 -5 z"
            fill="#ffffff"
          />
          <path d="M180 73.5 a2.2 2.2 0 0 0 4 0 z" fill="#ffffff" />
        </g>

        {/* Sparkles */}
        <g fill="none" strokeLinecap="round">
          <path d="M70 78 l0 8 M66 82 l8 0" stroke="#5b8def" strokeWidth="2.4" opacity="0.7" />
          <path d="M92 56 l0 6 M89 59 l6 0" stroke="#4fd1c5" strokeWidth="2.2" opacity="0.7" />
          <path d="M156 100 l0 6 M153 103 l6 0" stroke="#a78bfa" strokeWidth="2.2" opacity="0.7" />
          <circle cx="150" cy="60" r="1.8" fill="#f6c454" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  illustration,
  title,
  paragraphs,
  action
}: {
  icon: React.ComponentType<{ className?: string }>;
  illustration?: React.ReactNode;
  title: string;
  paragraphs: string[];
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
      {illustration ?? (
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full" style={{ background: '#eef3fd' }}>
          <Icon className="h-12 w-12 text-blue-400" />
        </div>
      )}
      <h2 className="mt-4 text-[22px] font-extrabold text-slate-900">{title}</h2>
      {paragraphs.map((p) => (
        <p key={p} className="mt-2 text-[14px] leading-relaxed text-slate-500">{p}</p>
      ))}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
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
  const [requestOpen, setRequestOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
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

  const loading = invitesLoading || applicationsLoading || draftsLoading;

  const openRequestSheet = () => {
    trackApplicationsEvent(user?.id, 'manual_application_request_opened', {});
    setRequestOpen(true);
  };

  const changeTab = (value: TabKey) => {
    setTab(value);
    trackApplicationsEvent(user?.id, 'applications_tab_changed', { tab: value });
  };

  const continueDraft = (draft: ApplicationDraftSummary) =>
    navigate(`/rental-application/${draft.property_id}?landlord=${draft.landlord_id}`);

  const SEGMENTS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; count: number }[] = [
    { key: 'invitations',  label: 'Invitations',  icon: Inbox,    count: activeInvitationCount },
    { key: 'applications', label: 'Applications', icon: FileText, count: applicationCount },
    { key: 'requests',     label: 'Requests',     icon: Send,     count: pendingRequestPropertyIds.length },
  ];

  return (
    // pb-24 keeps the last card's action clear of the mobile bottom navigation
    <section className="mx-auto w-full max-w-2xl pb-24 md:pb-8" aria-label="Your applications">
      {/* Primary action */}
      <button
        type="button"
        onClick={openRequestSheet}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-bold text-white shadow-[0_14px_26px_-12px_rgba(29,78,216,0.6)] active:scale-[0.99]"
        style={{ background: '#1d4ed8' }}
      >
        <Plus className="h-5 w-5" /> Request an application
      </button>

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
                'flex flex-1 flex-col items-center gap-1.5 py-2.5',
                i < SEGMENTS.length - 1 && 'border-r border-slate-100'
              )}
            >
              <seg.icon className={cn('h-6 w-6', active ? 'text-blue-600' : 'text-slate-500')} />
              <span className={cn('flex items-center gap-1.5 text-[13.5px]', active ? 'font-bold text-blue-600' : 'font-semibold text-slate-600')}>
                {seg.label}
                <span className={cn(
                  'rounded-full px-2 text-[11px] font-bold leading-5',
                  active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                )}>
                  {seg.count}
                </span>
              </span>
              <span className={cn('h-[3px] w-14 rounded-full', active ? 'bg-blue-600' : 'bg-transparent')} />
            </button>
          );
        })}
      </div>

      {tab === 'invitations' && (
        <div className="mt-5 space-y-3">
          {invitesError && (
            <ErrorBanner message="We could not load your invitations." onRetry={refreshInvites} />
          )}
          {invitesLoading && invitationItems.length === 0 ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading invitations">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : invitationItems.length === 0 && !invitesError ? (
            <EmptyState
              icon={Inbox}
              illustration={<InvitationEnvelope />}
              title="No invitations yet"
              paragraphs={[
                'When a landlord invites you to apply for a property, it will appear here.',
                "You can also request an application if you've already spoken to a landlord.",
              ]}
              action={
                <button
                  type="button"
                  onClick={() => setHowItWorksOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-5 py-3 text-[14px] font-bold text-blue-600 active:scale-[0.98]"
                >
                  <Info className="h-4 w-4" /> How do invitations work? <ChevronRight className="h-4 w-4" />
                </button>
              }
            />
          ) : (
            <div className="grid gap-4">
              {invitationItems.map((item) => {
                const draft = draftByPropertyId.get(item.propertyId);
                const presentation = item.expired ? EXPIRED_INVITE_PRESENTATION : INVITE_PRESENTATION;
                const ctaLabel = item.expired ? null : draft ? 'Continue application' : 'Start application';
                const dateLine = item.expired
                  ? `Expired ${item.expiresAt ? shortDate(item.expiresAt) : ''}`.trim()
                  : `Invited ${shortDate(item.invitedOn)}`;
                return (
                  <RecordCard
                    key={item.key}
                    title={item.propertyTitle}
                    dateLine={dateLine}
                    badge={presentationBadge(presentation)}
                    details={propertyDetails(item.propertyTitle, item.location, item.price)}
                    actions={
                      ctaLabel && (
                        <Button
                          size="sm"
                          onClick={() => {
                            trackApplicationsEvent(user?.id, draft ? 'application_continue_clicked' : 'application_start_clicked', {
                              source: 'invitation'
                            });
                            navigate(draft ? `/rental-application/${item.propertyId}?landlord=${draft.landlord_id}` : item.startPath);
                          }}
                        >
                          {ctaLabel}
                        </Button>
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'applications' && (
        <div className="mt-5 space-y-3">
          {applicationsError && (
            <ErrorBanner message="We could not load your applications." onRetry={refreshApplications} />
          )}
          {loading && applicationCount === 0 ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading applications">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : applicationCount === 0 && !applicationsError ? (
            <EmptyState
              icon={FileText}
              title="No applications yet"
              paragraphs={['Applications you start or submit will appear here.']}
              action={
                activeInvitationCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => changeTab('invitations')}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-5 py-3 text-[14px] font-bold text-blue-600 active:scale-[0.98]"
                  >
                    View invitations <ChevronRight className="h-4 w-4" />
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4">
              {draftRecords.map((draft) => (
                <RecordCard
                  key={`draft-${draft.id}`}
                  title={draft.property?.title ?? 'Property'}
                  dateLine={`Updated ${shortDate(draft.updated_at)}`}
                  badge={presentationBadge(DRAFT_PRESENTATION)}
                  details={propertyDetails(
                    draft.property?.title ?? 'Property',
                    draft.property?.location ?? null,
                    draft.property?.price ?? null
                  )}
                  extra={
                    <div className="space-y-1">
                      <Progress value={draft.completionPercentage} aria-label="Application progress" />
                      <p className="text-xs text-muted-foreground">{draft.completionPercentage}% complete</p>
                    </div>
                  }
                  actions={
                    <Button
                      size="sm"
                      onClick={() => {
                        trackApplicationsEvent(user?.id, 'application_continue_clicked', { source: 'draft' });
                        continueDraft(draft);
                      }}
                    >
                      Continue application
                    </Button>
                  }
                />
              ))}
              {applicationRecords.map((app) => {
                const presentation = applicationStatusPresentation(app.status);
                const dateLine =
                  app.status === 'pending' || app.status === 'submitted'
                    ? `Submitted ${shortDate(app.created_at)}`
                    : `Updated ${shortDate(app.updated_at ?? app.created_at)}`;
                return (
                  <RecordCard
                    key={app.id}
                    title={app.property?.title ?? 'Property'}
                    dateLine={dateLine}
                    badge={presentationBadge(presentation)}
                    details={propertyDetails(
                      app.property?.title ?? 'Property',
                      app.property?.location ?? null,
                      app.property?.price ?? null
                    )}
                    actions={
                      presentation.cta && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            trackApplicationsEvent(user?.id, 'application_status_viewed', { status: app.status });
                            navigate(`/application/${app.id}`);
                          }}
                        >
                          {presentation.cta}
                        </Button>
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="mt-5 space-y-3">
          {requests.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No requests yet"
              paragraphs={[
                'When you request an application from a landlord, it will appear here while you wait for their reply.',
              ]}
              action={
                <button
                  type="button"
                  onClick={openRequestSheet}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-5 py-3 text-[14px] font-bold text-blue-600 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" /> Request an application
                </button>
              }
            />
          ) : (
            <div className="grid gap-4">
              {requests.map((req) => {
                const badge = REQUEST_BADGE[req.status] ?? { label: req.status, className: 'bg-slate-100 text-slate-600 border-transparent' };
                return (
                  <RecordCard
                    key={req.id}
                    title={req.propertyTitle}
                    dateLine={`Requested ${shortDate(req.createdAt)}`}
                    badge={{ label: badge.label, variant: 'secondary', className: badge.className }}
                    details={propertyDetails(req.propertyTitle, req.location, req.price)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <Lock className="h-3.5 w-3.5" /> Your data is secure and only visible to you.
      </p>

      {/* How invitations work */}
      <Dialog open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>How invitations work</DialogTitle>
          </DialogHeader>
          <ol className="space-y-4 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-bold text-blue-600">1</span>
              A landlord invites you to apply — usually after a viewing or a chat about their property.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-bold text-blue-600">2</span>
              The invitation appears here. Open it to start your application with the property already filled in.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-bold text-blue-600">3</span>
              Submit and track its status in the Applications tab — you'll be notified when the landlord responds.
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
              setTab('invitations');
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
