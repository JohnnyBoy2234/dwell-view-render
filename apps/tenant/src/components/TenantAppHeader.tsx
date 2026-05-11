import { Link, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function TenantAppHeader() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 border-b border-black/[0.07]"
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <Link to="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(214,100%,59%)' }}>
          <Home className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-base text-gray-900 tracking-tight">MzanziHomes</span>
      </Link>

      {!loading && (
        user ? (
          <button
            onClick={() => navigate('/enhancedtenantdashboard')}
            className="px-4 py-1.5 text-sm font-semibold rounded-full text-white"
            style={{ background: 'hsl(214,100%,59%)' }}
          >
            Dashboard
          </button>
        ) : (
          <Link
            to="/auth"
            className="px-4 py-1.5 text-sm font-semibold rounded-full text-white"
            style={{ background: 'hsl(214,100%,59%)' }}
          >
            Sign In
          </Link>
        )
      )}
    </header>
  );
}
