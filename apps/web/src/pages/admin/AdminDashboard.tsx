import { Link } from 'react-router-dom';
import {
  Users, Building2, ClipboardCheck, FileText, Banknote, Wrench, ShieldCheck,
  Headset, RefreshCw, ArrowUpRight, Activity, UserPlus, ChevronRight,
} from 'lucide-react';
import { useAdminStats, type ActivityItem, type ActivityType } from '@/hooks/useAdminStats';
import { SupportMessagesAdmin } from '@/components/admin/SupportMessagesAdmin';

const zar = (v: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(v || 0);

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

interface StatDef {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;   // icon color
  bg: string;     // icon chip background
}

const ACTIVITY_META: Record<ActivityType, { icon: React.ComponentType<{ className?: string }>; tint: string; bg: string }> = {
  user:        { icon: UserPlus,       tint: '#2563eb', bg: '#eff4ff' },
  property:    { icon: Building2,      tint: '#4f46e5', bg: '#eef0ff' },
  application: { icon: ClipboardCheck, tint: '#ea580c', bg: '#fff1e8' },
  lease:       { icon: FileText,       tint: '#7c3aed', bg: '#f3edff' },
  support:     { icon: Headset,        tint: '#e11d48', bg: '#ffeef2' },
  maintenance: { icon: Wrench,         tint: '#d97706', bg: '#fff6e6' },
};

function StatCard({ s, loading }: { s: StatDef; loading: boolean }) {
  const Icon = s.icon;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-18px_rgba(16,24,40,0.25)]">
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: s.bg }}>
          <Icon className="h-5 w-5" style={{ color: s.tint }} />
        </span>
      </div>
      <p className="mt-4 text-[13px] font-medium text-slate-500">{s.label}</p>
      <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-slate-900">
        {loading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-slate-100" /> : s.value}
      </p>
      <p className="mt-1.5 text-[12px] text-slate-400">{s.sub}</p>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const m = ACTIVITY_META[item.type];
  const Icon = m.icon;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: m.bg }}>
        <Icon className="h-4 w-4" style={{ color: m.tint }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-slate-800">{item.title}</p>
        {item.detail ? <p className="truncate text-[12px] text-slate-400">{item.detail}</p> : null}
      </div>
      <span className="shrink-0 text-[11.5px] font-medium text-slate-400">{timeAgo(item.at)}</span>
    </div>
  );
}

const QUICK_LINKS = [
  { label: 'User Management', to: '/admin/users', icon: Users },
  { label: 'Properties', to: '/admin/properties', icon: Building2 },
  { label: 'Applications', to: '/admin/applications', icon: ClipboardCheck },
  { label: 'Leases & Contracts', to: '/admin/leases', icon: FileText },
  { label: 'Payments', to: '/admin/payments', icon: Banknote },
  { label: 'KYC Verification', to: '/admin/kyc', icon: ShieldCheck },
  { label: 'Documents', to: '/admin/documents', icon: FileText },
  { label: 'Property Reports', to: '/admin/reports', icon: Activity },
  { label: 'Support Tickets', to: '/admin/support', icon: Headset },
];

export default function AdminDashboard() {
  const { stats, activity, loading, refresh } = useAdminStats();

  const cards: StatDef[] = [
    { label: 'Total Users', value: String(stats.users), sub: `${stats.landlords} landlords · ${stats.tenants} tenants`, icon: Users, tint: '#2563eb', bg: '#eff4ff' },
    { label: 'Properties', value: String(stats.properties), sub: `${stats.listedProperties} listed`, icon: Building2, tint: '#4f46e5', bg: '#eef0ff' },
    { label: 'Applications', value: String(stats.applications), sub: `${stats.pendingApplications} awaiting review`, icon: ClipboardCheck, tint: '#ea580c', bg: '#fff1e8' },
    { label: 'Leases', value: String(stats.leases), sub: `${stats.signedLeases} signed`, icon: FileText, tint: '#7c3aed', bg: '#f3edff' },
    { label: 'Payments', value: zar(stats.transactionValue), sub: `${stats.transactions} transactions`, icon: Banknote, tint: '#059669', bg: '#e7f8f0' },
    { label: 'Maintenance', value: String(stats.openMaintenance), sub: 'open requests', icon: Wrench, tint: '#d97706', bg: '#fff6e6' },
    { label: 'KYC Pending', value: String(stats.pendingKyc), sub: 'awaiting verification', icon: ShieldCheck, tint: '#0d9488', bg: '#e6f7f5' },
    { label: 'Support', value: String(stats.openSupport), sub: 'open tickets', icon: Headset, tint: '#e11d48', bg: '#ffeef2' },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Overview</h1>
          <p className="mt-1 text-[13.5px] text-slate-500">Live records across the whole platform.</p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => <StatCard key={c.label} s={c} loading={loading} />)}
      </div>

      {/* Activity + quick links */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-18px_rgba(16,24,40,0.25)]">
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-slate-400" />
            <h2 className="text-[15px] font-bold text-slate-900">Recent activity</h2>
          </div>
          {loading ? (
            <div className="space-y-3 py-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                    <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13.5px] font-medium text-slate-500">No activity yet</p>
              <p className="mt-1 text-[12px] text-slate-400">New users, properties, applications and leases will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activity.map((a) => <ActivityRow key={a.id} item={a} />)}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-18px_rgba(16,24,40,0.25)]">
          <h2 className="mb-3 text-[15px] font-bold text-slate-900">Records</h2>
          <div className="space-y-1">
            {QUICK_LINKS.map(({ label, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-white">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-[13.5px] font-semibold text-slate-700">{label}</span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Support inbox (live) */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Headset className="h-4.5 w-4.5 text-slate-400" />
          <h2 className="text-[15px] font-bold text-slate-900">Support inbox</h2>
        </div>
        <SupportMessagesAdmin />
      </div>
    </div>
  );
}
