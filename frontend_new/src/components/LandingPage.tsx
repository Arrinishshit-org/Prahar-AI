import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import {
  ArrowRight, CheckCircle2, Languages, Zap, ShieldCheck, Mic,
  LayoutGrid, MessageSquare, Users, BookOpen, Tractor, Heart,
  TrendingUp, Clock, Globe2
} from 'lucide-react';
import { View } from '../types';

interface LandingPageProps {
  onNavigate: (view: View) => void;
}

const STATS = [
  { value: '1,200+', label: 'Government Schemes', icon: LayoutGrid },
  { value: '1.4B',   label: 'Citizens Covered',   icon: Users },
  { value: '22+',    label: 'Indian Languages',    icon: Languages },
  { value: '< 30s',  label: 'Average Search Time', icon: Clock },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'AI-Powered Matching',
    desc: 'Our model cross-references your profile against 1,200+ schemes in under 30 seconds.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: ShieldCheck,
    title: 'Aadhaar-Level Security',
    desc: 'End-to-end encrypted. Your personal data is never shared with third parties.',
    color: 'bg-green-50 text-green-700',
  },
  {
    icon: Mic,
    title: 'Voice-First Design',
    desc: 'Ask questions naturally in Hindi, Tamil, Bengali, and 19 more official languages.',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    icon: TrendingUp,
    title: 'Eligibility Insights',
    desc: 'Understand exactly why you qualify — and what documents you will need.',
    color: 'bg-purple-50 text-purple-700',
  },
  {
    icon: Globe2,
    title: 'Central + State Schemes',
    desc: "Coverage across all 28 states, 8 UTs, and all Central Government ministries.",
    color: 'bg-teal-50 text-teal-700',
  },
  {
    icon: BookOpen,
    title: 'Step-by-Step Guidance',
    desc: 'From eligibility to application — AI walks you through every step.',
    color: 'bg-orange-50 text-orange-700',
  },
];

const WHO = [
  { icon: Tractor,      label: 'Farmers',         desc: 'PM-KISAN, crop insurance, irrigation grants' },
  { icon: BookOpen,     label: 'Students',         desc: 'Scholarships, skill development, NHB' },
  { icon: Heart,        label: 'Women & Families', desc: 'Maternity benefits, self-help groups' },
  { icon: Users,        label: 'Senior Citizens',  desc: 'Pension, health coverage, housing aid' },
];

