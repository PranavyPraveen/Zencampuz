import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { academicsApi } from '../../api/academics';
import { 
  BookOpen, Users, Clock, MapPin, Loader2, Search,
  ChevronRight, Info, AlertCircle
} from 'lucide-react';

export default function MyAssignedCourses() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ department: '', section: '' });
  
  const primaryColor = user?.tenant?.primary_color || '#22D3EE';

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const assignmentRows = await academicsApi.getCourseSections();
        setAssignments(assignmentRows || []);
      } catch (err) {
        console.error("Failed to fetch assigned courses:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAssignments();
  }, [user]);

  const departmentOptions = useMemo(() => {
    const seen = new Map();
    assignments.forEach((item) => {
      if (item.department_id && !seen.has(String(item.department_id))) {
        seen.set(String(item.department_id), {
          id: item.department_id,
          name: item.department_name || 'Unknown Department',
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments]);

  const sectionOptions = useMemo(() => {
    const seen = new Map();
    assignments
      .filter((item) => !filters.department || String(item.department_id) === String(filters.department))
      .forEach((item) => {
        if (item.section && !seen.has(String(item.section))) {
          seen.set(String(item.section), {
            id: item.section,
            name: item.section_label || item.section_name || 'Unnamed Section',
          });
        }
      });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, filters.department]);

  const filtered = assignments.filter((item) => {
    const matchesSearch =
      item.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.course_code?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = !filters.department || String(item.department_id) === String(filters.department);
    const matchesSection = !filters.section || String(item.section) === String(filters.section);

    return matchesSearch && matchesDepartment && matchesSection;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      <p className="text-foreground/40 text-sm font-medium">Loading your assignments...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-1 bg-gradient-to-r from-transparent to-transparent rounded-full"
              style={{ background: `linear-gradient(90deg, ${primaryColor}, transparent)` }}
            />
            <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.5em]">Academic Duties</span>
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter">
            My Assigned <span style={{ color: primaryColor }}>Courses</span>
          </h1>
          <p className="text-foreground/40 font-medium max-w-xl text-sm leading-relaxed">
            View the courses assigned to you, and filter them by department or section.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
          <input 
            type="text" 
            placeholder="Search code or name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-foreground/5 border border-border rounded-2xl pl-12 pr-4 py-3 text-foreground focus:border-blue-500/50 outline-none transition-all placeholder:text-foreground/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={filters.department}
          onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value, section: '' }))}
          className="bg-foreground/5 border border-border rounded-2xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none"
        >
          <option value="">All Departments</option>
          {departmentOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>

        <select
          value={filters.section}
          onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))}
          className="bg-foreground/5 border border-border rounded-2xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none"
        >
          <option value="">All Sections</option>
          {sectionOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface shadow-sm/40 border border-border rounded-3xl p-16 text-center">
          <AlertCircle className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
          <p className="text-foreground/30 font-bold uppercase tracking-widest text-sm">No courses assigned yet.</p>
          <p className="text-foreground/20 text-xs mt-2">Your assigned courses will appear here once they are mapped to your faculty profile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(item => (
            <div key={item.id} className="group bg-surface/60 backdrop-blur-xl shadow-sm backdrop-blur-xl border border-border rounded-3xl p-6 hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 shadow-inner group-hover:bg-blue-500/20 transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-3 py-1 bg-foreground/5 border border-border rounded-full">
                    Active
                  </span>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{item.course_code}</p>
                <h3 className="text-lg font-bold text-foreground tracking-tight leading-snug">{item.course_name}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3" /> Section
                  </p>
                  <p className="text-sm font-bold text-foreground/80">{item.section_label || item.section_name || item.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Batch
                  </p>
                  <p className="text-sm font-bold text-foreground/80">{item.batch_name || '—'}</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="p-3 rounded-2xl bg-foreground/5 flex items-center justify-between group-hover:bg-white/[0.08] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5 text-foreground/40" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Campus / Dept</p>
                      <p className="text-xs font-bold text-foreground/60">{item.campus_name || 'No Campus'} • {item.department_name || 'No Department'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-foreground/20 group-hover:text-blue-400 transition-all" />
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-foreground/5 px-4 py-3">
                <p className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Enrollment</p>
                <p className="text-sm font-bold text-foreground/70 mt-1">{item.student_count || 0} Students</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-foreground/5 border border-border rounded-3xl p-6 flex gap-4 items-start">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground/80">About Assignments</p>
          <p className="text-xs text-foreground/40 leading-relaxed">
            Course assignments are managed by the Department HOD and Academic Registrar. Each assignment represents a specific section of a course you are responsible for in the current academic year.
          </p>
        </div>
      </div>
    </div>
  );
}
