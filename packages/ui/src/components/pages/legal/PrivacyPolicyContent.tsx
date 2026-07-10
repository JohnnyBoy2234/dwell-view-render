import type { ReactNode } from 'react';

// Shared POPIA privacy policy body — rendered by apps/web (marketing navbar wrapper)
// and by the tenant/landlord apps (LegalScreens back-button shell).
export function PrivacyPolicyContent() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 pb-20">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-1">Last updated: 6 May 2026 · Effective: 6 May 2026</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-sm text-blue-800">
        <strong>Responsible Party:</strong> BuildSynergy (Pty) Ltd, trading as <strong>MzanziHomes</strong>, is the responsible party for personal information processed through the Service as defined in POPIA. Questions? <a href="mailto:privacy@mzanzihomes.com" className="underline">privacy@mzanzihomes.com</a>
      </div>

      <div className="space-y-8 text-gray-700 text-[15px] leading-relaxed">

        <Section title="1. Who We Are">
          <p>BuildSynergy (Pty) Ltd, trading as <strong>MzanziHomes</strong>, operates the MzanziHomes mobile application, website, and related services (collectively, the "Service"). We are the responsible party for personal information processed through the Service as defined in the Protection of Personal Information Act 4 of 2013 ("POPIA").</p>
          <InfoBox>
            <strong>Information Officer</strong><br />
            Our registered Information Officer is responsible for ensuring POPIA compliance and can be reached at <a href="mailto:privacy@mzanzihomes.com" className="underline">privacy@mzanzihomes.com</a>.<br /><br />
            Our <strong>PAIA Manual</strong> is available on request at <a href="mailto:privacy@mzanzihomes.com" className="underline">privacy@mzanzihomes.com</a>.
          </InfoBox>
          <p>By using the Service, you acknowledge that you have read this Privacy Policy. Where your consent is required by law, we will request it separately and keep a record of it. We process personal information on one or more grounds permitted by POPIA — including where processing is necessary to perform a contract with you, to comply with a legal obligation, or where we or a third party have a legitimate interest that is not overridden by your interests.</p>
        </Section>

        <Section title="2. Scope">
          <p>This Privacy Policy explains how we collect, use, disclose, store, transfer, and protect personal information when you use the Service as a landlord, property manager, tenant, rental applicant, payor, payee, or support contact.</p>
          <p>It should be read together with our Terms of Service and any other notices we provide at the point of collection.</p>
        </Section>

        <Section title="3. Information We Collect">
          <h3 className="font-semibold text-gray-900 mt-4 mb-2">3a. Account Information</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>Full name, email address, phone number</li>
            <li>Role on the platform (landlord, property manager, or tenant)</li>
            <li>Profile photograph (optional)</li>
            <li>Password (stored as a one-way cryptographic hash — never in plain text)</li>
          </ul>

          <h3 className="font-semibold text-gray-900 mt-4 mb-2">3b. Identity and Verification Documents</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>South African ID document or passport (photograph or scan)</li>
            <li>Proof of address (utility bill, bank statement, or municipal account — dated within 3 months)</li>
            <li>Selfie photograph for identity verification</li>
            <li>Bank statements for tenant income verification — shared only with landlords of properties you actively apply to, for the duration of the application process</li>
            <li>Payslips or proof of income (optional, for rental applications)</li>
          </ul>

          <h3 className="font-semibold text-gray-900 mt-4 mb-2">3c. Property and Tenancy Information</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>Property address and geolocation coordinates</li>
            <li>Property photographs, rental amount, deposit amount, and lease terms</li>
            <li>Application details, rental history, references, employment and income information</li>
            <li>Lease records and maintenance request details</li>
          </ul>

          <h3 className="font-semibold text-gray-900 mt-4 mb-2">3d. Payment and Financial Information</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>Transaction amounts, dates, and status; payment references</li>
            <li>Landlord bank account details for rental payouts (processed securely by our payment provider)</li>
          </ul>
          <p className="mt-2">We do not store card numbers, CVV codes, or full bank account numbers on our servers. All sensitive payment credentials are handled by our PCI DSS-compliant payment processor.</p>

          <h3 className="font-semibold text-gray-900 mt-4 mb-2">3e. Communications and Support Records</h3>
          <p>In-app messages between landlords and tenants, support tickets, and dispute records. In-app messages may be reviewed by MzanziHomes support staff in the event of a reported dispute or Terms of Service violation.</p>

          <h3 className="font-semibold text-gray-900 mt-4 mb-2">3f. Location Information</h3>
          <p>With your permission, we collect your approximate or precise location when you use property search features. Precise GPS location is used only in real time during an active search session and is not stored after the session ends.</p>

          <h3 className="font-semibold text-gray-900 mt-4 mb-2">3g. Device and Usage Data</h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>Device type, model, operating system version, and app version</li>
            <li>Push notification token, app usage patterns, and crash data</li>
            <li>IP address and approximate location derived from IP</li>
          </ul>
        </Section>

        <Section title="4. Mandatory vs Optional Information">
          <p>Some information is mandatory — without it we may be unable to create your account, process an application, administer a lease, or make payments. Other information, such as a profile photograph, is voluntary.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 border border-gray-200 font-semibold">Information</th>
                  <th className="text-left p-2 border border-gray-200 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Name, email, phone number', 'Mandatory — account creation'],
                  ['Account type (landlord / tenant)', 'Mandatory — service delivery'],
                  ['Profile photograph', 'Optional'],
                  ['South African ID document', 'Mandatory for KYC'],
                  ['Proof of address', 'Mandatory for KYC'],
                  ['Selfie for verification', 'Mandatory for KYC'],
                  ['Bank statements / payslips', 'Mandatory for rental application'],
                  ['Property address and details', 'Mandatory for landlords listing'],
                  ['Landlord bank account details', 'Mandatory for payout recipients'],
                  ['Precise GPS location', 'Optional (user-initiated, not stored)'],
                ].map(([info, status]) => (
                  <tr key={info}>
                    <td className="p-2 border border-gray-200">{info}</td>
                    <td className="p-2 border border-gray-200 text-gray-600">{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="5. Sources of Information">
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Directly from you</strong> — when you register, list a property, submit an application, make a payment, or contact support</li>
            <li><strong>From your use of the Service</strong> — device data, usage patterns, and in-app activity</li>
            <li><strong>From documents you upload</strong> — identity documents, proof of address, payslips, and bank statements</li>
            <li><strong>From parties to a tenancy</strong> — landlords may provide information about applicants</li>
            <li><strong>From payment service providers</strong> — transaction confirmations and payout status</li>
            <li><strong>From connected services</strong> — where you choose to sign in via Google</li>
            <li><strong>From references and public records</strong> — where lawfully permitted for tenancy applications or fraud prevention</li>
          </ul>
        </Section>

        <Section title="6. How We Use Your Information">
          <ul className="list-disc ml-5 space-y-1">
            <li>Create and manage accounts</li>
            <li>List properties and connect landlords, property managers, and prospective tenants</li>
            <li>Receive, evaluate, and administer rental applications</li>
            <li>Generate, store, and administer lease-related records and documents</li>
            <li>Process rent, deposits, refunds, fees, and payouts</li>
            <li>Send service notifications, legal notices, payment reminders, and security alerts</li>
            <li>Enable in-app communication between landlords and tenants</li>
            <li>Provide customer support and resolve disputes</li>
            <li>Verify user identity in compliance with FICA</li>
            <li>Detect, investigate, and prevent fraud and security incidents</li>
            <li>Comply with legal, regulatory, tax, and record-keeping obligations</li>
            <li>Improve and maintain the performance and reliability of the Service</li>
          </ul>
          <p className="mt-2">We will not use your personal information for a purpose incompatible with the purpose for which it was collected, unless we have a separate lawful basis for doing so.</p>
        </Section>

        <Section title="7. POPIA Grounds for Processing">
          <p>We process personal information on the following grounds permitted by section 11 of POPIA:</p>
          <ul className="list-disc ml-5 space-y-2 mt-2">
            <li><strong>Contract:</strong> Processing necessary to conclude or perform a contract with you — creating your account, processing a rental application, administering a lease, or making/receiving a payment.</li>
            <li><strong>Legal obligation:</strong> Processing required to comply with a legal obligation — identity verification under FICA, financial record-keeping, or responding to a lawful regulatory demand.</li>
            <li><strong>Legitimate interests:</strong> Processing necessary for our legitimate interests — fraud prevention, security monitoring, service improvement, and dispute resolution — where not overridden by your rights.</li>
            <li><strong>Consent:</strong> Where we rely on consent — for optional features, certain marketing communications, or special personal information — we request it separately, keep a record, and you may withdraw it at any time.</li>
          </ul>
        </Section>

        <Section title="8. Third-Party Operators">
          <p>Each operator processes personal information only on our instructions, under confidentiality and security obligations, and subject to a written operator agreement.</p>
          <div className="mt-3 space-y-3">
            <ServiceCard name="Supabase" purpose="Database storage, user authentication, and file storage (identity documents, property photos). Data location: EU (AWS eu-west-1), encrypted at rest." />
            <ServiceCard name="Firebase (Google)" purpose="Push notifications (FCM), app analytics (Firebase Analytics), crash reporting (Crashlytics)." />
            <ServiceCard name="Paystack" purpose="Processing rent payments and landlord payouts. PCI DSS compliant, licensed in South Africa." />
            <ServiceCard name="Google Maps" purpose="Displaying property locations and enabling location-based search. GPS coordinates are passed to Google Maps in real time when you use location features." />
            <ServiceCard name="Vercel" purpose="Hosting MzanziHomes web infrastructure and anonymous performance analytics." />
          </div>
        </Section>

        <Section title="9. Sharing and Disclosure">
          <p>We do not sell your personal information. We may disclose it in the following circumstances:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong>Counterparties to a tenancy:</strong> Your profile and, where you have actively applied, your verification documents are shared with the relevant landlord or property manager for evaluation.</li>
            <li><strong>Operators and service providers:</strong> We share data with operators in Section 8 solely to operate the Service, under written agreements.</li>
            <li><strong>Legal and regulatory disclosure:</strong> We may disclose information if required by law, court order, or lawful regulatory demand, or to protect the safety of MzanziHomes users.</li>
            <li><strong>Business transfers:</strong> In the event of a merger or acquisition, personal information may be transferred to the successor entity subject to equivalent privacy protections.</li>
          </ul>
        </Section>

        <Section title="10. International Transfers">
          <p>Some operators host or access personal information outside South Africa. We transfer personal information internationally only where:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>The recipient is subject to law, binding corporate rules, or an agreement providing adequate protection substantially similar to POPIA (section 72 of POPIA);</li>
            <li>The transfer is necessary to perform a contract with you; or</li>
            <li>You have consented to the transfer.</li>
          </ul>
          <p className="mt-2">Our primary international hosting is through Supabase (EU — AWS eu-west-1) and Firebase / Google (global). A current list is available on request from our Information Officer.</p>
        </Section>

        <Section title="11. Data Retention">
          <p>We keep personal information only as long as reasonably necessary for the purpose collected, or as required by law. When retention periods expire, data is securely deleted or de-identified.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 border border-gray-200 font-semibold">Data</th>
                  <th className="text-left p-2 border border-gray-200 font-semibold">Retention</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Active account data', 'While account is active'],
                  ['Account data after closure', '3 years from closure'],
                  ['Identity and KYC documents', '5 years from relevant transaction (FICA)'],
                  ['Payment records', '7 years (Income Tax Act / SARS)'],
                  ['Rental application records', '3 years from application outcome'],
                  ['Lease records', '5 years from lease end'],
                  ['Communications (messages)', '3 years after relevant tenancy ends'],
                  ['Analytics data (identifiable)', '14 months (Firebase default)'],
                  ['Analytics data (aggregated)', 'Indefinite (anonymised)'],
                ].map(([data, retention]) => (
                  <tr key={data}>
                    <td className="p-2 border border-gray-200">{data}</td>
                    <td className="p-2 border border-gray-200 text-gray-600">{retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="12. Data Security">
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Encryption in transit:</strong> All data transmitted uses TLS 1.2 or higher.</li>
            <li><strong>Encryption at rest:</strong> All data stored in Supabase is encrypted using AES-256.</li>
            <li><strong>Access controls:</strong> Row Level Security (RLS) is enforced at the database level.</li>
            <li><strong>Password security:</strong> Passwords are hashed via Supabase Auth — never stored in plain text.</li>
            <li><strong>Document access:</strong> Identity documents are stored in a private bucket with expiring signed URLs — never publicly accessible.</li>
            <li><strong>Payment security:</strong> All payment credentials are handled by Paystack (PCI DSS Level 1 compliant).</li>
          </ul>
          <p className="mt-2">No method of transmission or storage is completely secure. We continuously work to improve our controls to minimise risk.</p>
        </Section>

        <Section title="13. Security Compromises">
          <p>Where there are reasonable grounds to believe that personal information in our possession has been accessed or acquired by an unauthorised person, we will:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>Notify the <strong>Information Regulator of South Africa</strong> as soon as reasonably possible after becoming aware of the compromise.</li>
            <li>Notify <strong>affected data subjects</strong> as soon as reasonably possible, unless the Regulator directs otherwise.</li>
          </ul>
          <InfoBox>
            <strong>Information Regulator (South Africa)</strong><br />
            Website: <a href="https://inforegulator.org.za" className="underline" target="_blank" rel="noreferrer">inforegulator.org.za</a><br />
            Compromise reports: <a href="mailto:POPIAComplaints@inforegulator.org.za" className="underline">POPIAComplaints@inforegulator.org.za</a><br />
            Phone: 012 406 4818
          </InfoBox>
        </Section>

        <Section title="14. Direct Marketing">
          <p>We will not send you unsolicited electronic direct marketing unless you have given consent, or you are an existing customer and we market only our own similar products or services with a clear opt-out.</p>
          <p className="mt-2"><strong>Service notices are not marketing.</strong> Service notifications, tenancy messages, payment reminders, legal notices, and security alerts are part of the Service and are not direct marketing.</p>
          <p className="mt-2">You can opt out at any time by clicking the unsubscribe link in the message, adjusting notification preferences in the app, or contacting <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a>.</p>
        </Section>

        <Section title="15. Automated Decision-Making">
          <p>We do not make decisions based solely on automated processing that produce legal consequences for you or affect you to a substantial degree, unless permitted by law and with appropriate safeguards.</p>
          <p className="mt-2">Where automated tools are used for matching, ranking, or fraud prevention in a way that materially affects you, you may request human review by contacting <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a>.</p>
        </Section>

        <Section title="16. Special Personal Information">
          <p>POPIA gives additional protection to special personal information, including information about health, biometrics, criminal behaviour, religion, race, trade union membership, political views, and sexual orientation.</p>
          <p className="mt-2">We do not intentionally require special personal information unless necessary and lawful for a specific purpose. Where we process special personal information, we apply additional safeguards and do so only where POPIA permits.</p>
        </Section>

        <Section title="17. Children's Privacy">
          <p>The Service is intended for users who are 18 years of age or older. We do not knowingly create accounts for children. If you believe we have inadvertently collected personal information from a minor, contact us immediately at <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a> and we will take appropriate action.</p>
        </Section>

        <Section title="18. Your Rights under POPIA">
          <p>Subject to POPIA and the Promotion of Access to Information Act ("PAIA"), you have the right to:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong>Confirmation and access</strong> — confirm whether we hold personal information about you and access a description of it. Confirmation is free; access to a record may be subject to a prescribed fee.</li>
            <li><strong>Correction or deletion</strong> — request that we correct, update, or delete inaccurate, irrelevant, excessive, or outdated information. Most account data can be updated directly in the app.</li>
            <li><strong>Object</strong> — object to the processing of your personal information. You have an unconditional right to object to direct marketing at any time, free of charge.</li>
            <li><strong>Withdraw consent</strong> — where we rely on consent, withdraw it at any time with future effect (withdrawal does not affect prior processing).</li>
            <li><strong>Information quality</strong> — we take reasonable steps to ensure personal information is accurate, complete, and up to date.</li>
          </ul>
        </Section>

        <Section title="19. How to Exercise Your Rights">
          <p>You may submit a request by:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong>Email:</strong> <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a></li>
            <li><strong>In-app:</strong> via account settings or the support section</li>
          </ul>
          <p className="mt-2">We may ask for proof of identity before processing a request. We will respond within a reasonable time in accordance with POPIA and PAIA timeframes.</p>
        </Section>

        <Section title="20. Complaints">
          <p>If you are dissatisfied with how we have handled your personal information, please contact us first so we can attempt to resolve the issue.</p>
          <p className="mt-2">You also have the right to lodge a complaint directly with the Information Regulator:</p>
          <InfoBox>
            <strong>Information Regulator (South Africa)</strong><br />
            Website: <a href="https://inforegulator.org.za" className="underline" target="_blank" rel="noreferrer">inforegulator.org.za</a><br />
            POPIA complaints: <a href="mailto:POPIAComplaints@inforegulator.org.za" className="underline">POPIAComplaints@inforegulator.org.za</a><br />
            General enquiries: <a href="mailto:inforeg@justice.gov.za" className="underline">inforeg@justice.gov.za</a><br />
            Phone: 012 406 4818
          </InfoBox>
        </Section>

        <Section title="21. Changes to This Policy">
          <p>We may update this Privacy Policy to reflect changes in the Service, our practices, or applicable law. When we make material changes, we will update the "Last updated" date, post the updated policy in the Service, and notify you through the app or by email. Continued use of the Service after an update constitutes acknowledgment of the revised policy.</p>
        </Section>

        <Section title="22. Contact Us">
          <p>For any questions, concerns, or data requests relating to this Privacy Policy or our POPIA compliance, contact our Information Officer:</p>
          <div className="mt-3 space-y-1">
            <p><strong>Information Officer:</strong> <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a></p>
            <p><strong>Support:</strong> <a href="mailto:support@mzanzihomes.com" className="text-blue-600 underline">support@mzanzihomes.com</a></p>
            <p><strong>Website:</strong> <a href="https://mzanzihomes.com" className="text-blue-600 underline">mzanzihomes.com</a></p>
          </div>
          <p className="mt-3 font-medium">MzanziHomes Information Officer<br />BuildSynergy (Pty) Ltd, trading as MzanziHomes<br />Republic of South Africa</p>
        </Section>

      </div>

      <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
        © 2026 BuildSynergy (Pty) Ltd, trading as MzanziHomes · This policy is governed by the laws of the Republic of South Africa and is subject to POPIA (Act 4 of 2013).
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-blue-700 border-b-2 border-blue-100 pb-2 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 mt-3">
      {children}
    </div>
  );
}

function ServiceCard({ name, purpose }: { name: string; purpose: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="font-semibold text-gray-900 text-sm">{name}</p>
      <p className="text-sm text-gray-600 mt-0.5">{purpose}</p>
    </div>
  );
}
