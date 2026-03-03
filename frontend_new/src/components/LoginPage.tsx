import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { View } from '../types';

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

interface LoginPageProps {
  onNavigate: (view: View) => void;
  onLoginSuccess?: () => void;
}

export default function LoginPage({ onNavigate, onLoginSuccess }: LoginPageProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    state: '',
    income: '',
    gender: '',
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({
          email: form.email,
          password: form.password,
          name: form.name,
          age: form.age ? Number(form.age) : undefined,
          state: form.state || undefined,
          income: form.income ? Number(form.income) : undefined,
          gender: form.gender || undefined,
        });
      }
      if (onLoginSuccess) onLoginSuccess();
      else onNavigate('home');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left Branding Panel ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 opacity-5">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            <circle cx="50" cy="50" r="46" stroke="white" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="8" stroke="white" strokeWidth="1.5" />
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i * 360) / 24, r = (a * Math.PI) / 180;
              return <line key={i} x1={50+10*Math.cos(r)} y1={50+10*Math.sin(r)} x2={50+44*Math.cos(r)} y2={50+44*Math.sin(r)} stroke="white" strokeWidth="1" />;
            })}
          </svg>
        </div>
        <button onClick={() => onNavigate('home')} className="flex items-center gap-3">
          <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="size-6 text-white" fill="none">
              <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="5" />
              <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="5" />
              {Array.from({ length: 24 }).map((_, i) => { const a=(i*360)/24, r=(a*Math.PI)/180; return <line key={i} x1={50+10*Math.cos(r)} y1={50+10*Math.sin(r)} x2={50+44*Math.cos(r)} y2={50+44*Math.sin(r)} stroke="currentColor" strokeWidth="3"/>; })}
            </svg>
          </div>
          <span className="font-display text-2xl font-bold text-white">Prahar AI</span>
        </button>
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
              Your gateway to<br /><span className="text-accent italic">government benefits.</span>
            </h2>
            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              Sign in to access personalised scheme recommendations tailored to your profile — in your language.
            </p>
          </div>
          <div className="space-y-3">
            {['1,200+ schemes from Central & State Governments', 'Personalised eligibility matching in seconds', 'Available in 22+ Indian languages'].map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-accent shrink-0" />
                <span className="text-white/75 text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-xs">© {new Date().getFullYear()} Prahar AI · Government of India Partner</p>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md"
        >
          <button onClick={() => onNavigate('home')} className="lg:hidden flex items-center gap-1 text-sm text-muted mb-6 hover:text-primary transition-colors">
            <ChevronLeft className="size-4" /> Back to Home
          </button>
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-ink mb-2">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
            <p className="text-muted text-sm">{mode === 'login' ? 'Sign in to access your personalised scheme dashboard.' : 'Register to start finding government schemes you qualify for.'}</p>
          </div>
          <div className="flex gap-1 p-1 bg-white border border-border rounded-lg mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                  mode === m ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink'
                }`}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Full Name</label>
                <input type="text" required value={form.name} onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. Priya Sharma" className="input-base" />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Email Address</label>
              <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com" className="input-base" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Minimum 6 characters" className="input-base !pr-12" />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Age</label>
                    <input type="number" min={1} max={120} value={form.age} onChange={(e) => update('age', e.target.value)} placeholder="e.g. 35" className="input-base" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Gender</label>
                    <select value={form.gender} onChange={(e) => update('gender', e.target.value)} className="input-base">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">State / UT</label>
                  <select value={form.state} onChange={(e) => update('state', e.target.value)} className="input-base">
                    <option value="">Select your state</option>
                    {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Annual Income (₹)</label>
                  <input type="number" min={0} value={form.income} onChange={(e) => update('income', e.target.value)} placeholder="e.g. 300000" className="input-base" />
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full !py-3 text-base mt-2">
              {loading
                ? <><Loader2 className="size-4 animate-spin" /> Processing…</>
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight className="size-4" /></>
              }
            </button>
          </form>

          <div className="mt-6 flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="size-3.5 shrink-0" />
            Your data is encrypted and protected under India's IT Act 2000.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
