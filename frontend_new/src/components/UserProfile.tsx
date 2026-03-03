import { User, MapPin, ShieldCheck, Edit3, CheckCircle2, Calendar, FileText, Upload, Download, Eye, LayoutGrid, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { View } from '../types';

interface UserProfileProps {
  onNavigate: (view: View) => void;
}

export default function UserProfile({ onNavigate }: UserProfileProps) {
  const { user, logout } = useAuth();

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const displayAge = user?.age ?? '—';
  const displayState = user?.state || '—';
  const displayIncome = user?.income ? `₹${(user.income / 100000).toFixed(1)}L` : '—';

  return (
    <div className="min-h-screen bg-surface">

      {/* ── Profile Banner ── */}
      <div className="bg-primary">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-end gap-6">
          <div className="relative">
            <div className="size-20 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center">
              <span className="font-display text-3xl font-bold text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 size-5 bg-green-400 border-2 border-white rounded-full" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-white">{displayName}</h1>
            <div className="flex flex-wrap gap-4 mt-2">
              {displayAge !== '—' && <span className="text-white/60 text-xs flex items-center gap-1"><User className="size-3" /> Age {displayAge}</span>}
              {displayState !== '—' && <span className="text-white/60 text-xs flex items-center gap-1"><MapPin className="size-3" /> {displayState}</span>}
              {displayIncome !== '—' && <span className="text-white/60 text-xs flex items-center gap-1"><FileText className="size-3" /> {displayIncome}</span>}
            </div>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <button className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg border border-white/25 text-white/80 hover:bg-white/10 transition-colors">
              <Edit3 className="size-3.5" /> Edit Profile
            </button>
            <button onClick={logout} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg border border-white/25 text-white/60 hover:bg-white/10 transition-colors">
              <LogOut className="size-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6 pb-16">

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Eligible Schemes', value: '05', icon: LayoutGrid, color: 'text-primary' },
            { label: 'Applied', value: '02', icon: CheckCircle2, color: 'text-success' },
            { label: 'Upcoming', value: '01', icon: Calendar, color: 'text-accent' },
            { label: 'Profile', value: `${user?.completeness ?? 70}%`, icon: ShieldCheck, color: 'text-green-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">{label}</span>
                <Icon className={`size-4 ${color}`} />
              </div>
              <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Aadhaar Verification Banner ── */}
        <div className="card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-green-50 flex items-center justify-center">
              <ShieldCheck className="size-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-ink text-sm">Aadhaar Verified</p>
              <p className="text-xs text-muted">1234 XXXX 9012</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">Verified</span>
        </div>

        {/* ── Deadline Alert ── */}
        <div className="card p-5 flex items-center gap-4 border-l-4 border-accent">
          <div className="size-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Calendar className="size-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-ink text-sm">Upcoming Deadline</p>
            <p className="text-xs text-muted mt-0.5">UP Scholarship Portal</p>
          </div>
          <span className="text-xs font-bold text-accent bg-amber-50 border border-accent/30 px-3 py-1.5 rounded-full">Closes in 3 days</span>
        </div>

        {/* ── Active Applications ── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-bold text-ink">Active Applications</h3>
            <button className="text-xs font-semibold text-primary hover:underline">View All</button>
          </div>
          <div className="flex justify-between items-start mb-5">
            <div>
              <h4 className="font-semibold text-ink">PM Awas Yojana (Rural)</h4>
              <p className="text-xs text-muted mt-0.5">Application ID: #PM-882910</p>
            </div>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Processing</span>
          </div>
          <div className="relative px-2 mb-5">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2" />
            <div className="absolute top-1/2 left-0 w-1/3 h-1 bg-primary -translate-y-1/2" />
            <div className="flex justify-between relative z-10">
              {[
                { label: 'Submitted', active: true },
                { label: 'Verified', active: true },
                { label: 'Approved', active: false },
                { label: 'Fund Transfer', active: false }
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`size-4 rounded-full border-2 ${
                    step.active ? 'bg-primary border-primary' : 'bg-white border-slate-200'
                  }`} />
                  <span className={`text-[8px] font-bold uppercase tracking-wider ${
                    step.active ? 'text-primary' : 'text-slate-400'
                  }`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="flex items-center justify-between p-3 bg-primary-50 rounded-lg text-xs font-semibold text-primary w-full border border-primary/20">
            <span>Next Step: Verification by Block Officer</span>
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* ── Required Documents ── */}
        <div className="card p-6">
          <h3 className="font-display text-lg font-bold text-ink mb-5">Required Documents</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-border">
              <div className="size-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="size-5 text-muted" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-ink">Income Certificate</h4>
                <p className="text-xs text-muted mt-0.5">Required for 3 schemes</p>
              </div>
              <button className="btn-navy !py-2 !px-4 text-xs flex items-center gap-1.5">
                <Upload className="size-3.5" /> Upload
              </button>
            </div>
            <div className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-border">
              <div className="size-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-ink">Aadhaar Card</h4>
                <p className="text-xs text-green-600 font-semibold mt-0.5">Verified</p>
              </div>
              <button className="text-muted hover:text-primary p-2 rounded-lg hover:bg-primary-50 transition-colors">
                <Eye className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Download Forms ── */}
        <div className="card p-6">
          <h3 className="font-display text-lg font-bold text-ink mb-5">Download Forms</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Farmer Subsidy Application', size: '1.2 MB' },
              { title: 'Birth Registration Form', size: '840 KB' }
            ].map((form, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-border">
                <div className="size-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="size-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-ink truncate">{form.title}</h4>
                  <p className="text-xs text-muted mt-0.5">PDF · {form.size}</p>
                </div>
                <button className="btn-ghost !py-2 !px-3 text-xs shrink-0 flex items-center gap-1">
                  <Download className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
