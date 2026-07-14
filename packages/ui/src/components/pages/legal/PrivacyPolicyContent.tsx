import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// Shared POPIA privacy policy body — rendered by apps/web (marketing navbar
// wrapper) and by the tenant/landlord apps (LegalScreens back-button shell).
export function PrivacyPolicyContent() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 pb-20">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">MzanziHomes Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-1">Version 2.0 · Last updated: 14 July 2026 · Effective: 14 July 2026</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-sm text-blue-800">
        <strong>Responsible Party:</strong> BuildSynergy (Pty) Ltd (registration number 2025/529281/07), trading as
        <strong> MzanziHomes</strong>, is the responsible party for personal information processed through the Platform
        as defined in POPIA.<br />
        <strong>Information Officer:</strong> <a href="mailto:privacy@mzanzihomes.com" className="underline">privacy@mzanzihomes.com</a> ·
        <strong> Support:</strong> <a href="mailto:support@mzanzihomes.com" className="underline">support@mzanzihomes.com</a> ·
        <strong> Website:</strong> <a href="https://mzanzihomes.co.za" className="underline">mzanzihomes.co.za</a>
      </div>

      <div className="space-y-8 text-gray-700 text-[15px] leading-relaxed">

        <Section title="1. Who We Are">
          <p>BuildSynergy (Pty) Ltd, a private company incorporated under the laws of the Republic of South Africa (registration number 2025/529281/07), trades as <strong>MzanziHomes</strong> and operates the MzanziHomes website, mobile application, landlord dashboard, tenant app, and related digital services (collectively, the "Platform").</p>
          <p>MzanziHomes is the responsible party for personal information processed through the Platform, as defined in the Protection of Personal Information Act 4 of 2013 ("POPIA").</p>
          <Sub>1.1 Information Officer</Sub>
          <p>Our registered Information Officer is responsible for ensuring POPIA compliance across the organisation. The Information Officer may be contacted at:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Email: <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a></li>
            <li>Postal address: BuildSynergy (Pty) Ltd, Republic of South Africa</li>
          </ul>
          <p>Our PAIA Manual is available on request at <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a>.</p>
          <Sub>1.2 Acknowledgement</Sub>
          <p>By creating an account, accessing the Platform, listing a property, submitting a rental application, activating a subscription, or otherwise using the Platform, you acknowledge that you have read and understood this Privacy Policy. Where your consent is required by law, we will request it separately and keep a record of it.</p>
          <p>This Privacy Policy must be read together with our <Link to="/terms" className="text-blue-600 underline">Terms and Conditions</Link>, Refund Policy, Cookie Policy, and any other notices we provide at the point of collection.</p>
        </Section>

        <Section title="2. Scope of This Policy">
          <p>This Privacy Policy explains how MzanziHomes collects, uses, stores, shares, transfers, and protects personal information when you use the Platform in any capacity, including as a:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Landlord (subscriber or non-subscriber)</li>
            <li>Property manager or authorised agent</li>
            <li>Tenant or rental applicant</li>
            <li>Visitor to our website or app</li>
          </ul>
          <p>This Policy applies to all personal information processed by MzanziHomes as a responsible party. Where MzanziHomes processes personal information as an operator on behalf of a landlord (for example, processing tenant information on a landlord's instructions), the applicable terms are set out in our operator agreement and Terms and Conditions.</p>
        </Section>

        <Section title="3. Legal Framework">
          <p>MzanziHomes processes personal information in accordance with:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Protection of Personal Information Act 4 of 2013 (POPIA)</strong> — primary data protection legislation</li>
            <li><strong>Promotion of Access to Information Act 2 of 2000 (PAIA)</strong> — right of access to records</li>
            <li><strong>Electronic Communications and Transactions Act 25 of 2002 (ECTA)</strong> — electronic communications and online transactions</li>
            <li><strong>Financial Intelligence Centre Act 38 of 2001 (FICA)</strong> — where identity verification and KYC obligations apply</li>
            <li><strong>Rental Housing Act 50 of 1999</strong> — tenancy records and landlord obligations</li>
            <li><strong>Income Tax Act 58 of 1962 and related SARS obligations</strong> — financial record retention</li>
            <li><strong>POPIA Amended Regulations, effective 17 April 2025</strong> — enhanced data subject rights and mandatory breach reporting</li>
          </ul>
        </Section>

        <Section title="4. The Eight Conditions for Lawful Processing (POPIA)">
          <p>All personal information processed by MzanziHomes is subject to the eight lawfulness conditions set out in POPIA:</p>
          <Table
            head={['Condition', 'What This Means for MzanziHomes']}
            rows={[
              ['Accountability', 'MzanziHomes takes full responsibility for ensuring POPIA compliance across all processing activities'],
              ['Processing Limitation', 'We collect only what is necessary for the specific purpose for which it is collected'],
              ['Purpose Specification', 'We clearly state why we collect personal information before or at the time of collection'],
              ['Further Processing Limitation', 'We will not use your information for a purpose incompatible with the original purpose, unless a separate lawful basis applies'],
              ['Information Quality', 'We take reasonable steps to ensure personal information is accurate, complete, and up to date'],
              ['Openness', 'We are transparent about what we collect, why, and how — this Policy gives effect to that obligation'],
              ['Security Safeguards', 'We implement appropriate technical and organisational security measures to protect your information'],
              ['Data Subject Participation', 'You have rights of access, correction, deletion, and objection — see Section 21 below'],
            ]}
          />
        </Section>

        <Section title="5. Personal Information We Collect">
          <Sub>5.1 Account Information</Sub>
          <ul className="list-disc ml-5 space-y-1">
            <li>Full name, email address, and phone number</li>
            <li>Role on the Platform (landlord or tenant)</li>
            <li>Profile photograph (optional)</li>
            <li>Password (stored as a one-way cryptographic hash — never in plain text)</li>
            <li>Account creation date and login history</li>
          </ul>
          <Sub>5.2 Identity and Verification Documents (KYC / FICA)</Sub>
          <ul className="list-disc ml-5 space-y-1">
            <li>South African ID document or valid passport (photograph or scan)</li>
            <li>Proof of residential address (utility bill, bank statement, or municipal account — dated within 3 months)</li>
            <li>Selfie photograph for identity verification purposes</li>
            <li>Company registration documents and authorising resolutions (where applicable for juristic persons)</li>
          </ul>
          <p>We collect identity and verification documents in order to comply with our obligations under FICA and to protect users against fraud and identity theft. These documents are stored in a private, access-controlled environment and are never publicly accessible.</p>
          <Sub>5.3 Tenancy and Property Information</Sub>
          <ul className="list-disc ml-5 space-y-1">
            <li>Property address, geolocation coordinates, and property photographs</li>
            <li>Rental amount, deposit amount, lease start and end dates</li>
            <li>Lease agreements, addenda, and supporting documents</li>
            <li>Rental application details, including references and previous tenancy information</li>
            <li>Employment and income information submitted by applicants (see Section 5.4)</li>
            <li>Inspection reports, maintenance records, and property history</li>
            <li>Notices served and received in connection with a tenancy</li>
          </ul>
          <Sub>5.4 Financial and Income Information (Rental Applications)</Sub>
          <ul className="list-disc ml-5 space-y-1">
            <li>Bank statements submitted by applicants for landlord evaluation</li>
            <li>Payslips or proof of income (optional, submitted at the applicant's election)</li>
            <li>Credit-related information shared with or obtained from credit bureaux or tenant screening services, where applicable</li>
            <li>Transaction records, payment references, payout status, and payment history</li>
          </ul>
          <InfoBox>
            <strong>Important:</strong> Bank statements and payslips submitted during a rental application are shared only with the landlord of the specific property applied for, for the duration of the application process. This information is not accessible to other users of the Platform.
          </InfoBox>
          <p>MzanziHomes does not store card numbers, CVV codes, or full bank account numbers on its servers. All sensitive payment credentials are handled exclusively by our PCI DSS-compliant payment processor, Paystack.</p>
          <Sub>5.5 Communication and Interaction Records</Sub>
          <ul className="list-disc ml-5 space-y-1">
            <li>In-app messages exchanged between landlords and tenants</li>
            <li>Maintenance requests and maintenance correspondence</li>
            <li>Notices, reminders, and automated communications generated by or through the Platform</li>
            <li>Customer support tickets and dispute records</li>
          </ul>
          <p>In-app messages form part of the permanent communication record associated with the relevant tenancy and cannot be deleted by either party. This is a core feature of the Platform, designed to protect both landlords and tenants in the event of a dispute. Users are informed of this at the time of account creation and by accepting these Terms and Conditions.</p>
          <p>Messages may be reviewed by authorised MzanziHomes support staff only where a dispute, Terms of Service violation, or security concern has been reported.</p>
          <Sub>5.6 Location Information</Sub>
          <p>With your permission, we collect your approximate or precise location when you use property search features. Precise GPS location is used only in real time during an active search session and is not stored after the session ends. Approximate location derived from IP address may be retained for fraud prevention and analytics purposes.</p>
          <Sub>5.7 Device and Usage Data</Sub>
          <ul className="list-disc ml-5 space-y-1">
            <li>Device type, model, operating system version, and app version number</li>
            <li>Push notification token (for delivery of service alerts)</li>
            <li>App usage patterns and session data</li>
            <li>Crash reports and diagnostic data (via Firebase Crashlytics)</li>
            <li>IP address and approximate location derived from IP address</li>
          </ul>
          <Sub>5.8 AI-Generated Content Records</Sub>
          <p>Where you use AI-powered tools on the Platform (including AI-generated invoices, notices, reminders, and property descriptions), records of the inputs provided and outputs generated are stored as part of your account history. You remain responsible for reviewing and approving all AI-generated content before use.</p>
          <Sub>5.9 Electronic Signature Records</Sub>
          <p>Where an electronic signature, OTP confirmation, or digital acceptance is used on the Platform, a record of the signing event — including timestamp, the signatory's identity, the document signed, and the method of signing — is retained as a permanent record associated with the relevant tenancy or transaction.</p>
        </Section>

        <Section title="6. Mandatory vs Optional Information">
          <Table
            head={['Information', 'Status']}
            rows={[
              ['Full name, email address, phone number', 'Mandatory — account creation'],
              ['Account role (landlord or tenant)', 'Mandatory — service delivery'],
              ['South African ID document or passport', 'Mandatory — KYC/FICA compliance'],
              ['Proof of residential address', 'Mandatory — KYC/FICA compliance'],
              ['Selfie for identity verification', 'Mandatory — KYC/FICA compliance'],
              ['Profile photograph', 'Optional'],
              ['Bank statements and payslips', 'Mandatory for rental applications'],
              ['Property address and listing details', 'Mandatory for landlords who list'],
              ['Landlord bank account details', 'Mandatory for payout recipients'],
              ['Precise GPS location', 'Optional — user-initiated, not stored after session'],
              ['Marketing preferences', 'Optional'],
            ]}
          />
          <p>Without mandatory information, MzanziHomes may be unable to create your account, process an application, administer a tenancy, or process payments.</p>
        </Section>

        <Section title="7. Sources of Personal Information">
          <p>MzanziHomes collects personal information from the following sources:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Directly from you</strong> — when you register, list a property, submit an application, make a payment, sign a document, or contact support</li>
            <li><strong>From your use of the Platform</strong> — device data, usage patterns, and in-app activity</li>
            <li><strong>From documents you upload</strong> — identity documents, proof of address, payslips, bank statements, photographs, and lease agreements</li>
            <li><strong>From counterparties to a tenancy</strong> — landlords may provide information about prospective tenants, and tenants may provide information relevant to a property</li>
            <li><strong>From payment service providers</strong> — transaction confirmations, payout status, and payment processing data from Paystack</li>
            <li><strong>From connected services</strong> — where you choose to sign in via Google or another connected account</li>
            <li><strong>From credit and screening bureaux</strong> — where credit checks or tenant screening checks are conducted with your knowledge and consent, or as permitted by applicable law</li>
            <li><strong>From public records</strong> — to the extent lawfully permitted for fraud prevention or identity verification purposes</li>
          </ul>
        </Section>

        <Section title="8. Grounds for Processing Personal Information (POPIA Section 11)">
          <p>MzanziHomes processes personal information on one or more of the following grounds:</p>
          <Sub>8.1 Contract</Sub>
          <p>Processing necessary to conclude or perform a contract with you — including creating your account, activating a subscription, processing a rental application, administering a lease, and processing or receiving payments.</p>
          <Sub>8.2 Legal Obligation</Sub>
          <p>Processing required to comply with a legal obligation to which MzanziHomes is subject, including: identity verification under FICA; financial record-keeping under the Income Tax Act; responding to lawful demands from regulatory, law enforcement, or judicial authorities; and breach notification obligations under POPIA section 22.</p>
          <Sub>8.3 Legitimate Interests</Sub>
          <p>Processing necessary for a legitimate interest of MzanziHomes or a third party where that interest is not overridden by your rights — including fraud prevention, platform security, service improvement, and dispute resolution.</p>
          <Sub>8.4 Consent</Sub>
          <p>Where we rely on your consent — for optional features, certain marketing communications, cookies and tracking technologies, or the processing of special personal information — we request consent separately, keep a record, and you may withdraw it at any time. Withdrawal of consent does not affect processing that took place before withdrawal.</p>
          <WarnBox>
            <strong>Important — April 2025 Amendment:</strong> The amended POPIA Regulations, effective 17 April 2025, confirm that an opt-out mechanism does not constitute consent for direct marketing. Consent requires a positive, affirmative action from you. MzanziHomes will only send you direct marketing communications where you have actively opted in.
          </WarnBox>
        </Section>

        <Section title="9. How We Use Your Personal Information">
          <p>We use your personal information for the following purposes:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Creating and managing your account and platform access</li>
            <li>Verifying your identity and conducting KYC/FICA checks</li>
            <li>Listing properties and connecting landlords and tenants</li>
            <li>Receiving, evaluating, and administering rental applications</li>
            <li>Generating, storing, and managing lease-related records and documents</li>
            <li>Processing and recording rent payments, deposits, and landlord payouts</li>
            <li>Operating the AI-powered tools available on the Platform</li>
            <li>Sending service notifications, legal notices, payment reminders, invoice alerts, and security alerts</li>
            <li>Enabling in-app communication between landlords and tenants</li>
            <li>Maintaining a permanent communication and document record for each tenancy</li>
            <li>Providing customer support and resolving disputes</li>
            <li>Detecting, investigating, and preventing fraud, abuse, and security incidents</li>
            <li>Complying with legal, regulatory, tax, and record-keeping obligations</li>
            <li>Improving and maintaining the performance and reliability of the Platform</li>
            <li>Conducting anonymised analytics to understand Platform usage patterns</li>
          </ul>
          <p>We will not use your personal information for a purpose incompatible with the purpose for which it was collected, unless we have a separate lawful basis for doing so.</p>
        </Section>

        <Section title="10. Cookies and Tracking Technologies">
          <Sub>10.1 What We Use</Sub>
          <p>MzanziHomes uses cookies and similar tracking technologies on its website and web application. Cookies are small data files placed on your device. They help the Platform function, improve user experience, and provide analytics.</p>
          <Sub>10.2 Types of Cookies</Sub>
          <Table
            head={['Type', 'Purpose', 'Consent Required']}
            rows={[
              ['Strictly Necessary', 'Login sessions, security tokens, basic functionality', 'No — essential to operation'],
              ['Functional', 'Language preferences, saved settings, user experience', 'Yes'],
              ['Analytics', 'Usage patterns, page performance (Firebase Analytics, Vercel Analytics)', 'Yes'],
              ['Marketing / Remarketing', 'Targeted advertising, retargeting campaigns', 'Yes'],
            ]}
          />
          <Sub>10.3 Consent Requirement (POPIA)</Sub>
          <p>Under POPIA, cookies that collect or process personal data — including analytics and marketing cookies — are subject to the processing rules of the Act. An opt-in consent model applies: we will not place non-essential cookies on your device before you have given your express, affirmative consent.</p>
          <p>A cookie consent banner is displayed when you first visit our website or web application. You may accept all cookies, reject all non-essential cookies, or customise your preferences by category. Pre-ticked boxes are not used. "Reject All" is presented with equal visual prominence to "Accept All". You may change your cookie preferences at any time via the Privacy Settings link.</p>
          <p>Your consent to cookies is valid for 12 months, after which your preferences will be requested again. Consent records are stored for at least 12 months.</p>
          <Sub>10.4 Cookie Policy</Sub>
          <p>A full Cookie Policy — listing each cookie used, its purpose, its provider, and its retention period — is available at <a href="https://mzanzihomes.co.za/cookie-policy" className="text-blue-600 underline">mzanzihomes.co.za/cookie-policy</a> and is updated whenever new cookies are introduced to the Platform.</p>
        </Section>

        <Section title="11. Third-Party Operators">
          <p>MzanziHomes uses third-party service providers (operators) to assist in operating the Platform. Each operator processes personal information only on MzanziHomes's instructions, under confidentiality and security obligations, and subject to a written operator agreement in accordance with POPIA section 21.</p>
          <Table
            head={['Operator', 'Role', 'Data Location', 'Key Standard']}
            rows={[
              ['Supabase', 'Database storage, user authentication, and file storage (identity documents, property photos, lease records)', 'EU — AWS eu-west-1', 'Encrypted at rest (AES-256)'],
              ['Firebase (Google)', 'Push notifications (FCM), app analytics, crash reporting (Crashlytics)', 'Global (Google infrastructure)', 'Google Cloud security standards'],
              ['Paystack', 'Processing rent payments, subscription billing, and landlord payouts', 'South Africa / Global', 'PCI DSS Level 1 compliant'],
              ['Google Maps', 'Displaying property locations, enabling location-based property search', 'Real-time (GPS not stored)', 'Google Maps Platform Terms'],
              ['Vercel', 'Hosting MzanziHomes web infrastructure and anonymous performance analytics', 'Global (Vercel edge network)', 'SOC 2 compliant'],
              ['Tenant screening / credit bureau provider', 'Tenant credit and screening checks', 'South Africa', 'POPIA-compliant operator agreement'],
            ]}
          />
          <p>MzanziHomes does not authorise operators to use personal information for their own purposes beyond what is required to provide services to MzanziHomes.</p>
        </Section>

        <Section title="12. Sharing and Disclosure of Personal Information">
          <p>MzanziHomes does not sell your personal information. We may disclose personal information in the following circumstances:</p>
          <Sub>12.1 Counterparties to a Tenancy</Sub>
          <p>Your profile, verification status, and — where you have actively submitted a rental application — your application documents and income information are shared with the landlord or property manager of the specific property you applied for, for the duration of the application process and the subsequent tenancy. No other landlord or user of the Platform has access to this information.</p>
          <Sub>12.2 Operators and Service Providers</Sub>
          <p>We share data with operators listed in Section 11 solely to operate the Platform, under written operator agreements. Operators do not receive more information than is necessary for their specific function.</p>
          <Sub>12.3 Legal and Regulatory Disclosure</Sub>
          <p>We may disclose personal information where required or authorised to do so by law, court order, or lawful demand from the South African Police Service, South African Revenue Service, Financial Intelligence Centre, Information Regulator, or any other competent authority. We will, where permissible, notify you of such a disclosure.</p>
          <Sub>12.4 Fraud Prevention and Security</Sub>
          <p>We may share information with third parties where we have reasonable grounds to suspect fraud, identity theft, money laundering, or other criminal conduct, including with law enforcement authorities and the Financial Intelligence Centre.</p>
          <Sub>12.5 Business Transfers</Sub>
          <p>In the event of a merger, acquisition, restructuring, or sale of all or part of MzanziHomes's business or assets, personal information may be disclosed to or transferred to the successor entity, subject to equivalent privacy protections and prior notice to affected users where required by law.</p>
        </Section>

        <Section title="13. International Transfers of Personal Information">
          <p>Some operators process or store personal information outside the Republic of South Africa. MzanziHomes transfers personal information internationally only where one or more of the following apply:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>The recipient country, organisation, or binding rules provide a level of protection substantially similar to POPIA, as required by section 72 of POPIA</li>
            <li>The transfer is necessary to perform a contract with you or to take steps at your request prior to entering into a contract</li>
            <li>You have consented to the transfer</li>
            <li>A written operator agreement incorporating POPIA-compliant data transfer provisions is in place</li>
          </ul>
          <p>Primary international hosting is through Supabase (EU — AWS eu-west-1) and Firebase / Google (global infrastructure). A current list of international transfer arrangements is available on request from the Information Officer at <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a>.</p>
        </Section>

        <Section title="14. Data Retention">
          <p>MzanziHomes retains personal information only for as long as it is reasonably necessary for the purpose for which it was collected, or as required or permitted by law, contract, fraud prevention, dispute resolution, tax compliance, or any other lawful purpose. When retention periods expire, data is securely deleted or de-identified.</p>
          <Table
            head={['Category of Information', 'Retention Period']}
            rows={[
              ['Active account data', 'While account is active'],
              ['Account data after voluntary closure', '3 years from closure date'],
              ['Identity and KYC documents (FICA)', '5 years from the date of the relevant transaction or service'],
              ['Payment records, invoices, and financial records', '7 years (Income Tax Act and SARS requirements)'],
              ['Rental application records (successful and unsuccessful)', '3 years from application outcome'],
              ['Lease agreements and lease-related documents', '5 years from lease end date'],
              ['In-app communication records', '3 years after the relevant tenancy ends'],
              ['Inspection reports and maintenance records', '5 years from date of record'],
              ['Electronic signature records', '5 years from date of signing'],
              ['AI-generated document records', '5 years from date of generation'],
              ['Device and usage analytics (identifiable)', '14 months (Firebase default)'],
              ['Analytics data (anonymised/aggregated)', 'Indefinite'],
              ['Security and access logs', '12 months rolling'],
              ['Suspended account data', 'Retained during grace period; subject to deletion after retention period set out in Terms and Conditions'],
            ]}
          />
          <p>Following account closure or subscription cancellation, users are encouraged to export and download any records they wish to retain before the applicable data export window closes. After the data export window, MzanziHomes may permanently delete all data associated with the closed account, subject to any mandatory legal retention obligations.</p>
        </Section>

        <Section title="15. Data Security">
          <p>MzanziHomes implements appropriate and reasonable technical and organisational measures to protect personal information against unauthorised access, acquisition, or disclosure; loss, damage, or destruction; and unlawful processing.</p>
          <p>Specific security measures include:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Encryption in transit:</strong> All data transmitted to and from the Platform uses TLS 1.2 or higher</li>
            <li><strong>Encryption at rest:</strong> All data stored in Supabase is encrypted using AES-256</li>
            <li><strong>Database-level access controls:</strong> Row Level Security (RLS) enforced at database level to ensure users can only access their own records</li>
            <li><strong>Password security:</strong> Passwords are hashed via Supabase Auth — never stored in plain text</li>
            <li><strong>Document access controls:</strong> Identity documents and sensitive files are stored in a private Supabase storage bucket with expiring signed URLs — not publicly accessible</li>
            <li><strong>Payment security:</strong> All payment credentials are handled exclusively by Paystack (PCI DSS Level 1 compliant) — MzanziHomes does not store card numbers, CVV codes, or full banking details</li>
            <li><strong>Access restriction:</strong> Access to personal information within MzanziHomes is restricted to staff who require access to perform their function; all staff with data access are bound by confidentiality obligations</li>
            <li><strong>Incident response:</strong> MzanziHomes maintains a data breach response procedure aligned with POPIA section 22 and the April 2025 mandatory e-portal reporting requirements</li>
          </ul>
          <p>No method of transmission or storage is completely secure. We continuously review and improve our security controls to minimise risk.</p>
        </Section>

        <Section title="16. Security Compromises and Breach Notification">
          <p>Where there are reasonable grounds to believe that personal information in MzanziHomes's possession or under its control has been accessed or acquired by an unauthorised person, MzanziHomes will:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Take immediate steps to mitigate the compromise and secure affected systems</li>
            <li>Notify the Information Regulator of South Africa as soon as reasonably possible after becoming aware of the compromise, using the Information Regulator's mandatory e-Services Portal (launched April 2025), rather than by email, in accordance with the updated reporting requirements</li>
            <li>Notify affected data subjects as soon as reasonably possible after the compromise, unless the Information Regulator directs otherwise or the identity of affected individuals cannot be established</li>
          </ul>
          <p>Notifications will describe the nature of the compromise, what information was affected, what steps are being taken, and what affected individuals can do to protect themselves.</p>
          <InfoBox>
            <strong>Information Regulator (South Africa)</strong><br />
            Website: <a href="https://inforegulator.org.za" target="_blank" rel="noreferrer" className="underline">inforegulator.org.za</a><br />
            Security compromise e-portal: <a href="https://eservices.inforegulator.org.za/" target="_blank" rel="noreferrer" className="underline">https://eservices.inforegulator.org.za/</a><br />
            Email: <a href="mailto:POPIAComplaints@inforegulator.org.za" className="underline">POPIAComplaints@inforegulator.org.za</a><br />
            Phone: 012 406 4818
          </InfoBox>
        </Section>

        <Section title="17. Direct Marketing">
          <p>MzanziHomes will only send you direct marketing communications via electronic means (including email, SMS, WhatsApp, or push notification) where:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>You have given your express, affirmative consent to receive such communications (opt-in required — an opt-out mechanism alone does not constitute consent under the amended POPIA Regulations effective 17 April 2025); or</li>
            <li>You are an existing user and we market only our own similar products or services, and you are provided with a clear and easy opt-out in every message</li>
          </ul>
          <InfoBox>
            <strong>Service notices are not marketing.</strong> Service notifications, tenancy-related messages, payment reminders, invoice alerts, legal notices, OTP messages, security alerts, and account communications are part of the Platform service and are not direct marketing. These cannot be disabled without deactivating your account.
          </InfoBox>
          <p>You may opt out of direct marketing at any time by clicking the unsubscribe link in any marketing message; adjusting your notification preferences in the app under Settings &gt; Notifications; or submitting a request by email to <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a>, by WhatsApp, or by phone — all channels accepted under the April 2025 POPIA amendments.</p>
          <p>Opt-out requests will be actioned within 30 days of receipt.</p>
        </Section>

        <Section title="18. Automated Decision-Making and AI Tools">
          <p>MzanziHomes uses AI-powered tools to assist with administrative functions including invoice generation, notice drafting, rental reminders, and property descriptions. These tools do not make automated decisions that produce binding legal consequences for you or affect you in a similarly significant manner without human involvement.</p>
          <p>Users are responsible for reviewing all AI-generated content before use. MzanziHomes does not warrant the accuracy, completeness, or legal sufficiency of AI-generated content. The use of AI tools does not remove the user's responsibility for the content they send, publish, or act upon.</p>
          <p>Where any AI or automated tool is used in a way that materially affects you and involves the processing of your personal information, you may request human review by contacting <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a>.</p>
          <p>MzanziHomes is monitoring guidance from the Information Regulator on the ethical use of AI and automated decision-making (announced April 2025) and will update this Policy and related practices as regulatory guidance is issued.</p>
        </Section>

        <Section title="19. Special Personal Information">
          <p>POPIA gives additional protection to special personal information, which includes information about: race, ethnic or social origin; political, religious, or philosophical views or beliefs; trade union membership; health or sex life; biometric information; and criminal behaviour (including alleged offences and proceedings).</p>
          <p>MzanziHomes does not intentionally collect or require special personal information from users, unless it is necessary for a specific, lawful purpose and we have a separate ground for processing under POPIA section 27 or section 28.</p>
          <p>Where special personal information is collected — for example, identity documents containing race classification information — we apply additional safeguards, limit access to authorised personnel, and process it only to the extent necessary for the lawful purpose.</p>
        </Section>

        <Section title="20. Children's Privacy">
          <p>The Platform is intended for users who are 18 years of age or older and who have full legal capacity to enter into binding agreements. MzanziHomes does not knowingly create accounts for or collect personal information directly from persons under the age of 18.</p>
          <p>If you believe that MzanziHomes has inadvertently collected personal information from a minor, please contact us immediately at <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a> and we will take appropriate action, including deletion of the information concerned.</p>
        </Section>

        <Section title="21. Your Rights Under POPIA">
          <p>Subject to POPIA and the Promotion of Access to Information Act (PAIA), you have the following rights in respect of your personal information:</p>
          <Sub>21.1 Right of Access and Confirmation</Sub>
          <p>You have the right to confirm whether MzanziHomes holds personal information about you, and to access a description of that information. Confirmation is free. Access to a copy of records may be subject to the prescribed fee under PAIA.</p>
          <Sub>21.2 Right to Correction or Deletion</Sub>
          <p>You have the right to request that we correct, update, or delete inaccurate, irrelevant, excessive, outdated, incomplete, or misleading personal information. Most account information can be corrected directly within the app. Where we action a correction or deletion request, we will notify you of the action taken within 30 days of receipt of your request, in accordance with the April 2025 POPIA amendments.</p>
          <Sub>21.3 Right to Object</Sub>
          <p>You have the right to object to the processing of your personal information. Under the April 2025 POPIA amendments, you may submit an objection through multiple channels: in writing, by email, by SMS, by WhatsApp, or by telephone. Objections to direct marketing are unconditional and free of charge. We will acknowledge your objection and advise you of the action taken. Where we are able to cease processing, we will do so. Where we cannot comply — for example, because processing is required by law or contract — we will explain why.</p>
          <Sub>21.4 Right to Withdraw Consent</Sub>
          <p>Where we rely on consent as our lawful basis for processing, you may withdraw that consent at any time. Withdrawal does not affect the lawfulness of processing that occurred before the withdrawal.</p>
          <Sub>21.5 Right to Information Quality</Sub>
          <p>You have the right to have your personal information kept accurate, complete, and up to date. We rely on you to notify us of changes to your information and to keep your profile current within the app.</p>
          <Sub>21.6 Right to Lodge a Complaint</Sub>
          <p>You have the right to lodge a complaint with the Information Regulator where you believe your rights under POPIA have been infringed. Complaint forms and assistance are available from the Information Regulator in English and other languages (see Section 23 below).</p>
        </Section>

        <Section title="22. How to Exercise Your Rights">
          <p>You may submit any data access, correction, deletion, or objection request through any of the following channels, all of which are accepted under the April 2025 POPIA amendments:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Email: <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a></li>
            <li>WhatsApp: +27 81 556 4058</li>
            <li>In-app: via Account Settings &gt; Privacy or the Support section</li>
            <li>Post: MzanziHomes Information Officer, BuildSynergy (Pty) Ltd, Republic of South Africa</li>
          </ul>
          <p>We may ask for proof of identity before processing a request, to protect you and other users from unauthorised access. We will respond within a reasonable time and, where applicable, within the 30-day timeframe required by POPIA.</p>
          <p>Requests that are manifestly unfounded or excessive may be refused or subject to an administrative fee, in accordance with POPIA and PAIA.</p>
        </Section>

        <Section title="23. Complaints">
          <p>If you are dissatisfied with how MzanziHomes has handled your personal information, please contact us first at <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a> so that we may attempt to resolve the matter.</p>
          <p>If you remain dissatisfied after engaging with us, you have the right to lodge a complaint directly with the Information Regulator:</p>
          <InfoBox>
            <strong>Information Regulator (South Africa)</strong><br />
            Website: <a href="https://inforegulator.org.za" target="_blank" rel="noreferrer" className="underline">inforegulator.org.za</a><br />
            POPIA complaints: <a href="mailto:POPIAComplaints@inforegulator.org.za" className="underline">POPIAComplaints@inforegulator.org.za</a><br />
            General enquiries: <a href="mailto:inforeg@justice.gov.za" className="underline">inforeg@justice.gov.za</a><br />
            Phone: 012 406 4818<br />
            Address: JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001
          </InfoBox>
          <p>The April 2025 POPIA amendments allow complaints to be submitted in writing, by email, by post, by courier, or in person. Assistance is available for complainants who require help reducing a complaint to writing or who wish to complain in a language other than English. Complainants may also request that their identity be kept confidential in appropriate circumstances.</p>
        </Section>

        <Section title="24. PAIA Manual">
          <p>MzanziHomes is required to maintain a PAIA Manual as a private body under section 51 of the Promotion of Access to Information Act. The PAIA Manual describes the categories of records held by MzanziHomes and the procedure for requesting access to those records.</p>
          <p>The PAIA Manual is available on request from the Information Officer at <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a> and will be made available on the Platform website.</p>
        </Section>

        <Section title="25. Changes to This Policy">
          <p>MzanziHomes may update this Privacy Policy to reflect changes in the Platform, our processing practices, our operators, or applicable law. When we make material changes, we will update the "Last Updated" date at the top of this Policy, post the updated Policy in the app and on the website, and notify you through the app, by email, or by another appropriate channel.</p>
          <p>Where changes are material and affect your rights or the way your information is processed in a significant manner, we will give you at least 20 business days' notice before the changes take effect, in line with the Consumer Protection Act 68 of 2008 where applicable.</p>
          <p>Your continued use of the Platform after an updated Policy takes effect constitutes acknowledgement of the revised terms. If you do not accept the changes, you must stop using the Platform.</p>
        </Section>

        <Section title="26. Contact Us">
          <p>For any questions, concerns, or data subject requests relating to this Privacy Policy or MzanziHomes's POPIA compliance, please contact our Information Officer:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg mt-2">
              <tbody>
                <tr className="border-b border-gray-200"><td className="px-3 py-2 font-semibold bg-gray-50 w-52">Privacy / Information Officer</td><td className="px-3 py-2"><a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a></td></tr>
                <tr className="border-b border-gray-200"><td className="px-3 py-2 font-semibold bg-gray-50">General Support</td><td className="px-3 py-2"><a href="mailto:support@mzanzihomes.com" className="text-blue-600 underline">support@mzanzihomes.com</a></td></tr>
                <tr className="border-b border-gray-200"><td className="px-3 py-2 font-semibold bg-gray-50">Legal</td><td className="px-3 py-2"><a href="mailto:legal@mzanzihomes.com" className="text-blue-600 underline">legal@mzanzihomes.com</a></td></tr>
                <tr className="border-b border-gray-200"><td className="px-3 py-2 font-semibold bg-gray-50">WhatsApp (data rights)</td><td className="px-3 py-2">+27 81 556 4058</td></tr>
                <tr><td className="px-3 py-2 font-semibold bg-gray-50">Website</td><td className="px-3 py-2"><a href="https://mzanzihomes.co.za" className="text-blue-600 underline">mzanzihomes.co.za</a></td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-medium">MzanziHomes Information Officer<br />BuildSynergy (Pty) Ltd (Reg. No. 2025/529281/07), trading as MzanziHomes<br />Republic of South Africa</p>
        </Section>

      </div>

      <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
        © 2026 BuildSynergy (Pty) Ltd (Reg. No. 2025/529281/07), trading as MzanziHomes · This Privacy Policy is governed by the laws of the Republic of South Africa and is subject to the Protection of Personal Information Act 4 of 2013 (POPIA), as amended · Version 2.0
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

function Sub({ children }: { children: ReactNode }) {
  return <h3 className="font-semibold text-gray-900 mt-4 mb-1">{children}</h3>;
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 mt-3">
      {children}
    </div>
  );
}

function WarnBox({ children }: { children: ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mt-3">
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-sm border border-gray-200 rounded-lg">
        <thead>
          <tr className="bg-gray-50">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold border-b border-gray-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-200 last:border-b-0 align-top">
              {row.map((cell, j) => (
                <td key={j} className={j === 0 ? 'px-3 py-2 font-medium' : 'px-3 py-2'}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
