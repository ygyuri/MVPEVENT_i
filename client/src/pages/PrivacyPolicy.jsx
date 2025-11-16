import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText, Mail, Phone, Database, Globe, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const PrivacyPolicy = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://event-i.co.ke";
  const currentUrl = `${baseUrl}/privacy`;
  const lastUpdated = new Date().toISOString().split("T")[0];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LegalDocument",
    "name": "Privacy Policy",
    "description": "Privacy Policy for Event-i event management platform",
    "url": currentUrl,
    "datePublished": "2024-01-01",
    "dateModified": lastUpdated,
    "publisher": {
      "@type": "Organization",
      "name": "Event-i",
      "url": baseUrl,
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@event-i.co.ke",
        "telephone": "+254703328938",
        "contactType": "customer service"
      }
    },
    "inLanguage": "en-US"
  };

  return (
    <>
      <Helmet>
        <title>Privacy Policy | Event-i</title>
        <meta name="description" content="Event-i Privacy Policy - Learn how we collect, use, and protect your personal information when you use our event management platform." />
        <meta name="keywords" content="privacy policy, data protection, GDPR, CCPA, event management, Event-i" />
        <link rel="canonical" href={currentUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Privacy Policy | Event-i" />
        <meta property="og:description" content="Event-i Privacy Policy - Learn how we collect, use, and protect your personal information." />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Event-i" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Privacy Policy | Event-i" />
        <meta name="twitter:description" content="Event-i Privacy Policy - Learn how we collect, use, and protect your personal information." />
        
        {/* Structured Data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container-modern py-12 md:py-16 lg:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl mb-6">
            <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 space-y-10">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                1. Introduction
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Welcome to Event-i ("we," "our," or "us"). We are committed to
                protecting your privacy and ensuring you have a positive
                experience on our platform. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you
                use our event management platform, including our website and
                services.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                By using Event-i, you agree to the collection and use of
                information in accordance with this policy. If you do not agree
                with our policies and practices, please do not use our services.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                2. Information We Collect
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                2.1 Information You Provide
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Account Information:</strong> Name, email address,
                  username, password, and profile information
                </li>
                <li>
                  <strong>Payment Information:</strong> Payment method details,
                  billing address, and transaction history
                </li>
                <li>
                  <strong>Event Information:</strong> Event details,
                  descriptions, images, and other content you create
                </li>
                <li>
                  <strong>Contact Information:</strong> Phone numbers,
                  addresses, and other contact details
                </li>
                <li>
                  <strong>Communications:</strong> Messages, feedback, and
                  correspondence with us or other users
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                2.2 Automatically Collected Information
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Usage Data:</strong> Pages visited, time spent, click
                  patterns, and navigation paths
                </li>
                <li>
                  <strong>Device Information:</strong> IP address, browser type,
                  operating system, and device identifiers
                </li>
                <li>
                  <strong>Cookies and Tracking:</strong> Information collected
                  through cookies, web beacons, and similar technologies
                </li>
                <li>
                  <strong>Location Data:</strong> General location information
                  based on IP address or device settings
                </li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                3. How We Use Your Information
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>To provide, maintain, and improve our services</li>
                <li>
                  To process transactions and send related information,
                  including confirmations and invoices
                </li>
                <li>
                  To send you technical notices, updates, security alerts, and
                  support messages
                </li>
                <li>To respond to your comments, questions, and requests</li>
                <li>
                  To personalize your experience and provide content and
                  features relevant to your interests
                </li>
                <li>To monitor and analyze usage patterns and trends</li>
                <li>
                  To detect, prevent, and address technical issues and security
                  threats
                </li>
                <li>
                  To comply with legal obligations and enforce our terms of
                  service
                </li>
                <li>
                  To send you marketing communications (with your consent) about
                  events, promotions, and new features
                </li>
              </ul>
            </section>

            {/* Data Sharing and Disclosure */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. Data Sharing and Disclosure
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We do not sell your personal information. We may share your
                information in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Service Providers:</strong> With third-party vendors
                  who perform services on our behalf (payment processing, email
                  delivery, analytics)
                </li>
                <li>
                  <strong>Event Organizers:</strong> With event organizers to
                  facilitate ticket purchases and event management
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law,
                  court order, or government regulation
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a
                  merger, acquisition, or sale of assets
                </li>
                <li>
                  <strong>With Your Consent:</strong> When you explicitly
                  authorize us to share your information
                </li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                5. Data Security
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We implement appropriate technical and organizational security
                measures to protect your personal information against
                unauthorized access, alteration, disclosure, or destruction.
                These measures include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4 mt-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure payment processing through trusted providers</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                However, no method of transmission over the Internet or
                electronic storage is 100% secure. While we strive to use
                commercially acceptable means to protect your information, we
                cannot guarantee absolute security.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Your Privacy Rights
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Depending on your location, you may have certain rights
                regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Access:</strong> Request access to your personal
                  information
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate
                  or incomplete data
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal
                  information
                </li>
                <li>
                  <strong>Portability:</strong> Request transfer of your data to
                  another service
                </li>
                <li>
                  <strong>Objection:</strong> Object to processing of your
                  personal information
                </li>
                <li>
                  <strong>Withdrawal:</strong> Withdraw consent where processing
                  is based on consent
                </li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                To exercise these rights, please contact us using the
                information provided at the end of this policy.
              </p>
            </section>

            {/* Data Processing Legal Basis */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                7. Legal Basis for Processing (GDPR)
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We process your personal information based on the following legal bases:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Contract Performance:</strong> To fulfill our contractual obligations and provide services you've requested
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> To operate and improve our platform, ensure security, and prevent fraud
                </li>
                <li>
                  <strong>Consent:</strong> When you've given explicit consent for specific processing activities
                </li>
                <li>
                  <strong>Legal Obligations:</strong> To comply with applicable laws, regulations, and legal processes
                </li>
                <li>
                  <strong>Vital Interests:</strong> To protect your safety or the safety of others
                </li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                8. Data Retention
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Our data retention periods are as follows:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Account Information:</strong> Retained while your account is active and for up to 2 years after account closure, unless you request earlier deletion
                </li>
                <li>
                  <strong>Transaction Records:</strong> Retained for 7 years as required by tax and accounting regulations
                </li>
                <li>
                  <strong>Event Data:</strong> Retained for the duration of the event and up to 2 years after the event ends
                </li>
                <li>
                  <strong>Marketing Communications:</strong> Retained until you opt out or request deletion
                </li>
                <li>
                  <strong>Analytics Data:</strong> Aggregated and anonymized data may be retained indefinitely for statistical purposes
                </li>
                <li>
                  <strong>Legal Records:</strong> Retained as required by applicable laws and regulations
                </li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                After the retention period expires, we will securely delete or anonymize your personal information.
              </p>
            </section>

            {/* International Data Transfers */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                9. International Data Transfers
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. When we transfer your data internationally, we ensure appropriate safeguards are in place:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Standard Contractual Clauses:</strong> We use European Commission-approved standard contractual clauses with service providers
                </li>
                <li>
                  <strong>Adequacy Decisions:</strong> We transfer data to countries with adequacy decisions from relevant authorities
                </li>
                <li>
                  <strong>Certification Programs:</strong> We work with service providers certified under recognized data protection frameworks
                </li>
                <li>
                  <strong>Technical and Organizational Measures:</strong> We implement appropriate security measures to protect your data during transfer
                </li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                By using our services, you consent to the transfer of your information to countries outside your jurisdiction, subject to the safeguards described above.
              </p>
            </section>

            {/* Data Breach Notification */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                10. Data Breach Notification
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                In the event of a data breach that poses a risk to your rights and freedoms, we will:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Notify Relevant Authorities:</strong> Report the breach to appropriate data protection authorities within 72 hours of becoming aware of it, where required by law
                </li>
                <li>
                  <strong>Notify Affected Users:</strong> Inform you without undue delay if the breach is likely to result in a high risk to your rights and freedoms
                </li>
                <li>
                  <strong>Provide Details:</strong> Include information about the nature of the breach, the types of data affected, and steps we're taking to address it
                </li>
                <li>
                  <strong>Remediation:</strong> Take immediate steps to contain the breach and prevent further unauthorized access
                </li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                We maintain an incident response plan and regularly test our security measures to minimize the risk of data breaches.
              </p>
            </section>

            {/* Third-Party Service Providers */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                11. Third-Party Service Providers
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We use third-party service providers to help us operate our platform and provide services. These providers may have access to your personal information only to perform tasks on our behalf and are obligated not to disclose or use it for any other purpose. Our key service providers include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Payment Processors:</strong> PayHero, MPesa, and other payment gateways for secure payment processing
                </li>
                <li>
                  <strong>Cloud Hosting:</strong> Cloud infrastructure providers for data storage and application hosting
                </li>
                <li>
                  <strong>Email Services:</strong> Email service providers for transactional and marketing communications
                </li>
                <li>
                  <strong>Analytics Services:</strong> Analytics providers for understanding usage patterns and improving our services
                </li>
                <li>
                  <strong>Authentication Services:</strong> Google OAuth and other authentication providers for user login
                </li>
                <li>
                  <strong>Customer Support:</strong> Customer support platforms for managing user inquiries
                </li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                All third-party service providers are required to comply with applicable data protection laws and implement appropriate security measures. We regularly review our service providers to ensure they meet our data protection standards.
              </p>
            </section>

            {/* User Rights Implementation */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                12. Exercising Your Rights
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                To exercise your privacy rights, please contact us at support@event-i.co.ke with:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>Your name and email address associated with your account</li>
                <li>A clear description of the right you wish to exercise</li>
                <li>Verification of your identity (we may request additional information to verify your identity)</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                We will respond to your request within 30 days, or within the time period required by applicable law. If we need more time to process your request, we will inform you of the reason and the extended timeframe.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority or supervisory authority.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                13. Cookies and Tracking Technologies
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We use cookies and similar tracking technologies to track
                activity on our platform and store certain information. You can
                instruct your browser to refuse all cookies or to indicate when
                a cookie is being sent. However, if you do not accept cookies,
                you may not be able to use some portions of our service.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                For more information about our use of cookies, please see our{" "}
                <Link
                  to="/cookies"
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                >
                  Cookie Policy
                </Link>
                .
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                14. Children's Privacy
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Our services are not intended for individuals under the age of
                18. We do not knowingly collect personal information from
                children. If you are a parent or guardian and believe your child
                has provided us with personal information, please contact us
                immediately.
              </p>
            </section>

            {/* Changes to This Policy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                15. Changes to This Privacy Policy
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We may update our Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "Last updated" date. You are advised
                to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            {/* Contact Us */}
            <section className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                16. Contact Us
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our data
                practices, please contact us:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <a
                    href="mailto:support@event-i.co.ke"
                    className="hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    support@event-i.co.ke
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Phone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <a
                    href="tel:+254703328938"
                    className="hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    +254 703 328 938
                  </a>
                </div>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
};

export default PrivacyPolicy;
