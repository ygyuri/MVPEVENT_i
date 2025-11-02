import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
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

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                7. Cookies and Tracking Technologies
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
                8. Children's Privacy
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
                9. Changes to This Privacy Policy
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
                10. Contact Us
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
  );
};

export default PrivacyPolicy;
