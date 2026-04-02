import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Save, Loader2, User, Palette, Globe, Shield } from 'lucide-react';
import PhoneInput from '../../components/common/PhoneInput';
import PasswordInput from '../../components/common/PasswordInput';
import api from '../../api/axios';

const ALL_SECTIONS = ['Profile', 'Branding', 'Portal', 'Security'];

export default function Settings() {
  const { user, fetchProfile } = useAuth();
  const tenant = user?.tenant;
  const isFaculty = user?.role?.name === 'faculty' || user?.role === 'faculty';
  const SECTIONS = isFaculty ? ['Profile', 'Security'] : ALL_SECTIONS;

  const [activeSection, setActiveSection] = useState('Profile');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Profile
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [countryCode, setCountryCode] = useState(user?.country_code || '+91');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const primaryColor = tenant?.primary_color || '#22D3EE';

  const show = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.patch('/auth/profile/', { full_name: fullName, phone, country_code: countryCode });
      await fetchProfile();
      show('✓ Profile updated successfully.');
    } catch {
      show('✗ Failed to update profile.');
    } finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      show('✗ Passwords do not match.'); return;
    }
    if (newPassword.length < 8) {
      show('✗ Password must be at least 8 characters.'); return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      show('✓ Password changed successfully.');
    } catch {
      show('✗ Failed. Check your current password.');
    } finally { setSaving(false); }
  };

  const SectionIcon = { Profile: User, Branding: Palette, Portal: Globe, Security: Shield };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold text-foreground tracking-tight">Settings</h2>
        <p className="text-muted mt-1">Manage your account and portal configuration</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-surface/60 border border-border rounded-2xl p-1.5 w-fit">
        {SECTIONS.map(s => {
          const Icon = SectionIcon[s];
          const isActive = activeSection === s;
          return (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={isActive ? {
                backgroundColor: `${primaryColor}18`,
                color: primaryColor,
                border: `1px solid ${primaryColor}30`,
              } : { color: '#64748B' }}
            >
              <Icon className="w-4 h-4" />
              {s}
            </button>
          );
        })}
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${msg.startsWith('✓') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {msg}
        </div>
      )}

      {/* ── Profile Section ──────────────────────────── */}
      {activeSection === 'Profile' && (
        <div className="bg-background border border-border rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-bold text-foreground">My Profile</h3>
          
          <div className="flex items-center gap-4 p-4 bg-surface/60 rounded-xl border border-border">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
            >
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-foreground font-bold text-lg">{user?.full_name}</p>
              <p className="text-muted text-sm">{user?.email}</p>
              <span
                className="mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              >
                {user?.role?.name?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Full Name</label>
              <input
                className="mt-1 w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Phone</label>
              <PhoneInput 
                value={phone} 
                countryCode={countryCode} 
                onChangePhone={setPhone} 
                onChangeCode={setCountryCode} 
                className="mt-1" 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Email</label>
              <input
                className="mt-1 w-full bg-surface/50 border border-border/50 rounded-xl px-4 py-2.5 text-muted text-sm cursor-not-allowed"
                value={user?.email || ''}
                disabled
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Role</label>
              <input
                className="mt-1 w-full bg-surface/50 border border-border/50 rounded-xl px-4 py-2.5 text-muted text-sm cursor-not-allowed capitalize"
                value={user?.role?.name?.replace(/_/g, ' ') || ''}
                disabled
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0F172A] transition-all disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* ── Branding Section ──────────────────────────── */}
      {activeSection === 'Branding' && (
        <div className="bg-background border border-border rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-bold text-foreground">Institution Branding</h3>
          <p className="text-sm text-muted">These are the colors applied to your tenant dashboard. They were set during registration and can only be changed by a Super Admin.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface/60 border border-border rounded-xl p-4">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Primary Color</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl shadow border border-border" style={{ backgroundColor: tenant?.primary_color || '#22D3EE' }} />
                <span className="text-foreground font-mono text-sm">{tenant?.primary_color || '#22D3EE'}</span>
              </div>
            </div>
            <div className="bg-surface/60 border border-border rounded-xl p-4">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Secondary Color</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl shadow border border-border" style={{ backgroundColor: tenant?.secondary_color || 'var(--bg-surface)' }} />
                <span className="text-foreground font-mono text-sm">{tenant?.secondary_color || 'var(--bg-surface)'}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-[#475569]">Contact your CampuZcore administrator to update branding colors.</p>
        </div>
      )}

      {/* ── Portal Section ──────────────────────────── */}
      {activeSection === 'Portal' && (
        <div className="bg-background border border-border rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-bold text-foreground">Portal Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Institution Name" value={tenant?.tenant_name} />
            <InfoRow label="Portal Code" value={tenant?.tenant_code} mono />
            <InfoRow label="Subscription" value={tenant?.subscription_type?.toUpperCase()} />
            <InfoRow label="Status" value={tenant?.status?.toUpperCase()} />
            <InfoRow label="Contract Expires" value={tenant?.contract_end_date || 'N/A'} />
            <InfoRow label="Portal URL" value={`${tenant?.subdomain}.campuzcore.com`} mono />
          </div>

          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Purchased Modules</p>
            <div className="flex flex-wrap gap-2">
              {[
                ['has_resources', 'Asset Management', '#8B5CF6'],
                ['has_bookings', 'Facility Bookings', '#10B981'],
                ['has_timetable', 'Timetabling', '#F59E0B'],
                ['has_exams', 'Exam Management', '#EC4899'],
                ['has_reports', 'Analytics', '#3B82F6'],
                ['has_notifications', 'Notifications', '#6366F1'],
              ].map(([key, label, color]) => (
                <span
                  key={key}
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${tenant?.[key] ? 'opacity-100' : 'opacity-20'}`}
                  style={tenant?.[key] ? { backgroundColor: `${color}15`, color, borderColor: `${color}40` } : {
                    backgroundColor: 'var(--bg-surface)', color: '#475569', borderColor: 'var(--bg-surface)'
                  }}
                >
                  {label} {tenant?.[key] ? '✓' : '✗'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Security Section ──────────────────────────── */}
      {activeSection === 'Security' && (
        <div className="bg-background border border-border rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-bold text-foreground">Change Password</h3>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Current Password</label>
              <PasswordInput
                name="currentPassword"
                value={currentPassword}
                onChange={setCurrentPassword}
                showStrengthIndicator={false}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">New Password</label>
              <PasswordInput
                name="newPassword"
                value={newPassword}
                onChange={setNewPassword}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Confirm New Password</label>
              <PasswordInput
                name="confirmPassword"
                value={confirmPassword}
                onChange={setConfirmPassword}
                showStrengthIndicator={false}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={savePassword}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-[#EF4444] hover:bg-[#DC2626] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Update Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="bg-surface/60 border border-border rounded-xl px-4 py-3">
      <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-foreground text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}
