import { motion } from "framer-motion";
import {
  FileText,
  Scale,
  AlertTriangle,
  CreditCard,
  Users,
  Shield,
  Mail,
  Phone,
  Clock,
  Globe,
  Server,
  Edit3,
} from "lucide-react";
import { Helmet } from "react-helmet-async";

const TermsOfService = () => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://event-i.co.ke";
  const currentUrl = `${baseUrl}/terms`;
  const lastUpdated = new Date().toISOString().split("T")[0];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LegalDocument",
    "name": "Terms of Service",
    "description": "Terms of Service for Event-i event management platform",
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
        <title>Terms of Service | Event-i</title>
        <meta name="description" content="Event-i Terms of Service - Read our terms and conditions for using our event management platform." />
        <meta name="keywords" content="terms of service, terms and conditions, user agreement, event management, Event-i" />
        <link rel="canonical" href={currentUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Terms of Service | Event-i" />
        <meta property="og:description" content="Event-i Terms of Service - Read our terms and conditions for using our platform." />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Event-i" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Terms of Service | Event-i" />
        <meta name="twitter:description" content="Event-i Terms of Service - Read our terms and conditions for using our platform." />
        
        {/* Structured Data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container-modern py-12 md:py-16 lg:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-6">
            <Scale className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Terms of Service
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
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                1. Agreement to Terms
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                By accessing or using Event-i ("the Platform"), you agree to be
                bound by these Terms of Service ("Terms"). If you disagree with
                any part of these terms, then you may not access the Platform.
                These Terms apply to all visitors, users, and others who access
                or use the service.
              </p>
            </section>

            {/* Description of Service */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                2. Description of Service
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Event-i is an event management platform that enables:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>Event organizers to create, manage, and promote events</li>
                <li>Users to discover, purchase tickets, and attend events</li>
                <li>Ticket validation and QR code scanning for event entry</li>
                <li>Payment processing and transaction management</li>
                <li>Event analytics and reporting tools</li>
              </ul>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                3. User Accounts
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                3.1 Account Creation
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                To access certain features, you must create an account. You
                agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your account information</li>
                <li>Maintain the security of your account credentials</li>
                <li>
                  Accept responsibility for all activities under your account
                </li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                3.2 Account Termination
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We reserve the right to suspend or terminate accounts that
                violate these Terms or engage in fraudulent, abusive, or illegal
                activity.
              </p>
            </section>

            {/* User Conduct */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. User Conduct
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon intellectual property rights</li>
                <li>Post false, misleading, or fraudulent information</li>
                <li>Engage in spam, phishing, or other malicious activities</li>
                <li>Interfere with or disrupt the Platform's operations</li>
                <li>Attempt to gain unauthorized access to systems or data</li>
                <li>Impersonate others or create fake accounts</li>
                <li>
                  Use automated systems to access the Platform without
                  permission
                </li>
              </ul>
            </section>

            {/* Event Creation and Management */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                5. Event Creation and Management
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                5.1 Organizer Responsibilities
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Event organizers are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>Providing accurate event information</li>
                <li>Fulfilling event commitments as described</li>
                <li>Complying with all applicable laws and regulations</li>
                <li>Obtaining necessary permits and licenses</li>
                <li>Handling attendee inquiries and support</li>
                <li>
                  Processing refunds in accordance with their refund policy
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                5.2 Event Content
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                You retain ownership of event content but grant Event-i a
                license to use, display, and distribute your content on the
                Platform. You warrant that you have all necessary rights to the
                content you post.
              </p>
            </section>

            {/* Payments and Refunds */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                6. Payments and Refunds
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                6.1 Payment Processing
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Payments are processed through secure third-party payment
                providers. By making a purchase, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>Provide accurate payment information</li>
                <li>Authorize the collection of payment amounts</li>
                <li>Accept transaction fees as disclosed</li>
                <li>
                  Understand that all sales are final unless otherwise stated
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                6.2 Refunds
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Refund policies are determined by individual event organizers.
                Event-i is not responsible for issuing refunds unless required
                by law. Refund requests should be directed to the event
                organizer.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                7. Intellectual Property
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                The Platform and its original content, features, and
                functionality are owned by Event-i and are protected by
                international copyright, trademark, patent, trade secret, and
                other intellectual property laws. You may not copy, modify,
                distribute, sell, or lease any part of our services without our
                written permission.
              </p>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                8. Disclaimers
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                The Platform is provided "as is" and "as available" without
                warranties of any kind. We do not guarantee:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>Uninterrupted or error-free service</li>
                <li>The accuracy or completeness of event information</li>
                <li>The quality, safety, or legality of events listed</li>
                <li>
                  The performance or conduct of event organizers or attendees
                </li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                9. Limitation of Liability
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                To the maximum extent permitted by law, Event-i shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages, or any loss of profits or revenues, whether
                incurred directly or indirectly, or any loss of data, use,
                goodwill, or other intangible losses resulting from your use of
                the Platform.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                10. Indemnification
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                You agree to indemnify and hold harmless Event-i, its officers,
                directors, employees, and agents from any claims, damages,
                losses, liabilities, and expenses (including legal fees) arising
                out of your use of the Platform, violation of these Terms, or
                infringement of any rights of another party.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                11. Governing Law
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                These Terms shall be governed by and construed in accordance
                with the laws of Kenya, without regard to its conflict of law
                provisions. Any disputes arising from these Terms shall be
                subject to the exclusive jurisdiction of the courts of Kenya.
              </p>
            </section>

            {/* Service Availability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                12. Service Availability and Uptime
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We strive to provide continuous access to the Platform, but we do not guarantee uninterrupted, secure, or error-free operation. The Platform may be temporarily unavailable due to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>Scheduled maintenance and updates</li>
                <li>Unforeseen technical issues or system failures</li>
                <li>Security incidents or cyberattacks</li>
                <li>Third-party service provider outages</li>
                <li>Acts of God, natural disasters, or other circumstances beyond our control</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                While we make reasonable efforts to minimize downtime and provide advance notice of scheduled maintenance, we are not liable for any losses or damages resulting from Platform unavailability.
              </p>
            </section>

            {/* User-Generated Content */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Edit3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                13. User-Generated Content
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                13.1 Content Responsibility
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                You are solely responsible for all content you post, upload, or otherwise make available on the Platform, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>Event descriptions, images, and media</li>
                <li>User comments, reviews, and feedback</li>
                <li>Profile information and biographical content</li>
                <li>Any other materials you contribute to the Platform</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                13.2 Content Standards
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                You agree that all content you post will:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>Be accurate and truthful</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not infringe upon the rights of any third party</li>
                <li>Not contain defamatory, harassing, or offensive material</li>
                <li>Not include spam, fraudulent, or malicious content</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                13.3 Content Monitoring and Removal
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We reserve the right to review, edit, or remove any content that violates these Terms or our community guidelines. We may, but are not obligated to, monitor or moderate user-generated content. You acknowledge that we may remove content at our sole discretion without prior notice.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                14. Dispute Resolution
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                14.1 Informal Resolution
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Before initiating any formal legal proceedings, you agree to first contact us at support@event-i.co.ke to attempt to resolve any dispute informally. We will make good faith efforts to resolve disputes within 30 days of receiving your complaint.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                14.2 Binding Arbitration
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                If informal resolution is unsuccessful, any dispute arising from or relating to these Terms shall be resolved through binding arbitration in accordance with the rules of the Arbitration Act of Kenya, rather than in court. The arbitration shall be conducted in Nairobi, Kenya, and the language of arbitration shall be English.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                14.3 Exceptions to Arbitration
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Notwithstanding the above, either party may seek injunctive relief or other equitable remedies in any court of competent jurisdiction to protect intellectual property rights or prevent unauthorized access to the Platform.
              </p>
            </section>

            {/* Force Majeure */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                15. Force Majeure
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We shall not be liable for any failure or delay in performance under these Terms that is due to circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, labor strikes, pandemics, government actions, internet failures, or failures of third-party service providers. In such events, we will make reasonable efforts to notify you and resume performance as soon as practicable.
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                16. Severability
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable. If such modification is not possible, the provision shall be severed from these Terms, and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            {/* Entire Agreement */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                17. Entire Agreement
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and Event-i regarding your use of the Platform and supersede all prior agreements, understandings, negotiations, and discussions, whether oral or written.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                No waiver of any provision of these Terms shall be effective unless in writing and signed by both parties. Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                18. Changes to Terms
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will
                notify users of significant changes by posting the updated Terms
                on the Platform and updating the "Last updated" date. Your
                continued use of the Platform after changes become effective
                constitutes acceptance of the new Terms.
              </p>
            </section>

            {/* Contact Us */}
            <section className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                19. Contact Us
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please
                contact us:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <a
                    href="mailto:support@event-i.co.ke"
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    support@event-i.co.ke
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <a
                    href="tel:+254703328938"
                    className="hover:text-blue-600 dark:hover:text-blue-400"
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

export default TermsOfService;
