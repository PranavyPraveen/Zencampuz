import { useState, useEffect } from 'react';
import { superAdminApi } from '../../api/superadmin';
import { Plus, Edit2, Ban, Power, Trash2, RefreshCw, X, Globe, Users, Calendar, Package, ChevronRight } from 'lucide-react';
import TenantFormModal from '../../components/superadmin/TenantFormModal';

// ─── Tenant Detail Side Panel ─────────────────────────────────────────────────
function TenantDetailPanel({ tenant, onClose, onEdit, onSuspend, onActivate, onDelete, onRenew }) {
  if (!tenant) return null;

  const moduleMap = [
    { key: 'has_resources', label: 'Asset Management', color: '#8B5CF6' },
    { key: 'has_bookings', label: 'Facility Bookings', color: '#10B981' },
    { key: 'has_timetable', label: 'Timetabling', color: '#F59E0B' },
    { key: 'has_exams', label: 'Exam Management', color: '#EC4899' },
    { key: 'has_reports', label: 'Analytics & Reports', color: '#3B82F6' },
    { key: 'has_notifications', label: 'Notifications', color: '#6366F1' },
    { key: 'has_asset_tagging', label: 'Asset Tagging', color: '#14B8A6' },
  ];

  const purchasedModules = moduleMap.filter(m => tenant[m.key]);
  const statusColors = {
    active: '#10B981', suspended: '#F59E0B', archived: '#EF4444'
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="relative w-full max-w-lg bg-surface border-l border-border h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h3 className="text-xl font-bold text-foreground">{tenant.tenant_name}</h3>
            <p className="text-xs text-[var(--primary)] font-mono mt-0.5">{tenant.tenant_code}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground p-2 rounded-lg hover:bg-surface transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-4 bg-background border-b border-border">
          <span
            className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
            style={{
              backgroundColor: `${statusColors[tenant.status] || '#64748B'}20`,
              color: statusColors[tenant.status] || '#64748B',
              border: `1px solid ${statusColors[tenant.status] || '#64748B'}33`
            }}>
            {tenant.status}
          </span>
        </div>

        {/* Details Grid */}
        <div className="p-6 space-y-6 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <InfoCard icon={Globe} label="Portal URL" value={tenant.subdomain ? `${tenant.subdomain}.campuzcore.com` : 'Pending'} />
            <InfoCard icon={Users} label="Total Users" value={`${tenant.user_count || 0} Users`} />
            <InfoCard icon={Calendar} label="Plan Type" value={tenant.subscription_type?.toUpperCase() || 'N/A'} />
            <InfoCard icon={Calendar} label="Expires" value={tenant.contract_end_date || 'N/A'} highlight={tenant.contract_end_date && new Date(tenant.contract_end_date) < new Date(Date.now() + 30 * 86400000)} />
          </div>

          {/* Color Theme */}
          {(tenant.primary_color || tenant.secondary_color) && (
            <div className="bg-surface/30 rounded-xl p-4 border border-border">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Branding Theme</p>
              <div className="flex gap-3 items-center">
                {tenant.primary_color && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-border shadow" style={{ backgroundColor: tenant.primary_color }} />
                    <span className="text-xs text-muted font-mono">{tenant.primary_color}</span>
                    <span className="text-[10px] text-muted">Primary</span>
                  </div>
                )}
                {tenant.secondary_color && (
                  <div className="flex items-center gap-2 ml-4">
                    <div className="w-8 h-8 rounded-lg border border-border shadow" style={{ backgroundColor: tenant.secondary_color }} />
                    <span className="text-xs text-muted font-mono">{tenant.secondary_color}</span>
                    <span className="text-[10px] text-muted">Secondary</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Purchased Modules */}
          <div className="bg-surface/30 rounded-xl p-4 border border-border">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package className="w-3.5 h-3.5" /> Purchased Modules ({purchasedModules.length}/{moduleMap.length})
            </p>
            {purchasedModules.length === 0 ? (
              <p className="text-sm text-muted">No modules purchased.</p>
            ) : (
              <div className="space-y-2">
                {purchasedModules.map(m => (
                  <div key={m.key} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-sm text-[#E2E8F0]">{m.label}</span>
                  </div>
                ))}
                {moduleMap.filter(m => !tenant[m.key]).map(m => (
                  <div key={m.key} className="flex items-center gap-2 opacity-30">
                    <div className="w-2 h-2 rounded-full bg-[#64748B]" />
                    <span className="text-sm text-muted line-through">{m.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-border grid grid-cols-2 gap-3">
          <button onClick={() => onEdit(tenant)} className="bg-surface hover:bg-[#243456] text-foreground px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            <Edit2 className="w-4 h-4" /> Edit Tenant
          </button>
          <button onClick={() => onRenew(tenant.id)} className="bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            <RefreshCw className="w-4 h-4" /> Renew (+1yr)
          </button>
          {tenant.status === 'active' ? (
            <button onClick={() => onSuspend(tenant.id)} className="bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all">
              <Ban className="w-4 h-4" /> Suspend
            </button>
          ) : (
            <button onClick={() => onActivate(tenant.id)} className="bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all">
              <Power className="w-4 h-4" /> Activate
            </button>
          )}
          <button onClick={() => onDelete(tenant.id)} className="bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, highlight }) {
  return (
    <div className="bg-surface/30 rounded-xl p-3 border border-border">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-muted" />
        <span className="text-[10px] text-muted font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${highlight ? 'text-[#EF4444]' : 'text-[#E2E8F0]'}`}>{value}</p>
    </div>
  );
}

// ─── Main Tenants Page ─────────────────────────────────────────────────────────
export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getTenants();
      setTenants(data.results || data);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleSuspend = async (id) => {
    if (!window.confirm('Are you sure you want to suspend this tenant?')) return;
    try {
      await superAdminApi.suspendTenant(id);
      setSelectedTenant(null);
      fetchTenants();
    } catch (err) { alert('Failed to suspend tenant.'); }
  };

  const handleActivate = async (id) => {
    try {
      await superAdminApi.activateTenant(id);
      setSelectedTenant(null);
      fetchTenants();
    } catch (err) { alert('Failed to activate tenant.'); }
  };

  const handleRenew = async (id) => {
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);
    try {
      await superAdminApi.updateSubscription(id, {
        contract_start_date: today.toISOString().split('T')[0],
        contract_end_date: nextYear.toISOString().split('T')[0],
        renewal_status: true
      });
      setSelectedTenant(null);
      fetchTenants();
    } catch (err) { alert('Failed to renew tenant.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('WARNING: This will permanently delete the tenant and ALL their data. This cannot be undone.')) return;
    try {
      await superAdminApi.deleteTenant(id);
      setSelectedTenant(null);
      fetchTenants();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(`Failed to delete tenant: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const handleEdit = (tenant) => {
    setSelectedTenant(null);
    setEditingTenant(tenant);
    setIsModalOpen(true);
  };

  const statusBadge = (status) => {
    switch (status) {
      case 'active': return <span className="px-2.5 py-1 bg-[#10B981]/10 text-[#10B981] rounded-full text-xs font-bold tracking-wider uppercase border border-[#10B981]/20">Active</span>;
      case 'suspended': return <span className="px-2.5 py-1 bg-[#F59E0B]/10 text-[#F59E0B] rounded-full text-xs font-bold tracking-wider uppercase border border-[#F59E0B]/20">Suspended</span>;
      case 'archived': return <span className="px-2.5 py-1 bg-[#EF4444]/10 text-[#EF4444] rounded-full text-xs font-bold tracking-wider uppercase border border-[#EF4444]/20">Archived</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Tenants</h2>
          <p className="text-muted mt-1">Manage institutions on the CampuZcore platform</p>
        </div>
        <button
          onClick={() => { setEditingTenant(null); setIsModalOpen(true); }}
          className="bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
        >
          <Plus className="w-5 h-5" />
          Add Tenant
        </button>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-muted text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Institution</th>
                <th className="px-6 py-4">Details & Modules</th>
                <th className="px-6 py-4">Subscription</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Portal</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A4A]">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-12 text-muted">Loading tenants...</td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12 text-muted">No tenants found on the platform.</td></tr>
              ) : (
                tenants.map(t => (
                  <tr
                    key={t.id}
                    className="hover:bg-surface/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedTenant(t)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-foreground font-medium">{t.tenant_name}</div>
                      <div className="text-xs text-muted">{t.user_count} Users</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[var(--primary)] font-mono text-xs mb-1.5">{t.tenant_code}</div>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {t.has_resources && <span className="px-1.5 py-0.5 bg-[#8B5CF6]/10 text-[#8B5CF6] text-[9px] rounded uppercase font-bold border border-[#8B5CF6]/20">Assets</span>}
                        {t.has_bookings && <span className="px-1.5 py-0.5 bg-[#10B981]/10 text-[#10B981] text-[9px] rounded uppercase font-bold border border-[#10B981]/20">Facils</span>}
                        {t.has_timetable && <span className="px-1.5 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] text-[9px] rounded uppercase font-bold border border-[#F59E0B]/20">T.Table</span>}
                        {t.has_exams && <span className="px-1.5 py-0.5 bg-[#EC4899]/10 text-[#EC4899] text-[9px] rounded uppercase font-bold border border-[#EC4899]/20">Exams</span>}
                        {t.has_reports && <span className="px-1.5 py-0.5 bg-[#3B82F6]/10 text-[#3B82F6] text-[9px] rounded uppercase font-bold border border-[#3B82F6]/20">Analytics</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[#E2E8F0] uppercase text-xs font-bold tracking-widest">{t.subscription_type}</div>
                      <div className="text-xs text-muted mt-1">Exp: {t.contract_end_date || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">{statusBadge(t.status)}</td>
                    <td className="px-6 py-4">
                      {t.subdomain ? (
                        <a
                          href={`http://${t.subdomain}.campuzcore.com`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-[var(--primary)] hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          {t.subdomain}.campuzcore.com
                        </a>
                      ) : (
                        <span className="text-sm text-muted">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 text-muted">
                        <button
                          onClick={e => { e.stopPropagation(); handleEdit(t); }}
                          className="hover:text-[var(--primary)] transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleRenew(t.id); }}
                          className="hover:text-[#10B981] transition-colors"
                          title="Quick Renew (1 Yr)"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        {t.status === 'active' ? (
                          <button
                            onClick={e => { e.stopPropagation(); handleSuspend(t.id); }}
                            className="hover:text-[#F59E0B] transition-colors"
                            title="Suspend"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); handleActivate(t.id); }}
                            className="hover:text-[#10B981] transition-colors"
                            title="Activate"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(t.id); }}
                          className="hover:text-[#EF4444] transition-colors"
                          title="Delete Tenant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-[#1B2A4A]" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Detail Slide Panel */}
      {selectedTenant && (
        <TenantDetailPanel
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onEdit={handleEdit}
          onSuspend={handleSuspend}
          onActivate={handleActivate}
          onDelete={handleDelete}
          onRenew={handleRenew}
        />
      )}

      <TenantFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTenants}
        initialData={editingTenant}
      />
    </div>
  );
}
