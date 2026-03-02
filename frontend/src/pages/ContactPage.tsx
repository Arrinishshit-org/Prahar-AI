import { motion } from 'framer-motion';
import { PhoneCall, MessageSquare, MapPin, Building2, ChevronDown, Send } from 'lucide-react';
import { useState } from 'react';

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });

  const faqs = [
    { q: "How to track my application?", a: "You can track your application status by logging into the Prahar AI portal with your registered mobile number and clicking on 'Track Requests' in the dashboard." },
    { q: "What are the operating hours?", a: "Our digital support via Prahar AI is available 24/7. Phone support is active Monday to Saturday, 9:00 AM to 6:00 PM." },
    { q: "Is my data secure?", a: "Yes, Prahar AI uses enterprise-grade encryption to protect your personal data and query history. We never share your details with third parties." },
    { q: "Can I talk to a human agent?", a: "Absolutely. If our AI cannot resolve your query, you can request a call-back or use the Toll-Free button to speak directly with our support team." }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you! Your message has been sent. We will get back to you soon.');
    setFormData({ name: '', phone: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-background-light">
      {/* Hero Section */}
      <div className="bg-white px-4 py-16 text-center border-b border-primary/10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-4xl font-black text-slate-900 mb-4">How can we help?</h1>
          <p className="text-slate-500 text-lg">Reach out to us via any of the channels below</p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-10 max-w-md mx-auto">
            <a
              href="tel:1800-000-0000"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl h-14 bg-primary text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/20"
            >
              <PhoneCall className="w-5 h-5" />
              Toll-Free Call
            </a>
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl h-14 bg-[#25D366] text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-green-500/20"
            >
              <MessageSquare className="w-5 h-5" />
              WhatsApp
            </a>
          </div>
        </motion.div>
      </div>

      {/* Contact Form */}
      <div className="px-4 py-16 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Submit a Query</h2>
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-primary/5 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm focus:border-primary focus:ring-primary"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm focus:border-primary focus:ring-primary"
                placeholder="+91 00000 00000"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Your Message *</label>
              <textarea
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm focus:border-primary focus:ring-primary"
                placeholder="How can Prahar AI assist you today?"
                rows={5}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-white font-bold py-4 rounded-xl transition-all hover:bg-primary/90 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Message
            </button>
          </form>
        </motion.div>
      </div>

      {/* Office Locations */}
      <div className="px-4 py-16 bg-primary/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Our Offices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-2xl border border-primary/10 flex gap-4 items-start shadow-sm"
            >
              <div className="bg-primary/10 p-3 rounded-xl text-primary shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 mb-2">Head Office</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Prahar Tower, 4th Floor, Tech Park Road, Bangalore, Karnataka - 560001
                </p>
                <a 
                  href="https://maps.google.com/?q=Bangalore+Karnataka+560001" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary text-sm font-bold mt-3 hover:underline inline-block"
                >
                  Get Directions →
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-2xl border border-primary/10 flex gap-4 items-start shadow-sm"
            >
              <div className="bg-primary/10 p-3 rounded-xl text-primary shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 mb-2">Regional Support Center</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Civil Lines, Sector 12, Jaipur, Rajasthan - 302001
                </p>
                <a 
                  href="https://maps.google.com/?q=Jaipur+Rajasthan+302001" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary text-sm font-bold mt-3 hover:underline inline-block"
                >
                  Get Directions →
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-4 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-white rounded-2xl border border-primary/10 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left font-bold text-slate-900 hover:bg-slate-50 transition-colors"
              >
                {faq.q}
                <ChevronDown
                  className={`w-5 h-5 text-primary transition-transform ${
                    openFaq === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
