import { useEffect, useMemo, useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@mzanzihomes/ui/components/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@mzanzihomes/ui/components/sheet';
import { Input } from '@mzanzihomes/ui/components/input';
import { useIsMobile } from '@mzanzihomes/ui/hooks/use-mobile';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { Loader2 } from 'lucide-react';
import { createApplicationRequest } from '../services/applicationRequestService';
import {
  duplicateRequestReason,
  trackApplicationsEvent,
  type DuplicateRequestCheckInput,
  type DuplicateRequestReason
} from '../applicationPresentation';
import { PropertyThumbnail } from './PropertyThumbnail';

export interface RequestLeadOption {
  conversation_id: string;
  property_id: string;
  landlord_id: string;
  title: string;
  location: string | null;
  image: string | null;
  landlord_name: string | null;
  last_message_at: string | null;
}

interface RequestApplicationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  /** Existing records used to explain duplicates instead of erroring. */
  duplicateContext: Omit<DuplicateRequestCheckInput, 'propertyId'>;
  onDuplicateAction: (action: NonNullable<DuplicateRequestReason['action']>, propertyId: string) => void;
  onRequestSent: () => void;
}

/**
 * Manual application-request flow: bottom sheet on mobile, dialog on desktop.
 * Loads the tenant's recent landlord conversations as recognisable options
 * and blocks duplicates with a state-specific explanation before submitting.
 */
export function RequestApplicationSheet({
  open,
  onOpenChange,
  userId,
  duplicateContext,
  onDuplicateAction,
  onRequestSent
}: RequestApplicationSheetProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [options, setOptions] = useState<RequestLeadOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId('');
    setSearch('');
    let cancelled = false;
    (async () => {
      setOptionsLoading(true);
      try {
        const { data: convs, error } = await (supabase.from('conversations') as any)
          .select('id, property_id, landlord_id, last_message_at')
          .eq('tenant_id', userId)
          .order('last_message_at', { ascending: false })
          .limit(20);
        if (error) throw error;

        const rows = (convs ?? []) as any[];
        const propertyIds = Array.from(new Set(rows.map((c) => c.property_id).filter(Boolean)));
        const landlordIds = Array.from(new Set(rows.map((c) => c.landlord_id).filter(Boolean)));
        const [propsRes, profilesRes] = await Promise.all([
          propertyIds.length
            ? (supabase.from('properties') as any).select('id, title, location, images').in('id', propertyIds)
            : Promise.resolve({ data: [] }),
          landlordIds.length
            ? (supabase.from('profiles') as any).select('user_id, display_name').in('user_id', landlordIds)
            : Promise.resolve({ data: [] })
        ]);
        const propsById = new Map(((propsRes.data ?? []) as any[]).map((p) => [p.id, p]));
        const profilesById = new Map(((profilesRes.data ?? []) as any[]).map((p) => [p.user_id, p]));

        const mapped: RequestLeadOption[] = rows
          .filter((c) => c.property_id && c.landlord_id)
          .map((c) => {
            const property = propsById.get(c.property_id);
            return {
              conversation_id: c.id,
              property_id: c.property_id,
              landlord_id: c.landlord_id,
              title: property?.title ?? 'Property',
              location: property?.location ?? null,
              image: property?.images?.[0] ?? null,
              landlord_name: profilesById.get(c.landlord_id)?.display_name ?? null,
              last_message_at: c.last_message_at ?? null
            };
          });
        if (!cancelled) {
          setOptions(mapped);
          setOptionsError(false);
        }
      } catch (e) {
        console.error('Failed to load request options', e);
        if (!cancelled) setOptionsError(true);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) =>
        o.title.toLowerCase().includes(term) ||
        (o.location ?? '').toLowerCase().includes(term) ||
        (o.landlord_name ?? '').toLowerCase().includes(term)
    );
  }, [options, search]);

  const selected = options.find((o) => o.conversation_id === selectedId) ?? null;
  const duplicate = selected
    ? duplicateRequestReason({ ...duplicateContext, propertyId: selected.property_id })
    : null;

  const sendRequest = async () => {
    if (!selected || submitting || duplicate) return;
    setSubmitting(true);
    trackApplicationsEvent(userId, 'manual_application_request_submitted', {});
    try {
      await createApplicationRequest({
        property_id: selected.property_id,
        tenant_id: userId,
        landlord_id: selected.landlord_id
      });
      trackApplicationsEvent(userId, 'manual_application_request_succeeded', {});
      toast({
        title: 'Application request sent to the landlord.',
        description: 'You will be notified when the landlord responds.'
      });
      onOpenChange(false);
      onRequestSent();
    } catch (error: any) {
      trackApplicationsEvent(userId, 'manual_application_request_failed', {});
      console.error('Application request failed', error);
      const alreadyRequested = typeof error?.message === 'string' && error.message.includes('already requested');
      toast({
        variant: 'destructive',
        title: alreadyRequested
          ? 'An application request has already been sent for this property.'
          : 'We could not send your request. Check your connection and try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const duplicateActionLabel: Record<NonNullable<DuplicateRequestReason['action']>, string> = {
    'view-invitation': 'View invitation',
    'continue-application': 'Continue application',
    'view-application': 'View application'
  };

  const body = (
    <div className="space-y-4">
      {optionsLoading ? (
        <div className="space-y-2" aria-label="Loading properties">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : optionsError ? (
        <p className="text-sm text-muted-foreground py-4" role="alert">
          We could not load your recent conversations. Close this and try again.
        </p>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No recent landlord conversations found. Message a landlord about a property first, then
          request an application here.
        </p>
      ) : (
        <>
          {options.length > 5 && (
            <Input
              placeholder="Search by property or landlord"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search properties"
            />
          )}
          <div
            role="radiogroup"
            aria-label="Choose a property"
            className="space-y-2 max-h-[45vh] overflow-y-auto pr-1"
          >
            {filteredOptions.map((option) => {
              const isSelected = option.conversation_id === selectedId;
              return (
                <button
                  key={option.conversation_id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setSelectedId(option.conversation_id);
                    trackApplicationsEvent(userId, 'manual_application_request_property_selected', {});
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg border p-2 text-left transition-colors min-h-[44px] ${
                    isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <PropertyThumbnail
                    src={option.image}
                    propertyTitle={option.title}
                    className="h-12 w-16 shrink-0 rounded-md"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{option.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {[option.location, option.landlord_name].filter(Boolean).join(' • ')}
                    </span>
                    {option.last_message_at && (
                      <span className="block text-xs text-muted-foreground">
                        Last message {new Date(option.last_message_at).toLocaleDateString()}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {filteredOptions.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No properties match your search.</p>
            )}
          </div>
        </>
      )}

      {duplicate && selected && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2" role="alert">
          <p className="text-sm">{duplicate.message}</p>
          {duplicate.action && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onDuplicateAction(duplicate.action!, selected.property_id);
              }}
            >
              {duplicateActionLabel[duplicate.action]}
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2 pt-1">
        {!selected && !optionsLoading && options.length > 0 && (
          <p className="text-xs text-muted-foreground" id="request-helper">
            Select a property to continue.
          </p>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={sendRequest}
            disabled={!selected || !!duplicate || submitting}
            aria-describedby={!selected ? 'request-helper' : undefined}
            className="min-h-[44px]"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting ? 'Sending…' : 'Send application request'}
          </Button>
        </div>
      </div>
    </div>
  );

  const title = 'Request an application';
  const description = 'Choose a property or recent landlord conversation.';

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
