import { useState } from 'react';
import { campusApi } from '../../api/campus';
import { UploadCloud, FileSpreadsheet, Check, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BulkUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await campusApi.bulkUploadRooms(formData);
      setResult({ success: true, message: data.message, errors: data.errors });
    } catch (err) {
      setResult({ 
        success: false, 
        message: err.response?.data?.error || "An unexpected error occurred during upload.",
        errors: []
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "building_code,floor_number,room_number,room_type_code,capacity\nBLD-A,1,101,classroom,40\nBLD-B,0,G05,lab,25";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "campuzcore_rooms_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex gap-4 items-center">
            <button onClick={() => navigate('/campus/rooms')} className="p-2 bg-surface/50 hover:bg-surface rounded-xl text-muted transition-colors">
                <ArrowLeft className="w-5 h-5"/>
            </button>
            <div>
              <h2 className="text-3xl font-bold text-foreground tracking-tight">Bulk Pipeline</h2>
              <p className="text-muted mt-1">Mass import rooms directly into the campus topology</p>
            </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-background border border-border p-8 rounded-3xl">
             <h3 className="text-xl font-bold text-foreground mb-4">Instructions</h3>
             <ul className="text-muted space-y-3 mb-8 text-sm leading-relaxed">
                 <li className="flex gap-3"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0" /> Ensure Buildings and Floors exist in the system first. Buildings are matched by <strong>building_code</strong>.</li>
                 <li className="flex gap-3"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0" /> Floors are matched by <strong>floor_number</strong> under the specified building.</li>
                 <li className="flex gap-3"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0" /> Valid <strong>room_type_code</strong> values include: classroom, lab, auditorium, seminar_hall.</li>
             </ul>
             <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 bg-surface border border-border hover:bg-surface/50 text-muted px-4 py-3 rounded-xl transition-all font-semibold">
                 <FileSpreadsheet className="w-5 h-5 text-[#10B981]"/> Download CSV Template
             </button>
          </div>

          <div className="bg-background border border-border p-8 rounded-3xl flex flex-col items-center justify-center text-center">
             
             {!file ? (
                 <>
                    <div className="w-20 h-20 bg-surface/50 rounded-full flex items-center justify-center mb-6 border border-[#2563EB]/30">
                        <UploadCloud className="w-10 h-10 text-[#2563EB]" />
                    </div>
                    <p className="text-foreground font-bold mb-2">Upload Data File</p>
                    <p className="text-sm text-muted mb-6">CSV UTF-8 format only</p>
                    <label className="cursor-pointer bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-8 py-3 rounded-xl font-bold transition-colors">
                        Choose File
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                    </label>
                 </>
             ) : (
                 <div className="w-full">
                     <div className="flex items-center gap-4 p-4 bg-surface/30 border border-border rounded-xl mb-6">
                         <FileSpreadsheet className="w-8 h-8 text-[var(--primary)]" />
                         <div className="text-left flex-1 min-w-0">
                             <p className="text-foreground font-bold truncate">{file.name}</p>
                             <p className="text-xs text-muted">{Math.round(file.size / 1024)} KB</p>
                         </div>
                         <button onClick={() => setFile(null)} className="text-[#EF4444] text-xs font-bold uppercase hover:underline">Remove</button>
                     </div>
                     <button 
                        onClick={handleUpload} 
                        disabled={uploading}
                        className="w-full bg-[var(--primary)] hover:brightness-90 text-[#0F172A] px-6 py-4 rounded-xl font-bold transition-all disabled:opacity-50"
                     >
                         {uploading ? 'Processing Architecture...' : 'Commence Upload'}
                     </button>
                 </div>
             )}
          </div>
      </div>

      {result && (
          <div className={`p-6 rounded-2xl border ${result.success ? 'bg-[#10B981]/10 border-[#10B981]/30' : 'bg-[#EF4444]/10 border-[#EF4444]/30'}`}>
              <div className="flex items-center gap-3 mb-4">
                  {result.success ? <Check className="text-[#10B981] w-6 h-6"/> : <AlertTriangle className="text-[#EF4444] w-6 h-6"/>}
                  <h4 className={`text-lg font-bold ${result.success ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {result.success ? 'Upload Complete' : 'Upload Failed'}
                  </h4>
              </div>
              <p className="text-foreground font-medium mb-4">{result.message}</p>
              
              {result.errors && result.errors.length > 0 && (
                  <div className="bg-background rounded-xl p-4 max-h-60 overflow-y-auto border border-border">
                      <p className="text-xs uppercase font-bold text-muted mb-2">Error Log</p>
                      <ul className="space-y-1 text-sm text-[#F59E0B] font-mono">
                          {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                  </div>
              )}
          </div>
      )}
    </div>
  );
}
