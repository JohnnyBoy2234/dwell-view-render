// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Settings, CreditCard, Shield, ShieldCheck, FileText, HelpCircle, LogOut,
} from 'lucide-react';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@mzanzihomes/ui/components/dropdown-menu';
import { BillingSubscriptionDialog } from './BillingSubscriptionDialog';

// Avatar in the dashboard header's top-right corner (Slack/Google style).
// Replaces the old separate Profile tab — account actions live in this menu.
export function UserMenu({ variant = 'dark' }: { variant?: 'dark' | 'light' } = {}) {
  const { user, isLandlord, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name?: string | null; avatar_url?: string | null } | null>(null);
  const [billingOpen, setBillingOpen] = useState(false);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setProfile(data); });
    return () => { cancelled = true; };
  }, [user]);

  const displayName =
    profile?.display_name ||
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Account';
  const initials = displayName
    .split(/\s+/)
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const go = (path: string) => () => navigate(path);

  // The admin panel is served only by the web app (mzanzihomes.com). The JT menu
  // also renders in the landlord/tenant apps (separate deployments with no /admin
  // route), so from there we jump to the web app's absolute URL instead of an
  // in-app navigation that would 404.
  const goAdmin = () => {
    const host = window.location.hostname;
    const isWebApp =
      host === 'mzanzihomes.com' || host === 'www.mzanzihomes.com' ||
      host === 'rentlekker.com' || host === 'www.rentlekker.com' ||
      host === 'localhost' || host === '127.0.0.1';
    if (isWebApp) navigate('/admin/dashboard');
    else window.location.href = 'https://mzanzihomes.com/admin/dashboard';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Account menu"
            className={
              variant === 'light'
                ? 'w-11 h-11 rounded-full overflow-hidden bg-white shadow-sm border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 hover:border-slate-300 active:scale-95 transition shrink-0'
                : 'w-9 h-9 rounded-full overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center text-xs font-bold text-white hover:border-white/45 transition-colors shrink-0'
            }
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl">
          <DropdownMenuLabel className="flex items-center gap-3 py-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-bold shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs font-normal text-muted-foreground truncate">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin ? (
            <>
              <DropdownMenuItem className="gap-2.5 py-2 font-semibold text-primary focus:text-primary" onClick={goAdmin}>
                <ShieldCheck className="w-4 h-4" /> Admin Panel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem className="gap-2.5 py-2" onClick={go(isLandlord ? '/enhancedlandlorddashboard/profile' : '/tenant/profile')}>
            <User className="w-4 h-4 text-muted-foreground" /> My Account
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2.5 py-2" onClick={go('/settings')}>
            <Settings className="w-4 h-4 text-muted-foreground" /> Settings
          </DropdownMenuItem>
          {isLandlord ? (
            <DropdownMenuItem className="gap-2.5 py-2" onClick={() => setBillingOpen(true)}>
              <CreditCard className="w-4 h-4 text-muted-foreground" /> Billing &amp; Subscription
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className="gap-2.5 py-2" onClick={go('/privacy-policy')}>
            <Shield className="w-4 h-4 text-muted-foreground" /> Privacy
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2.5 py-2" onClick={go('/terms')}>
            <FileText className="w-4 h-4 text-muted-foreground" /> Terms &amp; Conditions
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2.5 py-2" onClick={go(isLandlord ? '/enhancedlandlorddashboard/support' : '/tenant/support')}>
            <HelpCircle className="w-4 h-4 text-muted-foreground" /> Contact Support
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2.5 py-2 text-destructive focus:text-destructive"
            onClick={async () => { await signOut(); navigate('/auth'); }}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isLandlord ? <BillingSubscriptionDialog open={billingOpen} onOpenChange={setBillingOpen} /> : null}
    </>
  );
}
