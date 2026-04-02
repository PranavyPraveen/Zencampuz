import { useState, useEffect } from 'react';
import { superAdminApi } from '../../api/superadmin';
import { X, Building, Save, AlertCircle } from 'lucide-react';
import PasswordInput from '../common/PasswordInput';

export default function TenantFormModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const [formData, setFormData] = useState({
    tenant_name: '',
    tenant_code: '',
    subscription_type: 'monthly',
    contract_start_date: '',
    contract_end_date: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  
  const [modules, setModules] = useState({
    has_resources: false,
    has_bookings: false,
    has_timetable: false,
    has_exams: false,
    has_reports: false,
    has_notifications: false,
    has_asset_tagging: false,
  });

  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData({
        tenant_name: initialData.tenant_name || '',
        tenant_code: initialData.tenant_code || '',
        subscription_type: initialData.subscription_type || 'monthly',
        contract_start_date: initialData.contract_start_date || '',
        contract_end_date: initialData.contract_end_date || '',
        // Admin details are creation-only usually, leave blank for edit
      });
      setModules({
        has_resources: !!initialData.has_resources,
        has_bookings: !!initialData.has_bookings,
        has_timetable: !!initialData.has_timetable,
        has_exams: !!initialData.has_exams,
        has_reports: !!initialData.has_reports,
        has_notifications: !!initialData.has_notifications,
        has_asset_tagging: !!initialData.has_asset_tagging,
      });
    } else {
      setFormData({
        tenant_name: '', tenant_code: '', subscription_type: 'monthly',
        contract_start_date: '', contract_end_date: '',
        admin_name: '', admin_email: '', admin_password: ''
      });
      setModules({
        has_resources: false, has_bookings: false, has_timetable: false,
        has_exams: false, has_reports: false, has_notifications: false, has_asset_tagging: false
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleModuleToggle = (m) => setModules({ ...modules, [m]: !modules[m] });

  const slugPreview = formData.tenant_name 
    ? formData.tenant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') 
    : 'institution';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        // 1. Update basic info & subscription
        await superAdminApi.updateTenant(initialData.id, {
          tenant_name: formData.tenant_name,
          tenant_code: formData.tenant_code,
        });
        await superAdminApi.updateSubscription(initialData.id, {
          subscription_type: formData.subscription_type,
          contract_start_date: formData.contract_start_date || null,
          contract_end_date: formData.contract_end_date || null,
        });
        // 2. Toggle modules
        await superAdminApi.toggleModules(initialData.id, modules);
      } else {
        // Create completely new
        const payload = {
          tenant_details: {
            name: formData.tenant_name,
            code: formData.tenant_code,
          },
          subscription_type: formData.subscription_type,
          contract_start_date: formData.contract_start_date || null,
          contract_end_date: formData.contract_end_date || null,
          ...modules,
          admin_details: {
            name: formData.admin_name,
            email: formData.admin_email,
            password: formData.admin_password
          }
        };
        await superadminApi.createTenant(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert("Error saving tenant details. Check console.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building className="w-5 h-5 text-[var(--primary)]" />
            {isEditing ? 'Edit Tenant' : 'Provision New Tenant'}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="tenantForm" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Institution Details */}
            <div>
              <h4 className="text-sm font-bold text-[var(--primary)] uppercase tracking-wider mb-4 border-b border-border pb-2">Institution Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Organization Name</label>
                  <input required name="tenant_name" value={formData.tenant_name} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]/50 transition-colors" placeholder="e.g. Zen University" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Institution Code</label>
                  <input required name="tenant_code" value={formData.tenant_code} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]/50 transition-colors" placeholder="e.g. ZEN-01" />
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-[var(--primary)]/5 border border-[#22D3EE]/20 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--primary)]" />
                <div>
                  <p className="text-xs text-[var(--primary)] font-medium">Portal URL Preview</p>
                  <p className="text-sm text-foreground font-mono break-all">https://{slugPreview}.campuzcore.com</p>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div>
              <h4 className="text-sm font-bold text-[#8B5CF6] uppercase tracking-wider mb-4 border-b border-border pb-2">Subscription & Contract</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Billing Cycle</label>
                  <select name="subscription_type" value={formData.subscription_type} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-[#8B5CF6]/50 transition-colors">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Start Date</label>
                  <input type="date" name="contract_start_date" value={formData.contract_start_date} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-[#E2E8F0] focus:outline-none focus:border-[#8B5CF6]/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">End Date</label>
                  <input type="date" name="contract_end_date" value={formData.contract_end_date} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-[#E2E8F0] focus:outline-none focus:border-[#8B5CF6]/50" />
                </div>
              </div>
            </div>

            {/* Modules */}
            <div>
              <h4 className="text-sm font-bold text-[#10B981] uppercase tracking-wider mb-4 border-b border-border pb-2">Enabled Modules</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.keys(modules).map(modKey => (
                  <label key={modKey} className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl cursor-pointer hover:border-[#10B981]/30 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={modules[modKey]} 
                      onChange={() => handleModuleToggle(modKey)}
                      className="w-4 h-4 rounded text-[#10B981] focus:ring-[#10B981] bg-surface border-border"
                    />
                    <span className="text-sm text-foreground capitalize">{modKey.replace('has_', '').replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Admin User (Only on creation for simplicity right now) */}
            {!isEditing && (
              <div>
                <h4 className="text-sm font-bold text-[#F59E0B] uppercase tracking-wider mb-4 border-b border-border pb-2">First Admin Account</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted mb-1">Admin Full Name</label>
                    <input required name="admin_name" value={formData.admin_name} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-[#F59E0B]/50" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Admin Email</label>
                    <input required type="email" name="admin_email" value={formData.admin_email} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-[#F59E0B]/50" placeholder="admin@university.edu" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Admin Password</label>
                  <PasswordInput 
                    value={formData.admin_password} 
                    onChange={(v) => handleChange({ target: { name: 'admin_password', value: v } })} 
                    name="admin_password"
                    required 
                  />
                  <p className="text-xs text-muted mt-1.5 flex items-center gap-1">
              </p></div>
                </div>
              </div>
            )}

          </form>
        </div>

        <div className="p-4 border-t border-border bg-surface flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-muted hover:text-foreground transition-colors">
            Cancel
          </button>
          <button 
            type="submit" 
            form="tenantForm" 
            disabled={saving}
            className="bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Provision Tenant'}
          </button>
        </div>

      </div>
    </div>
  );
}
