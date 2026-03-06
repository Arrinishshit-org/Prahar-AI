import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Home,
  LayoutGrid,
  MessageSquare,
  User,
  PhoneCall,
  LogIn,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Bot,
} from 'lucide-react';
import { View, Scheme } from './types';
import { AuthProvider, useAuth } from './AuthContext';

// Components
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import SchemeExplorer from './components/SchemeExplorer';
import SchemeDetail from './components/SchemeDetail';
import ChatAssistant from './components/ChatAssistant';
import UserProfile from './components/UserProfile';
import AboutPage from './components/AboutPage';
import PartnerPortal from './components/PartnerPortal';
import ContactPage from './components/ContactPage';
import LoginPage from './components/LoginPage';
import OnboardingWizard from './components/OnboardingWizard';
import LanguageSelector from './components/LanguageSelector';

/* ─────────────────────────────────────────────
   Prahar Logo Mark
───────────────────────────────────────────── */
function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stylised 'P' letterform with chakra dots */}
      <rect width="36" height="36" rx="8" fill="currentColor" />
      <path d="M10 26V10h9a5.5 5.5 0 0 1 0 11H10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="26" r="2" fill="#C8700D" />
      <circle cx="26" cy="20" r="1.2" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Global Navigation Bar
───────────────────────────────────────────── */
interface NavBarProps {
  current: View;
  onNavigate: (v: View) => void;
}

