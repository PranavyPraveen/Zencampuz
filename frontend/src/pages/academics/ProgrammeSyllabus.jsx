import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Trash2 } from 'lucide-react';
import { academicsApi } from '../../api/academics';
import { useAuth } from '../../auth/AuthContext';

export default function ProgrammeSyllabus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const primaryColor = user?.tenant?.primary_color || '#22D3EE';
  const requestedProgramId = searchParams.get('program');

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const rows = await academicsApi.getPrograms(user?.department_id ? { department_id: user.department_id } : {});
      setPrograms(Array.isArray(rows) ? rows : []);
      if (Array.isArray(rows) && rows.length > 0) {
        const requestedMatch = requestedProgramId && rows.find((item) => String(item.id) === String(requestedProgramId));
        if (requestedMatch) {
          setSelectedProgramId(String(requestedMatch.id));
        } else if (!selectedProgramId) {
          setSelectedProgramId(String(rows[0].id));
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load department programmes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, [requestedProgramId]);

  const selectedProgram = useMemo(
    () => programs.find((item) => String(item.id) === String(selectedProgramId)) || null,
    [programs, selectedProgramId]
  );

  const handleDownloadTemplate = async () => {
    if (!selectedProgramId) {
      setError('Please select a programme.');
      return;
    }

    setWorking(true);
    setError('');
    setSuccess('');
    try {
      const blob = await academicsApi.downloadProgramSyllabusTemplate(selectedProgramId);
      const objectUrl = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${selectedProgram?.name || 'programme'}_syllabus_template.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setSuccess('Programme syllabus template downloaded successfully.');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to download syllabus template.');
    } finally {
      setWorking(false);
    }
  };

  const handleUploadTemplate = async () => {
    if (!selectedProgramId) {
      setError('Please select a programme.');
      return;
    }
    if (!selectedFile) {
      setError('Please choose the filled template file.');
      return;
    }

    setWorking(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const updated = await academicsApi.uploadProgramSyllabus(selectedProgramId, formData);
      setPrograms((prev) => prev.map((item) => String(item.id) === String(updated.id) ? updated : item));
      setSelectedFile(null);
      const storedCount = Number(updated.stored_subjects_count ?? 0);
      const parsedCount = Number(updated.parsed_rows_count ?? updated.syllabus_extracted_subjects?.length ?? 0);
      const duplicateCount = Number(updated.duplicate_code_rows_count ?? Math.max(parsedCount - storedCount, 0));
      setSuccess(
        duplicateCount > 0
          ? `Template uploaded successfully. ${storedCount} subjects were stored in the programme subject table. ${duplicateCount} duplicate-code row(s) were merged automatically.`
          : `Template uploaded successfully. ${storedCount} subjects were stored in the programme subject table.`
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.response?.data?.syllabus_last_error || 'Failed to upload filled template.');
    } finally {
      setWorking(false);
    }
  };

  const handleDeleteSyllabus = async () => {
    if (!selectedProgramId || !selectedProgram?.syllabus_file_url) {
      return;
    }
    const deleteFile = window.confirm(`Delete the uploaded file for ${selectedProgram.name}?`);
    if (!deleteFile) {
      return;
    }

    setWorking(true);
    setError('');
    setSuccess('');
    try {
      const updated = await academicsApi.deleteProgramSyllabus(selectedProgramId);
      setPrograms((prev) => prev.map((item) => String(item.id) === String(updated.id) ? updated : item));
      const deletedCoursesCount = updated.deleted_courses_count || 0;
      setSuccess(`Uploaded file deleted successfully. Removed ${deletedCoursesCount} structured subjects too.`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to delete uploaded file.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-foreground/25">Department Syllabus</p>
        <h1 className="text-4xl font-black text-foreground tracking-tight">Syllabus Template</h1>
        <p className="text-sm text-foreground/45">
          Download a semester-wise template for the selected programme. One sheet is created for each semester, and each subject row must include a valid Subject Domain from your department.
        </p>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : null}

      {success ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 text-green-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      ) : null}

      <div className="bg-surface/60 backdrop-blur-xl shadow-sm border border-border rounded-3xl p-8 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Programme</label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="mt-2 w-full bg-foreground/5 border border-border rounded-2xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none"
            >
              <option value="">Select Programme</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">Filled Template</label>
            <input
              type="file"
              accept=".xlsx,.xlsm,.xltx,.xltm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="mt-2 w-full bg-foreground/5 border border-border rounded-2xl px-4 py-3 text-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--primary)]/15 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--primary)]"
            />
            {selectedFile ? (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400"
              >
                <Trash2 className="w-4 h-4" />
                Remove Selected File
              </button>
            ) : null}
          </div>
        </div>

        {selectedProgram ? (
          <div className="rounded-2xl bg-foreground/5 border border-border px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-base font-bold text-foreground">{selectedProgram.name}</p>
              <p className="text-xs text-foreground/35 mt-1">{selectedProgram.department_name} • {selectedProgram.campus_name}</p>
              <p className="text-xs text-foreground/45 mt-2">Template sheets: {selectedProgram.total_semesters || 0}</p>
            </div>
            <div className="text-right">
              <div className="mt-3 flex flex-col items-end gap-3">
                {selectedProgram.syllabus_file_url ? (
                  <a href={selectedProgram.syllabus_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">
                    <FileText className="w-4 h-4" />
                    Open Uploaded File
                  </a>
                ) : null}
                {selectedProgram.syllabus_file_url ? (
                  <button
                    type="button"
                    onClick={handleDeleteSyllabus}
                    disabled={working}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Uploaded File
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-dashed border-border bg-foreground/5 px-5 py-4 text-sm text-foreground/45">
          The template includes one sheet per semester with required subject columns, including Subject Domain. Create or update department domains before uploading the filled template.
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/academics/subject-domains')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-foreground/5 px-5 py-3 font-bold text-foreground"
          >
            Manage Subject Domains
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={working || !selectedProgramId}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold text-[#0F172A] disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Template
          </button>
          <button
            type="button"
            onClick={handleUploadTemplate}
            disabled={working || !selectedProgramId || !selectedFile}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-foreground/5 px-5 py-3 font-bold text-foreground disabled:opacity-60"
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Upload Filled Template
          </button>
          {selectedProgramId ? (
            <button
              type="button"
              onClick={() => navigate(`/academics/programme-subjects?program=${selectedProgramId}`)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-foreground/5 px-5 py-3 font-bold text-foreground"
            >
              View Programme Subjects
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
