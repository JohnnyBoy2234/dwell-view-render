import { deleteUsersByEmailPrefix } from './support/supabaseAdmin';

/** Sweep any users the suite created (fixtures clean their own; this catches UI signups). */
export default async function globalTeardown(): Promise<void> {
  try {
    await deleteUsersByEmailPrefix('e2e-');
  } catch {
    // best effort — never fail the run on cleanup
  }
}
