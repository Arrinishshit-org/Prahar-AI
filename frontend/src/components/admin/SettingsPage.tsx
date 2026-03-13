import { useEffect, useMemo, useState } from 'react';
import {
  Save,
  RefreshCw,
  Shield,
  Users,
  LineChart,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { AdminSystemSettings, getAdminSettings, updateAdminSettings } from './adminApi';
import { updateCurrentUserPassword } from '../../api';
import { useDialog } from '../DialogProvider';

export default function SettingsPage() {
  const { toast } = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AdminSystemSettings | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [form, setForm] = useState({
    syncIntervalHours: '24',
    maxUsers: '100000',
    maintenanceMode: false,
    analyticsEnabled: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const current = await getAdminSettings();
        if (!mounted) return;
        setSettings(current);
        setForm({
          syncIntervalHours: String(current.syncIntervalHours),
          maxUsers: String(current.maxUsers),
          maintenanceMode: current.maintenanceMode,
          analyticsEnabled: current.analyticsEnabled,
        });
      } catch (error) {
        if (!mounted) return;
        toast({
          message: error instanceof Error ? error.message : 'Failed to load admin settings',
          variant: 'error',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const isDirty = useMemo(() => {
    if (!settings) return false;
    return (
      Number(form.syncIntervalHours) !== settings.syncIntervalHours ||
      Number(form.maxUsers) !== settings.maxUsers ||
      form.maintenanceMode !== settings.maintenanceMode ||
      form.analyticsEnabled !== settings.analyticsEnabled
    );
  }, [form, settings]);

  const reload = async () => {
    try {
      setLoading(true);
      const current = await getAdminSettings();
      setSettings(current);
      setForm({
        syncIntervalHours: String(current.syncIntervalHours),
        maxUsers: String(current.maxUsers),
        maintenanceMode: current.maintenanceMode,
        analyticsEnabled: current.analyticsEnabled,
      });
    } catch (error) {
      toast({
        message: error instanceof Error ? error.message : 'Failed to refresh settings',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const syncIntervalHours = Number(form.syncIntervalHours);
    const maxUsers = Number(form.maxUsers);

    if (!Number.isFinite(syncIntervalHours) || syncIntervalHours < 1 || syncIntervalHours > 168) {
      toast({ message: 'Sync interval must be between 1 and 168 hours.', variant: 'error' });
      return;
    }

    if (!Number.isFinite(maxUsers) || maxUsers < 1) {
      toast({ message: 'Max users must be at least 1.', variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAdminSettings({
        syncIntervalHours: Math.round(syncIntervalHours),
        maxUsers: Math.round(maxUsers),
        maintenanceMode: form.maintenanceMode,
        analyticsEnabled: form.analyticsEnabled,
      });
      setSettings(updated);
      setForm({
        syncIntervalHours: String(updated.syncIntervalHours),
        maxUsers: String(updated.maxUsers),
        maintenanceMode: updated.maintenanceMode,
        analyticsEnabled: updated.analyticsEnabled,
      });
      toast({ message: 'Settings updated and applied successfully.', variant: 'success' });
    } catch (error) {
      toast({
        message: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      toast({ message: 'Please fill in all password fields.', variant: 'error' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ message: 'New password and confirmation do not match.', variant: 'error' });
      return;
    }

    setChangingPassword(true);
    try {
      await updateCurrentUserPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ message: 'Admin password updated successfully.', variant: 'success' });
    } catch (error) {
      toast({
        message: error instanceof Error ? error.message : 'Failed to update password',
        variant: 'error',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure applied runtime controls for the admin system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reload} disabled={loading || saving} className="btn btn-secondary">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving || !isDirty}
            className="btn btn-primary"
          >
            <Save className="size-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Clock3 className="size-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Synchronization</h2>
            <p className="text-sm text-gray-600">
              Controls how frequently scheduled scheme sync runs
            </p>
          </div>
        </div>

        <div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sync Interval (hours)
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={form.syncIntervalHours}
              onChange={(e) => setForm((prev) => ({ ...prev, syncIntervalHours: e.target.value }))}
              className="input-base max-w-xs"
              disabled={loading || saving}
            />
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Applies immediately to the background schedule and next-sync calculation.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Users className="size-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Capacity Controls</h2>
            <p className="text-sm text-gray-600">Set registration cap for citizen user accounts</p>
          </div>
        </div>

        <div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Users</label>
            <input
              type="number"
              min={1}
              value={form.maxUsers}
              onChange={(e) => setForm((prev) => ({ ...prev, maxUsers: e.target.value }))}
              className="input-base max-w-xs"
              disabled={loading || saving}
            />
            <p className="text-xs text-[var(--color-muted)] mt-1">
              New registrations are blocked when this limit is reached.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
            <Shield className="size-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Runtime Controls</h2>
            <p className="text-sm text-gray-600">Toggle live behavior flags for the platform</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={form.maintenanceMode}
              onChange={(e) => setForm((prev) => ({ ...prev, maintenanceMode: e.target.checked }))}
              disabled={loading || saving}
              className="size-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-accent)]/30"
            />
            <label htmlFor="maintenanceMode" className="text-sm font-medium text-gray-700">
              Maintenance Mode (blocks non-admin write operations)
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="analyticsEnabled"
              checked={form.analyticsEnabled}
              onChange={(e) => setForm((prev) => ({ ...prev, analyticsEnabled: e.target.checked }))}
              disabled={loading || saving}
              className="size-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-accent)]/30"
            />
            <label htmlFor="analyticsEnabled" className="text-sm font-medium text-gray-700">
              Analytics Enabled (admin + panchayat analytics endpoints)
            </label>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
            <KeyRound className="size-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Admin Password</h2>
            <p className="text-sm text-gray-600">Change your current admin account password</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPassword.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                className="input-base pr-10"
                autoComplete="current-password"
                disabled={changingPassword || saving}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => ({ ...prev, current: !prev.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                aria-label={
                  showPassword.current ? 'Hide current password' : 'Show current password'
                }
              >
                {showPassword.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword.next ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                className="input-base pr-10"
                autoComplete="new-password"
                disabled={changingPassword || saving}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => ({ ...prev, next: !prev.next }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                aria-label={showPassword.next ? 'Hide new password' : 'Show new password'}
              >
                {showPassword.next ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                className="input-base pr-10"
                autoComplete="new-password"
                disabled={changingPassword || saving}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                aria-label={
                  showPassword.confirm ? 'Hide confirm password' : 'Show confirm password'
                }
              >
                {showPassword.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--color-muted)] mt-2">
          Use 8+ characters including uppercase, lowercase, number, and special character.
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handlePasswordChange}
            disabled={changingPassword || saving}
            className="btn btn-primary"
          >
            {changingPassword ? 'Updating...' : 'Update Admin Password'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
            <LineChart className="size-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Settings Status</h2>
            <p className="text-sm text-gray-600">Current applied values from backend</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Sync Interval</p>
            <p className="font-medium text-gray-900">
              {settings?.syncIntervalHours ?? '...'} hours
            </p>
          </div>
          <div>
            <p className="text-gray-600">Max Users</p>
            <p className="font-medium text-gray-900">{settings?.maxUsers ?? '...'}</p>
          </div>
          <div>
            <p className="text-gray-600">Maintenance Mode</p>
            <p className="font-medium text-gray-900">
              {settings?.maintenanceMode ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Analytics</p>
            <p className="font-medium text-gray-900">
              {settings?.analyticsEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-4">
          Last updated:{' '}
          {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Not available'}
        </p>
      </div>
    </div>
  );
}
