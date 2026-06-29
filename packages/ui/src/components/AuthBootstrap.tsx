import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingLogo } from '@mzanzihomes/ui/components/LoadingLogo';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
	const { loading } = useAuth();
	if (loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<LoadingLogo size="lg" />
			</div>
		);
	}
	return <>{children}</>;
}
