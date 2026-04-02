import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { academicsApi } from '../../api/academics';
import {
  User, Award, Briefcase, BookOpen, FlaskConical, Factory,
  FileText, Clock, Save, CheckCircle2, AlertCircle, Loader2, ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

const inputCls =
  'w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]/60 transition-colors resize-none';

function Field({ label, icon: Icon, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/50">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
        {required && <span className="text-[var(--primary)]">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-foreground/30">{hint}</p>}
    </div>
  );
}

export default function FacultyProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [availableDomains, setAvailableDomains] = useState([]);
  const [availablePrimaryDomains, setAvailablePrimaryDomains] = useState([]);
  const [relatedSecondaryDomains, setRelatedSecondaryDomains] = useState({});
  const [secondarySearch, setSecondarySearch] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [form, setForm] = useState({
    primary_specialization_domain: '',
    secondary_specialization_domain_ids: [],
    qualifications: '',
    skills: '',
    years_of_experience: '',
    certifications: '',
    research_interests: '',
    industry_experience: '',
    bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const hasSavedProfileDetails = (data) => Boolean(
    data?.primary_specialization_domain ||
    data?.years_of_experience !== null && data?.years_of_experience !== undefined && data?.years_of_experience !== '' ||
    (data?.qualifications || '').trim() ||
    (data?.skills || '').trim() ||
    (data?.certifications || '').trim() ||
    (data?.bio || '').trim()
  );

  const hydrateProfileData = async (data) => {
    let domainRows = Array.isArray(data.available_subject_domains) ? data.available_subject_domains : [];
    if (domainRows.length === 0) {
      const departmentId = data.department || user?.department_id;
      if (departmentId) {
        const fallbackDomains = await academicsApi.getSubjectDomains({ department_id: departmentId });
        domainRows = Array.isArray(fallbackDomains) ? fallbackDomains : [];
      }
    }
    const primaryDomainRows = Array.isArray(data.available_primary_subject_domains) && data.available_primary_subject_domains.length
      ? data.available_primary_subject_domains
      : domainRows;
    setProfile(data);
    setAvailableDomains(domainRows);
    setAvailablePrimaryDomains(primaryDomainRows);
    setRelatedSecondaryDomains(data.related_secondary_domains || {});
    setForm({
      primary_specialization_domain: data.primary_specialization_domain || '',
      secondary_specialization_domain_ids: data.secondary_specialization_domain_ids || [],
      qualifications: data.qualifications || '',
      skills: data.skills || '',
      years_of_experience: data.years_of_experience ?? '',
      certifications: data.certifications || '',
      research_interests: data.research_interests || '',
      industry_experience: data.industry_experience || '',
      bio: data.bio || '',
    });
    setIsEditing(!hasSavedProfileDetails(data));
  };

  const formatErrorMessage = (payload) => {
    if (!payload) return 'Failed to save profile.';
    if (typeof payload === 'string') return payload;
    if (Array.isArray(payload)) return payload.join(', ');
    if (payload.detail) return payload.detail;
    const messages = Object.entries(payload).flatMap(([field, value]) => {
      if (Array.isArray(value)) return [`${field.replaceAll('_', ' ')}: ${value.join(', ')}`];
      if (typeof value === 'string') return [`${field.replaceAll('_', ' ')}: ${value}`];
      return [];
    });
    return messages[0] || 'Failed to save profile.';
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await academicsApi.getMyProfessionalProfile();
        await hydrateProfileData(data);
      } catch (err) {
        if (err?.response?.status === 404) {
          setFeedback({ type: 'warn', message: 'No faculty profile is linked to your account yet. Contact your admin.' });
        } else {
          setFeedback({ type: 'error', message: 'Failed to load profile.' });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.department_id]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const toggleSecondaryDomain = (domainId) => {
    if (!filteredSecondaryDomains.some((item) => String(item.id) === String(domainId))) return;
    setForm((prev) => ({
      ...prev,
      secondary_specialization_domain_ids: prev.secondary_specialization_domain_ids.includes(domainId)
        ? prev.secondary_specialization_domain_ids.filter((item) => item !== domainId)
        : [...prev.secondary_specialization_domain_ids, domainId],
    }));
  };

  const filteredSecondaryDomains = useMemo(() => {
    const primaryId = form.primary_specialization_domain;
    const allOtherDomains = availableDomains.filter((item) => String(item.id) !== String(primaryId));
    if (!primaryId) return [];
    const relatedIds = relatedSecondaryDomains[String(primaryId)] || [];
    const relatedPool = allOtherDomains.filter((item) => relatedIds.includes(String(item.id)));
    const query = secondarySearch.trim().toLowerCase();
    return relatedPool
      .filter((item) => !query || item.name?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableDomains, form.primary_specialization_domain, relatedSecondaryDomains, secondarySearch]);

  const selectedSecondaryDomains = useMemo(
    () => availableDomains.filter((item) => form.secondary_specialization_domain_ids.includes(item.id)),
    [availableDomains, form.secondary_specialization_domain_ids]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.primary_specialization_domain || form.years_of_experience === '') {
      setFeedback({ type: 'error', message: 'Primary specialization and years of experience are required before you can receive subject preferences.' });
      return;
    }
    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      const payload = { ...form };
      if (payload.years_of_experience === '') payload.years_of_experience = null;
      else payload.years_of_experience = parseInt(payload.years_of_experience, 10);
      await academicsApi.updateMyProfessionalProfile(payload);
      const refreshed = await academicsApi.getMyProfessionalProfile();
      await hydrateProfileData(refreshed);
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: formatErrorMessage(err?.response?.data) });
    } finally {
      setSaving(false);
    }
  };

  const primaryColor = user?.tenant?.primary_color || '#22D3EE';
  const completion = profile?.profile_completion || 0;
  const missingFields = Array.isArray(profile?.profile_missing_fields) ? profile.profile_missing_fields : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="p-2 rounded-xl bg-foreground/5 hover:bg-white/10 text-foreground/50 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">My Professional Profile</h1>
          <p className="text-foreground/40 text-sm mt-1">
            {profile
              ? `${profile.designation_display || 'Faculty'} · ${profile.department_name || ''} · ${profile.campus_name || ''}`
              : 'Update your professional details'}
          </p>
        </div>
      </div>

      {/* ── Identity Banner ── */}
      {profile && (
        <div className="bg-surface/60 border border-border rounded-2xl p-5 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-[#0F172A] flex-shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-foreground font-bold text-lg">{profile.user_name || user?.full_name}</p>
            <p className="text-foreground/40 text-sm">{profile.user_email || user?.email}</p>
            <p className="text-foreground/30 text-xs mt-0.5">Employee ID: {profile.employee_id || '—'}</p>
          </div>
        </div>
      )}

      {profile && (
        <div className="bg-surface/60 border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Profile Completion</p>
              <p className="text-xs text-foreground/40">Complete your profile to receive subject preferences.</p>
            </div>
            <span className="text-2xl font-black text-[var(--primary)]">{completion}%</span>
          </div>
          <div className="h-3 rounded-full bg-foreground/5 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${completion}%`, backgroundColor: primaryColor }} />
          </div>
          {missingFields.length > 0 ? (
            <p className="text-xs text-amber-400">Missing: {missingFields.join(', ').replaceAll('_', ' ')}</p>
          ) : (
            <p className="text-xs text-emerald-400">Your profile is ready for subject preference selection.</p>
          )}
        </div>
      )}

      {/* ── Feedback Banner ── */}
      {feedback.message && (
        <div className={`flex items-center gap-3 rounded-2xl p-4 border text-sm font-medium
          ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            feedback.type === 'warn' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
            'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {feedback.message}
        </div>
      )}

      {/* ── Form ── */}
      {profile && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Core Professional Info */}
          <div className="bg-surface/60 border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-foreground/30" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/30">Core Details</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Primary Specialization Domain" icon={BookOpen} required hint="This is the structured domain used for subject matching.">
                <select
                  className={inputCls}
                  disabled={!isEditing}
                  value={form.primary_specialization_domain}
                  onChange={e => {
                    const nextPrimary = e.target.value;
                    const relatedIds = relatedSecondaryDomains[String(nextPrimary)] || [];
                    setSecondarySearch('');
                    setForm((prev) => ({
                      ...prev,
                      primary_specialization_domain: nextPrimary,
                      secondary_specialization_domain_ids: prev.secondary_specialization_domain_ids.filter((item) => {
                        if (String(item) === String(nextPrimary)) return false;
                        return !relatedIds.length || relatedIds.includes(String(item));
                      }),
                    }));
                  }}
                >
                  <option value="">Select subject domain...</option>
                    {availablePrimaryDomains.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
              </Field>
              <Field label="Years of Experience" icon={Clock} required>
                <input
                  type="number"
                  min="0"
                  max="60"
                  className={inputCls}
                  disabled={!isEditing}
                  value={form.years_of_experience}
                  onChange={e => set('years_of_experience', e.target.value)}
                  placeholder="e.g. 8"
                />
              </Field>
            </div>
            <Field label="Secondary Specialization Domains" icon={BookOpen} hint="Optional matching areas related to your selected primary domain.">
              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Suggested secondary domains</p>
                      <p className="text-xs text-foreground/40">
                        {form.primary_specialization_domain
                          ? 'These options are narrowed using your selected primary domain and related programme subject mappings.'
                          : 'Select a primary domain to see the most relevant secondary domains.'}
                      </p>
                    </div>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={secondarySearch}
                      onChange={(e) => setSecondarySearch(e.target.value)}
                      placeholder="Search secondary domains..."
                      className="w-full sm:w-64 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]/60"
                    />
                  </div>
                  {selectedSecondaryDomains.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedSecondaryDomains.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!isEditing}
                          onClick={() => toggleSecondaryDomain(item.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-semibold text-foreground"
                        >
                          <span>{item.name}</span>
                          <span className="text-[var(--primary)]">×</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {filteredSecondaryDomains.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm text-foreground/40">
                    {form.primary_specialization_domain
                      ? 'No related secondary domains are mapped for the selected primary domain yet.'
                      : 'Select a primary domain to see related secondary domains.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {filteredSecondaryDomains.map((item) => {
                      const selected = form.secondary_specialization_domain_ids.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!isEditing}
                          onClick={() => toggleSecondaryDomain(item.id)}
                          className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                            selected
                              ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'
                              : 'border-border bg-background text-foreground/70 hover:border-[var(--primary)]/40 hover:bg-surface/80 hover:text-foreground'
                          } ${!isEditing ? 'opacity-70 cursor-default' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold">{item.name}</p>
                              {item.description ? <p className="text-xs text-foreground/40 mt-1 line-clamp-2">{item.description}</p> : null}
                            </div>
                            <div className={`mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 ${selected ? 'border-[var(--primary)] bg-[var(--primary)] text-[#0F172A]' : 'border-border'}`}>
                              {selected ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Qualifications" icon={Award} required hint="e.g. Ph.D. Computer Science, IIT Madras | M.Tech BITS Pilani">
              <textarea
                rows={3}
                className={inputCls}
                disabled={!isEditing}
                value={form.qualifications}
                onChange={e => set('qualifications', e.target.value)}
                placeholder="List your academic qualifications..."
              />
            </Field>
            <Field label="Skills" icon={FlaskConical} hint="Comma-separated list of key skills">
              <textarea
                rows={2}
                className={inputCls}
                disabled={!isEditing}
                value={form.skills}
                onChange={e => set('skills', e.target.value)}
                placeholder="e.g. Python, Data Analysis, Circuit Design..."
              />
            </Field>
          </div>

          {/* Research & Certifications */}
          <div className="bg-surface/60 border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-4 h-4 text-foreground/30" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/30">Research & Certifications</h2>
            </div>
            <Field label="Research Interests" icon={BookOpen} hint="Optional">
              <textarea
                rows={3}
                className={inputCls}
                disabled={!isEditing}
                value={form.research_interests}
                onChange={e => set('research_interests', e.target.value)}
                placeholder="Areas of research you are interested in or actively pursuing..."
              />
            </Field>
            <Field label="Certifications" icon={Award} hint="Optional — list any professional certifications">
              <textarea
                rows={3}
                className={inputCls}
                disabled={!isEditing}
                value={form.certifications}
                onChange={e => set('certifications', e.target.value)}
                placeholder="e.g. AWS Certified Solutions Architect, GATE 2019..."
              />
            </Field>
          </div>

          {/* Industry & Bio */}
          <div className="bg-surface/60 border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-foreground/30" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/30">Industry & Bio</h2>
            </div>
            <Field label="Industry Experience" icon={Factory} hint="Optional">
              <textarea
                rows={3}
                className={inputCls}
                disabled={!isEditing}
                value={form.industry_experience}
                onChange={e => set('industry_experience', e.target.value)}
                placeholder="Describe any prior industry experience before joining academia..."
              />
            </Field>
            <Field label="Profile Summary / Bio" icon={FileText} hint="Optional — a short professional biography">
              <textarea
                rows={4}
                className={inputCls}
                disabled={!isEditing}
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="Write a brief professional summary about yourself..."
              />
            </Field>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <div className="flex items-center gap-3">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 border border-border bg-background hover:bg-surface text-foreground font-bold px-6 py-3 rounded-xl transition-colors"
                >
                  Edit Profile
                </button>
              ) : null}
              <button
                type="submit"
                disabled={saving || !isEditing}
                className="flex items-center gap-2 bg-[var(--primary)] hover:brightness-90 text-[#0F172A] font-bold px-7 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : isEditing ? 'Save Profile' : 'Saved'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
