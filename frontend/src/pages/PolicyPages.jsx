import React from 'react';
import { ShieldCheck, MapPin, Phone, Mail, Clock, ExternalLink, MessageCircle, AlertCircle } from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="glass-card-glow rounded-3xl p-8 sm:p-12 text-center space-y-4">
        <span className="inline-block px-3 py-1 rounded-full bg-brand-cyan/20 text-brand-cyan text-xs font-bold uppercase tracking-wider">
          Our Heritage &amp; Vision
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          About Netra Unnayan
        </h1>
        <p className="text-sm text-slate-300 max-w-xl mx-auto">
          "Clarity You Can Trust" &bull; Advanced Optical Eyewear &amp; Comprehensive Clinical Eye Care
        </p>
      </div>

      <div className="glass-card rounded-3xl p-8 space-y-6 text-sm text-slate-300 leading-relaxed">
        <h2 className="text-xl font-bold text-white">Elevating Vision in Purba Medinipur</h2>
        <p>
          Founded on Digha Bypass Road, <strong>Netra Unnayan</strong> was established to bridge the gap between luxury optical aesthetics and uncompromising clinical precision. We believe that corrective eyewear should never force a choice between medical accuracy, physical durability, and sophisticated personal style.
        </p>
        <p>
          Our in-house optical workshop features computer-controlled diamond wheel edgers and focimeters. Every lens—whether high-index 1.67 aspheric, photochromic transition, or digital blue-light blocking—is surfaced to sub-millimeter tolerances before final fitting and multi-point inspection.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-center">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="text-2xl font-black text-brand-cyan">100%</div>
            <div className="text-xs text-slate-400 mt-1">UV400 Certified Lenses</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="text-2xl font-black text-brand-teal">&lt; 12g</div>
            <div className="text-xs text-slate-400 mt-1">Titanium Featherweight</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="text-2xl font-black text-sky-400">10,000+</div>
            <div className="text-xs text-slate-400 mt-1">Patients Served Locally</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContactPage = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center space-y-3">
        <span className="inline-block px-3 py-1 rounded-full bg-brand-cyan/20 text-brand-cyan text-xs font-bold uppercase tracking-wider">
          Clinic &amp; Storefront
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Contact Netra Unnayan</h1>
        <p className="text-xs sm:text-sm text-slate-300">
          Visit our flagship store in Digha or get instant assistance via phone and WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">Store Location</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed flex items-start gap-2">
              <MapPin className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
              <span>Digha Bypass Rd, Jatimati, Digha, West Bengal 721428</span>
            </p>
            <a 
              href="https://maps.app.goo.gl/TBLLEac73RdPyqLq6?g_st=ac"
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-cyan font-bold hover:underline mt-2"
            >
              Open Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-4 h-4 text-brand-teal shrink-0" />
              <span>+91 9382293614</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-cyan" />
              <span>netraunnayan@gmail.com</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>9:30 AM – 8:30 PM (Everyday)</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <a 
              href="https://wa.me/919382293614?text=Hello%20Netra%20Unnayan"
              target="_blank"
              rel="noreferrer"
              className="w-full btn-primary text-xs py-2.5 rounded-xl flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Message on WhatsApp
            </a>
          </div>
        </div>

        {/* Google Maps View */}
        <div className="lg:col-span-2 glass-card rounded-3xl overflow-hidden p-2 min-h-[350px]">
          <iframe
            title="Google Maps Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14787.21448892182!2d87.5025!3d21.6275!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a032fb77c44e6b5%3A0x86b0337bfa5a938c!2sDigha%20Bypass%20Rd%2C%20Jatimati%2C%20Digha%2C%20West%20Bengal%20721428!5e0!3m2!1sen!2sin!4v1714000000000!5m2!1sen!2sin"
            width="100%"
            height="100%"
            style={{ minHeight: '340px', border: 0, borderRadius: '1rem' }}
            allowFullScreen=""
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
};

