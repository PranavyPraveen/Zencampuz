import { useState, useEffect } from 'react';
import { reportsApi } from '../../api/reports';
import { FileDown, Users, Layers, Activity, CalendarDays, Search } from 'lucide-react';

export default function ReportsDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [roomData, setRoomData] = useState([]);
  const [facultyData, setFacultyData] = useState([]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Derived lists for dropdowns
  const buildings = [...new Set(roomData.map(r => r.building).filter(Boolean))].sort();
  const departments = [...new Set(facultyData.map(f => f.department).filter(Boolean))].sort();

  // Filter implementation
  const filteredRooms = roomData.filter(r => {
    const s = searchQuery.toLowerCase();
    const matchSearch = r.room_number.toLowerCase().includes(s) || r.type.toLowerCase().includes(s);
    const matchBldg = buildingFilter ? r.building === buildingFilter : true;
    return matchSearch && matchBldg;
  });

  const filteredFaculty = facultyData.filter(f => {
    const s = searchQuery.toLowerCase();
    const matchSearch = f.faculty_name.toLowerCase().includes(s);
    const matchDept = deptFilter ? f.department === deptFilter : true;
    return matchSearch && matchDept;
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [sum, rooms, fac] = await Promise.all([
        reportsApi.getSystemSummary(),
        reportsApi.getRoomUtilization(),
        reportsApi.getFacultyWorkload()
      ]);
      setSummary(sum);
      setRoomData(rooms);
      setFacultyData(fac);
      setLoading(false);
    };
    load();
  }, []);

  const exportCSV = (data, filename) => {
    if(!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${(row[h]+'').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  if (loading) return null;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
         <div>
           <h2 className="text-3xl font-bold text-foreground">Campus Reports & Analytics</h2>
           <p className="text-muted mt-1">Unified view of Resource Utilization and Workloads.</p>
         </div>
         <button onClick={() => window.print()} className="bg-surface text-foreground px-5 py-2.5 rounded-xl font-bold hover:bg-[#2A3A6A] transition-colors flex items-center gap-2">
           Print Dashboard
         </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-background border border-border p-6 rounded-3xl flex items-center gap-4">
            <div className="p-4 bg-[var(--primary)]/10 text-[var(--primary)] rounded-2xl"><Users className="w-8 h-8" /></div>
            <div><p className="text-muted text-sm font-bold uppercase tracking-wider">Active Faculty</p><p className="text-3xl font-black text-foreground mt-1">{summary.active_faculty}</p></div>
         </div>
         <div className="bg-background border border-border p-6 rounded-3xl flex items-center gap-4">
            <div className="p-4 bg-[#A855F7]/10 text-[#A855F7] rounded-2xl"><Layers className="w-8 h-8" /></div>
            <div><p className="text-muted text-sm font-bold uppercase tracking-wider">Total Rooms</p><p className="text-3xl font-black text-foreground mt-1">{summary.total_rooms}</p></div>
         </div>
         <div className="bg-background border border-border p-6 rounded-3xl flex items-center gap-4">
            <div className="p-4 bg-[#F59E0B]/10 text-[#F59E0B] rounded-2xl"><CalendarDays className="w-8 h-8" /></div>
            <div><p className="text-muted text-sm font-bold uppercase tracking-wider">Pending Bookings</p><p className="text-3xl font-black text-foreground mt-1">{summary.pending_bookings}</p></div>
         </div>
         <div className="bg-background border border-border p-6 rounded-3xl flex items-center gap-4">
            <div className="p-4 bg-[#10B981]/10 text-[#10B981] rounded-2xl"><Activity className="w-8 h-8" /></div>
            <div><p className="text-muted text-sm font-bold uppercase tracking-wider">System Health</p><p className="text-3xl font-black text-foreground mt-1">100%</p></div>
         </div>
      </div>

      {/* Global Dashboard Controls */}
      <div className="flex flex-col md:flex-row gap-4 bg-background p-4 rounded-2xl border border-border">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Search Rooms or Faculty globally..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface text-foreground border border-border rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] transition-colors"
            />
          </div>
          <select 
            value={buildingFilter} 
            onChange={e => setBuildingFilter(e.target.value)}
            className="w-full md:w-64 bg-surface text-foreground border border-border rounded-xl px-4 py-2 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] transition-colors"
          >
             <option value="">All Buildings</option>
             {buildings.map(b => (
                <option key={b} value={b}>{b}</option>
             ))}
          </select>
          <select 
            value={deptFilter} 
            onChange={e => setDeptFilter(e.target.value)}
            className="w-full md:w-64 bg-surface text-foreground border border-border rounded-xl px-4 py-2 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] transition-colors"
          >
             <option value="">All Departments</option>
             {departments.map(d => (
                <option key={d} value={d}>{d}</option>
             ))}
          </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
         {/* Room Utilization */}
         <div className="bg-background border border-border rounded-3xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface">
               <h3 className="text-xl font-bold text-foreground flex items-center gap-2">Room Utilization Matrix</h3>
               <button onClick={() => exportCSV(filteredRooms, 'room_utilization.csv')} className="text-[var(--primary)] font-bold text-sm flex items-center gap-1 hover:underline"><FileDown className="w-4 h-4"/> CSV</button>
            </div>
            <div className="p-6 overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="text-muted text-sm border-b border-border">
                        <th className="pb-3 font-bold">Room</th>
                        <th className="pb-3 font-bold">Type</th>
                        <th className="pb-3 font-bold text-right">Weekly Classes</th>
                        <th className="pb-3 font-bold text-right">Exam Sessions</th>
                        <th className="pb-3 font-bold text-right">Misc Bookings</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B2A4A]">
                     {filteredRooms.map(r => (
                       <tr key={r.room_id} className="text-muted">
                          <td className="py-4 font-bold text-foreground flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${120 - (r.utilization_score/100 * 120)}, 70%, 50%)`}}></span>
                            {r.room_number} <span className="text-xs text-muted font-mono">({r.capacity}p)</span>
                          </td>
                          <td className="py-4">
                            <div>{r.type}</div>
                            <div className="text-xs text-muted">{r.building}</div>
                          </td>
                          <td className="py-4 text-right font-mono text-[var(--primary)]">{r.weekly_classes}</td>
                          <td className="py-4 text-right font-mono text-[#F59E0B]">{r.exam_sessions}</td>
                          <td className="py-4 text-right font-mono text-[#A855F7]">{r.one_off_bookings}</td>
                       </tr>
                     ))}
                     {filteredRooms.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-muted">No rooms recorded</td></tr>}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Faculty Workload */}
         <div className="bg-background border border-border rounded-3xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface">
               <h3 className="text-xl font-bold text-foreground flex items-center gap-2">Faculty Workload Distribution</h3>
               <button onClick={() => exportCSV(filteredFaculty, 'faculty_workload.csv')} className="text-[var(--primary)] font-bold text-sm flex items-center gap-1 hover:underline"><FileDown className="w-4 h-4"/> CSV</button>
            </div>
            <div className="p-6 overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="text-muted text-sm border-b border-border">
                        <th className="pb-3 font-bold">Faculty Name</th>
                        <th className="pb-3 font-bold">Department</th>
                        <th className="pb-3 font-bold text-right">Class Units</th>
                        <th className="pb-3 font-bold text-right">Invigilation Slots</th>
                        <th className="pb-3 font-bold text-right">Load Score</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B2A4A]">
                     {filteredFaculty.map(f => (
                       <tr key={f.faculty_name} className="text-muted">
                          <td className="py-4 font-bold text-foreground">{f.faculty_name}</td>
                          <td className="py-4 text-sm">{f.department}</td>
                          <td className="py-4 text-right font-mono text-[var(--primary)]">{f.weekly_teaching_units}</td>
                          <td className="py-4 text-right font-mono text-[#EF4444]">{f.exam_invigilations}</td>
                          <td className="py-4 text-right font-mono text-foreground font-bold">{f.total_load_score}</td>
                       </tr>
                     ))}
                     {filteredFaculty.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-muted">No faculty recorded</td></tr>}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
      
    </div>
  );
}