function NavBar({ current, onNavigate }: NavBarProps) {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: { id: View; labelKey: string }[] = [
    { id: 'home', labelKey: 'nav.home' },
    { id: 'schemes', labelKey: 'nav.schemes' },
    { id: 'assistant', labelKey: 'nav.assistant' },
    { id: 'about', labelKey: 'nav.about' },
    { id: 'contact', labelKey: 'nav.contact' },
  ];

  const go = (v: View) => {
    onNavigate(v);
    setMobileOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[3.75rem] flex items-center justify-between gap-4">
          {/* Logo */}
          <button onClick={() => go('home')} className="flex items-center gap-2.5 shrink-0">
            <LogoMark className="size-9 text-primary" />
            <div className="leading-none">
              <span className="block text-[1.1rem] font-bold text-primary tracking-[-0.02em]" style={{ fontFamily: 'Syne, sans-serif' }}>
                Prahar AI
              </span>
              <span className="text-[9px] font-semibold text-muted tracking-[0.15em] uppercase block" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {t('nav.citizen_welfare')}
              </span>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {links.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className={`relative px-3.5 py-2 text-[0.82rem] font-semibold transition-colors ${
                  current === l.id
                    ? 'text-accent'
                    : 'text-ink/70 hover:text-ink'
                }`}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {t(l.labelKey)}
                {current === l.id && (
                  <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] rounded-full bg-accent" />
                )}
              </button>
            ))}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <LanguageSelector />
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => go('profile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold transition-colors ${
                    current === 'profile'
                      ? 'bg-primary text-white'
                      : 'bg-surface-2 text-ink hover:bg-border'
                  }`}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  <div className="size-6 rounded-full bg-accent/15 flex items-center justify-center">
                    <span className="text-[0.65rem] font-bold text-accent">
                      {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span>{user?.name?.split(' ')[0] || 'Profile'}</span>
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-[0.78rem] text-muted hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50/70 transition-colors"
                >
                  <LogOut className="size-3.5" />
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <button onClick={() => go('login')} className="btn btn-primary">
                <LogIn className="size-3.5" />
                {t('nav.login')}
              </button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden size-9 flex items-center justify-center rounded-lg hover:bg-surface-2 text-ink transition-colors"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-parchment overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {links.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => go(l.id)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      current === l.id ? 'bg-primary text-white' : 'text-ink/70 hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    {t(l.labelKey)}
                  </button>
                ))}
                <div className="pt-3 border-t border-border mt-2 flex items-center gap-2">
                  <LanguageSelector />
                  {isAuthenticated ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => go('profile')}
                        className="flex-1 btn btn-navy text-xs"
                      >
                        <User className="size-3.5" /> {t('nav.profile')}
                      </button>
                      <button
                        onClick={logout}
                        className="flex items-center gap-1 text-sm text-red-600 px-3 py-2 rounded-lg hover:bg-red-50"
                      >
                        <LogOut className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => go('login')} className="w-full btn btn-primary">
                      <LogIn className="size-4" /> {t('nav.login')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

/* ─────────────────────────────────────────────
   Mobile Bottom Nav
───────────────────────────────────────────── */
function MobileBottomNav({
  current,
  onNavigate,
}: {
  current: View;
  onNavigate: (v: View) => void;
}) {
  const items = [
    { id: 'home' as View, label: 'Home', icon: Home },
    { id: 'schemes' as View, label: 'Schemes', icon: LayoutGrid },
    { id: 'assistant' as View, label: 'Chat', icon: MessageSquare },
    { id: 'contact' as View, label: 'Support', icon: PhoneCall },
    { id: 'profile' as View, label: 'Profile', icon: User },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-parchment border-t border-border safe-area-pb shadow-[0_-1px_8px_rgba(26,18,8,0.06)]">
      <div className="flex">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
              current === id ? 'text-accent' : 'text-muted hover:text-ink'
            }`}
          >
            <Icon className={`size-5 ${current === id ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
            <span className="text-[9px] font-bold tracking-wide" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   Main App
───────────────────────────────────────────── */
function AppContent() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [intendedView, setIntendedView] = useState<View | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const { isAuthenticated, user } = useAuth();

  const PROTECTED: View[] = ['schemes', 'assistant', 'profile', 'partner'];

  const navigate = (view: View) => {
    if (PROTECTED.includes(view) && !isAuthenticated) {
      setIntendedView(view);
      setCurrentView('login');
      return;
    }
    setIntendedView(null);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSchemeSelect = (scheme: Scheme) => {
    setSelectedScheme(scheme);
    setCurrentView('schemeDetail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToSchemes = () => {
    setSelectedScheme(null);
    setCurrentView('schemes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostLogin = () => {
    const dest = intendedView || 'home';
    setIntendedView(null);
    setCurrentView(dest);
    if (!user?.onboardingComplete) setShowOnboarding(true);
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return isAuthenticated && user ? (
          <Dashboard user={user} onNavigate={navigate} />
        ) : (
          <LandingPage onNavigate={navigate} />
        );
      case 'schemes':
        return <SchemeExplorer onSchemeSelect={handleSchemeSelect} />;
      case 'schemeDetail':
        return selectedScheme ? (
          <SchemeDetail scheme={selectedScheme} onBack={handleBackToSchemes} />
        ) : (
          <SchemeExplorer onSchemeSelect={handleSchemeSelect} />
        );
      case 'assistant':
        return <ChatAssistant />;
      case 'profile':
        return <UserProfile onNavigate={navigate} />;
      case 'about':
        return <AboutPage onNavigate={navigate} />;
      case 'partner':
        return <PartnerPortal />;
      case 'contact':
        return <ContactPage onNavigate={navigate} />;
      case 'login':
        return <LoginPage onNavigate={navigate} onLoginSuccess={handlePostLogin} />;
      default:
        return isAuthenticated && user ? (
          <Dashboard user={user} onNavigate={navigate} />
        ) : (
          <LandingPage onNavigate={navigate} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Global Nav */}
      <NavBar current={currentView} onNavigate={navigate} />

      {/* Onboarding Wizard Overlay */}
      <AnimatePresence>
        {showOnboarding && isAuthenticated && (
          <OnboardingWizard
            onComplete={() => setShowOnboarding(false)}
            onSkip={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>

      {/* Page content */}
      <main className="flex-1 pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="min-h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav current={currentView} onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
