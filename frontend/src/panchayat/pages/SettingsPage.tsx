import { useEffect, useState } from 'react';
import {
  clearSession,
  getPanchayatUser,
  getCurrentPanchayatUser,
  updateCurrentPanchayatUser,
  updatePanchayatPassword,
} from '../api';
import { LogOut, ShieldAlert, Leaf, User, KeyRound, Save, Eye, EyeOff } from 'lucide-react';
import { useDialog } from '../../components/DialogProvider';

export default function SettingsPage() {
  const { confirm, toast } = useDialog();
  const [cleared, setCleared] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profile, setProfile] = useState({ name: '', panchayatName: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  useEffect(() => {
    let mounted = true;

    const localUser = getPanchayatUser();
    if (localUser) {
      setProfile({
        name: localUser.name ?? '',
        panchayatName: localUser.panchayatName ?? '',
      });
      setLoadingProfile(false);
    }

    getCurrentPanchayatUser()
      .then((user) => {
        if (!mounted) return;
        setProfile({
          name: user.name ?? '',
          panchayatName: user.panchayatName ?? '',
        });
      })
      .catch(() => {
        if (!mounted) return;
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = profile.name.trim();

    if (!name) {
      toast({
        message: 'Name is required.',
        variant: 'error',
      });
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateCurrentPanchayatUser({ name });
      setProfile({
        name: updated.name,
        panchayatName: updated.panchayatName,
      });
      toast({
        message: 'Profile updated successfully.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        message: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'error',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setSavingPassword(true);
    try {
      await updatePanchayatPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        message: 'Password updated successfully.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        message: error instanceof Error ? error.message : 'Failed to update password',
        variant: 'error',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleClearKey = async () => {
    const ok = await confirm({
      title: 'Log Out',
      message: 'This will log you out of the Panchayat portal. Continue?',
      confirmLabel: 'Log Out',
      variant: 'primary',
    });
    if (!ok) return;
    clearSession();
    setCleared(true);
    setTimeout(() => {
      window.location.href = '/panchayat';
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <section className="p-card p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div
            className="size-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(217,122,16,0.14)',
              border: '1px solid rgba(217,122,16,0.28)',
            }}
          >
            <Leaf className="size-6" style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="min-w-0">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--color-ink)', fontFamily: 'Lora, Georgia, serif' }}
            >
              Settings
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
              Manage your account details and security preferences for the Panchayat portal.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="p-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="size-4" style={{ color: 'var(--color-accent)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                Profile
              </h2>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Display Name
                  </label>
                  <input
                    type="text"
                    className="p-input"
                    value={profile.name}
                    onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your name"
                    disabled={loadingProfile || savingProfile}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Panchayat Name (Assigned)
                  </label>
                  <input
                    type="text"
                    className="p-input"
                    value={profile.panchayatName}
                    readOnly
                    disabled
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-muted-2)' }}>
                    Your panchayat is managed by administrators and cannot be edited here.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="p-btn p-btn-primary gap-2"
                disabled={loadingProfile || savingProfile}
              >
                <Save className="size-4" />
                {savingProfile ? 'Saving…' : 'Save profile changes'}
              </button>
            </form>
          </section>

          <section className="p-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="size-4" style={{ color: 'var(--color-accent)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                Change Password
              </h2>
            </div>

            <form onSubmit={handlePasswordSave} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    className="p-input pr-10"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                    }
                    autoComplete="current-password"
                    disabled={savingPassword}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-muted-2)' }}
                    aria-label={
                      showPasswords.current ? 'Hide current password' : 'Show current password'
                    }
                  >
                    {showPasswords.current ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.next ? 'text' : 'password'}
                      className="p-input pr-10"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      autoComplete="new-password"
                      disabled={savingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, next: !prev.next }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-muted-2)' }}
                      aria-label={showPasswords.next ? 'Hide new password' : 'Show new password'}
                    >
                      {showPasswords.next ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      className="p-input pr-10"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      autoComplete="new-password"
                      disabled={savingPassword}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-muted-2)' }}
                      aria-label={
                        showPasswords.confirm ? 'Hide confirm password' : 'Show confirm password'
                      }
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs" style={{ color: 'var(--color-muted-2)' }}>
                Use 8+ characters with uppercase, lowercase, number, and a special character.
              </p>

              <button type="submit" className="p-btn p-btn-primary gap-2" disabled={savingPassword}>
                <KeyRound className="size-4" />
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="p-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="size-4" style={{ color: 'var(--color-accent)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                Session & Security
              </h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
              If this is a shared device, log out to keep citizen data and account access secure.
            </p>
            <button
              onClick={handleClearKey}
              disabled={cleared}
              className="p-btn p-btn-danger gap-2 w-full justify-center"
            >
              <LogOut className="size-4" />
              {cleared ? 'Logging out…' : 'Logout from this device'}
            </button>
          </section>

          <section className="p-card p-5">
            <h2 className="font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
              About This Portal
            </h2>
            <div className="space-y-2 text-sm" style={{ color: 'var(--color-muted)' }}>
              <p>
                This portal helps Panchayat officials identify relevant welfare schemes for eligible
                citizens.
              </p>
              <p>
                Keep your profile details up to date so reports and recommendations remain accurate.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
