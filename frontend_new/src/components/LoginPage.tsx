import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { View } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const INDIA_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu & Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh',
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
  const [successMessage, setSuccessMessage] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    state: '',
    income: '',
    gender: '',
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  // Password strength calculator
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
    if (score === 4) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = mode === 'register' ? getPasswordStrength(form.password) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        setSuccessMessage('Welcome back! Redirecting...');
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
        setSuccessMessage('Account created successfully! Redirecting...');
      }
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
        else onNavigate('home');
      }, 1000);
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
              const a = (i * 360) / 24,
                r = (a * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1={50 + 10 * Math.cos(r)}
                  y1={50 + 10 * Math.sin(r)}
                  x2={50 + 44 * Math.cos(r)}
                  y2={50 + 44 * Math.sin(r)}
                  stroke="white"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </div>
        <button onClick={() => onNavigate('home')} className="flex items-center gap-3">
          <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="size-6 text-white" fill="none">
              <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="5" />
              <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="5" />
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i * 360) / 24,
                  r = (a * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    x1={50 + 10 * Math.cos(r)}
                    y1={50 + 10 * Math.sin(r)}
                    x2={50 + 44 * Math.cos(r)}
                    y2={50 + 44 * Math.sin(r)}
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                );
              })}
            </svg>
          </div>
          <span className="font-display text-2xl font-bold text-white">Prahar AI</span>
        </button>
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
              Your gateway to
              <br />
              <span className="text-accent italic">government benefits.</span>
            </h2>
            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              Sign in to access personalised scheme recommendations tailored to your profile — in
              your language.
            </p>
          </div>
          <div className="space-y-3">
            {[
              '1,200+ schemes from Central & State Governments',
              'Personalised eligibility matching in seconds',
              'Available in 22+ Indian languages',
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-accent shrink-0" />
                <span className="text-white/75 text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-xs">
          © {new Date().getFullYear()} Prahar AI · Government of India Partner
        </p>
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
          <button
            onClick={() => onNavigate('home')}
            className="lg:hidden flex items-center gap-1 text-sm text-muted mb-6 hover:text-primary transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Home
          </button>
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-ink mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-muted text-sm">
              {mode === 'login'
                ? 'Sign in to access your personalised scheme dashboard.'
                : 'Register to start finding government schemes you qualify for.'}
            </p>
          </div>

          {/* Tab Switcher with Animation */}
          <div className="relative flex gap-1 p-1 bg-white border border-border rounded-lg mb-6">
            <AnimatePresence mode="wait">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className={`relative flex-1 py-2 rounded-md text-sm font-semibold transition-colors z-10 ${
                    mode === m ? 'text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  {mode === m && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary rounded-md shadow-sm"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{m === 'login' ? 'Sign In' : 'Register'}</span>
                </button>
              ))}
            </AnimatePresence>
          </div>

          {/* Success Message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2"
              >
                <CheckCircle2 className="size-4 shrink-0" />
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"
            >
              <X className="size-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === 'register' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'register' ? -20 : 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {mode === 'register' && (
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="e.g. Priya Sharma"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="pr-12!"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {mode === 'register' && form.password && passwordStrength && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 space-y-2"
                    >
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              level <= passwordStrength.score
                                ? passwordStrength.color
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-medium ${
                            passwordStrength.score <= 2
                              ? 'text-red-600'
                              : passwordStrength.score === 3
                                ? 'text-yellow-600'
                                : passwordStrength.score === 4
                                  ? 'text-blue-600'
                                  : 'text-green-600'
                          }`}
                        >
                          {passwordStrength.label}
                        </span>
                        <span className="text-muted">
                          {passwordStrength.score >= 4 && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Check className="size-3" /> Secure
                            </span>
                          )}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {mode === 'register' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          type="number"
                          min={1}
                          max={120}
                          value={form.age}
                          onChange={(e) => update('age', e.target.value)}
                          placeholder="e.g. 35"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <select
                          id="gender"
                          value={form.gender}
                          onChange={(e) => update('gender', e.target.value)}
                          className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="state">State / UT</Label>
                      <select
                        id="state"
                        value={form.state}
                        onChange={(e) => update('state', e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select your state</option>
                        {INDIA_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="income">Annual Income (₹)</Label>
                      <Input
                        id="income"
                        type="number"
                        min={0}
                        value={form.income}
                        onChange={(e) => update('income', e.target.value)}
                        placeholder="e.g. 300000"
                      />
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <Button type="submit" disabled={loading} className="w-full py-3! text-base mt-2">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}{' '}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
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
