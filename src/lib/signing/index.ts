import { DocuSignProvider } from "./DocuSignProvider";
import { LegacyProvider } from "./LegacyProvider";
import type { SignatureProvider } from "./SignatureProvider";

const providerEnv = (import.meta as any).env?.VITE_SIGN_PROVIDER ?? "legacy"; // "legacy" | "docusign"

let provider: SignatureProvider;
if (providerEnv === "docusign") {
  provider = new DocuSignProvider();
} else {
  provider = new LegacyProvider();
}

export const signingProvider = provider;
export const currentSigningProviderName: "legacy" | "docusign" = providerEnv;
