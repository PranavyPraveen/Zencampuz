import { useState, useEffect } from 'react';
import { superAdminApi } from '../../api/superadmin';
import { Plus, Edit2, Save, X, Trash2, Loader2, Tag, CheckSquare, AlertTriangle, Package } from 'lucide-react';

const EMPTY_FORM = {
  module_code: '',
  title: '',
  price_annual: '',
  price_monthly: '',
  is_annual_only: false,
  is_popular: false,
  features: [''],
  order: 0,
};

export default function FeaturesPricing() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // null or 'new' or module id
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getPricingModules();
      setModules(data || []);
    } catch (err) {
      console.error('Failed to fetch modules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, []);

  const startEdit = (mod) => {
    setEditingId(mod.id);
    setEditForm({
      module_code: mod.module_code,
      title: mod.title,
      price_annual: mod.price_annual,
      price_monthly: mod.price_monthly || '',
      is_annual_only: mod.is_annual_only,
      is_popular: mod.is_popular,
      features: mod.features?.length ? mod.features : [''],
      order: mod.order,
    });
  };

  const startNew = () => {
    setEditingId('new');
    setEditForm({ ...EMPTY_FORM });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ ...EMPTY_FORM });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Clean up features array
      const payload = {
        ...editForm,
        features: editForm.features.filter(f => f.trim() !== ''),
        price_monthly: editForm.is_annual_only ? null : (editForm.price_monthly || null),
      };

      if (editingId === 'new') {
        await superAdminApi.createPricingModule(payload);
      } else {
        await superAdminApi.updatePricingModule(editingId, payload);
      }
      cancelEdit();
      fetchModules();
    } catch (err) {
      console.error('Save failed:', err);
      alert(`Failed to save: ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this pricing module? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await superAdminApi.deletePricingModule(id);
      fetchModules();
    } catch (err) {
      alert('Failed to delete module.');
    } finally {
      setDeletingId(null);
    }
  };

  const addFeatureRow = () => setEditForm(f => ({ ...f, features: [...f.features, ''] }));
  const removeFeatureRow = (idx) => setEditForm(f => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));
  const updateFeature = (idx, val) => setEditForm(f => ({
    ...f,
    features: f.features.map((item, i) => i === idx ? val : item)
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  // ── Edit / Create Form ──────────────────────────────────────────────────────
  const EditForm = () => (
    <div className="bg-background border border-[#22D3EE]/30 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">{editingId === 'new' ? '✦ New Module' : 'Edit Module'}</h3>
        <button onClick={cancelEdit} className="text-muted hover:text-foreground p-1.5 rounded-lg hover:bg-surface">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">Module Code</label>
          <input
            className="mt-1 w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] font-mono"
            placeholder="e.g. mod_core"
            value={editForm.module_code}
            onChange={e => setEditForm(f => ({ ...f, module_code: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">Display Title</label>
          <input
            className="mt-1 w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
            placeholder="e.g. Core Campus Suite"
            value={editForm.title}
            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">Annual Price (₹)</label>
          <input
            type="number"
            className="mt-1 w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
            placeholder="0"
            value={editForm.price_annual}
            onChange={e => setEditForm(f => ({ ...f, price_annual: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">Monthly Price (₹)</label>
          <input
            type="number"
            disabled={editForm.is_annual_only}
            className="mt-1 w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-40"
            placeholder="0 (leave blank if annual only)"
            value={editForm.price_monthly}
            onChange={e => setEditForm(f => ({ ...f, price_monthly: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">Sort Order</label>
          <input
            type="number"
            className="mt-1 w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
            value={editForm.order}
            onChange={e => setEditForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={editForm.is_annual_only}
              onChange={e => setEditForm(f => ({ ...f, is_annual_only: e.target.checked, price_monthly: e.target.checked ? '' : f.price_monthly }))}
            />
            <span className="text-sm text-muted">Annual Only (Enterprise)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={editForm.is_popular}
              onChange={e => setEditForm(f => ({ ...f, is_popular: e.target.checked }))}
            />
            <span className="text-sm text-muted">Mark as Popular</span>
          </label>
        </div>
      </div>

      {/* Features editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">Features List</label>
          <button
            onClick={addFeatureRow}
            className="text-xs text-[var(--primary)] hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Feature
          </button>
        </div>
        <div className="space-y-2">
          {editForm.features.map((feat, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-2 text-foreground text-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
                placeholder={`Feature ${idx + 1}`}
                value={feat}
                onChange={e => updateFeature(idx, e.target.value)}
              />
              {editForm.features.length > 1 && (
                <button
                  onClick={() => removeFeatureRow(idx)}
                  className="text-muted hover:text-[#EF4444] transition-colors p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-border">
        <button onClick={cancelEdit} className="text-muted hover:text-foreground px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-colors hover:bg-surface">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#10B981] hover:bg-[#059669] text-foreground px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Module'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Features & Pricing</h2>
          <p className="text-muted mt-1">Manage public module configurations and pricing plans</p>
        </div>
        {editingId !== 'new' && (
          <button
            onClick={startNew}
            className="bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          >
            <Plus className="w-5 h-5" /> Add Module
          </button>
        )}
      </div>

      {/* Create new module form */}
      {editingId === 'new' && <EditForm />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {modules.map((mod) => (
          <div key={mod.id} className="bg-background border border-border rounded-2xl p-6 relative flex flex-col justify-between">
            {mod.is_popular && (
              <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-[#00E5FF] text-[#0F172A] text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                <Tag className="w-3 h-3" /> Popular
              </div>
            )}

            {editingId === mod.id ? (
              <EditForm />
            ) : (
              <>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[var(--primary)] font-mono text-xs mb-1 uppercase opacity-80">
                      {mod.module_code} {mod.is_annual_only && <span className="text-[#F59E0B]"> · Enterprise</span>}
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{mod.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(mod)}
                      className="text-muted hover:text-[var(--primary)] transition-colors bg-surface/50 p-2 rounded-lg border border-border"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(mod.id)}
                      disabled={deletingId === mod.id}
                      className="text-muted hover:text-[#EF4444] transition-colors bg-surface/50 p-2 rounded-lg border border-border disabled:opacity-50"
                      title="Delete Module"
                    >
                      {deletingId === mod.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex gap-8 mb-6 bg-surface/40 p-4 rounded-xl border border-border/50">
                  <div>
                    <div className="text-xs text-muted font-bold uppercase tracking-wider mb-1">Annual Plan</div>
                    <div className="text-2xl font-bold text-foreground">
                      ₹{Number(mod.price_annual).toLocaleString()} <span className="text-sm text-muted font-normal">/yr</span>
                    </div>
                  </div>
                  {!mod.is_annual_only && mod.price_monthly && (
                    <div>
                      <div className="text-xs text-muted font-bold uppercase tracking-wider mb-1">Monthly Plan</div>
                      <div className="text-lg font-bold text-[#E2E8F0] mt-1">
                        ₹{Number(mod.price_monthly).toLocaleString()} <span className="text-sm text-muted font-normal">/mo</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="border-t border-border pt-4 mt-auto">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Included Features</div>
                  {mod.features?.length > 0 ? (
                    <ul className="space-y-2">
                      {mod.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted">
                          <CheckSquare className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted text-sm flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> No features listed yet.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {modules.length === 0 && (
        <div className="text-center py-16 text-muted">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">No modules yet.</p>
          <p className="text-sm mt-1">Click "Add Module" to create your first pricing tier.</p>
        </div>
      )}
    </div>
  );
}
