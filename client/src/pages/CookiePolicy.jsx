import { motion } from "framer-motion";
import { Cookie, Settings, Shield, BarChart3, Mail, Phone } from "lucide-react";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container-modern py-12 md:py-16 lg:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl mb-6">
            <Cookie className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Cookie Policy
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
                <Cookie className="w-6 h-6 text-green-600 dark:text-green-400" />
                1. What Are Cookies?
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Cookies are small text files that are placed on your device when
                you visit a website. They are widely used to make websites work
                more efficiently and provide information to website owners.
                Cookies allow websites to recognize your device and remember
                information about your visit, such as your preferences and
                actions.
              </p>
            </section>

            {/* Types of Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Settings className="w-6 h-6 text-green-600 dark:text-green-400" />
                2. Types of Cookies We Use
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                2.1 Essential Cookies
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                These cookies are necessary for the website to function
                properly. They enable core functionality such as security,
                network management, and accessibility.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Authentication:</strong> Remember your login status
                  and session information
                </li>
                <li>
                  <strong>Security:</strong> Detect and prevent fraudulent
                  activity
                </li>
                <li>
                  <strong>Load Balancing:</strong> Distribute website traffic
                  across servers
                </li>
                <li>
                  <strong>Preferences:</strong> Store your language and region
                  preferences
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                2.2 Performance Cookies
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
                These cookies help us understand how visitors interact with our
                website by collecting and reporting information anonymously.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Analytics:</strong> Track page views, user flows, and
                  engagement metrics
                </li>
                <li>
                  <strong>Error Tracking:</strong> Identify and fix technical
                  issues
                </li>
                <li>
                  <strong>Performance Monitoring:</strong> Measure page load
                  times and responsiveness
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                2.3 Functionality Cookies
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                These cookies enable enhanced functionality and personalization,
                such as remembering your preferences and choices.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>User Preferences:</strong> Remember your theme
                  (light/dark mode) and display settings
                </li>
                <li>
                  <strong>Search History:</strong> Store recent searches for
                  convenience
                </li>
                <li>
                  <strong>Form Data:</strong> Remember information entered in
                  forms
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                2.4 Targeting/Advertising Cookies
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                These cookies may be set through our site by advertising
                partners to build a profile of your interests and show you
                relevant content on other sites.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Advertising:</strong> Display personalized ads based
                  on your interests
                </li>
                <li>
                  <strong>Retargeting:</strong> Show relevant events and
                  promotions
                </li>
                <li>
                  <strong>Social Media:</strong> Enable social sharing and
                  integration
                </li>
              </ul>
            </section>

            {/* Third-Party Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                3. Third-Party Cookies
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                In addition to our own cookies, we may also use various
                third-party cookies to report usage statistics and deliver
                advertisements. These include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Google Analytics:</strong> Web analytics service for
                  tracking and reporting website traffic
                </li>
                <li>
                  <strong>Payment Processors:</strong> Secure payment processing
                  and fraud detection
                </li>
                <li>
                  <strong>Social Media Platforms:</strong> Social sharing
                  buttons and embedded content
                </li>
                <li>
                  <strong>Marketing Tools:</strong> Email marketing and customer
                  engagement platforms
                </li>
              </ul>
            </section>

            {/* Cookie Duration */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                4. Cookie Duration
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                4.1 Session Cookies
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                These cookies are temporary and are deleted when you close your
                browser. They are used to maintain your session while you
                navigate the website.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                4.2 Persistent Cookies
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                These cookies remain on your device for a set period or until
                you delete them. They are used to remember your preferences and
                improve your experience on return visits.
              </p>
            </section>

            {/* Managing Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                5. Managing Your Cookie Preferences
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                You have the right to accept or reject cookies. Most web
                browsers automatically accept cookies, but you can modify your
                browser settings to decline cookies if you prefer.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                5.1 Browser Settings
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                You can control and manage cookies in your browser settings:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                <li>
                  <strong>Chrome:</strong> Settings → Privacy and Security →
                  Cookies and other site data
                </li>
                <li>
                  <strong>Firefox:</strong> Options → Privacy & Security →
                  Cookies and Site Data
                </li>
                <li>
                  <strong>Safari:</strong> Preferences → Privacy → Cookies and
                  website data
                </li>
                <li>
                  <strong>Edge:</strong> Settings → Privacy, search, and
                  services → Cookies and site permissions
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                5.2 Impact of Disabling Cookies
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Please note that disabling cookies may affect your ability to
                use certain features of our website. Essential cookies cannot be
                disabled as they are necessary for the website to function
                properly.
              </p>
            </section>

            {/* Cookie Consent */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                6. Cookie Consent
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                By continuing to use our website after being informed about our
                use of cookies, you consent to our use of cookies as described
                in this policy. You can withdraw your consent at any time by
                adjusting your browser settings or contacting us.
              </p>
            </section>

            {/* Updates to Cookie Policy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                7. Updates to This Cookie Policy
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect
                changes in our practices or for other operational, legal, or
                regulatory reasons. We encourage you to review this policy
                periodically to stay informed about our use of cookies.
              </p>
            </section>

            {/* Contact Us */}
            <section className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                8. Contact Us
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                If you have any questions about our use of cookies or this
                Cookie Policy, please contact us:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <a
                    href="mailto:support@event-i.co.ke"
                    className="hover:text-green-600 dark:hover:text-green-400"
                  >
                    support@event-i.co.ke
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <a
                    href="tel:+254703328938"
                    className="hover:text-green-600 dark:hover:text-green-400"
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

export default CookiePolicy;
