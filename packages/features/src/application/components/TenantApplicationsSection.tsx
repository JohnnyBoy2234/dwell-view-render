import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
import { AlertCircle, Mail, Plus, RefreshCw } from 'lucide-react';
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
import { PropertyThumbnail } from './PropertyThumbnail';
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
  image: string | null;
  invitedOn: string;
  expiresAt: string | null;
  expired: boolean;
  startPath: string;
}

interface CardShellProps {
  presentation: StatusPresentation;
  propertyTitle: string;
  location: string | null;
  price: number | null;
  image: string | null;
  dateLine: string;
  extra?: React.ReactNode;
  ctaLabel?: string | null;
  onCta?: () => void;
  onImageFailed: () => void;
}

/** Shared card layout for invitations, drafts, and applications. Kept sparse
 * on purpose: title, location/price, one status row, one action — everything
 * else lives on the detail screens. */
function RecordCard({
  presentation,
  propertyTitle,
  location,
  price,
  image,
  dateLine,
  extra,
  ctaLabel,
  onCta,
  onImageFailed
}: CardShellProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-3">
          <PropertyThumbnail
            src={image}
            propertyTitle={propertyTitle}
            className="h-16 w-20 shrink-0 rounded-lg"
            onLoadFailed={onImageFailed}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-base font-semibold leading-snug line-clamp-2">{propertyTitle}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {[price ? `R${price.toLocaleString()}/m` : null, location].filter(Boolean).join(' • ')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={presentation.badgeVariant} className={presentation.badgeClassName}>
                {presentation.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{dateLine}</span>
            </div>
          </div>
        </div>

        {extra}

        {ctaLabel && onCta && (
          <Button className="w-full sm:w-auto min-h-[44px]" onClick={onCta}>
            {ctaLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

const CardSkeleton = () => (
  <Card aria-hidden="true">
    <CardContent className="p-4 space-y-3">
      <div className="flex gap-3">
        <div className="h-20 w-24 shrink-0 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="h-10 w-full rounded bg-muted animate-pulse" />
    </CardContent>
  </Card>
);

function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-10 text-center space-y-3">
        <Mail className="h-8 w-8 mx-auto text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
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

  const [tab, setTab] = useState<'invitations' | 'applications'>('invitations');
  const [requestOpen, setRequestOpen] = useState(false);
  const [pendingRequestPropertyIds, setPendingRequestPropertyIds] = useState<string[]>([]);

  useEffect(() => {
    trackApplicationsEvent(user?.id, 'applications_page_viewed', {});
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase.from('application_requests') as any)
        .select('property_id')
        .eq('tenant_id', user.id)
        .eq('status', 'pending');
      setPendingRequestPropertyIds(((data ?? []) as any[]).map((r) => r.property_id));
    })();
  }, [user?.id, requestOpen]);

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
      image: inv.property?.images?.[0] ?? null,
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
        image: app.property?.images?.[0] ?? null,
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

  const requestButton = (
    <Button type="button" variant="outline" size="sm" onClick={() => {
      trackApplicationsEvent(user?.id, 'manual_application_request_opened', {});
      setRequestOpen(true);
    }}>
      <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Request an application
    </Button>
  );

  const onThumbnailFailed = () => trackApplicationsEvent(user?.id, 'property_thumbnail_failed', {});

  const continueDraft = (draft: ApplicationDraftSummary) =>
    navigate(`/rental-application/${draft.property_id}?landlord=${draft.landlord_id}`);

  return (
    // pb-24 keeps the last card's action clear of the mobile bottom navigation
    <section className="mb-8 pb-24 md:pb-0" aria-label="Your applications">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Your applications</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View landlord invitations and track your rental applications.
          </p>
        </div>
        <div className="shrink-0">{requestButton}</div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as 'invitations' | 'applications');
          trackApplicationsEvent(user?.id, 'applications_tab_changed', { tab: value });
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger
            value="invitations"
            className="data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-border"
          >
            Invitations{activeInvitationCount > 0 && ` (${activeInvitationCount})`}
          </TabsTrigger>
          <TabsTrigger
            value="applications"
            className="data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-border"
          >
            Applications{applicationCount > 0 && ` (${applicationCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invitations" className="mt-4 space-y-3">
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
              title="No invitations yet"
              description="When a landlord invites you to apply, the invitation will appear here. Use the request option if you have already spoken to a landlord."
              action={requestButton}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    presentation={presentation}
                    propertyTitle={item.propertyTitle}
                    location={item.location}
                    price={item.price}
                    image={item.image}
                    dateLine={dateLine}
                    ctaLabel={ctaLabel}
                    onCta={() => {
                      trackApplicationsEvent(user?.id, draft ? 'application_continue_clicked' : 'application_start_clicked', {
                        source: 'invitation'
                      });
                      navigate(draft ? `/rental-application/${item.propertyId}?landlord=${draft.landlord_id}` : item.startPath);
                    }}
                    onImageFailed={onThumbnailFailed}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications" className="mt-4 space-y-3">
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
              title="No applications yet"
              description="Applications you start or submit will appear here."
              action={
                activeInvitationCount > 0 ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setTab('invitations')}>
                    View invitations
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {draftRecords.map((draft) => (
                <RecordCard
                  key={`draft-${draft.id}`}
                  presentation={DRAFT_PRESENTATION}
                  propertyTitle={draft.property?.title ?? 'Property'}
                  location={draft.property?.location ?? null}
                  price={draft.property?.price ?? null}
                  image={draft.property?.images?.[0] ?? null}
                  dateLine={`Updated ${shortDate(draft.updated_at)}`}
                  extra={
                    <div className="space-y-1">
                      <Progress value={draft.completionPercentage} aria-label="Application progress" />
                      <p className="text-xs text-muted-foreground">{draft.completionPercentage}% complete</p>
                    </div>
                  }
                  ctaLabel="Continue application"
                  onCta={() => {
                    trackApplicationsEvent(user?.id, 'application_continue_clicked', { source: 'draft' });
                    continueDraft(draft);
                  }}
                  onImageFailed={onThumbnailFailed}
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
                    presentation={presentation}
                    propertyTitle={app.property?.title ?? 'Property'}
                    location={app.property?.location ?? null}
                    price={app.property?.price ?? null}
                    image={app.property?.images?.[0] ?? null}
                    dateLine={dateLine}
                    ctaLabel={presentation.cta}
                    onCta={() => {
                      trackApplicationsEvent(user?.id, 'application_status_viewed', { status: app.status });
                      navigate(`/application/${app.id}`);
                    }}
                    onImageFailed={onThumbnailFailed}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
