import { MiniNavbar } from '@/components/ui/mini-navbar';

export default function PrivacyPolicy() {
  return (
    <>
      <MiniNavbar />
      <div className="pt-28 sm:pt-24 min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-10 pb-20">

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mt-1">Effective date: 6 May 2026 · Version 1.0</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-sm text-blue-800">
            <strong>Who we are:</strong> BuildSynergy (Pty) Ltd ("BuildSynergy", "we", "us", or "our"), trading as <strong>MzanziHomes</strong>, operates the MzanziHomes mobile application and related services (collectively, the "Service"). Questions? <a href="mailto:privacy@mzanzihomes.com" className="underline">privacy@mzanzihomes.com</a>
          </div>

          <div className="space-y-8 text-gray-700 text-[15px] leading-relaxed">

            <Section title="1. Introduction">
              <p>This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our Service. We are committed to protecting your privacy and complying with the Protection of Personal Information Act 4 of 2013 ("POPIA") of South Africa.</p>
              <p>By using the MzanziHomes app, you acknowledge that you have read, understood, and agree to the practices described in this Privacy Policy. This policy applies to all users, including landlords, property managers, and tenants.</p>
              <InfoBox>
                <strong>Information Officer:</strong> The MzanziHomes Information Officer is responsible for ensuring compliance with POPIA. Contact us at <a href="mailto:privacy@mzanzihomes.com" className="underline">privacy@mzanzihomes.com</a>.
              </InfoBox>
            </Section>

            <Section title="2. Information We Collect">
              <p>We collect information you provide directly, information generated through your use of the Service, and information from third-party services you connect to MzanziHomes.</p>

              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2a. Account Information</h3>
              <p>When you create a MzanziHomes account, we collect:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Full name and email address</li>
                <li>Phone number (optional)</li>
                <li>South African ID number (for tenant identity verification)</li>
                <li>Profile photograph (optional)</li>
                <li>Account role (landlord or tenant)</li>
              </ul>

              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2b. Property Information</h3>
              <p>Landlords provide property details including address, photographs, rental amount, and lease terms. Tenants provide employment details, income information, and rental history during applications.</p>

              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2c. Payment Information</h3>
              <p>MzanziHomes processes payments through CallPay, a PCI DSS-compliant payment processor. We collect transaction amounts, payment references, and landlord bank account details for payouts. We do not store your card number, CVV, or full bank account number on our servers at any time.</p>

              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2d. Communications</h3>
              <p>In-app messages exchanged between landlords and tenants are stored on our servers and may be reviewed by MzanziHomes support staff in the event of a dispute or reported violation of our Terms of Service.</p>

              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2e. Device & Usage Data</h3>
              <ul className="list-disc ml-5 space-y-1">
                <li>Device type, operating system, and app version</li>
                <li>IP address and approximate location</li>
                <li>Pages and features accessed, and time spent</li>
                <li>Crash reports and error logs</li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <ul className="list-disc ml-5 space-y-1">
                <li>Creating and managing your account</li>
                <li>Matching landlords with prospective tenants</li>
                <li>Processing rental applications and generating lease agreements</li>
                <li>Processing rent payments and payouts via CallPay</li>
                <li>Sending notifications about your tenancy, maintenance, and payments</li>
                <li>Providing customer support</li>
                <li>Improving and personalising the Service</li>
                <li>Complying with South African legal obligations (POPIA, ECTA, Rental Housing Act)</li>
                <li>Detecting and preventing fraud and abuse</li>
              </ul>
            </Section>

            <Section title="4. Third-Party Services">
              <p>MzanziHomes uses the following third-party services, each subject to its own privacy policy:</p>

              <div className="mt-3 space-y-3">
                <ServiceCard name="Supabase" purpose="Database, authentication, and file storage. All data is stored in EU-West data centres with AES-256 encryption at rest." />
                <ServiceCard name="Firebase (Google)" purpose="Push notifications (FCM), app analytics (Firebase Analytics), and crash reporting (Crashlytics)." />
                <ServiceCard name="CallPay" purpose="Processing rent payments and landlord payouts. PCI DSS compliant, licensed in South Africa." />
                <ServiceCard name="Google Maps" purpose="Displaying property locations. Your GPS coordinates are passed to Google Maps when using location search." />
                <ServiceCard name="Vercel" purpose="Hosting MzanziHomes web infrastructure and anonymous performance analytics." />
              </div>
            </Section>

            <Section title="5. Sharing Your Information">
              <p>We do not sell your personal information. We may share it in the following limited circumstances:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Between landlords and tenants:</strong> Your name, contact details, and lease-relevant information are shared with the other party to your tenancy.</li>
                <li><strong>With service providers:</strong> We share data with Supabase, Firebase, CallPay, Google Maps, and Vercel solely to operate the Service.</li>
                <li><strong>For legal compliance:</strong> We may disclose information if required by law, court order, or to protect the safety of MzanziHomes users.</li>
                <li><strong>Business transfers:</strong> In the event of a merger or acquisition, your data may be transferred to the acquiring entity subject to equivalent privacy protections.</li>
              </ul>
            </Section>

            <Section title="6. Data Retention">
              <p>We retain your personal information for as long as your account is active or as needed to provide the Service. After account closure:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Lease agreements and payment records are retained for 5 years as required by South African law.</li>
                <li>Identity documents are deleted within 90 days of account closure.</li>
                <li>Chat messages are deleted within 30 days of account closure.</li>
              </ul>
            </Section>

            <Section title="7. Security">
              <ul className="list-disc ml-5 space-y-1">
                <li>All data is transmitted over TLS 1.2+ encrypted connections.</li>
                <li>Database contents are encrypted at rest using AES-256.</li>
                <li>Access to production data is restricted to authorised personnel only.</li>
                <li>Payment credentials are handled by CallPay (PCI DSS Level 1 compliant) — we never receive or store card details.</li>
              </ul>
              <p className="mt-2">No system is 100% secure. In the event of a data breach that poses a risk to your rights and freedoms, we will notify you and the Information Regulator as required by POPIA.</p>
            </Section>

            <Section title="8. Your POPIA Rights">
              <p>Under POPIA you have the right to:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Access</strong> the personal information we hold about you</li>
                <li><strong>Correct</strong> inaccurate or incomplete information (most can be updated directly in the app)</li>
                <li><strong>Delete</strong> your personal information, subject to legal retention requirements</li>
                <li><strong>Object</strong> to the processing of your information for direct marketing</li>
                <li><strong>Complain</strong> to the Information Regulator of South Africa if you believe your rights have been violated</li>
              </ul>
              <p className="mt-2">To exercise any of these rights, contact <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a>.</p>
            </Section>

            <Section title="9. Children's Privacy">
              <p>MzanziHomes is intended for users who are 18 years of age or older. We do not knowingly collect personal information from anyone under 18. If you believe we have inadvertently collected information from a minor, contact us immediately at <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a> and we will delete it promptly.</p>
            </Section>

            <Section title="10. Changes to This Policy">
              <p>We may update this Privacy Policy from time to time. We will notify you of material changes via the Platform or by email. The "Effective Date" at the top of this page will always reflect the most recent version. Your continued use of MzanziHomes after a policy update constitutes your acceptance of the revised policy.</p>
            </Section>

            <Section title="11. Contact Us">
              <p>If you have questions or concerns about this Privacy Policy or how we handle your personal information:</p>
              <div className="mt-2 space-y-1">
                <p><strong>Privacy Officer:</strong> <a href="mailto:privacy@mzanzihomes.com" className="text-blue-600 underline">privacy@mzanzihomes.com</a></p>
                <p><strong>Support:</strong> <a href="mailto:support@mzanzihomes.com" className="text-blue-600 underline">support@mzanzihomes.com</a></p>
                <p><strong>Website:</strong> <a href="https://mzanzihomes.com" className="text-blue-600 underline">mzanzihomes.com</a></p>
              </div>
              <p className="mt-3 font-medium">MzanziHomes Privacy Team<br />BuildSynergy (Pty) Ltd, trading as MzanziHomes<br />Republic of South Africa</p>
            </Section>

          </div>

          <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
            © 2026 BuildSynergy (Pty) Ltd, trading as MzanziHomes · This policy is governed by the laws of the Republic of South Africa.
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-blue-700 border-b-2 border-blue-100 pb-2 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 mt-3">
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
