import { Link } from 'react-router-dom';
import { MiniNavbar } from '@/components/ui/mini-navbar';

export default function TermsOfService() {
  return (
    <>
      <MiniNavbar />
      <div className="pt-28 sm:pt-24 min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-10 pb-20">

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            <p className="text-sm text-gray-500 mt-1">Effective date: 6 May 2026 · Version 1.0</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-sm text-blue-800">
            These Terms constitute a binding legal agreement between you and BuildSynergy (Pty) Ltd, trading as <strong>MzanziHomes</strong>. By creating an account you agree to these Terms and our <Link to="/privacy-policy" className="underline">Privacy Policy</Link>. Questions? <a href="mailto:legal@mzanzihomes.com" className="underline">legal@mzanzihomes.com</a>
          </div>

          <div className="space-y-8 text-gray-700 text-[15px] leading-relaxed">

            <Section title="1. Agreement to These Terms">
              <p>These Terms of Service ("Terms") constitute a binding legal agreement between you ("User", "you", "your") and BuildSynergy (Pty) Ltd ("BuildSynergy", "MzanziHomes", "we", "us", or "our"), a company registered in the Republic of South Africa, trading as <strong>MzanziHomes</strong>.</p>
              <p>By creating an account, accessing, or using the MzanziHomes mobile application or website (collectively, the "Platform"), you confirm that you have read, understood, and agree to be bound by these Terms and our <Link to="/privacy-policy" className="text-blue-600 underline">Privacy Policy</Link>.</p>
              <InfoBox>
                These Terms are governed by the laws of South Africa, including the Electronic Communications and Transactions Act 25 of 2002 (ECTA), Consumer Protection Act 68 of 2008 (CPA), Protection of Personal Information Act 4 of 2013 (POPIA), and the Rental Housing Act 50 of 1999.
              </InfoBox>
            </Section>

            <Section title="2. About the Platform">
              <p>MzanziHomes is a digital platform that facilitates direct connections between landlords and tenants for residential property rental in South Africa. The Platform provides tools for:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Listing and discovering residential rental properties</li>
                <li>Submitting and managing rental applications</li>
                <li>Executing and storing digital lease agreements</li>
                <li>Processing rent payments and landlord payouts via CallPay</li>
                <li>Logging and tracking property maintenance requests</li>
                <li>In-app communication between landlords and tenants</li>
                <li>Financial reporting and rent receipt generation</li>
              </ul>
              <WarnBox>
                MzanziHomes is a <strong>technology intermediary only</strong>. We are not a party to any rental agreement, do not own or manage any property, and are not registered as an estate agency. We do not charge commission — any fees are platform service fees only.
              </WarnBox>
            </Section>

            <Section title="3. Eligibility">
              <p>You may only use the Platform if you:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Are at least 18 years of age</li>
                <li>Have full legal capacity to enter into binding contracts under South African law</li>
                <li>Are not prohibited from using the Platform under any applicable law or court order</li>
                <li>Provide accurate, truthful, and complete registration information</li>
              </ul>
            </Section>

            <Section title="4. User Accounts">
              <Sub>4a. Registration</Sub>
              <p>You must register an account to access most Platform features. You may register as a <strong>Landlord</strong> or a <strong>Tenant</strong>. You agree to keep your account information accurate and up to date.</p>

              <Sub>4b. Account Security</Sub>
              <p>You are solely responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately at <a href="mailto:support@mzanzihomes.com" className="text-blue-600 underline">support@mzanzihomes.com</a> if you suspect any unauthorised access.</p>

              <Sub>4c. One Account Per Person</Sub>
              <p>You may only hold one active account. Creating multiple accounts to circumvent suspensions or bans is prohibited and may result in permanent removal from the Platform.</p>
            </Section>

            <Section title="5. Landlord Terms">
              <Sub>5a. Listing Accuracy</Sub>
              <p>You warrant that all information in your property listings is accurate, complete, and not misleading. Misleading listings may violate the Consumer Protection Act 68 of 2008.</p>

              <Sub>5b. Legal Ownership or Authority</Sub>
              <p>You warrant that you are the registered owner of the listed property or have lawful authority to list and lease it on behalf of the owner.</p>

              <Sub>5c. Compliance with the Rental Housing Act</Sub>
              <p>You are responsible for ensuring all lease agreements and tenancy conditions comply with the Rental Housing Act 50 of 1999 (as amended). You must:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Provide a written lease agreement to the tenant before occupation</li>
                <li>Comply with the maximum rental deposit rules</li>
                <li>Maintain the property in a habitable condition</li>
                <li>Follow the prescribed process for evictions — <strong>no self-help eviction is permitted under South African law</strong></li>
              </ul>

              <Sub>5d. Deposits</Sub>
              <p>Deposits are subject to the Rental Housing Act. You must hold deposits in an interest-bearing account and return them (with interest) within the timeframes prescribed by law. MzanziHomes does not hold deposits on your behalf.</p>
            </Section>

            <Section title="6. Tenant Terms">
              <Sub>6a. Application Accuracy</Sub>
              <p>You warrant that all information you provide during the rental application process — including employment details, income, references, and identification — is accurate and complete. Providing false information may result in account termination and may constitute fraud under South African law.</p>

              <Sub>6b. Lease Agreement</Sub>
              <p>When you accept a tenancy through the Platform, you enter into a legally binding lease agreement directly with the landlord. MzanziHomes is not a party to this agreement. You are responsible for meeting all obligations under the lease, including paying rent on time.</p>

              <Sub>6c. Rent Payments</Sub>
              <p>Rent payments are processed via CallPay. MzanziHomes generates payment records for your reference but is not responsible for payment processing errors caused by CallPay or your financial institution.</p>
            </Section>

            <Section title="7. Payments and Fees">
              <Sub>7a. Platform Fees</Sub>
              <p>MzanziHomes may charge service fees for certain Platform features. Any applicable fees will be clearly disclosed before you incur them.</p>

              <Sub>7b. Payment Processing</Sub>
              <p>Payments are processed by CallPay, a licensed third-party payment service provider. MzanziHomes does not store your card numbers, CVV, or full bank account details.</p>

              <Sub>7c. Refunds</Sub>
              <p>Refund queries relating to rent payments must first be raised with the landlord. If unresolved, contact <a href="mailto:support@mzanzihomes.com" className="text-blue-600 underline">support@mzanzihomes.com</a>. Platform service fees are non-refundable except where required by the Consumer Protection Act 68 of 2008.</p>
            </Section>

            <Section title="8. Prohibited Conduct">
              <p>You agree not to:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Post false, misleading, or fraudulent property listings or applications</li>
                <li>Discriminate against any user on the basis of race, gender, sex, pregnancy, marital status, ethnic or social origin, colour, sexual orientation, age, disability, religion, or birth — as prohibited by the South African Constitution and the Rental Housing Act</li>
                <li>Harass, abuse, threaten, or intimidate any other user</li>
                <li>Solicit or share another user's personal information without their consent</li>
                <li>Attempt to circumvent, disable, or interfere with any security or access-control feature of the Platform</li>
                <li>Use automated tools (bots, scrapers, crawlers) to access or extract data without prior written consent</li>
                <li>Use the Platform for any illegal purpose, including money laundering or fraud</li>
              </ul>
              <p>Violations may result in immediate account suspension or termination and may be reported to the South African Police Service or other relevant authorities.</p>
            </Section>

            <Section title="9. Intellectual Property">
              <p>All content, software, logos, trade marks, and designs on the Platform are the intellectual property of BuildSynergy (Pty) Ltd or its licensors. You are granted a limited, non-exclusive, revocable licence to use the Platform for its intended purpose only.</p>
              <p>You retain ownership of content you upload (e.g., property photographs). By uploading content you grant MzanziHomes a non-exclusive, royalty-free licence to display and distribute that content solely for the purpose of operating the Platform.</p>
            </Section>

            <Section title="10. Disclaimers">
              <p>The Platform is provided <strong>"as is"</strong> and <strong>"as available"</strong> without warranties of any kind, to the maximum extent permitted by South African law. We specifically disclaim:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Any warranty that the Platform will be error-free, uninterrupted, or secure</li>
                <li>Any warranty regarding the accuracy of property listings or user-generated content</li>
                <li>Any liability for the conduct of landlords or tenants on the Platform</li>
                <li>Any liability for the condition, safety, or legal compliance of any listed property</li>
              </ul>
              <WarnBox>
                MzanziHomes does not verify the ownership of listed properties beyond what is voluntarily provided. Always conduct your own due diligence before signing a lease or paying any money.
              </WarnBox>
            </Section>

            <Section title="11. Limitation of Liability">
              <p>To the maximum extent permitted by the Consumer Protection Act 68 of 2008, MzanziHomes's total liability to you shall not exceed the greater of:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>The total platform service fees paid by you to MzanziHomes in the 12 months preceding the claim; or</li>
                <li>R 500 (five hundred rand).</li>
              </ul>
              <p>We shall not be liable for any indirect, incidental, special, or consequential damages. Nothing in these Terms limits our liability for fraud, gross negligence, or any liability that cannot be excluded under South African law.</p>
            </Section>

            <Section title="12. Dispute Resolution">
              <Sub>12a. Rental Housing Tribunal</Sub>
              <p>Disputes between landlords and tenants relating to residential leases may be referred to the Rental Housing Tribunal in the relevant province at no cost.</p>

              <Sub>12b. Platform Disputes</Sub>
              <p>Any dispute between you and MzanziHomes shall first be referred to good-faith negotiation. If unresolved within 30 days, either party may refer the dispute to mediation before resorting to litigation.</p>

              <Sub>12c. Consumer Rights</Sub>
              <p>Nothing in these Terms limits your rights under the Consumer Protection Act 68 of 2008, including the right to refer disputes to the National Consumer Commission.</p>
            </Section>

            <Section title="13. Governing Law and Jurisdiction">
              <p>These Terms are governed by the laws of the Republic of South Africa. You consent to the non-exclusive jurisdiction of the Magistrates' Court or High Court having jurisdiction over your area of residence, or the Gauteng Division of the High Court of South Africa.</p>
            </Section>

            <Section title="14. Changes to These Terms">
              <p>We may update these Terms from time to time. When we do, we will update the "Effective Date" above and notify you via the Platform or by email. If changes are material, we will give you at least 20 business days' notice as required by the Consumer Protection Act 68 of 2008.</p>
              <p>Your continued use of the Platform after the updated Terms take effect constitutes acceptance. If you do not accept, you must stop using the Platform and close your account.</p>
            </Section>

            <Section title="15. Contact Us">
              <div className="space-y-1">
                <p><strong>Legal:</strong> <a href="mailto:legal@mzanzihomes.com" className="text-blue-600 underline">legal@mzanzihomes.com</a></p>
                <p><strong>Support:</strong> <a href="mailto:support@mzanzihomes.com" className="text-blue-600 underline">support@mzanzihomes.com</a></p>
                <p><strong>Website:</strong> <a href="https://mzanzihomes.com" className="text-blue-600 underline">mzanzihomes.com</a></p>
              </div>
              <p className="mt-3 font-medium">MzanziHomes Legal Team<br />BuildSynergy (Pty) Ltd, trading as MzanziHomes<br />Republic of South Africa</p>
            </Section>

          </div>

          <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
            © 2026 BuildSynergy (Pty) Ltd, trading as MzanziHomes · These Terms are governed by the laws of the Republic of South Africa.
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

function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-gray-900 mt-4 mb-1">{children}</h3>;
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 mt-3">
      {children}
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mt-3">
      {children}
    </div>
  );
}
