import { motion } from 'motion/react';
import { Search, Filter, ExternalLink, School, Tractor as Agriculture, Baby, HeartPulse, Map, User, Zap, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import { useState, useEffect, FormEvent } from 'react';
import { Scheme } from '../types';
import { fetchSchemes } from '../api';

const CATEGORIES = [
  { icon: Agriculture, label: 'Farmer' },
  { icon: School, label: 'Student' },
  { icon: Baby, label: 'Women' },
  { icon: HeartPulse, label: 'Health' },
  { icon: Map, label: 'State' },
];

export default function SchemeExplorer() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    loadSchemes();
  }, []);

  const loadSchemes = async (searchQuery = '', category = '') => {
    setLoading(true);
    setError('');
    try {
      // Backend only supports `q` — merge search + category into one query
      const combined = [searchQuery, category].filter(Boolean).join(' ');
      const data = await fetchSchemes(combined || undefined, 50);
      // API returns a flat array
      const list: Scheme[] = Array.isArray(data) ? data : (data.schemes ?? data.data ?? data.value ?? []);
      setSchemes(list.slice(0, 50));
    } catch {
      setError('Could not load schemes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    loadSchemes(query, activeCategory);
  };

  const handleCategory = (label: string) => {
    const next = activeCategory === label ? '' : label;
    setActiveCategory(next);
    loadSchemes(query, next);
  };

  return (
    <div className="min-h-screen bg-surface">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold text-ink">Government Schemes</h1>
              <p className="text-muted text-sm mt-1">Browse and search 1,200+ Central and State schemes.</p>
            </div>
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-lg">
              <div className="relative flex items-center">
                <Search className="absolute left-4 text-muted size-5 pointer-events-none" />
                <input
                  className="input-base !pl-12 !pr-28"
                  placeholder="Search by name, ministry, keyword…"
                  type="text" value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className="absolute right-2 btn-navy !py-1.5 !px-4 !text-xs">
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 mt-5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => { setActiveCategory(''); loadSchemes(query, ''); }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold border transition-colors ${
                !activeCategory ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-border hover:border-primary/40 hover:text-primary'
              }`}
            >
              <Filter className="size-3.5" /> All Schemes
            </button>
            {CATEGORIES.map((cat, i) => (
              <button key={i} onClick={() => handleCategory(cat.label)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold border transition-colors ${
                  activeCategory === cat.label ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-border hover:border-primary/40 hover:text-primary'
                }`}>
                <cat.icon className="size-3.5" />{cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-medium text-muted">
            {loading ? 'Loading…' : `${schemes.length} scheme${schemes.length !== 1 ? 's' : ''} found${
              activeCategory ? ` in ${activeCategory}` : ''
            }`}
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Fetching schemes…</p>
          </div>
        )}

        {!loading && error && (
          <div className="card p-5 flex items-center gap-3 text-red-700 border-red-200 bg-red-50">
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-sm flex-1">{error}</p>
            <button onClick={() => loadSchemes(query, activeCategory)} className="text-xs font-bold underline">Retry</button>
          </div>
        )}

        {!loading && !error && schemes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted">
            <BookOpen className="size-12 opacity-30" />
            <p className="text-sm font-medium">No schemes found. Try a different keyword or category.</p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5 pb-8">
          {!loading && schemes.map((scheme, idx) => (
            <motion.div key={scheme.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.4) }}
              className="card p-6 flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-ink text-base leading-snug flex-1">{scheme.title}</h3>
                <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-primary-50 text-primary uppercase tracking-wide">
                  {scheme.category || 'General'}
                </span>
              </div>

              {scheme.description && (
                <p className="text-sm text-muted leading-relaxed line-clamp-2">{scheme.description}</p>
              )}

              {(scheme.benefits || scheme.benefit) && (
                <div className="flex items-start gap-2 p-3 bg-accent-50 rounded-lg border-l-4 border-accent">
                  <Zap className="size-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-ink">{scheme.benefits || scheme.benefit}</p>
                </div>
              )}

              <div className="flex items-start gap-2">
                <User className="size-4 text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Eligibility</p>
                  <p className="text-xs text-ink mt-0.5 line-clamp-2">{scheme.eligibility || 'See official website'}</p>
                </div>
              </div>

              <div className="mt-auto pt-2">
                <a
                  href={scheme.applicationUrl || `https://www.myscheme.gov.in/search?q=${encodeURIComponent(scheme.id)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn-primary w-full !py-2.5 text-sm"
                >
                  Apply on MyScheme.gov.in <ExternalLink className="size-3.5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
