import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// Shared Terms and Conditions body — rendered by apps/web (marketing navbar
// wrapper) and by the tenant/landlord apps (LegalScreens back-button shell).
export function TermsOfServiceContent() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 pb-20">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">MzanziHomes Terms and Conditions</h1>
        <p className="text-sm text-gray-500 mt-1">Version 1.0 · Last updated: 14 July 2026 · Effective date: 14 July 2026</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-sm text-blue-800">
        These Terms and Conditions constitute a binding legal agreement between you and BuildSynergy (Pty) Ltd
        (registration number 2025/529281/07), trading as <strong>MzanziHomes</strong>. By creating an account,
        listing a property, activating a subscription, or otherwise using the Platform, you agree to be legally
        bound by these Terms. Questions? <a href="mailto:legal@mzanzihomes.co.za" className="underline">legal@mzanzihomes.co.za</a>
      </div>

      <div className="space-y-8 text-gray-700 text-[15px] leading-relaxed">

        <Section title="1. Acceptance of These Terms">
          <p>1.1 These Terms and Conditions ("Terms") govern your access to and use of Mzanzihomes.co.za, including the website, mobile applications, dashboards, landlord tools, tenant app, software features and related digital services made available by MzanziHomes (collectively, the "Platform").</p>
          <p>1.2 By creating an account, accessing the Platform, publishing a property listing, activating a subscription, using any landlord tool, using the Tenant App, uploading information, or otherwise using the Platform in any way, you confirm that you have read, understood and agree to be legally bound by these Terms.</p>
          <p>1.3 By using the Platform, you also agree to be bound by: (a) the MzanziHomes <Link to="/privacy-policy" className="text-blue-600 underline">Privacy Policy</Link>; (b) the MzanziHomes Refund and Cancellation Policy; (c) any payment terms applicable to paid services; and (d) any additional policies, notices or rules published by MzanziHomes from time to time.</p>
          <p>1.4 If you do not agree to these Terms, you must not access or use the Platform.</p>
          <p>1.5 You confirm that you are at least 18 years old and have legal capacity to enter into a binding agreement under South African law. If you use the Platform on behalf of a company, trust, close corporation, partnership or other legal entity, you warrant that you are duly authorised to bind that entity to these Terms.</p>
          <p>1.6 You agree that any acceptance given electronically — including by ticking a checkbox, clicking "I agree", creating an account, publishing a listing, activating a subscription, signing electronically, confirming by OTP, or continuing to use the Platform — constitutes valid acceptance of these Terms to the extent recognised under South African law, including the Electronic Communications and Transactions Act 25 of 2002 ("ECTA"). MzanziHomes records the date, time, version and method of acceptance.</p>
          <p>1.7 You consent to receiving notices, invoices, reminders, account updates, legal notices and other communications from MzanziHomes electronically, including by email, SMS, WhatsApp, in-app notification, dashboard notification or any other electronic communication method linked to your account.</p>
          <p>1.8 Where the Consumer Protection Act 68 of 2008 ("CPA") applies to your use of the Platform, nothing in these Terms is intended to limit or exclude any rights that cannot lawfully be limited or excluded under applicable South African law.</p>
        </Section>

        <Section title="2. Definitions">
          <p>In these Terms, unless the context indicates otherwise:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>"Advanced Electronic Signature"</strong> means an electronic signature accredited by the South African Accreditation Authority in terms of ECTA.</li>
            <li><strong>"AI Tools"</strong> means the artificial intelligence-assisted features available on the Platform, including but not limited to AI-generated invoices, AI reminders, AI-generated property descriptions and AI-assisted notices.</li>
            <li><strong>"BuildSynergy"</strong> means BuildSynergy (Pty) Ltd (registration number 2025/529281/07), a company registered in the Republic of South Africa, trading as MzanziHomes.</li>
            <li><strong>"CPA"</strong> means the Consumer Protection Act 68 of 2008.</li>
            <li><strong>"Customer Data"</strong> means all information, records and documents uploaded to or generated within the Platform by a User, including lease agreements, inspection reports, photographs, communications and payment records.</li>
            <li><strong>"ECTA"</strong> means the Electronic Communications and Transactions Act 25 of 2002.</li>
            <li><strong>"Information Regulator"</strong> means the Information Regulator established under POPIA.</li>
            <li><strong>"Landlord"</strong> means a User who registers on the Platform as a property owner or person authorised to market or manage a property.</li>
            <li><strong>"Listing Plan"</strong> means the subscription plan designed for landlords who wish to advertise rental properties on the Platform.</li>
            <li><strong>"MzanziHomes"</strong> means BuildSynergy (Pty) Ltd, trading as MzanziHomes, and includes its Platform, website and mobile applications.</li>
            <li><strong>"OTP"</strong> means a one-time password sent to a User's registered contact details for the purpose of verifying identity or confirming a specific action.</li>
            <li><strong>"Payment Provider"</strong> means Paystack or any other authorised third-party payment service provider used by MzanziHomes from time to time.</li>
            <li><strong>"Platform"</strong> means the MzanziHomes website, mobile applications, dashboards, software features, AI tools, landlord tools, tenant app and related digital services accessible at Mzanzihomes.co.za and associated domains.</li>
            <li><strong>"POPIA"</strong> means the Protection of Personal Information Act 4 of 2013.</li>
            <li><strong>"Property Management Plan"</strong> means the subscription plan designed for landlords who manage one or more rental properties and wish to access the full range of property management tools on the Platform.</li>
            <li><strong>"Rental Housing Act"</strong> means the Rental Housing Act 50 of 1999, as amended.</li>
            <li><strong>"Subscription"</strong> means a paid plan activated by a Landlord to access specified features of the Platform.</li>
            <li><strong>"Tenant"</strong> means a person who registers on the Platform as a tenant or prospective tenant.</li>
            <li><strong>"User"</strong> means any person who accesses or uses the Platform, whether as a Landlord, Tenant, or otherwise.</li>
          </ul>
        </Section>

        <Section title="3. Nature of the Platform">
          <p>3.1 MzanziHomes is a technology company that provides cloud-based software designed to empower landlords to independently advertise, organise and manage their own residential rental properties in South Africa.</p>
          <p>3.2 The Platform provides digital tools that assist landlords with tasks such as:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Advertising rental properties</li>
            <li>Managing tenancy records</li>
            <li>Securely storing lease agreements and supporting documents</li>
            <li>Recording and storing inspection reports</li>
            <li>Managing maintenance requests</li>
            <li>Tracking rental payments</li>
            <li>Communicating with tenants</li>
            <li>Using AI-powered administrative tools</li>
            <li>Maintaining a complete digital history of their rental properties</li>
          </ul>
          <p>3.3 MzanziHomes is a digital landlord platform that empowers property owners to manage their own rental properties without the need for a property management company.</p>
          <p>3.4 Throughout a tenancy, the Platform securely stores leases, communications, maintenance records, payment information, inspections, notices and other important property records in one central location. These records create a reliable and permanent digital history that assists landlords and tenants in managing their rental relationship and resolving future queries or disputes.</p>
          <p>3.5 Access to certain features is provided at no cost, while other features require a paid Subscription. The Tenant App is provided free of charge to tenants.</p>
        </Section>

        <Section title="4. What MzanziHomes Is Not">
          <p>4.1 To avoid any misunderstanding, MzanziHomes does not:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>act as a property management company;</li>
            <li>act as a property practitioner or estate agency;</li>
            <li>act as a landlord or tenant;</li>
            <li>become a party to any lease agreement;</li>
            <li>provide legal advice;</li>
            <li>provide accounting or tax advice;</li>
            <li>act as a maintenance contractor; or</li>
            <li>guarantee the conduct, creditworthiness or performance of any Landlord, Tenant, or third party.</li>
          </ul>
          <p>4.2 Unless expressly stated for a specific service, MzanziHomes does not receive, hold or administer rental funds on behalf of landlords or tenants.</p>
          <p>4.3 Landlords remain solely responsible for: selecting tenants; negotiating and entering into lease agreements; complying with the Rental Housing Act, the CPA (where applicable) and all other applicable South African laws; managing their rental properties; collecting rent (where applicable); maintaining their properties in a habitable condition; and making all decisions relating to the rental relationship.</p>
          <p>4.4 MzanziHomes simply provides the technology that enables landlords to manage these activities themselves.</p>
        </Section>

        <Section title="5. Eligibility">
          <p>5.1 To register and use the Platform, you must:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>be at least 18 years old;</li>
            <li>have full legal capacity to enter into binding contracts under South African law;</li>
            <li>not be prohibited by any court order or applicable law from using the Platform;</li>
            <li>provide accurate, truthful and complete registration information; and</li>
            <li>keep your account information current and updated at all times.</li>
          </ul>
          <p>5.2 You are responsible for all activity occurring under your account, whether or not authorised by you.</p>
          <p>5.3 MzanziHomes reserves the right to refuse registration or to suspend or terminate any account where these eligibility requirements are not met.</p>
        </Section>

        <Section title="6. User Accounts and Security">
          <p>6.1 <strong>Registration.</strong> You must register an account to access most Platform features. You may register as a Landlord or a Tenant. Accounts are personal and non-transferable.</p>
          <p>6.2 <strong>One account per person.</strong> You may only hold one active account. Creating multiple accounts to circumvent a suspension, ban or other platform restriction is prohibited and may result in permanent removal from the Platform.</p>
          <p>6.3 <strong>Account security.</strong> You are solely responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must immediately notify MzanziHomes at <a href="mailto:support@mzanzihomes.co.za" className="text-blue-600 underline">support@mzanzihomes.co.za</a> if you suspect any unauthorised access to your account.</p>
          <p>6.4 <strong>Accurate information.</strong> You agree to ensure that all information provided during registration and throughout your use of the Platform is accurate, complete and kept up to date. MzanziHomes may suspend accounts where information is found to be materially inaccurate or misleading.</p>
          <p>6.5 <strong>Two-factor authentication.</strong> Where MzanziHomes makes two-factor authentication available, users are strongly encouraged to enable it. MzanziHomes shall not be liable for losses arising from unauthorised account access where available security features were not activated.</p>
        </Section>

        <Section title="7. Free Tenant App">
          <p>7.1 The Tenant App is provided to tenants free of charge. There is no subscription fee payable by tenants for access to the standard features of the Tenant App.</p>
          <p>7.2 Free access to the Tenant App is provided as a benefit to facilitate communication between landlords and tenants using the Platform. The availability of the Tenant App is subject to the relevant Landlord maintaining an active Subscription.</p>
          <p>7.3 MzanziHomes reserves the right to: introduce paid or premium features within the Tenant App in future; change, remove or add features to the Tenant App; discontinue the Tenant App or specific features upon reasonable notice; and suspend a tenant's access to the Tenant App where the tenant engages in prohibited conduct.</p>
          <p>7.4 Creating an account on the Tenant App or downloading the application does not create a tenancy or rental agreement with MzanziHomes. Any rental agreement is concluded directly between the Landlord and the Tenant.</p>
        </Section>

        <Section title="8. Landlord Subscription Services">
          <p>8.1 The Platform offers two primary subscription-based service plans for landlords:</p>
          <Sub>Listing Plan</Sub>
          <p>Designed for landlords wishing to advertise rental properties. Features may include, but are not limited to:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Property listings</li>
            <li>Tenant enquiry management</li>
            <li>In-app messaging</li>
            <li>Listing management tools</li>
          </ul>
          <Sub>Property Management Plan</Sub>
          <p>Designed for landlords managing one or more rental properties. Features may include, but are not limited to:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>All features included in the Listing Plan</li>
            <li>Lease storage and management</li>
            <li>Tenant records</li>
            <li>Ingoing and outgoing inspection reports</li>
            <li>Maintenance request management</li>
            <li>AI-generated invoices and reminders</li>
            <li>Payment tracking and records</li>
            <li>Secure cloud document storage</li>
            <li>Digital communication history</li>
            <li>Property history records</li>
            <li>Access to the Tenant App for connected tenants</li>
          </ul>
          <p>8.2 The Subscription covers access to the software tools described above as a bundled service. The Subscription is not a contract for advertising only, storage only, messaging only, AI features only, or any other individual component. All features form part of a single software access licence.</p>
          <p>8.3 MzanziHomes may change pricing, modify features, add new features or remove features from any plan after providing reasonable notice in accordance with clause 36.</p>
        </Section>

        <Section title="9. Platform Features and Software Licence">
          <p>9.1 Subject to your Subscription remaining active and your compliance with these Terms, MzanziHomes grants you a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform for its intended purpose during the Subscription term.</p>
          <p>9.2 This licence does not transfer ownership of any software, code, design, algorithm, database, intellectual property or underlying technology to you.</p>
          <p>9.3 Access to the Platform ends when your Subscription is cancelled, suspended or terminated. A user whose Subscription has ended has no ongoing right to use the Platform, whether or not outstanding data remains stored.</p>
          <p>9.4 You acknowledge that the Platform, including its software, AI tools, workflows, designs, and systems, constitutes valuable intellectual property owned exclusively by MzanziHomes.</p>
        </Section>

        <Section title="10. Property Listings">
          <p>10.1 <strong>Accuracy.</strong> You warrant that all information contained in your property listings is accurate, complete, not misleading and complies with the Consumer Protection Act 68 of 2008.</p>
          <p>10.2 <strong>Legal authority.</strong> By listing a property on the Platform, you warrant that you are either the registered owner of the property or have been duly authorised by the registered owner to market, lease or manage it. You indemnify MzanziHomes against any claim arising from a listing placed without legal authority.</p>
          <p>10.3 <strong>Prohibited listings.</strong> You may not list:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Properties that you do not own or are not authorised to list;</li>
            <li>Properties subject to a liquidation, sequestration or court order prohibiting disposal or leasing;</li>
            <li>Properties that are unsafe, uninhabitable or in breach of applicable regulations;</li>
            <li>Misleading, false or duplicate listings; or</li>
            <li>Properties in a manner that discriminates against any person on a prohibited ground.</li>
          </ul>
          <p>10.4 <strong>Listing fees.</strong> Where a listing fee is applicable, it becomes payable before the listing is published. Listing fees are non-refundable once the property has been published. See clause 12 for full details.</p>
          <p>10.5 MzanziHomes reserves the right to remove or suspend any property listing that violates these Terms or applicable law.</p>
        </Section>

        <Section title="11. Subscription Fees and Billing">
          <p>11.1 Subscriptions are billed monthly in advance unless otherwise agreed in writing.</p>
          <p>11.2 Before a Subscription is activated, the applicable monthly fee will be displayed clearly. By clicking "Start Subscription", "Activate Plan", or any equivalent confirmation button, you expressly authorise MzanziHomes and its authorised Payment Provider to process recurring subscription payments from your nominated payment method.</p>
          <p>11.3 Your Subscription automatically renews at the end of each billing period unless you cancel in accordance with clause 16.</p>
          <p>11.4 You authorise MzanziHomes and its authorised Payment Provider to process recurring subscription payments. This authorisation remains in effect until your Subscription is cancelled in accordance with these Terms.</p>
          <p>11.5 <strong>No free trial.</strong> Because Users receive immediate value upon activation of a Subscription — including access to property advertising, AI features, document storage and property management tools — MzanziHomes does not provide a free trial period. Access to paid features begins immediately upon activation.</p>
          <p>11.6 All fees are quoted in South African Rand (ZAR) and are inclusive of VAT unless otherwise stated.</p>
          <p>11.7 <strong>Escalation.</strong> MzanziHomes may adjust Subscription fees on renewal. Where the CPA applies, any fee increase will be communicated with reasonable advance notice, and the User will have the right to cancel without penalty if the revised fee is unacceptable.</p>
        </Section>

        <Section title="12. Listing Fees">
          <p>12.1 Certain services on the Platform may attract a once-off listing fee in addition to or separate from a Subscription.</p>
          <p>12.2 Where a listing fee applies:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>The fee will be clearly disclosed before the listing is published.</li>
            <li>The fee becomes payable before the property is published on the Platform.</li>
            <li>By clicking "Publish Listing" or any equivalent confirmation, you authorise MzanziHomes to commence providing the requested digital listing service immediately.</li>
            <li>Once the listing has been published, the listing fee is non-refundable, as the digital service has commenced.</li>
          </ul>
          <p>12.3 MzanziHomes does not guarantee a specific number of enquiries, viewings, or tenancy outcomes from any listing.</p>
        </Section>

        <Section title="13. Failed Payments and Grace Period">
          <p>13.1 If a Subscription payment cannot be collected on the due date:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>MzanziHomes will send payment reminders to the email address and contact details registered on your account.</li>
            <li>You may update your payment method via your account dashboard.</li>
            <li>A grace period of 7 days will be provided from the original due date.</li>
          </ul>
          <p>13.2 If payment remains outstanding after the grace period, MzanziHomes may, without further notice: suspend your account and restrict access to all paid features; hide or deactivate active property listings; disable in-app messaging; disable AI services; suspend maintenance request functionality; and suspend access to property management tools and document storage.</p>
          <InfoBox>
            13.3 <strong>Your data is safe.</strong> Your Customer Data will remain securely stored during any suspension period. Full functionality will be restored once all outstanding Subscription fees have been paid.
          </InfoBox>
          <p>13.4 MzanziHomes reserves the right to permanently delete an account and all associated Customer Data if the account remains suspended for more than 90 consecutive days following the end of the grace period, subject to applicable data retention requirements.</p>
        </Section>

        <Section title="14. Suspension and Read-Only Access">
          <p>14.1 Upon expiry of the grace period for non-payment, an account may enter a read-only mode before full suspension, during which the User may: view (but not edit or create) existing records, documents and communications; and download and export stored data.</p>
          <p>14.2 Read-only access will be available for 30 days following the expiry of the grace period, after which the account may be fully suspended.</p>
          <p>14.3 MzanziHomes strongly encourages Users to export and download all records they wish to retain before the expiry of the read-only period.</p>
          <p>14.4 In addition to non-payment, MzanziHomes may suspend or terminate an account at any time, with or without prior notice, where: the User engages in prohibited conduct under clause 30; fraud or suspected fraud is detected under clause 31; the User provides materially false information; or suspension is required by applicable law or a court order.</p>
        </Section>

        <Section title="15. Refund Policy">
          <p>15.1 <strong>General principle.</strong> MzanziHomes is a subscription-based digital software platform. Charges become payable only once a User activates a paid feature or Subscription.</p>
          <p>15.2 <strong>No refunds after activation.</strong> Because MzanziHomes' services are digital and are made available immediately upon activation, Subscription fees, listing fees and other charges are generally non-refundable once:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>A property listing has been published;</li>
            <li>A Subscription has been activated;</li>
            <li>Property Management tools have been accessed;</li>
            <li>AI services have been used;</li>
            <li>Documents have been uploaded or generated; or</li>
            <li>Digital cloud storage has been allocated to your account.</li>
          </ul>
          <p>15.3 <strong>Exceptions.</strong> A refund may be considered where: you were charged more than once due to a system error; an unauthorised transaction occurred through no fault of your own; MzanziHomes charged you incorrectly; MzanziHomes was unable to provide the purchased service due to a fault solely attributable to MzanziHomes; or a refund is required by applicable South African law, including the CPA. Refund requests must be submitted to <a href="mailto:support@mzanzihomes.co.za" className="text-blue-600 underline">support@mzanzihomes.co.za</a> within 7 days of the relevant transaction.</p>
          <p>15.4 <strong>No change-of-mind refunds.</strong> Refunds will not be provided because you changed your mind, no longer require the service, sold or rented your property elsewhere, forgot to cancel before renewal, or did not actively use the Platform after activating your Subscription.</p>
          <p>15.5 <strong>CPA rights preserved.</strong> Where the CPA applies to your Subscription and you entered into it as a result of direct marketing, you may have a right to cancel within 5 business days of the transaction date without penalty in terms of section 16 of the CPA, provided digital services have not yet commenced.</p>
        </Section>

        <Section title="16. Cancellation">
          <p>16.1 You may cancel your Subscription at any time through your account dashboard or by providing written notice to <a href="mailto:support@mzanzihomes.co.za" className="text-blue-600 underline">support@mzanzihomes.co.za</a>.</p>
          <p>16.2 <strong>CPA-protected Users.</strong> Where the CPA applies to your Subscription: you may cancel on 20 business days' written notice, and MzanziHomes will honour all mandatory cancellation rights provided under the CPA.</p>
          <p>16.3 <strong>Non-CPA Users (juristic persons above threshold).</strong> Where the CPA does not apply, standard contractual notice periods as agreed at the time of Subscription apply.</p>
          <p>16.4 Upon cancellation: your Subscription will remain active until the end of the current paid billing period, unless otherwise required by law; no further Subscription fees will be charged after the cancellation takes effect; and listing fees and fees for digital services already commenced are non-refundable.</p>
          <p>16.5 Following cancellation, access to the Platform and all paid features will end at the close of the final billing period.</p>
          <p>16.6 MzanziHomes strongly encourages you to export and download all records, documents and data you wish to retain before your access ends.</p>
        </Section>

        <Section title="17. Data Export">
          <p>17.1 During an active Subscription, Users may export and download their Customer Data at any time via the export tools available in their account dashboard.</p>
          <p>17.2 Following cancellation or suspension, Users will have access to a data export window of 90 days during which they may download their Customer Data in standard formats (such as PDF, CSV, or JSON where applicable).</p>
          <p>17.3 MzanziHomes will provide reasonable assistance to Users wishing to export their data during this period. Users are responsible for initiating the export process.</p>
        </Section>

        <Section title="18. Data Retention After Cancellation">
          <p>18.1 Following the expiry of the data export window, MzanziHomes may permanently and irrecoverably delete all Customer Data associated with the cancelled account.</p>
          <p>18.2 MzanziHomes may retain certain data for a period after cancellation where required or permitted by: applicable South African law; a contractual obligation; an ongoing dispute, litigation or regulatory investigation; fraud prevention or security requirements; tax, accounting or financial compliance purposes; or another lawful purpose under POPIA.</p>
          <p>18.3 Personal information will not be retained beyond the period for which it was originally collected, unless retention is required or permitted by applicable law.</p>
        </Section>

        <Section title="19. Protection of Personal Information (POPIA)">
          <p>19.1 MzanziHomes is committed to protecting the personal information of all Users in accordance with the Protection of Personal Information Act 4 of 2013 ("POPIA").</p>
          <p>19.2 <strong>What we collect.</strong> MzanziHomes collects and processes personal information necessary to provide the Platform, including: full name, identity number and contact details; property information and addresses; financial and payment information (processed by the Payment Provider); lease and tenancy records uploaded by Users; communications and messages sent through the Platform; device information and usage data; and any other personal information provided by Users in the course of using the Platform.</p>
          <p>19.3 <strong>Why we collect it.</strong> Personal information is collected and processed for the following purposes: to create and manage User accounts; to provide and operate Platform features; to process payments; to send service-related communications, reminders and notifications; to maintain property and tenancy records; to comply with applicable South African law; and to improve the Platform using anonymised or aggregated data only, unless specific consent is obtained.</p>
          <p>19.4 <strong>Operator relationships.</strong> Where a Landlord uploads the personal information of tenants or other third parties to the Platform, the Landlord is the responsible party under POPIA and MzanziHomes acts as the operator processing that information on the Landlord's behalf.</p>
          <p>19.5 <strong>Security.</strong> MzanziHomes implements appropriate technical and organisational security measures to protect personal information against unauthorised access, loss, destruction or damage.</p>
          <p>19.6 <strong>Breach notification.</strong> In the event of a security compromise involving personal information, MzanziHomes will notify affected data subjects and the Information Regulator as soon as reasonably possible, in accordance with section 22 of POPIA, via the Information Regulator's eServices portal.</p>
          <p>19.7 <strong>Data subject rights.</strong> Users have the right to: request access to their personal information held by MzanziHomes; request correction of inaccurate personal information; request deletion of personal information where no longer required or where processing was unlawful; object to the processing of their personal information; and lodge a complaint with the Information Regulator (<a href="https://www.inforegulator.org.za" target="_blank" rel="noreferrer" className="text-blue-600 underline">www.inforegulator.org.za</a>).</p>
          <p>19.8 <strong>Cross-border transfers.</strong> Where personal information is transferred to infrastructure or service providers outside South Africa, MzanziHomes ensures that adequate data protection safeguards are in place in accordance with section 72 of POPIA.</p>
          <p>19.9 <strong>AI and personal information.</strong> Customer Data and personal information will not be used to train MzanziHomes' AI models or third-party AI models without the explicit, informed consent of the relevant Users.</p>
          <p>19.10 Full details of MzanziHomes' data processing practices are set out in the MzanziHomes <Link to="/privacy-policy" className="text-blue-600 underline">Privacy Policy</Link>.</p>
          <p>19.11 MzanziHomes' nominated Information Officer is contactable at: <a href="mailto:privacy@mzanzihomes.co.za" className="text-blue-600 underline">privacy@mzanzihomes.co.za</a>.</p>
        </Section>

        <Section title="20. Landlord Responsibilities">
          <p>20.1 Landlords who use the Platform remain solely responsible for:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Ensuring that all property listings are accurate, lawful and not misleading;</li>
            <li>Ensuring that they have legal authority to list, market and lease the property;</li>
            <li>Conducting tenant screening and credit checks prior to entering into a lease agreement;</li>
            <li>Ensuring that lease agreements comply with the Rental Housing Act, the CPA and all other applicable law;</li>
            <li>Holding rental deposits in an interest-bearing account in accordance with section 5(3)(d) of the Rental Housing Act;</li>
            <li>Maintaining the property in a habitable condition throughout the tenancy;</li>
            <li>Following lawful eviction procedures and not engaging in unlawful self-help evictions;</li>
            <li>Complying with all applicable municipal bylaws, body corporate rules and other property-related obligations; and</li>
            <li>Ensuring that the personal information of tenants uploaded to the Platform is processed lawfully and in accordance with POPIA.</li>
          </ul>
          <p>20.2 MzanziHomes provides software tools only. The use of these tools does not relieve the Landlord of any legal obligation.</p>
          <p>20.3 Landlords indemnify MzanziHomes against any claim, loss, damage, fine or penalty arising from the Landlord's failure to comply with any applicable law or these Terms.</p>
        </Section>

        <Section title="21. Tenant Responsibilities">
          <p>21.1 Tenants who use the Platform are responsible for: providing accurate, complete and truthful information during the application process; meeting all obligations under any lease agreement entered into with a Landlord; paying rent on time as agreed in the lease agreement; communicating with the Landlord through the Platform in a respectful and lawful manner; and complying with these Terms.</p>
          <p>21.2 Providing false information during a rental application may constitute fraud under South African law and may result in immediate account termination and referral to the South African Police Service.</p>
          <p>21.3 Any rental agreement concluded through the Platform is an agreement directly between the Landlord and the Tenant. MzanziHomes is not a party to any such agreement.</p>
        </Section>

        <Section title="22. Communication Records">
          <p>22.1 Messages, notices, reminders and other communications sent between landlords and tenants through the Platform are recorded and stored as part of the permanent digital property record.</p>
          <p>22.2 These communication records: are stored securely and cannot be deleted by either party once sent; form part of the digital property history maintained by MzanziHomes; may be used by either party to demonstrate the content and timing of communications in the event of a dispute; and may be retained by MzanziHomes for audit, compliance and dispute resolution purposes.</p>
          <p>22.3 By using the Platform's messaging features, both landlords and tenants acknowledge and consent to the permanent recording and storage of their communications in accordance with POPIA.</p>
        </Section>

        <Section title="23. Inspection and Maintenance Records">
          <p>23.1 Ingoing and outgoing inspection reports, photographs, videos and related documentation stored on the Platform form part of the permanent property record.</p>
          <p>23.2 Maintenance requests and their associated records, photographs, communications and resolution history are stored as part of the property's digital history.</p>
          <p>23.3 MzanziHomes provides software for recording these items only. MzanziHomes is not responsible for the accuracy of any inspection report uploaded by a User, the outcome of any maintenance request, or the conduct of any maintenance contractor or service provider.</p>
        </Section>

        <Section title="24. AI Tools and AI Disclaimer">
          <p>24.1 The Platform includes AI-powered tools that may assist Users with tasks such as: generating rental invoices and payment reminders; drafting lease-related notices and communications; generating property descriptions for listings; and producing summaries or reports based on property data.</p>
          <p>24.2 AI-generated content is produced automatically and may contain inaccuracies, errors, omissions or content that is unsuitable for your specific circumstances.</p>
          <WarnBox>
            24.3 <strong>You are responsible.</strong> All AI-generated content must be reviewed and verified by you before it is used, sent, or relied upon in any way. By using any AI-generated output, you confirm that you have reviewed it and accept responsibility for its accuracy and appropriateness.
          </WarnBox>
          <p>24.4 MzanziHomes makes no warranty that AI-generated content is legally compliant, accurate, free from errors, fit for any particular purpose, or suitable as a substitute for legal, accounting or professional advice.</p>
          <p>24.5 MzanziHomes shall not be liable for any loss, damage, claim or liability arising from a User's reliance on AI-generated content without independent verification.</p>
        </Section>

        <Section title="25. Electronic Communications">
          <p>25.1 You consent to receiving all communications from MzanziHomes electronically, including account notifications, payment invoices, reminders, receipts, legal notices, policy updates and service announcements.</p>
          <p>25.2 Electronic communications will be delivered to the email address, mobile number or in-app notification channel registered on your account. You are responsible for ensuring your contact details are kept current.</p>
          <p>25.3 A communication is deemed received: by email, on the date and time of transmission to the registered email address; by SMS or WhatsApp, on the date and time of delivery to the registered number; by in-app notification, when accessible in your account dashboard.</p>
        </Section>

        <Section title="26. Electronic Signatures and OTP Verification">
          <p>26.1 The Platform supports electronic signatures and OTP-based verification for the execution of documents including lease agreements, addenda, notices and other property-related instruments.</p>
          <p>26.2 <strong>ECTA compliance.</strong> Electronic signatures used on the Platform constitute valid and binding signatures under sections 13 and 22 of ECTA, provided that the method used identifies the signatory and indicates the signatory's approval of the document.</p>
          <p>26.3 <strong>OTP verification.</strong> Where a User confirms a signature or action by entering an OTP sent to their registered contact details, that OTP confirmation constitutes a valid electronic signature in terms of ECTA and confirmation of the User's identity and informed intention to be bound by the relevant document or action. MzanziHomes records the date, time, User identity, document reference and OTP confirmation for each signing event.</p>
          <p>26.4 <strong>Lease agreements.</strong> Standard residential lease agreements with a term of less than 10 years may be validly executed using electronic signatures under ECTA. Users are advised to seek legal advice for long-term or complex lease arrangements.</p>
          <WarnBox>
            26.5 <strong>Important limitation.</strong> Electronic signatures cannot lawfully be used for agreements for the alienation of immovable property (sale agreements) under the Alienation of Land Act 68 of 1981. The Platform is not designed or intended for such transactions.
          </WarnBox>
        </Section>

        <Section title="27. Payment Processing and Third-Party Providers">
          <p>27.1 Payments on the Platform are processed by Paystack or such other authorised Payment Provider as MzanziHomes designates from time to time. MzanziHomes does not store your full card number, CVV, or complete bank account details.</p>
          <p>27.2 By making a payment through the Platform, you agree to the Payment Provider's terms and conditions in addition to these Terms.</p>
          <p>27.3 MzanziHomes shall not be liable for payment processing errors, failures or delays caused by the Payment Provider, downtime of the Payment Provider's systems, or unauthorised transactions arising from your failure to protect your payment credentials.</p>
          <p>27.4 The Platform may integrate with other third-party service providers, including cloud storage providers, analytics services and communication tools. Each sub-processor is bound by data protection obligations equivalent to those in these Terms and applicable law.</p>
        </Section>

        <Section title="28. Split Payments and Commission">
          <p>28.1 Where the Platform facilitates rental payment collection on behalf of a Landlord, rental payments may be automatically processed and split between: the Landlord (the applicable rental amount after deductions); and MzanziHomes (any applicable platform commission or service fee).</p>
          <p>28.2 By activating a payment collection feature, Landlords authorise MzanziHomes and its Payment Provider to process and apply the relevant split automatically.</p>
          <p>28.3 The applicable commission or service fee will be clearly disclosed to the Landlord before the payment collection feature is activated.</p>
          <p>28.4 MzanziHomes does not hold rental funds in trust. Where funds are temporarily held during processing, this is a payment facilitation function only.</p>
        </Section>

        <Section title="29. Intellectual Property">
          <p>29.1 All intellectual property rights in and to the Platform, including the software, code, algorithms, AI models and tools, user interfaces, designs, workflows, logos, trade marks, trade names, databases, documentation and content created by MzanziHomes, are owned exclusively by BuildSynergy (Pty) Ltd.</p>
          <p>29.2 Users retain ownership of Customer Data uploaded by them to the Platform. By uploading Customer Data, Users grant MzanziHomes a limited, non-exclusive, royalty-free licence to store, process and display that data solely for the purpose of providing the Platform services.</p>
          <p>29.3 Users may not, without MzanziHomes' prior written consent: copy, reproduce, modify, adapt or create derivative works of the Platform; reverse engineer, decompile, disassemble or attempt to access the source code of the Platform; use Platform content, data or listings to build a competing product or service; scrape, extract or harvest data from the Platform using automated tools or bots; or remove or alter any copyright notice or proprietary marking on the Platform.</p>
        </Section>

        <Section title="30. Acceptable Use and Prohibited Conduct">
          <p>30.1 Users agree to use the Platform only for its intended, lawful purpose and in compliance with these Terms and applicable South African law.</p>
          <p>30.2 You may not use the Platform to:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Post false, misleading or fraudulent property listings or tenant applications;</li>
            <li>Discriminate against any person on a prohibited ground under the South African Constitution, the Rental Housing Act or the CPA;</li>
            <li>Harass, abuse, threaten, intimidate or defame any other User;</li>
            <li>Solicit, collect or share another User's personal information without their consent;</li>
            <li>Circumvent, disable or interfere with any security or access control feature of the Platform;</li>
            <li>Use automated tools, bots, scrapers or crawlers to access or extract Platform data without prior written consent;</li>
            <li>Use the Platform for any illegal purpose, including money laundering, fraud or any activity prohibited by the Cybercrimes Act 19 of 2020;</li>
            <li>Upload or transmit malware, viruses, or any malicious code; or</li>
            <li>Engage in any conduct that disrupts, overloads or interferes with the Platform's infrastructure.</li>
          </ul>
          <p>30.3 Violations may result in immediate account suspension or termination and may be reported to the South African Police Service, the Information Regulator or other relevant authorities.</p>
        </Section>

        <Section title="31. Fraud Prevention and Account Suspension">
          <p>31.1 MzanziHomes reserves the right to suspend or terminate any account immediately and without prior notice where fraud, suspected fraud, identity theft, money laundering or any other criminal activity is detected or reasonably suspected.</p>
          <p>31.2 Where an account is suspended for suspected fraud, MzanziHomes may freeze access to all account features and data, report the matter to the South African Police Service or other relevant authorities, and cooperate with any lawful investigation.</p>
          <p>31.3 Users who believe their account has been suspended in error may contact MzanziHomes at <a href="mailto:support@mzanzihomes.co.za" className="text-blue-600 underline">support@mzanzihomes.co.za</a> to request a review.</p>
        </Section>

        <Section title="32. Platform Availability and Service Levels">
          <p>32.1 MzanziHomes aims to provide reliable, high-availability access to the Platform. However, the Platform is provided on an "as is" and "as available" basis.</p>
          <p>32.2 The Platform may be temporarily unavailable due to scheduled maintenance, technical failures, internet service disruptions, load shedding or Eskom power disruptions, cyber attacks, third-party service provider outages, or force majeure events as defined in clause 37.</p>
          <p>32.3 MzanziHomes will use reasonable endeavours to restore Platform availability as promptly as practicable following any interruption and will carry out planned maintenance during off-peak hours where reasonably possible.</p>
        </Section>

        <Section title="33. Limitation of Liability">
          <p>33.1 To the maximum extent permitted by applicable South African law, MzanziHomes' total aggregate liability to a User for any and all claims arising from or in connection with these Terms or the use of the Platform shall not exceed: the total Subscription fees paid by that User to MzanziHomes in the 12-month period preceding the event giving rise to the claim; or R 500 (five hundred rand), whichever is greater.</p>
          <p>33.2 MzanziHomes shall not be liable, under any circumstances, for indirect, incidental, special, punitive or consequential damages, loss of profits, loss of revenue, loss of business opportunity or loss of data, reputational harm, the conduct of any Landlord, Tenant, or third party, or the accuracy, condition, safety or legal compliance of any property listed on the Platform.</p>
          <p>33.3 MzanziHomes is a software provider only and is not liable for the outcome of any tenancy, any decision made by a Landlord regarding tenant selection, the legal validity of any lease agreement, or the accuracy of any AI-generated content.</p>
          <p>33.4 Nothing in these Terms limits MzanziHomes' liability for fraud or wilful misconduct, gross negligence, death or personal injury caused by MzanziHomes' negligence, or any liability that cannot lawfully be excluded or limited under the CPA or POPIA.</p>
        </Section>

        <Section title="34. Indemnity">
          <p>34.1 You agree to indemnify, defend and hold harmless MzanziHomes, its directors, employees, agents and service providers from and against any claims, losses, damages, costs (including reasonable legal costs) and liabilities arising from or in connection with: your use of the Platform in breach of these Terms; your breach of any applicable law, including the Rental Housing Act, the CPA or POPIA; any property listing, document, or information you upload that is inaccurate, misleading, unlawful or in breach of a third party's rights; any lease agreement, tenancy arrangement or dispute between you and another User; or your infringement of any third party's intellectual property or privacy rights.</p>
        </Section>

        <Section title="35. Changes to the Platform">
          <p>35.1 MzanziHomes reserves the right to modify, enhance, add, remove or discontinue any feature, tool, service or aspect of the Platform at any time.</p>
          <p>35.2 Where a change materially reduces the features available under an active Subscription, MzanziHomes will provide reasonable advance notice and, where applicable, a pro-rata refund or credit for the affected period.</p>
        </Section>

        <Section title="36. Changes to These Terms">
          <p>36.1 MzanziHomes may update these Terms from time to time to reflect changes in the Platform, applicable law, or business practices.</p>
          <p>36.2 When Terms are updated, MzanziHomes will update the "Last Updated" date and notify Users via the Platform dashboard and/or email.</p>
          <p>36.3 Where changes are material and the CPA applies, MzanziHomes will provide at least 20 business days' advance notice before the updated Terms take effect.</p>
          <p>36.4 Your continued use of the Platform after the updated Terms take effect constitutes your acceptance of the revised Terms. If you do not accept the updated Terms, you must stop using the Platform and cancel your Subscription before the effective date.</p>
        </Section>

        <Section title="37. Force Majeure">
          <p>37.1 MzanziHomes shall not be liable for any failure or delay in performing its obligations under these Terms where such failure or delay is caused by circumstances beyond MzanziHomes' reasonable control, including but not limited to:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Load shedding, Eskom power outages or national electricity grid failures;</li>
            <li>Natural disasters, acts of God or extreme weather events;</li>
            <li>Cyber attacks, denial-of-service attacks or malicious intrusions;</li>
            <li>Internet service outages or telecommunications network failures;</li>
            <li>Cloud infrastructure or third-party service provider failures;</li>
            <li>Government restrictions, regulations or actions;</li>
            <li>Acts of war, terrorism or civil unrest;</li>
            <li>Pandemic or public health emergency; or</li>
            <li>Any other event outside MzanziHomes' reasonable control.</li>
          </ul>
          <p>37.2 MzanziHomes will notify Users as soon as reasonably practicable of any force majeure event affecting the Platform.</p>
        </Section>

        <Section title="38. Dispute Resolution">
          <p>38.1 <strong>Internal complaints.</strong> If you have a complaint about the Platform or these Terms, contact MzanziHomes first at <a href="mailto:support@mzanzihomes.co.za" className="text-blue-600 underline">support@mzanzihomes.co.za</a>. MzanziHomes will endeavour to respond within a reasonable time.</p>
          <p>38.2 <strong>Negotiation.</strong> If the internal complaint process does not resolve the matter, the parties agree to attempt to resolve the dispute through good-faith negotiation within 30 days of written notice of the dispute.</p>
          <p>38.3 <strong>Mediation.</strong> If negotiation is unsuccessful, either party may refer the dispute to mediation before the Arbitration Foundation of Southern Africa ("AFSA") or such other mutually agreed mediator, before resorting to litigation.</p>
          <p>38.4 <strong>Rental Housing Tribunal.</strong> Disputes between landlords and tenants relating to the rental of residential property may be referred to the Rental Housing Tribunal in the relevant province at no cost, in terms of the Rental Housing Act.</p>
          <p>38.5 <strong>National Consumer Commission.</strong> Where the CPA applies, Users have the right to refer complaints to the National Consumer Commission or the Consumer Goods and Services Ombud (CGSO).</p>
          <p>38.6 <strong>Litigation.</strong> If a dispute cannot be resolved through the above processes, either party may institute proceedings in the appropriate South African court.</p>
        </Section>

        <Section title="39. Governing Law and Jurisdiction">
          <p>39.1 These Terms are governed by and construed in accordance with the laws of the Republic of South Africa, including ECTA, the CPA, POPIA, the Rental Housing Act and South African common law.</p>
          <p>39.2 You consent to the non-exclusive jurisdiction of the Magistrate's Court or High Court of South Africa having jurisdiction over the relevant matter, or the Gauteng Division of the High Court of South Africa.</p>
          <p>39.3 Nothing in this clause prevents MzanziHomes from seeking urgent or interim relief in any court of competent jurisdiction.</p>
        </Section>

        <Section title="40. Notices and Contact Details">
          <p>40.1 Any notice required or permitted under these Terms must be in writing and may be delivered by email to the addresses set out below or to the User's registered email address, by registered post to the physical address below, or via the Platform's in-app notification system.</p>
          <p>40.2 Notice by email is deemed received on the date of transmission to the correct address. Notice by registered post is deemed received 7 days after posting.</p>
          <p>40.3 MzanziHomes' contact details:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <tbody>
                <tr className="border-b border-gray-200"><td className="px-3 py-2 font-semibold bg-gray-50 w-44">Company</td><td className="px-3 py-2">BuildSynergy (Pty) Ltd, trading as MzanziHomes</td></tr>
                <tr className="border-b border-gray-200"><td className="px-3 py-2 font-semibold bg-gray-50">Registration number</td><td className="px-3 py-2">2025/529281/07</td></tr>
                <tr className="border-b border-gray-200"><td className="px-3 py-2 font-semibold bg-gray-50">Website</td><td className="px-3 py-2"><a href="https://mzanzihomes.co.za" className="text-blue-600 underline">mzanzihomes.co.za</a></td></tr>
                <tr className="border-b border-gray-200"><td className="px-3 py-2 font-semibold bg-gray-50">General enquiries</td><td className="px-3 py-2"><a href="mailto:support@mzanzihomes.co.za" className="text-blue-600 underline">support@mzanzihomes.co.za</a></td></tr>
                <tr className="border-b border-gray-200"><td className="px-3 py-2 font-semibold bg-gray-50">Legal notices</td><td className="px-3 py-2"><a href="mailto:legal@mzanzihomes.co.za" className="text-blue-600 underline">legal@mzanzihomes.co.za</a></td></tr>
                <tr className="border-b border-gray-200"><td className="px-3 py-2 font-semibold bg-gray-50">Privacy / POPIA</td><td className="px-3 py-2"><a href="mailto:privacy@mzanzihomes.co.za" className="text-blue-600 underline">privacy@mzanzihomes.co.za</a></td></tr>
                <tr><td className="px-3 py-2 font-semibold bg-gray-50">Country</td><td className="px-3 py-2">Republic of South Africa</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

      </div>

      <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
        © 2026 BuildSynergy (Pty) Ltd (Reg. No. 2025/529281/07), trading as MzanziHomes · These Terms and Conditions are governed by the laws of the Republic of South Africa · Version 1.0
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
