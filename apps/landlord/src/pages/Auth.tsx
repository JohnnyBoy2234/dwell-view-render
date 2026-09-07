import { AuthPage } from '@mzanzihomes/features/auth';

// This is the landlord app — accounts created here default to the landlord role.
export default function Auth() {
  return <AuthPage appRole="landlord" homePath="/landlord/dashboard" />;
}
