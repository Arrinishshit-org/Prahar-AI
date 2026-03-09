import { useState, useEffect } from 'react';
import {
  Users, FileText, CheckCircle, TrendingUp, RefreshCw, ArrowRight, Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getSyncStatus, getSystemHealth, getPanchayatUser } from '../api';
import type { SyncStatus, SystemHealth } from '../types';

interface Stats {
  totalUsers: number;
  totalSchemes: number;
  activeSchemes: number;
  totalApplications: number;
  userGrowth: number;
  schemeGrowth: number;
  applicationGrowth: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const panchayatUser = getPanchayatUser();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsData, syncData, healthData] = await Promise.all([
        getDashboardStats().catch(() => null),
        getSyncStatus().catch(() => null),
        getSystemHealth().catch(() => null),
      ]);
      setStats(statsData);
      setSyncStatus(syncData);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="size-10 rounded-full border-2 border-gray-200 border-t-amber-500 animate-spin" />
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Loading overview…
        </p>
      </div>
    );
  }

  const enrolled = stats?.totalApplications ?? 0;
  const total = stats?.totalUsers ?? 0;
  const coveragePct = total > 0 ? Math.round((enrolled / total) * 100) : 0;

  const statCards = [
    {
      label: 'Registered Citizens',
      value: total,
      change: stats?.userGrowth ?? 0,
      icon: Users,
      accent: 'blue',
    },
    {
      label: 'Welfare Schemes',
      value: stats?.totalSchemes ?? 0,
      change: stats?.schemeGrowth ?? 0,
      icon: FileText,
      accent: 'amber',
    },
    {
      label: 'Active Schemes',
      value: stats?.activeSchemes ?? 0,
      change: 0,
      icon: CheckCircle,
      accent: 'green',
    },
    {
      label: 'Total Enrollments',
      value: enrolled,
      change: stats?.applicationGrowth ?? 0,
      icon: TrendingUp,
      accent: 'purple',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary) 60%, var(--color-primary-700) 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-xl font-bold text-white tracking-tight"
              style={{ fontFamily: 'Lora, Georgia, serif' }}
            >
              {panchayatUser?.panchayatName || 'Gram Panchayat'} Overview
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {panchayatUser?.district && panchayatUser?.state
                ? `${panchayatUser.district}, ${panchayatUser.state}`
                : 'Welfare scheme delivery dashboard'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-accent)' }}
            >
              Coverage Rate
            </p>
            <p className="text-3xl font-bold text-white tabular-nums">{coveragePct}%</p>
            <div
              className="w-32 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${coveragePct}%`, background: 'var(--color-accent)' }}
              />
            </div>
          </div>
        </div>
        <button
          onClick={loadData}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          title="Refresh"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`p-stat-card ${s.accent}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="p-stat-label">{s.label}</p>
                  <p className="p-stat-value">{s.value.toLocaleString('en-IN')}</p>
                  {s.change !== 0 && (
                    <p className={`p-stat-change ${s.change > 0 ? 'positive' : 'negative'}`}>
                      {s.change > 0 ? '+' : ''}
                      {s.change}% this month
                    </p>
                  )}
                </div>
                <Icon className="size-5 mt-0.5" style={{ color: 'var(--color-muted-2)' }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System health */}
        {health && (
          <div className="p-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-sm font-semibold"
                style={{ color: 'var(--color-ink)', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                System Status
              </h2>
              <span
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{
                  color:
                    health.status === 'healthy'
                      ? '#059669'
                      : health.status === 'degraded'
                        ? '#d97706'
                        : '#dc2626',
                }}
              >
                <span className={`p-health-dot ${health.status}`} />
                {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Database', ok: health.neo4j },
                { label: 'Cache', ok: health.redis },
                { label: 'API', ok: health.api },
              ].map(({ label, ok }) => (
                <div
                  key={label}
                  className="p-3 rounded-lg text-center"
                  style={{
                    background: ok ? 'var(--color-success-50)' : '#fef2f2',
                    border: `1px solid ${ok ? 'var(--color-success-100)' : '#fecaca'}`,
                  }}
                >
                  <p
                    className="text-xs font-bold"
                    style={{ color: ok ? 'var(--color-success)' : '#dc2626' }}
                  >
                    {ok ? '✓' : '✗'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync status */}
        {syncStatus && (
          <div className="p-card p-5">
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: 'var(--color-ink)', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Scheme Sync
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  Total Schemes
                </span>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {syncStatus.totalSchemes.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  Last Synced
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--color-ink-2)' }}>
                  {syncStatus.lastSync
                    ? new Date(syncStatus.lastSync).toLocaleDateString('en-IN')
                    : 'Never'}
                </span>
              </div>
              {syncStatus.isSyncing && (
                <div className="p-badge p-badge-info flex items-center gap-2 text-xs w-fit">
                  <RefreshCw className="size-3 animate-spin" />
                  Syncing…
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="p-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="size-4" style={{ color: 'var(--color-accent)' }} />
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--color-ink)', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/panchayat/beneficiaries')}
            className="flex items-center justify-between p-4 rounded-xl transition-all duration-150 group text-left"
            style={{
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-100)',
            }}
          >
            <div className="flex items-center gap-3">
              <Users className="size-5" style={{ color: 'var(--color-primary-600)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                  Help a Citizen
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  Find schemes for a beneficiary
                </p>
              </div>
            </div>
            <ArrowRight
              className="size-4 group-hover:translate-x-1 transition-transform"
              style={{ color: 'var(--color-primary-400)' }}
            />
          </button>

          <button
            onClick={() => navigate('/panchayat/schemes')}
            className="flex items-center justify-between p-4 rounded-xl transition-all duration-150 group text-left"
            style={{
              background: 'var(--color-accent-50)',
              border: '1px solid var(--color-accent-100)',
            }}
          >
            <div className="flex items-center gap-3">
              <FileText className="size-5" style={{ color: 'var(--color-accent-700)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-accent-800)' }}>
                  Browse Schemes
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  Explore all available schemes
                </p>
              </div>
            </div>
            <ArrowRight
              className="size-4 group-hover:translate-x-1 transition-transform"
              style={{ color: 'var(--color-accent-300)' }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