const STEPS = [
  { n: '01', title: 'Create Your Profile', desc: 'Enter your age, income, state, and occupation — takes 2 minutes.' },
  { n: '02', title: 'AI Scans All Schemes', desc: 'Our engine matches your profile against every Central and State scheme.' },
  { n: '03', title: 'Apply with Confidence', desc: 'Get direct links to official portals with required documents listed.' },
];

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [schemeCount, setSchemeCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/schemes/stats')
      .then((r) => r.json())
      .then((d) => { if (d.totalSchemes) setSchemeCount(d.totalSchemes); })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col">

      {/* ── HERO ───────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary min-h-[88vh] flex items-center">
        {/* Decorative Ashoka Wheel bg */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-5 w-[600px] h-[600px] pointer-events-none">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            <circle cx="50" cy="50" r="46" stroke="white" strokeWidth="1" />
            <circle cx="50" cy="50" r="8" stroke="white" strokeWidth="1" />
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 360) / 24;
              const rad = (angle * Math.PI) / 180;
              return (
                <line key={i}
                  x1={50 + 10 * Math.cos(rad)} y1={50 + 10 * Math.sin(rad)}
                  x2={50 + 44 * Math.cos(rad)} y2={50 + 44 * Math.sin(rad)}
                  stroke="white" strokeWidth="0.8"
                />
              );
            })}
          </svg>
        </div>

        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center w-full">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-white/90 text-xs font-semibold tracking-wider uppercase">
              <ShieldCheck className="size-3.5 text-accent" />
              Government of India &nbsp;·&nbsp; Official Data
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] font-bold">
              Every Citizen<br />
              Deserves Their<br />
              <span className="text-accent italic">Entitlements.</span>
            </h1>

            <p className="text-white/70 text-lg md:text-xl max-w-lg leading-relaxed">
              Prahar AI scans{' '}
              <span className="text-white font-semibold">
                {schemeCount ? `${schemeCount.toLocaleString('en-IN')}+` : '1,200+'}
              </span>{' '}
              central and state government schemes to find every benefit you qualify for — in seconds, in your language.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onNavigate('schemes')}
                className="btn-primary h-13 px-8 text-base !rounded-lg shadow-lg shadow-accent/30"
              >
                Check My Eligibility
                <ArrowRight className="size-5" />
              </button>
              <button
                onClick={() => onNavigate('assistant')}
                className="h-13 px-8 border border-white/25 bg-white/10 text-white rounded-lg font-semibold text-base hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="size-5" />
                Talk to AI
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 pt-2">
              {['Data.gov.in', 'MyScheme.gov.in', 'DigiLocker'].map((b) => (
                <span key={b} className="flex items-center gap-1.5 text-white/60 text-xs font-medium">
                  <CheckCircle2 className="size-3.5 text-green-400" />
                  {b}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right: Search card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="hidden lg:block"
          >
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
              <div className="bg-primary-700 p-5 flex items-center gap-3">
                <div className="size-9 bg-accent/20 rounded-lg flex items-center justify-center">
                  <Zap className="size-5 text-accent" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Scheme Match Engine</p>
                  <p className="text-white/50 text-xs">Powered by Prahar AI</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs font-medium">Live</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { scheme: 'PM-KISAN Samman Nidhi', match: 98, cat: 'Farmer', color: 'bg-green-500' },
                  { scheme: 'Pradhan Mantri Fasal Bima', match: 94, cat: 'Insurance', color: 'bg-blue-500' },
                  { scheme: 'Kisan Credit Card', match: 89, cat: 'Finance', color: 'bg-purple-500' },
                  { scheme: 'PM Krishi Sinchai Yojana', match: 82, cat: 'Irrigation', color: 'bg-teal-500' },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-4 p-3 rounded-lg bg-surface hover:bg-primary-50 transition-colors cursor-default"
                  >
                    <div className={`size-8 rounded-md ${s.color} flex items-center justify-center shrink-0`}>
                      <span className="text-white text-xs font-bold">{s.match}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{s.scheme}</p>
                      <p className="text-xs text-muted">{s.cat}</p>
                    </div>
                    <span className="text-xs font-bold text-green-600">{s.match}%</span>
                  </motion.div>
                ))}
                <button
                  onClick={() => onNavigate('schemes')}
                  className="w-full mt-2 btn-primary !rounded-lg text-sm"
                >
                  View All Matched Schemes
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────── */}
      <section className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4"
            >
              <div className="size-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <s.icon className="size-6 text-primary" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted font-medium">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────── */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-14">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Simple Process</p>
          <h2 className="section-title text-4xl">How Prahar AI Works</h2>
          <p className="text-muted mt-3 max-w-xl mx-auto">From profile creation to approved application — all in one place.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative"
            >
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px border-t-2 border-dashed border-border z-10" />
              )}
              <div className="card p-7 h-full">
                <span className="font-display text-5xl font-bold text-primary/10 block mb-4 leading-none">{step.n}</span>
                <h3 className="text-lg font-bold text-ink mb-2">{step.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ───────────────────────────── */}
      <section className="bg-primary py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Platform Features</p>
            <h2 className="font-display text-4xl font-bold text-white">Built for Bharat</h2>
            <p className="text-white/60 mt-3 max-w-xl mx-auto">Designed ground-up for India — multilingual, mobile-first, and mission-driven.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-white/8 border border-white/10 rounded-xl p-6 hover:bg-white/12 transition-colors"
              >
                <div className={`size-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="size-6" />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR EVERY INDIAN ───────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Inclusive Platform</p>
            <h2 className="section-title text-4xl">For Every Indian</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHO.map((w, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card p-6 text-center hover:shadow-md transition-shadow cursor-default"
              >
                <div className="size-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
                  <w.icon className="size-7 text-primary" />
                </div>
                <h3 className="font-bold text-ink text-base mb-2">{w.label}</h3>
                <p className="text-muted text-xs leading-relaxed">{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ───────────────────────────────── */}
      <section className="bg-accent py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            Don't leave your entitlements on the table.
          </h2>
          <p className="text-white/80 text-lg mb-8 leading-relaxed">
            Thousands of eligible citizens miss out on government benefits simply because they don't know they exist. We're here to change that.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('login')}
              className="h-13 px-10 bg-white text-accent rounded-lg font-bold text-base hover:bg-white/90 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              Get Started Free
              <ArrowRight className="size-5" />
            </button>
            <button
              onClick={() => onNavigate('about')}
              className="h-13 px-10 border-2 border-white/40 text-white rounded-lg font-bold text-base hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer className="bg-primary-800 text-white/60 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-accent/20 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="size-5 text-accent" fill="none">
                <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="5" />
                <circle cx="50" cy="50" r="8"  stroke="currentColor" strokeWidth="5" />
                {Array.from({ length: 24 }).map((_, i) => {
                  const a = (i * 360) / 24, r = (a * Math.PI) / 180;
                  return <line key={i} x1={50+10*Math.cos(r)} y1={50+10*Math.sin(r)} x2={50+44*Math.cos(r)} y2={50+44*Math.sin(r)} stroke="currentColor" strokeWidth="3" />;
                })}
              </svg>
            </div>
            <span className="font-display font-bold text-white">Prahar AI</span>
          </div>
          <p className="text-xs text-center">
            © {new Date().getFullYear()} Prahar AI — Built for India &nbsp;·&nbsp; Data sourced from MyScheme.gov.in &amp; Data.gov.in
          </p>
          <div className="flex gap-4 text-xs">
            <button onClick={() => onNavigate('about')}   className="hover:text-white transition-colors">About</button>
            <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors">Contact</button>
            <button onClick={() => onNavigate('partner')} className="hover:text-white transition-colors">Partners</button>
          </div>
        </div>
      </footer>

    </div>
  );
}

