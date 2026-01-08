import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

export default function Privacy() {
  const [, setLocation] = useLocation();
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <div className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <Logo
              logoSize="h-10 sm:h-12 md:h-14"
              textSize="text-xl sm:text-2xl md:text-3xl lg:text-4xl"
              textColor="text-black hover:text-gray-600"
              showLink={true}
            />
            <button
              onClick={() => setLocation("/")}
              className="text-black hover:text-gray-600 transition-colors text-sm uppercase tracking-wide"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Page Header */}
        <div className="mb-12">
          <h1
            className="text-5xl md:text-6xl font-black text-black uppercase tracking-tight mb-4"
            style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.02em' }}
          >
            Privacy Policy
          </h1>
          <p
            className="text-sm text-gray-600 uppercase tracking-wider"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            New York City Surf Co.
          </p>
          <p
            className="text-sm text-gray-500 mt-2"
            style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
          >
            Last Updated: December 31, 2025
          </p>
        </div>

        {/* Content */}
        <div
          className="prose prose-lg max-w-none space-y-8"
          style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
        >
          {/* Section 1 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              1. INTRODUCTION
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              New York City Surf Co. ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our surf forecasting service (the "Service").
            </p>
            <p className="text-gray-800 leading-relaxed">
              By using the Service, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, do not use the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              2. INFORMATION WE COLLECT
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              We collect several types of information from and about users of our Service:
            </p>
            
            <div className="ml-4 space-y-4">
              <div>
                <p className="text-gray-800 font-semibold mb-2">2.1 Account Information</p>
                <p className="text-gray-800 leading-relaxed mb-2">When you create an account, we collect:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
                  <li>Name</li>
                  <li>Email address</li>
                  <li>OAuth identifier (openId) from your authentication provider</li>
                  <li>Login method (e.g., Google, Facebook)</li>
                  <li>Last sign-in timestamp</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">2.2 User-Generated Content</p>
                <p className="text-gray-800 leading-relaxed mb-2">When you interact with the Service, we may collect:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
                  <li>Crowd reports (surf conditions, crowd levels)</li>
                  <li>Comments and feedback</li>
                  <li>Preferences and saved spots</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">2.3 Usage Data</p>
                <p className="text-gray-800 leading-relaxed mb-2">We automatically collect information about how you use the Service:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
                  <li>Pages visited and features used</li>
                  <li>Time spent on pages</li>
                  <li>Forecast queries and spot views</li>
                  <li>Click patterns and navigation paths</li>
                  <li>Timestamps of activity</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">2.4 Technical Information</p>
                <p className="text-gray-800 leading-relaxed mb-2">We collect technical data to improve service delivery:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Device type and operating system</li>
                  <li>Screen resolution</li>
                  <li>Referring website</li>
                  <li>Error logs and diagnostic data</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">2.5 Location Data</p>
                <p className="text-gray-800 leading-relaxed">
                  With your permission, we may collect approximate location data to show you relevant surf spots and calculate travel distances. You can disable location access at any time through your device settings.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              3. HOW WE USE YOUR INFORMATION
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li><strong>Provide the Service:</strong> Generate surf forecasts, display current conditions, and enable user features</li>
              <li><strong>Account Management:</strong> Authenticate users, maintain accounts, and provide customer support</li>
              <li><strong>Improve the Service:</strong> Analyze usage patterns, identify bugs, and develop new features</li>
              <li><strong>Personalization:</strong> Remember your preferences and provide customized experiences</li>
              <li><strong>Communications:</strong> Send service updates, forecast alerts, and respond to inquiries</li>
              <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
              <li><strong>Legal Compliance:</strong> Comply with legal obligations and enforce our Terms & Conditions</li>
              <li><strong>Analytics:</strong> Understand how users interact with the Service to optimize performance</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              4. THIRD-PARTY SERVICES & DATA SHARING
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              We integrate with third-party services to provide our forecasting capabilities. We do not sell your personal information.
            </p>
            
            <div className="ml-4 space-y-4">
              <div>
                <p className="text-gray-800 font-semibold mb-2">4.1 Weather & Oceanographic Data Providers</p>
                <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
                  <li><strong>Open-Meteo:</strong> Weather and wave forecast data</li>
                  <li><strong>NOAA:</strong> Tide predictions, buoy data, and marine conditions</li>
                </ul>
                <p className="text-gray-800 leading-relaxed mt-2">
                  These providers receive API requests that may include your IP address but do not receive personally identifiable information.
                </p>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">4.2 Authentication Provider</p>
                <p className="text-gray-800 leading-relaxed">
                  We use OAuth authentication through third-party providers (e.g., Google, Facebook). When you sign in, your authentication provider shares your name, email, and unique identifier with us. Review your provider's privacy policy for details on their data practices.
                </p>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">4.3 Analytics Services</p>
                <p className="text-gray-800 leading-relaxed">
                  We may use analytics tools to understand user behavior and improve the Service. These tools may use cookies and similar technologies to collect usage data.
                </p>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">4.4 When We May Share Information</p>
                <p className="text-gray-800 leading-relaxed mb-2">We may share your information in the following circumstances:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
                  <li><strong>Legal Requirements:</strong> When required by law, subpoena, or court order</li>
                  <li><strong>Safety & Security:</strong> To protect the rights, property, or safety of NYC Surf Co., users, or the public</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              5. COOKIES & TRACKING TECHNOLOGIES
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to maintain your session and enhance your experience.
            </p>
            
            <div className="ml-4 space-y-4">
              <div>
                <p className="text-gray-800 font-semibold mb-2">5.1 Types of Cookies We Use</p>
                <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
                  <li><strong>Session Cookies:</strong> Required for authentication and account access (expires after 1 year)</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                  <li><strong>Analytics Cookies:</strong> Track usage patterns to improve the Service</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">5.2 Managing Cookies</p>
                <p className="text-gray-800 leading-relaxed">
                  Most web browsers allow you to control cookies through settings. Note that disabling cookies may limit your ability to use certain features of the Service, particularly authentication.
                </p>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">5.3 Local Storage</p>
                <p className="text-gray-800 leading-relaxed">
                  We store certain data in your browser's local storage (e.g., user preferences, cached forecast data) to improve performance. This data remains on your device and can be cleared through your browser settings.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              6. DATA SECURITY
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              We implement reasonable technical and organizational measures to protect your information from unauthorized access, disclosure, alteration, and destruction.
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">
              <strong>Security measures include:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Encrypted data transmission (HTTPS/TLS)</li>
              <li>Secure session management with httpOnly and secure cookie flags</li>
              <li>Regular security updates and patches</li>
              <li>Access controls and authentication</li>
              <li>Database security and backup procedures</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              <strong>However, no method of transmission over the Internet is 100% secure.</strong> While we strive to protect your information, we cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your account credentials.
            </p>
          </section>

          {/* Section 7 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              7. DATA RETENTION
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              We retain your information for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li><strong>Account Data:</strong> Retained while your account is active, or as needed to provide services</li>
              <li><strong>Usage Logs:</strong> Retained for up to 90 days for analytics and troubleshooting</li>
              <li><strong>User-Generated Content:</strong> Retained until you delete it or request account deletion</li>
              <li><strong>Legal Requirements:</strong> Some data may be retained longer to comply with legal obligations</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              Inactive accounts (no sign-in for 2+ years) may be deleted after reasonable notice.
            </p>
          </section>

          {/* Section 8 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              8. YOUR PRIVACY RIGHTS
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              Depending on your location, you may have certain rights regarding your personal information:
            </p>
            
            <div className="ml-4 space-y-4">
              <div>
                <p className="text-gray-800 font-semibold mb-2">8.1 Access & Portability</p>
                <p className="text-gray-800 leading-relaxed">
                  You have the right to request a copy of the personal information we hold about you. Contact us to request your data in a portable format.
                </p>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">8.2 Correction</p>
                <p className="text-gray-800 leading-relaxed">
                  You can update your account information through your account settings. Contact us if you need assistance correcting inaccurate data.
                </p>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">8.3 Deletion</p>
                <p className="text-gray-800 leading-relaxed">
                  You can request deletion of your account and associated data by contacting us. We will process deletion requests within 30 days, subject to legal retention requirements.
                </p>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">8.4 Opt-Out</p>
                <p className="text-gray-800 leading-relaxed">
                  You can opt out of non-essential communications and disable location services through your device settings.
                </p>
              </div>

              <div>
                <p className="text-gray-800 font-semibold mb-2">8.5 Exercising Your Rights</p>
                <p className="text-gray-800 leading-relaxed">
                  To exercise any of these rights, contact us at <a href="mailto:rniederreither@gmail.com" className="text-blue-600 hover:underline">rniederreither@gmail.com</a>. We may need to verify your identity before processing requests.
                </p>
              </div>
            </div>
          </section>

          {/* Section 9 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              9. CHILDREN'S PRIVACY
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              The Service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18.
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">
              Users under 18 must have parental or guardian supervision when using the Service. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </p>
            <p className="text-gray-800 leading-relaxed">
              If we discover that we have collected personal information from a child under 18 without parental consent, we will take steps to delete that information promptly.
            </p>
          </section>

          {/* Section 10 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              10. INTERNATIONAL DATA TRANSFERS
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              The Service is operated in the United States. If you access the Service from outside the United States, your information will be transferred to, stored, and processed in the United States.
            </p>
            <p className="text-gray-800 leading-relaxed">
              By using the Service, you consent to the transfer of your information to the United States and acknowledge that the United States may have different data protection laws than your country of residence.
            </p>
          </section>

          {/* Section 11 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              11. CALIFORNIA PRIVACY RIGHTS
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Right to know what personal information we collect, use, and disclose</li>
              <li>Right to request deletion of your personal information</li>
              <li>Right to opt-out of the "sale" of personal information (we do not sell personal information)</li>
              <li>Right to non-discrimination for exercising your CCPA rights</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              To exercise your CCPA rights, contact us at <a href="mailto:rniederreither@gmail.com" className="text-blue-600 hover:underline">rniederreither@gmail.com</a> with "CCPA Request" in the subject line.
            </p>
          </section>

          {/* Section 12 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              12. DO NOT TRACK SIGNALS
            </h2>
            <p className="text-gray-800 leading-relaxed">
              Some web browsers have a "Do Not Track" (DNT) feature that signals to websites that you do not want your online activities tracked. The Service does not currently respond to DNT signals. We will update this Privacy Policy if we implement DNT signal recognition in the future.
            </p>
          </section>

          {/* Section 13 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              13. CHANGES TO THIS PRIVACY POLICY
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">
              <strong>How we notify you of changes:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Material changes will be communicated via email or prominent website notice at least 30 days before taking effect</li>
              <li>The "Last Updated" date at the top of this policy will be revised</li>
              <li>Continued use of the Service after changes take effect constitutes acceptance</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
            </p>
          </section>

          {/* Section 14 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              14. LINKS TO OTHER WEBSITES
            </h2>
            <p className="text-gray-800 leading-relaxed">
              The Service may contain links to third-party websites (e.g., social media, weather services). We are not responsible for the privacy practices or content of external sites. We encourage you to review the privacy policies of any third-party sites you visit.
            </p>
          </section>

          {/* Section 15 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              15. CONTACT US
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="ml-4 space-y-1 text-gray-800">
              <p><strong>New York City Surf Co.</strong></p>
              <p>
                <a 
                  href="mailto:rniederreither@gmail.com" 
                  className="text-blue-600 hover:underline"
                >
                  rniederreither@gmail.com
                </a>
              </p>
              <p>303 E 5th St, New York, NY 10003</p>
            </div>
            <p className="text-gray-800 leading-relaxed mt-4">
              We will respond to privacy inquiries within 30 days.
            </p>
          </section>

          {/* Section 16 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              16. RELATIONSHIP TO TERMS & CONDITIONS
            </h2>
            <p className="text-gray-800 leading-relaxed">
              This Privacy Policy should be read in conjunction with our <Link href="/terms" className="text-blue-600 hover:underline">Terms & Conditions</Link>. In the event of a conflict between this Privacy Policy and the Terms & Conditions, the Terms & Conditions shall prevail.
            </p>
          </section>

          {/* Final Notice */}
          <section className="mt-12 p-6 bg-black text-white border-2 border-black">
            <p
              className="text-center text-lg font-bold uppercase mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              YOUR PRIVACY MATTERS TO US
            </p>
            <p
              className="text-center text-sm uppercase tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Questions? Contact us at rniederreither@gmail.com
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}

