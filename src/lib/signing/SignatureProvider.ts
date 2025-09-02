// Provider interface and types for signing engines
// Note: Buffer type is not available in the browser; we declare it as any to avoid build issues in the frontend bundle.
// In server/runtime code, you should rely on Node's Buffer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Buffer = any;

export type NormalizedStatus =
  | "draft"
  | "sent"
  | "delivered"
  | "viewed"
  | "completed"
  | "declined"
  | "voided"
  | "expired"
  | "error";

export interface Signer {
  name: string;
  email: string;
  clientUserId?: string;
  phone?: string;
}

export interface CreateEnvelopeInput {
  leaseId: string;
  templateKey?: string;
  landlord: Signer;
  tenant: Signer;
  cc?: Signer[];
  tabs?: Record<string, string | number | boolean>;
  options?: {
    sendNow?: boolean;
    smsDelivery?: boolean;
    idv?: boolean;
    reminders?: {
      delayDays: number;
      frequencyDays: number;
      expireAfterDays: number;
      expireWarnDays: number;
    };
  };
}

export interface SignatureProvider {
  createEnvelope(input: CreateEnvelopeInput): Promise<{ envelopeId: string }>;
  getRecipientViewUrl(
    envelopeId: string,
    signer: Signer,
    returnUrl: string
  ): Promise<{ url: string }>;
  getStatus(envelopeId: string): Promise<{ status: NormalizedStatus }>;
  cancel(envelopeId: string, reason?: string): Promise<void>;
  downloadDocuments(
    envelopeId: string
  ): Promise<{ combinedPdfBuffer: Buffer; certificatePdfBuffer?: Buffer }>;
  mapIncomingWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<{
    envelopeId: string;
    status: NormalizedStatus;
    completedAt?: Date;
    error?: string;
  }>;
}