export const TermsPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="glass-card-glow rounded-3xl p-8 text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Terms of Service</h1>
        <p className="text-xs text-brand-cyan font-mono">Netra Unnayan &bull; Official Business Terms</p>
      </div>

      <div className="glass-card rounded-3xl p-8 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">1. Service Scope</h3>
          <p>
            Netra Unnayan provides optical frames, prescription lenses, sunglasses, clinical eye specialist consultations, and professional Home Eye Testing services.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">2. Prescription Accuracy</h3>
          <p>
            Customers submitting prescriptions online or via WhatsApp are solely responsible for providing valid, up-to-date, and accurate medical values. We fabricate customized lenses strictly based on the prescription details submitted.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">3. Home Eye Checkup Appointments</h3>
          <p>
            Home visits require a verified physical address and a functioning local mobile contact. We reserve the right to reschedule or cancel appointments due to extreme weather, safety conditions, or inaccessible locations.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">4. Delivery Timelines</h3>
          <p>
            Standard delivery for prescription eyewear takes 3 to 6 business days to account for precise lens lab cutting, coating, and fitting.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">5. Jurisdiction</h3>
          <p>
            All legal claims and disputes are subject exclusively to the local jurisdiction of Purba Medinipur, West Bengal.
          </p>
        </section>
      </div>
    </div>
  );
};

export const ReturnPolicyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="glass-card-glow rounded-3xl p-8 text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Return &amp; Replacement Policy</h1>
        <p className="text-xs text-brand-cyan font-mono">Netra Unnayan &bull; Optical Lab Guarantee</p>
      </div>

      <div className="glass-card rounded-3xl p-8 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">1. Custom Prescription Lenses</h3>
          <p>
            Prescription lenses are custom-manufactured medical devices tailored specifically to an individual eye profile. Once lens edging/cutting has commenced, returns or monetary refunds are not permitted under statutory optical norms.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">2. Power Mismatch / Manufacturing Defect</h3>
          <p>
            If the delivered lenses do not match the prescription provided, or if the product arrives damaged/scratched, notify customer care within 7 days of delivery. We will replace or correct the lenses at zero additional cost following internal lab verification.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">3. Frame Exchanges</h3>
          <p>
            Unused frames without prescription customization can be exchanged within 7 days of delivery, provided they remain in original condition with intact packaging, tags, cases, and proof of purchase.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">4. Conditions for Non-Returnable Items</h3>
          <p>
            Products showing signs of wear, physical damage from customer handling, misuse, unauthorized repair attempts, or returned without complete original accessories will not be accepted.
          </p>
        </section>
      </div>
    </div>
  );
};

export const RefundPolicyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="glass-card-glow rounded-3xl p-8 text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Refund &amp; Cancellation Policy</h1>
        <p className="text-xs text-brand-cyan font-mono">Netra Unnayan &bull; Cancellation Timeframes</p>
      </div>

      <div className="glass-card rounded-3xl p-8 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">1. Eyewear Order Cancellation</h3>
          <p>
            Cancellation requests must be submitted within 12 hours of placing the order or prior to commencement of lens cutting. Once lens production begins in our lab, the order cannot be canceled.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">2. Home Visit Cancellation</h3>
          <p>
            Customers may cancel or reschedule a booked Home Eye Test appointment up to 2 hours prior to the scheduled slot via phone or WhatsApp (+91 9382293614).
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">3. Refund Processing</h3>
          <p>
            For eligible cancellations or approved returns, refunds will be credited back to the original payment method within 5 to 7 business days, subject to bank processing timelines.
          </p>
        </section>
      </div>
    </div>
  );
};

export const PrivacyPolicyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="glass-card-glow rounded-3xl p-8 text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Privacy Policy</h1>
        <p className="text-xs text-brand-cyan font-mono">Netra Unnayan &bull; Confidential Medical Data Protection</p>
      </div>

      <div className="glass-card rounded-3xl p-8 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">1. Data Collection</h3>
          <p>
            We collect essential customer information, including name, contact number, delivery address, email, and clinical optical prescriptions, exclusively to fulfill orders and provide optometrist services.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">2. Medical Data Protection</h3>
          <p>
            Eye health records, power specifications, and uploaded prescriptions are treated as confidential information and are never rented, sold, or shared with third parties for commercial or marketing exploitation.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">3. Payment Security</h3>
          <p>
            Netra Unnayan does not collect, process, or store sensitive financial data such as card CVVs, net banking credentials, or UPI PINs. All online payments are handled securely through the configured payment gateway.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-white text-base">4. Third-Party Logistics</h3>
          <p>
            Necessary shipping details are shared strictly with contracted local delivery personnel or courier partners solely for product dispatch and fulfillment.
          </p>
        </section>
      </div>
    </div>
  );
};
