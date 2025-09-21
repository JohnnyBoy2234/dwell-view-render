import React from 'react';
import { useAuth } from '@/hooks/useAuth';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
	const { loading } = useAuth();
	if (loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="animate-pulse text-muted-foreground">Loading…</div>
			</div>
		);
	}
	return <>{children}</>;
}
