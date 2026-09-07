import { AuthPage } from '@mzanzihomes/features/auth';

// This is the tenant app — accounts created here default to the tenant role.
export default function Auth() {
  return <AuthPage appRole="tenant" homePath="/" />;
}
