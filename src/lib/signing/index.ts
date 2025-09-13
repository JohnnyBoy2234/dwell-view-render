import type { SignatureProvider } from "./SignatureProvider";
import { DocuSignProvider } from "./DocuSignProvider";

// Default to the new flow; legacy removed
const provider: SignatureProvider = new DocuSignProvider();
export const signingProvider = provider;
export const currentSigningProviderName = "docusign" as const;
