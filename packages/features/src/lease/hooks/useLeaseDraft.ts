// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { DEFAULT_WIZARD_DATA, type LeaseWizardData } from '@mzanzihomes/common/types/lease';

/**
 * Lease-draft engine shared by the lease wizard(s): autofill from records,
 * debounced autosave into lease_contracts.contract_data, banking setup, and
 * send-to-tenant. The essentials-first wizard renders this state in a shorter
 * UX — the data model, storage and PDF pipeline are unchanged.
 */
export function useLeaseDraft(opts: {
  contractId?: string;
  propertyId?: string;
  tenantId?: string;
  onContractSaved?: (id: string) => void;
}) {
  const { contractId, propertyId, tenantId, onContractSaved } = opts;
  const { user } = useAuth();

  const [data, setData] = useState<LeaseWizardData>(DEFAULT_WIZARD_DATA);
  const [loading, setLoading] = useState(!!contractId);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedContractId, setSavedContractId] = useState<string | null>(contractId || null);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(tenantId || null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialData = useRef<string>(JSON.stringify(DEFAULT_WIZARD_DATA));

  const updateData = useCallback((updates: Partial<LeaseWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // ── Load or initialise ────────────────────────────────────────────────────
  useEffect(() => {
    if (contractId) loadContract(contractId);
    else if (user) initializeNewContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, user?.id]);

  const loadContract = async (id: string) => {
    setLoading(true);
    try {
      const { data: contract, error } = await supabase
        .from('lease_contracts').select('*').eq('id', id).single();
      if (error) throw error;
      if (contract?.tenant_id) setResolvedTenantId(contract.tenant_id);
      if (contract?.contract_data) {
        const merged = { ...DEFAULT_WIZARD_DATA, ...contract.contract_data };
        setData(merged);
        initialData.current = JSON.stringify(merged);
      }
    } catch (e) {
      console.error('Error loading contract:', e);
    } finally {
      setLoading(false);
    }
  };

  const initializeNewContract = async () => {
    if (!user) return;
    const prefill: Partial<LeaseWizardData> = { landlordEmail: user.email || '' };

    // ID numbers are encrypted at rest — read the plaintext via the
    // owner/relationship-scoped RPC rather than the (ciphertext) column.
    const [{ data: llProfile }, { data: llScreening }, { data: llId }] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
      supabase.from('screening_details').select('full_name, phone, current_address').eq('user_id', user.id).maybeSingle(),
      supabase.rpc('get_id_number', { p_user_id: user.id, p_source: 'screening' }),
    ]);
    prefill.landlordFullName = llScreening?.full_name || llProfile?.display_name || user.user_metadata?.full_name || '';
    prefill.landlordIdNumber = (llId as string) || '';
    prefill.landlordPhone = llScreening?.phone || '';
    prefill.landlordAddress = llScreening?.current_address || '';

    if (tenantId) {
      const [{ data: tProfile }, { data: tScreening }, { data: tId }, { data: tEmail }] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('user_id', tenantId).maybeSingle(),
        supabase.from('screening_details').select('full_name, phone, current_address').eq('user_id', tenantId).maybeSingle(),
        supabase.rpc('get_id_number', { p_user_id: tenantId, p_source: 'screening' }),
        supabase.rpc('get_related_user_email', { p_user_id: tenantId }),
      ]);
      prefill.tenantFullName = tScreening?.full_name || tProfile?.display_name || '';
      prefill.tenantIdNumber = (tId as string) || '';
      prefill.tenantPhone = tScreening?.phone || '';
      prefill.tenantAddress = tScreening?.current_address || '';
      prefill.tenantEmail = (tEmail as string) || '';
    }

    if (propertyId) {
      const { data: property } = await supabase
        .from('properties').select('title, location, price').eq('id', propertyId).maybeSingle();
      if (property) {
        prefill.propertyAddress = property.location || property.title || '';
        if (property.price) {
          prefill.rentAmount = Number(property.price);
          prefill.depositAmount = Number(property.price) * 3; // default: 3 months' rent
        }
      }
    }

    if (propertyId && tenantId) {
      const { data: invite } = await supabase
        .from('property_invites').select('monthly_rent, lease_start, lease_end')
        .eq('property_id', propertyId).eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (invite) {
        if (invite.monthly_rent) { prefill.rentAmount = Number(invite.monthly_rent); prefill.depositAmount = Number(invite.monthly_rent) * 3; }
        if (invite.lease_start) prefill.leaseStartDate = invite.lease_start;
        if (invite.lease_end) prefill.leaseEndDate = invite.lease_end;
      }
    }

    const { data: settings } = await supabase
      .from('landlord_settings').select('bank, account_holder, account_number, branch_code').eq('user_id', user.id).maybeSingle();
    if (settings) {
      prefill.landlordBankName = settings.bank || '';
      prefill.landlordAccountHolder = settings.account_holder || prefill.landlordFullName || '';
      prefill.landlordAccountNumber = settings.account_number || '';
      prefill.landlordBranchCode = settings.branch_code || '';
    } else {
      prefill.landlordAccountHolder = prefill.landlordFullName || '';
    }

    // Resume an existing draft, backfilling blanks from prefill.
    const isBlank = (v: any) => v === undefined || v === null || v === '' || v === 0;
    if (propertyId && tenantId) {
      const { data: existingDraft } = await supabase
        .from('lease_contracts').select('id, contract_data')
        .eq('landlord_id', user.id).eq('property_id', propertyId).eq('tenant_id', tenantId)
        .eq('status', 'draft').maybeSingle();
      if (existingDraft) {
        setSavedContractId(existingDraft.id);
        onContractSaved?.(existingDraft.id);
        const merged: any = { ...DEFAULT_WIZARD_DATA, ...(existingDraft.contract_data || {}) };
        for (const [k, pv] of Object.entries(prefill)) {
          if (pv != null && pv !== '' && isBlank(merged[k])) merged[k] = pv;
        }
        setData(merged);
        initialData.current = JSON.stringify(merged);
        return;
      }
    }
    setData((prev) => {
      const merged = { ...prev, ...prefill };
      initialData.current = JSON.stringify(merged);
      return merged;
    });
  };

  // ── Debounced autosave ──────────────────────────────────────────────────────
  const saveNow = useCallback(async () => {
    if (!user) return;
    if (savedContractId) {
      await supabase.from('lease_contracts')
        .update({ contract_data: data as any, updated_at: new Date().toISOString() })
        .eq('id', savedContractId);
    } else {
      const { data: created, error } = await supabase.from('lease_contracts').insert({
        landlord_id: user.id,
        property_id: propertyId,
        tenant_id: resolvedTenantId,
        title: data.propertyAddress ? `Lease for ${String(data.propertyAddress).split('\n')[0]}` : 'New Lease Agreement',
        contract_data: data as any,
        status: 'draft',
      }).select().single();
      if (error) throw error;
      setSavedContractId(created.id);
      onContractSaved?.(created.id);
    }
  }, [user, savedContractId, data, propertyId, resolvedTenantId, onContractSaved]);

  useEffect(() => {
    if (!user || loading) return;
    if (JSON.stringify(data) === initialData.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus('saving');
    autoSaveTimer.current = setTimeout(async () => {
      try { await saveNow(); setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 1500); }
      catch { setSaveStatus('error'); }
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, user?.id, loading]);

  // ── Banking setup + Paystack subaccount (once-off) ──────────────────────────
  const ensureBankingSetup = useCallback(async () => {
    if (!user) return;
    const holder = (data.landlordAccountHolder || data.landlordFullName || '').trim();
    try {
      const bankFields = {
        bank: data.landlordBankName || '', account_holder: holder,
        account_number: data.landlordAccountNumber || '', branch_code: data.landlordBranchCode || '',
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from('landlord_settings').select('id').eq('user_id', user.id).maybeSingle();
      if (existing) await supabase.from('landlord_settings').update(bankFields as any).eq('user_id', user.id);
      else await supabase.from('landlord_settings').insert({
        user_id: user.id, name: data.landlordFullName || holder || 'Landlord',
        address: data.landlordAddress || '', contact: data.landlordPhone || data.landlordEmail || '', ...bankFields,
      } as any);
    } catch (e) { console.warn('Saving banking settings failed', e); }
    try {
      const { data: profile } = await supabase.from('profiles').select('paystack_subaccount_code').eq('user_id', user.id).maybeSingle();
      if (!profile?.paystack_subaccount_code && data.landlordBankCode && data.landlordAccountNumber && holder) {
        await supabase.functions.invoke('create-paystack-subaccount', {
          body: { bankName: data.landlordBankCode, accountNumber: data.landlordAccountNumber, accountHolderName: holder },
        });
      }
    } catch (e) { console.warn('Payout subaccount setup failed', e); }
  }, [user, data]);

  // ── Send to tenant (uses the existing edge function + PDF pipeline) ─────────
  const sendToTenant = useCallback(async () => {
    if (!savedContractId || !resolvedTenantId) throw new Error('No tenant linked to this lease yet');
    await saveNow();
    // Banking / payout setup is handled separately via the Rent Collection tile,
    // so the lease doesn't collect or touch it here.
    const { error } = await supabase.functions.invoke('send-contract-to-tenant', {
      body: { contractId: savedContractId, tenantId: resolvedTenantId },
    });
    if (error) throw error;
  }, [savedContractId, resolvedTenantId, saveNow]);

  return {
    data, updateData, loading, saveStatus,
    savedContractId, resolvedTenantId,
    saveNow, ensureBankingSetup, sendToTenant,
  };
}
