import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

export default function Terms() {
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
            Terms & Conditions
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
            Last Updated: December 30, 2025
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
              1. ACCEPTANCE OF TERMS
            </h2>
            <p className="text-gray-800 leading-relaxed">
              By accessing or using the New York City Surf Co. website and services (the "Service"), you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              2. DESCRIPTION OF SERVICE
            </h2>
            <p className="text-gray-800 leading-relaxed">
              NYC Surf Co. provides surf forecasting and oceanographic data for Long Island beaches, including but not limited to Lido Beach, Long Beach, and Rockaway Beach. Our forecasts are generated using predictive algorithms that aggregate data from third-party sources including Open-Meteo and NOAA.
            </p>
          </section>

          {/* Section 3 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              3. NO WARRANTY - USE AT YOUR OWN RISK
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              <strong>SURF FORECASTING IS INHERENTLY IMPRECISE.</strong> Our forecasts are predictions based on available data and algorithms, not guarantees of actual conditions.
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">
              <strong>YOU ASSUME ALL RISK.</strong> By using this Service, you acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Ocean and weather conditions can change rapidly and unpredictably</li>
              <li>Our forecasts may be inaccurate, incomplete, or delayed</li>
              <li>Surfing and ocean activities carry inherent risks including serious injury or death</li>
              <li>You are solely responsible for assessing actual conditions before entering the water</li>
              <li>You will not rely solely on our forecasts for safety decisions</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
          </section>

          {/* Section 4 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              4. LIMITATION OF LIABILITY
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">
              NYC Surf Co., its operators, employees, and affiliates shall not be liable for any damages arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Use or inability to use the Service</li>
              <li>Inaccurate, delayed, or missing forecast data</li>
              <li>Decisions made based on our forecasts</li>
              <li>Personal injury, property damage, or death resulting from ocean activities</li>
              <li>Technical failures, data errors, or service interruptions</li>
              <li>Third-party data sources or API failures</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED $100 OR THE AMOUNT YOU PAID TO USE THE SERVICE IN THE PAST 12 MONTHS, WHICHEVER IS GREATER.
            </p>
          </section>

          {/* Section 5 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              5. USER RESPONSIBILITIES
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Be 18 years of age or older, or use the Service under parental supervision (see Section 5.1)</li>
              <li>Use the Service only for lawful purposes</li>
              <li>Not attempt to reverse engineer, scrape, or abuse our algorithms or systems</li>
              <li>Verify actual conditions before engaging in any water activities</li>
              <li>Understand that surf forecasting is a guide, not a safety guarantee</li>
              <li>Possess appropriate skills and equipment for ocean activities, or be learning under qualified supervision</li>
            </ul>
            <div className="mt-4 p-4 bg-gray-50 border-2 border-gray-300">
              <p className="text-sm text-gray-700 font-semibold mb-2">5.1 Age Verification</p>
              <p className="text-sm text-gray-700">
                Users under 18 must have parental or guardian supervision when using the Service. By using the Service, you represent that you are either 18 or older, or that you have obtained parental consent. We reserve the right to request age verification and may restrict access to users who cannot provide adequate proof of age or parental consent.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              6. USER ACCOUNTS AND DATA
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              The Service may require you to create an account. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4 mb-4">
              We reserve the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Suspend or terminate accounts that violate these Terms</li>
              <li>Delete accounts that are inactive for extended periods</li>
              <li>Modify or discontinue account features at any time</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              You may request deletion of your account and associated data by contacting us. We will process such requests within 30 days, subject to legal retention requirements.
            </p>
          </section>

          {/* Section 7 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              7. USER-GENERATED CONTENT
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              The Service may allow you to submit content, including but not limited to crowd reports, comments, and feedback ("User Content"). By submitting User Content, you grant NYC Surf Co. a worldwide, non-exclusive, royalty-free, perpetual, irrevocable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such content for any purpose.
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">
              You represent and warrant that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>You own or have the right to submit the User Content</li>
              <li>User Content does not violate any third-party rights</li>
              <li>User Content is accurate and not misleading</li>
              <li>User Content does not contain illegal, harmful, or offensive material</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              We reserve the right to remove, edit, or refuse to publish any User Content at our sole discretion, without notice or liability.
            </p>
          </section>

          {/* Section 8 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              8. THIRD-PARTY DATA SOURCES
            </h2>
            <p className="text-gray-800 leading-relaxed">
              Our forecasts incorporate data from Open-Meteo, NOAA, and other third-party sources. We do not control these sources and are not responsible for their accuracy, availability, or reliability. Third-party data may be subject to separate terms and conditions.
            </p>
          </section>

          {/* Section 9 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              9. INTELLECTUAL PROPERTY
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              All content on the Service, including but not limited to forecasting algorithms, UI/UX design, text, graphics, and code, is the property of NYC Surf Co. and is protected by copyright and other intellectual property laws.
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">
              You may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Copy, modify, or distribute our proprietary algorithms or code</li>
              <li>Use our content for commercial purposes without written permission</li>
              <li>Remove or alter any copyright or proprietary notices</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              You may share screenshots or forecasts for personal, non-commercial use, provided you include attribution to NYC Surf Co. Fair use exceptions apply as permitted by law.
            </p>
          </section>

          {/* Section 10 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              10. PRIVACY & DATA COLLECTION
            </h2>
            <p className="text-gray-800 leading-relaxed">
              We may collect usage data, analytics, and technical information to improve the Service. We do not sell personal information. For details, see our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          {/* Section 11 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              11. SERVICE MODIFICATIONS & AVAILABILITY
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              We reserve the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Modify, suspend, or discontinue the Service at any time</li>
              <li>Update forecast algorithms and methodologies</li>
              <li>Change these Terms with reasonable notice (material changes will be communicated via email or prominent website notice at least 30 days before taking effect)</li>
              <li>Restrict access to certain features or geographic areas</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4 mb-4">
              Continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
            <p className="text-gray-800 leading-relaxed">
              We do not guarantee uninterrupted or error-free service. The Service may be unavailable due to maintenance, technical issues, or circumstances beyond our control (see Section 11.1).
            </p>
            <div className="mt-4 p-4 bg-gray-50 border-2 border-gray-300">
              <p className="text-sm text-gray-700 font-semibold mb-2">11.1 Force Majeure</p>
              <p className="text-sm text-gray-700">
                We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to natural disasters, war, terrorism, labor disputes, internet outages, third-party API failures, government actions, or other acts of God.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              12. LOCAL REGULATIONS & BEACH ACCESS
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Knowing and complying with all local beach regulations and ordinances</li>
              <li>Obtaining necessary permits or beach badges</li>
              <li>Respecting private property and beach access restrictions</li>
              <li>Following lifeguard instructions and beach closures</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              NYC Surf Co. provides forecasts only and does not grant beach access rights.
            </p>
          </section>

          {/* Section 13 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              13. INDEMNIFICATION
            </h2>
            <p className="text-gray-800 leading-relaxed">
              You agree to indemnify and hold harmless NYC Surf Co., its operators, employees, and affiliates from any claims, damages, losses, or expenses (including reasonable legal fees) arising from your use of the Service, your violation of these Terms, your violation of any rights of another party, or your ocean activities or decisions based on our forecasts.
            </p>
          </section>

          {/* Section 14 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              14. EXTERNAL LINKS
            </h2>
            <p className="text-gray-800 leading-relaxed">
              The Service may contain links to third-party websites or resources. We are not responsible for the content, accuracy, or practices of external sites.
            </p>
          </section>

          {/* Section 15 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              15. DISCLAIMER OF PROFESSIONAL ADVICE
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              NYC Surf Co. does not provide:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>Professional meteorological services</li>
              <li>Safety training or certification</li>
              <li>Emergency services or rescue operations</li>
              <li>Marine navigation or boating guidance</li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              For professional forecasts, consult qualified meteorologists. For safety training, consult certified instructors.
            </p>
          </section>

          {/* Section 16 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              16. GEOGRAPHIC RESTRICTIONS
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              The Service is primarily designed for users in the United States. We make no representation that the Service is appropriate or available for use in other locations.
            </p>
            <p className="text-gray-800 leading-relaxed">
              If you access the Service from outside the United States, you do so at your own risk and are responsible for compliance with local laws. Data processing occurs primarily within the United States, and by using the Service, you consent to such processing.
            </p>
          </section>

          {/* Section 17 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              17. DISPUTE RESOLUTION
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              These Terms are governed by the laws of the State of New York, without regard to conflict of law principles.
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">
              Any disputes arising from or relating to these Terms or the Service shall be resolved exclusively in the state and federal courts located in New York County, New York. You consent to the personal jurisdiction of such courts.
            </p>
            <p className="text-gray-800 leading-relaxed">
              You agree that any claim or cause of action arising from these Terms must be filed within one (1) year after such claim or cause of action arose, or it shall be forever barred.
            </p>
          </section>

          {/* Section 18 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              18. TERMINATION
            </h2>
            <p className="text-gray-800 leading-relaxed">
              We may terminate or suspend your access to the Service immediately, without notice, for any reason, including violation of these Terms. Upon termination, your right to use the Service will cease immediately.
            </p>
          </section>

          {/* Section 19 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              19. ASSIGNMENT AND WAIVER
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              You may not assign or transfer these Terms or any rights hereunder without our prior written consent. We may assign these Terms or any rights hereunder without restriction.
            </p>
            <p className="text-gray-800 leading-relaxed">
              Our failure to enforce any provision of these Terms shall not constitute a waiver of such provision or any other provision. Any waiver must be in writing and signed by an authorized representative of NYC Surf Co.
            </p>
          </section>

          {/* Section 20 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              20. SEVERABILITY
            </h2>
            <p className="text-gray-800 leading-relaxed">
              If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full effect.
            </p>
          </section>

          {/* Section 21 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              21. ENTIRE AGREEMENT
            </h2>
            <p className="text-gray-800 leading-relaxed">
              These Terms constitute the entire agreement between you and NYC Surf Co. regarding the Service and supersede any prior agreements.
            </p>
          </section>

          {/* Section 22 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              22. CONTACT
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              For questions about these Terms, contact:
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
          </section>

          {/* Section 23 */}
          <section className="border-b-2 border-black pb-6">
            <h2
              className="text-2xl font-bold text-black uppercase mb-4"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}
            >
              23. ACKNOWLEDGMENT
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              BY USING THIS SERVICE, YOU ACKNOWLEDGE THAT:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li>You have read and understood these Terms</li>
              <li>You accept all risks associated with ocean activities</li>
              <li>Surf forecasts are predictions, not guarantees</li>
              <li>You will verify actual conditions before entering the water</li>
              <li>NYC Surf Co. is not liable for injuries or damages resulting from your use of the Service</li>
            </ul>
          </section>

          {/* Final Notice */}
          <section className="mt-12 p-6 bg-black text-white border-2 border-black">
            <p
              className="text-center text-lg font-bold uppercase mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE SERVICE.
            </p>
            <p
              className="text-center text-sm uppercase tracking-wider"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              STAY SAFE. CHECK CONDITIONS. SURF SMART.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}

