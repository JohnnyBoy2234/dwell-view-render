import type {
  CreateEnvelopeInput,
  NormalizedStatus,
  SignatureProvider,
  Signer,
} from "./SignatureProvider";

// Placeholder adapter. In this PR we will wire endpoints in a follow-up edge function/service.
export class DocuSignProvider implements SignatureProvider {
  private mapStatus(ds: string): NormalizedStatus {
    const map: Record<string, NormalizedStatus> = {
      created: "draft",
      sent: "sent",
      delivered: "delivered",
      completed: "completed",
      declined: "declined",
      voided: "voided",
      expired: "expired",
    };
    return map[ds] ?? "error";
  }

  async createEnvelope(input: CreateEnvelopeInput): Promise<{ envelopeId: string }> {
    // Call serverless endpoint in a follow-up phase; for now, throw to prevent accidental use.
    throw new Error("DocuSignProvider.createEnvelope not implemented in this phase");
  }

  async getRecipientViewUrl(): Promise<{ url: string }> {
    throw new Error("DocuSignProvider.getRecipientViewUrl not implemented in this phase");
  }

  async getStatus(): Promise<{ status: NormalizedStatus }> {
    throw new Error("DocuSignProvider.getStatus not implemented in this phase");
  }

  async cancel(): Promise<void> {
    throw new Error("DocuSignProvider.cancel not implemented in this phase");
  }

  async downloadDocuments(): Promise<{ combinedPdfBuffer: any; certificatePdfBuffer?: any }> {
    throw new Error("DocuSignProvider.downloadDocuments not implemented in this phase");
  }

  async mapIncomingWebhook(): Promise<{
    envelopeId: string;
    status: NormalizedStatus;
    completedAt?: Date | undefined;
    error?: string | undefined;
  }> {
    throw new Error("DocuSignProvider.mapIncomingWebhook not implemented in this phase");
  }
}
