import { useState, useEffect } from 'react';
import { superAdminApi } from '../../api/superadmin';
import { Loader2, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

export default function TenantReports() {
  const [data, setData] = useState({ active_tenants: [], expiring_tenants: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await superAdminApi.getTenantReports();
        setData(res || { active_tenants: [], expiring_tenants: [] });
      } catch (err) {
        console.error("Failed to fetch reports", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) {
     return (
        <div className="flex justify-center items-center h-64">
           <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
        </div>
     );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground tracking-tight">Tenant Analytics & Reports</h2>
        <p className="text-muted mt-1">Review active subscriptions and identify upcoming renewals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#10B981]/10 border border-[#10B981]/30 p-6 rounded-2xl flex items-center justify-between">
            <div>
                <p className="text-[#10B981] text-sm font-bold uppercase tracking-wider mb-1">Active Tenants</p>
                <h3 className="text-4xl font-black text-foreground">{data.active_tenants.length}</h3>
            </div>
            <TrendingUp className="w-12 h-12 text-[#10B981] opacity-50" />
        </div>
        
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 p-6 rounded-2xl flex items-center justify-between">
            <div>
                <p className="text-[#EF4444] text-sm font-bold uppercase tracking-wider mb-1">Expiring (&lt;= 30 Days)</p>
                <h3 className="text-4xl font-black text-foreground">{data.expiring_tenants.length}</h3>
            </div>
            <AlertTriangle className="w-12 h-12 text-[#EF4444] opacity-50" />
        </div>
      </div>

      {data.expiring_tenants.length > 0 && (
          <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#EF4444]/10 border-b border-[#EF4444]/20 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                <h3 className="font-bold text-[#EF4444]">Action Required: Upcoming Renewals</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-surface/50 text-muted text-xs font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Institution</th>
                            <th className="px-6 py-4">Plan</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Expiry Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1B2A4A] text-sm">
                        {data.expiring_tenants.map(t => (
                            <tr key={t.id} className="hover:bg-background transition-colors">
                                <td className="px-6 py-4 text-foreground font-medium">{t.tenant_name}</td>
                                <td className="px-6 py-4 text-[var(--primary)] uppercase tracking-wider text-xs font-bold">{t.subscription_type}</td>
                                <td className="px-6 py-4"><span className="px-2 py-1 bg-[#EF4444]/10 text-[#EF4444] text-[10px] rounded uppercase font-bold tracking-wider">Expiring Soon</span></td>
                                <td className="px-6 py-4 text-[#EF4444] font-mono font-bold animate-pulse">{t.contract_end_date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
      )}

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
            <h3 className="font-bold text-foreground">All Active Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-surface/50 text-muted text-xs font-semibold uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Institution</th>
                        <th className="px-6 py-4">Code</th>
                        <th className="px-6 py-4">Plan</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Expiry Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#1B2A4A] text-sm">
                    {data.active_tenants.map(t => (
                        <tr key={t.id} className="hover:bg-background transition-colors">
                            <td className="px-6 py-4 text-foreground font-medium">{t.tenant_name}</td>
                            <td className="px-6 py-4 text-muted font-mono">{t.tenant_code}</td>
                            <td className="px-6 py-4 text-[var(--primary)] uppercase tracking-wider text-xs font-bold">{t.subscription_type}</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 bg-[#10B981]/10 text-[#10B981] text-[10px] rounded uppercase font-bold tracking-wider">Active</span></td>
                            <td className="px-6 py-4 text-[#E2E8F0] font-mono">{t.contract_end_date || 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
}
