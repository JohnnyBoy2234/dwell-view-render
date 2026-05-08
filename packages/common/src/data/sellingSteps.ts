export interface SellingStep {
  number: number;
  title: string;
  phase: string;
  phaseNumber: number;
  description: string;
  whatToDo: string[];
  requiresUpload: boolean;
  uploadLabel?: string;
  uploadDescription?: string;
}

export const SELLING_PHASES = [
  'Preparation',
  'Sale Agreement',
  'Attorney & FICA',
  'Transfer Process',
  'Registration',
];

export const SELLING_STEPS: SellingStep[] = [
  {
    number: 1,
    title: 'Prepare Your Property',
    phase: 'Preparation',
    phaseNumber: 1,
    description:
      'Before listing, gather all your important property documents and set a realistic asking price based on market research.',
    whatToDo: [
      'Locate your original title deed (from the deeds office or your bank if bonded)',
      'Get a current municipal rates statement showing no arrears',
      'Research comparable sales in your area to set a fair asking price',
      'Decide whether you want to appoint a conveyancing attorney now or after the sale',
    ],
    requiresUpload: true,
    uploadLabel: 'Title Deed / Rates Statement',
    uploadDescription: 'Upload your title deed and latest rates statement',
  },
  {
    number: 2,
    title: 'Sign the Deed of Sale',
    phase: 'Sale Agreement',
    phaseNumber: 2,
    description:
      'Once a buyer makes an offer, both parties sign the Offer to Purchase (OTP). This is the legally binding sale agreement — read it carefully before signing.',
    whatToDo: [
      'Review the Offer to Purchase carefully, including all conditions and dates',
      'Ensure the purchase price, deposit amount, and occupation date are correct',
      'Both buyer and seller must sign the OTP — signatures must match IDs',
      'Keep a copy of the signed OTP for your records',
    ],
    requiresUpload: true,
    uploadLabel: 'Signed Offer to Purchase (OTP)',
    uploadDescription: 'Upload the signed OTP / Deed of Sale',
  },
  {
    number: 3,
    title: 'Appoint a Conveyancing Attorney',
    phase: 'Attorney & FICA',
    phaseNumber: 3,
    description:
      'As the seller, you nominate the conveyancing attorney who will handle the transfer. The buyer pays the transfer costs. Choose an attorney you trust.',
    whatToDo: [
      'Select a conveyancing attorney (the seller nominates, the buyer pays)',
      'Provide the attorney with the signed OTP and your contact details',
      'The attorney will instruct the bank (if there is a bond) to issue a cancellation figure',
      "Confirm the attorney's fees and timeline upfront",
    ],
    requiresUpload: false,
  },
  {
    number: 4,
    title: 'FICA Compliance',
    phase: 'Attorney & FICA',
    phaseNumber: 3,
    description:
      'South African law requires both parties to submit FICA (Financial Intelligence Centre Act) documents to the attorney before transfer can proceed.',
    whatToDo: [
      'Provide your original South African ID or passport',
      'Submit proof of residence (utility bill or bank statement, not older than 3 months)',
      'If a company or trust is selling, additional FICA docs are required — ask your attorney',
      'Submit promptly — delays here slow down the entire transfer',
    ],
    requiresUpload: true,
    uploadLabel: 'FICA Documents',
    uploadDescription: 'Upload your ID and proof of residence',
  },
  {
    number: 5,
    title: 'Pay Transfer Duty',
    phase: 'Transfer Process',
    phaseNumber: 4,
    description:
      'The buyer is liable for Transfer Duty (a tax paid to SARS). The conveyancing attorney handles this on behalf of the buyer. Properties below R1,100,000 are exempt.',
    whatToDo: [
      'The attorney will calculate and submit the Transfer Duty on behalf of the buyer',
      'If the property is below R1,100,000, no Transfer Duty is payable (as of 2024)',
      'SARS issues a Transfer Duty receipt — this must be lodged at the Deeds Office',
      'No action needed from the seller — just confirm this has been paid before lodgement',
    ],
    requiresUpload: false,
  },
  {
    number: 6,
    title: 'Obtain Rates Clearance',
    phase: 'Transfer Process',
    phaseNumber: 4,
    description:
      'The local municipality must confirm that all rates, taxes, and levies on the property are paid up. Without this certificate, transfer cannot proceed.',
    whatToDo: [
      'Your attorney will apply for the Rates Clearance Certificate from the municipality',
      'Pay any outstanding municipal rates, taxes, or levies',
      'If in an estate or complex, a levy clearance certificate from the body corporate is also needed',
      'This can take 2–6 weeks depending on the municipality — start early',
    ],
    requiresUpload: true,
    uploadLabel: 'Rates Clearance Certificate',
    uploadDescription: 'Upload the rates clearance certificate from the municipality',
  },
  {
    number: 7,
    title: 'Compliance Certificates',
    phase: 'Transfer Process',
    phaseNumber: 4,
    description:
      'The seller must provide valid compliance certificates before transfer. These confirm the property meets South African safety standards.',
    whatToDo: [
      'Electrical Certificate of Compliance (COC) — required by law, valid for 2 years',
      'Plumbing certificate if required by the municipality',
      'Gas Certificate of Compliance if there is any gas installation',
      'Beetle/Borer certificate may be required in coastal areas',
      'Certificates must be issued by qualified, registered professionals',
    ],
    requiresUpload: true,
    uploadLabel: 'Compliance Certificates',
    uploadDescription: 'Upload electrical, plumbing, and/or gas compliance certificates',
  },
  {
    number: 8,
    title: 'Sign Transfer Documents',
    phase: 'Transfer Process',
    phaseNumber: 4,
    description:
      'Both seller and buyer sign the official transfer documents prepared by the conveyancing attorney. These documents are lodged at the Deeds Office.',
    whatToDo: [
      "Visit the attorney's office to sign the transfer documents (or use remote signing if available)",
      'Bring your original ID — it will be verified against the documents',
      'Review everything carefully before signing',
      'The attorney will confirm the date of lodgement at the Deeds Office',
    ],
    requiresUpload: true,
    uploadLabel: 'Signed Transfer Documents',
    uploadDescription: 'Upload the signed transfer documentation',
  },
  {
    number: 9,
    title: 'Registration at Deeds Office',
    phase: 'Registration',
    phaseNumber: 5,
    description:
      'The conveyancing attorney lodges all documents at the Deeds Office. Once registered, ownership officially transfers to the buyer and the seller receives payment.',
    whatToDo: [
      'The attorney lodges the documents — no action needed from you at this stage',
      'Registration typically takes 7–10 working days after lodgement',
      'Once registered, the attorney pays out the net proceeds to the seller',
      'Request a copy of the new title deed for your records',
    ],
    requiresUpload: false,
  },
];
