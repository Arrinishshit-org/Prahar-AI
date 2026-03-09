import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart2,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Bell,
  Leaf,
} from 'lucide-react';
import { clearAdminKey, isAuthenticated } from './api';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BeneficiariesPage from './pages/BeneficiariesPage';
import SchemesPage from './pages/SchemesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ActivityPage from './pages/ActivityPage';
import SettingsPage from './pages/SettingsPage';

const navigation = [
  { path: '', label: 'Overview', icon: LayoutDashboard },
  { path: 'beneficiaries', label: 'Beneficiaries', icon: Users },
  { path: 'schemes', label: 'Schemes', icon: FileText },
  { path: 'analytics', label: 'Analytics', icon: BarChart2 },
  { path: 'activity', label: 'Activity', icon: Activity },
  { path: 'settings', label: 'Settings', icon: Settings },
];

const PAGE_LABELS: Record<string, string> = {
  '': 'Overview',
  beneficiaries: 'Beneficiaries',
  schemes: 'Scheme Catalog',
  analytics: 'Analytics',
  activity: 'Activity Log',
  settings: 'Settings',
};

export default function PanchayatLayout() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearAdminKey();
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  }

  // Derive the current sub-page from the URL
  const subPath = location.pathname.replace(/^\/panchayat\/?/, '').split('/')[0] || '';

  const isActive = (navPath: string) => subPath === navPath;

  const goTo = (navPath: string) => {
    navigate(`/panchayat/${navPath}`);
  };

  return (
    <div className="panchayat-portal min-h-screen bg-gray-50 flex">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={`p-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-60' : 'w-17'
        }`}
      >
        {/* Logo row */}
        <div className="p-sidebar-logo h-14 flex items-center justify-between px-4 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <div
                className="size-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}
              >
                <Leaf className="size-4 text-amber-400" />
              </div>
              <div className="leading-none">
                <p className="text-white font-bold text-sm tracking-tight">Gram Sabha</p>
                <p
                  style={{
                    color: '#4a7a52',
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                    fontWeight: 600,
                    marginTop: '2px',
                  }}
                >
                  PANCHAYAT PORTAL
                </p>
              </div>
            </div>
          ) : (
            <div
              className="mx-auto size-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <Leaf className="size-4 text-amber-400" />
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {sidebarOpen && (
            <p
              className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: '#2d4a32' }}
            >
              Navigation
            </p>
          )}
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => goTo(item.path)}
                title={!sidebarOpen ? item.label : undefined}
                className={`p-nav-item ${active ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-0' : ''}`}
              >
                <Icon className="size-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom: toggle + logout */}
        <div className="px-2 pb-4 space-y-0.5 border-t shrink-0" style={{ borderColor: '#1e3322' }}>
          <div className="pt-3" />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-nav-item ${!sidebarOpen ? 'justify-center px-0' : ''}`}
            title={sidebarOpen ? 'Collapse' : 'Expand'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="size-4 shrink-0" />
            ) : (
              <Menu className="size-4 shrink-0" />
            )}
            {sidebarOpen && <span>Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`p-nav-item ${!sidebarOpen ? 'justify-center px-0' : ''}`}
            style={{ color: '#f85149' }}
            title="Logout"
          >
            <LogOut className="size-4 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-60' : 'ml-17'}`}
      >
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200/80 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {PAGE_LABELS[subPath] || 'Panchayat Portal'}
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <Bell className="size-4" />
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-linear-to-br from-green-600 to-green-800 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                P
              </div>
              <div className="hidden sm:block leading-none">
                <p className="text-xs font-semibold text-gray-800">Panchayat</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={subPath}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="beneficiaries" element={<BeneficiariesPage />} />
                <Route path="schemes" element={<SchemesPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/panchayat" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
