import type {
  CreateEnvelopeInput,
  NormalizedStatus,
  SignatureProvider,
  Signer,
} from "./SignatureProvider";
import { supabase } from "@/integrations/supabase/client";

// This adapter wraps the current legacy flow.
// Envelope ID is represented by the lease (tenancy) ID for compatibility.
export class LegacyProvider implements SignatureProvider {
  async createEnvelope(input: CreateEnvelopeInput): Promise<{ envelopeId: string }> {
    // Generate legacy lease PDF via edge function; status is advanced there.
    await supabase.functions.invoke("generate-lease", {
      body: { tenancyId: input.leaseId },
    });
    return { envelopeId: input.leaseId };
  }

  async getRecipientViewUrl(
    envelopeId: string,
    signer: Signer,
    returnUrl: string
  ): Promise<{ url: string }> {
    // Legacy uses in-app signing dialog; route already exists.
    // Prefer returning a hash/route that opens the existing UI.
    const url = `${window.location.origin}/lease/${encodeURIComponent(
      envelopeId
    )}?returnUrl=${encodeURIComponent(returnUrl)}`;
    return { url };
  }

  async getStatus(envelopeId: string): Promise<{ status: NormalizedStatus }> {
    const { data, error } = await supabase
      .from("tenancies")
      .select("lease_status")
      .eq("id", envelopeId)
      .maybeSingle();
    if (error || !data) return { status: "error" };
    // Map legacy statuses to normalized
    const map: Record<string, NormalizedStatus> = {
      draft: "draft",
      awaiting_tenant_signature: "sent",
      awaiting_landlord_signature: "delivered",
      completed: "completed",
      cancelled: "voided",
      expired: "expired",
    };
    return { status: map[data.lease_status] ?? "error" };
  }

  async cancel(envelopeId: string, reason?: string): Promise<void> {
    await supabase
      .from("tenancies")
      .update({ lease_status: "cancelled" })
      .eq("id", envelopeId);
  }

  async downloadDocuments(envelopeId: string): Promise<{ combinedPdfBuffer: any; certificatePdfBuffer?: any }> {
    // Download the lease PDF from storage if available
    const { data, error } = await supabase
      .from("tenancies")
      .select("lease_document_path")
      .eq("id", envelopeId)
      .maybeSingle();
    if (error || !data) throw new Error("Lease not found");

    if (data.lease_document_path) {
      const dl = await supabase.storage
        .from("lease-documents")
        .download(data.lease_document_path);
      if (dl.error || !dl.data) throw dl.error || new Error("Download failed");
      const arr = new Uint8Array(await dl.data.arrayBuffer());
      return { combinedPdfBuffer: arr };
    }
    throw new Error("No document available");
  }

  async mapIncomingWebhook(): Promise<{
    envelopeId: string;
    status: NormalizedStatus;
    completedAt?: Date | undefined;
    error?: string | undefined;
  }> {
    // Legacy has no external webhooks; surface error
    return { envelopeId: "", status: "error", error: "not_applicable" };
  }
}
