import { useState } from 'react';
import { resourcesApi } from '../../api/resources';
import { UploadCloud, FileSpreadsheet, Check, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ResourceBulkUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const data = await resourcesApi.bulkUploadAssets(formData);
      setResult({ success: true, message: data.message, errors: data.errors });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Upload failed.', errors: [] });
    } finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const csv = "resource_code,name,category_name,quantity_total,unit_type\nLAB-01-SYS-001,Dell Desktop PC,IT Asset,10,system\nSPORT-BKT-001,Basketball Set,Sports Equipment,5,set";
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'campuzcore_resources_template.csv';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex gap-4 items-center">
        <button onClick={() => navigate('/resources/assets')} className="p-2 bg-surface/50 hover:bg-surface rounded-xl text-muted"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Resource Bulk Import</h2>
          <p className="text-muted mt-1">Mass upload assets, equipment, and instruments via CSV</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-background border border-border p-8 rounded-3xl">
          <h3 className="text-xl font-bold text-foreground mb-4">CSV Instructions</h3>
          <ul className="text-muted space-y-3 text-sm mb-8">
            <li className="flex gap-3"><div className="mt-1 w-1.5 h-1.5 bg-[var(--primary)] rounded-full shrink-0" /> Required: <strong>resource_code</strong>, <strong>name</strong>, <strong>category_name</strong></li>
            <li className="flex gap-3"><div className="mt-1 w-1.5 h-1.5 bg-[var(--primary)] rounded-full shrink-0" /> <strong>category_name</strong> must match an existing category exactly</li>
            <li className="flex gap-3"><div className="mt-1 w-1.5 h-1.5 bg-[var(--primary)] rounded-full shrink-0" /> <strong>unit_type</strong>: unit, seat, system, instrument, kit, pair</li>
          </ul>
          <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 bg-surface border border-border hover:bg-surface/50 text-muted px-4 py-3 rounded-xl font-semibold">
            <FileSpreadsheet className="w-5 h-5 text-[#10B981]" /> Download Template
          </button>
        </div>

        <div className="bg-background border border-border p-8 rounded-3xl flex flex-col items-center justify-center text-center">
          {!file ? (
            <>
              <div className="w-20 h-20 bg-surface/50 rounded-full flex items-center justify-center mb-6 border border-[#2563EB]/30">
                <UploadCloud className="w-10 h-10 text-[#2563EB]" />
              </div>
              <p className="text-foreground font-bold mb-2">Upload CSV File</p>
              <p className="text-sm text-muted mb-6">UTF-8 encoded CSV only</p>
              <label className="cursor-pointer bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-8 py-3 rounded-xl font-bold">
                Choose File
                <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setResult(null); } }} />
              </label>
            </>
          ) : (
            <div className="w-full">
              <div className="flex items-center gap-4 p-4 bg-surface/30 border border-border rounded-xl mb-6">
                <FileSpreadsheet className="w-8 h-8 text-[var(--primary)]" />
                <div className="text-left flex-1">
                  <p className="text-foreground font-bold truncate">{file.name}</p>
                  <p className="text-xs text-muted">{Math.round(file.size / 1024)} KB</p>
                </div>
                <button onClick={() => setFile(null)} className="text-[#EF4444] text-xs font-bold">Remove</button>
              </div>
              <button onClick={handleUpload} disabled={uploading} className="w-full bg-[var(--primary)] text-[#0F172A] py-4 rounded-xl font-bold disabled:opacity-50">
                {uploading ? 'Processing...' : 'Start Import'}
              </button>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className={`p-6 rounded-2xl border ${result.success ? 'bg-[#10B981]/10 border-[#10B981]/30' : 'bg-[#EF4444]/10 border-[#EF4444]/30'}`}>
          <div className="flex items-center gap-3 mb-4">
            {result.success ? <Check className="text-[#10B981] w-6 h-6" /> : <AlertTriangle className="text-[#EF4444] w-6 h-6" />}
            <h4 className={`font-bold text-lg ${result.success ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{result.success ? 'Import Complete' : 'Import Failed'}</h4>
          </div>
          <p className="text-foreground">{result.message}</p>
          {result.errors?.length > 0 && (
            <div className="mt-4 bg-background rounded-xl p-4 max-h-40 overflow-y-auto border border-border">
              {result.errors.map((e, i) => <p key={i} className="text-[#F59E0B] font-mono text-xs">{e}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
