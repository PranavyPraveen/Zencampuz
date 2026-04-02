import { useState } from 'react';
import { academicsApi } from '../../api/academics';
import { UploadCloud, CheckCircle, AlertCircle, FileText } from 'lucide-react';

function UploadCard({ title, templateCols, onUpload }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setResult(null);
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await onUpload(fd);
      setResult({ success: true, message: r.message, errors: r.errors });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Upload failed.' });
    } finally { setLoading(false); setFile(null); }
  };

  return (
    <div className="bg-background border border-border rounded-3xl p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2"><FileText className="w-5 h-5 text-[var(--primary)]" /> {title}</h3>
          <p className="text-xs text-muted mt-1">Expected columns: <span className="text-muted font-mono">{templateCols}</span></p>
        </div>
      </div>
      <div className="p-4 border-2 border-dashed border-border rounded-2xl bg-surface text-center">
        <input type="file" accept=".csv" className="hidden" id={`file-${title}`} onChange={e => setFile(e.target.files[0])} />
        <label htmlFor={`file-${title}`} className="cursor-pointer flex flex-col items-center justify-center p-4">
          <UploadCloud className={`w-8 h-8 mb-2 ${file ? 'text-[#10B981]' : 'text-muted'}`} />
          <span className="text-sm font-bold text-foreground">{file ? file.name : 'Select CSV File'}</span>
          {!file && <span className="text-xs text-muted mt-1">Click to browse</span>}
        </label>
      </div>
      <button onClick={handleUpload} disabled={!file || loading} className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 ${file && !loading ? 'bg-[var(--primary)] text-[#0F172A] hover:brightness-90' : 'bg-surface/50 text-muted cursor-not-allowed'}`}>
        {loading ? 'Processing...' : 'Upload & Import'}
      </button>

      {result && (
        <div className={`p-4 rounded-xl text-sm border ${result.success ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]' : 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]'}`}>
          <p className="font-bold flex items-center gap-2">
            {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {result.message}
          </p>
          {result.errors?.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-foreground bg-background p-2 rounded max-h-32 overflow-y-auto font-mono">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function AcademicBulkUpload() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-3xl font-bold text-foreground tracking-tight">Academic Bulk Upload</h2>
        <p className="text-muted mt-1">Quickly populate standard academic data using CSV files</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadCard title="Courses Master Data" templateCols="code, name, course_type, credits, department_code, [lecture_hours], [tutorial_hours], [practical_hours], [is_elective]" onUpload={academicsApi.bulkUploadCourses} />
        <UploadCard title="Faculty Profiles" templateCols="email, employee_id, department_code, designation, [specialization], [max_weekly_hours], [qualifications]" onUpload={academicsApi.bulkUploadFaculty} />
      </div>
    </div>
  );
}
