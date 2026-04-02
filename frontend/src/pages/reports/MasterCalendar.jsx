import { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { reportsApi } from '../../api/reports';
import { Filter } from 'lucide-react';

const localizer = momentLocalizer(moment);

const EVENT_COLORS = {
  booking: '#F59E0B',  // Amber
  class: '#22D3EE',    // Cyan
  exam: '#EF4444'      // Red
};

export default function MasterCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date Range state for the API
  const [dateRange, setDateRange] = useState(() => {
    // Default to a 2 month window around today
    const start = moment().subtract(1, 'month').startOf('month');
    const end = moment().add(1, 'month').endOf('month');
    return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') };
  });

  // Client-side Filters
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, BOOKING, CLASS, EXAM

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const data = await reportsApi.getUnifiedCalendar({
          start_date: dateRange.start,
          end_date: dateRange.end
        });
        
        // Parse ISO strings back into JS Dates for react-big-calendar
        const parsed = data.map(evt => ({
          ...evt,
          start: new Date(evt.start),
          end: new Date(evt.end),
        }));
        
        setEvents(parsed);
      } catch (err) {
        console.error("Failed to load calendar", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [dateRange]);

  // Handle calendar navigation to fetch new chunks of data if they go too far out
  const handleNavigate = (newDate) => {
    // Check if newDate is near the edge of our currently loaded range
    const d = moment(newDate);
    const rs = moment(dateRange.start);
    const re = moment(dateRange.end);
    
    // If they scrolled out of bounds, expand the window
    if (d.isBefore(rs.add(1, 'week')) || d.isAfter(re.subtract(1, 'week'))) {
       setDateRange({
         start: d.clone().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
         end: d.clone().add(1, 'month').endOf('month').format('YYYY-MM-DD')
       });
    }
  };

  const filteredEvents = events.filter(e => typeFilter === 'ALL' ? true : e.type.toUpperCase() === typeFilter);

  // Custom Event Styling
  const eventPropGetter = (event) => {
    return {
      style: {
        backgroundColor: EVENT_COLORS[event.type] || 'var(--bg-surface)',
        border: 'none',
        borderRadius: '4px',
        color: event.type === 'class' ? 'var(--bg-main)' : '#FFFFFF',
        fontWeight: 'bold',
        fontSize: '11px',
        opacity: 0.9,
      }
    };
  };

  const CustomEvent = ({ event }) => (
    <div title={`${event.title}\nLoc: ${event.location}\nWith: ${event.attendees}`}>
      <strong>{event.title}</strong>
      <div className="text-[9px] opacity-80 truncate">{event.location}</div>
    </div>
  );

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
       <div className="flex justify-between items-center shrink-0">
         <div>
           <h2 className="text-3xl font-bold text-foreground">Unified Master Calendar</h2>
           <p className="text-muted mt-1">Global view of all Classes, Exams, and Facility Bookings.</p>
         </div>
         
         <div className="flex items-center gap-4 bg-background border border-border px-4 py-2 rounded-xl">
           <Filter className="w-4 h-4 text-muted" />
           <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent text-foreground font-bold outline-none cursor-pointer"
           >
              <option value="ALL">All Event Types</option>
              <option value="CLASS">Regular Classes</option>
              <option value="EXAM">Exam Sessions</option>
              <option value="BOOKING">Facility Bookings</option>
           </select>
         </div>
       </div>

       {/* Calendar Container */}
       <div className="flex-1 bg-surface rounded-3xl overflow-hidden p-6 border border-border shadow-2xl z-0 master-calendar-override">
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            defaultView={Views.WEEK}
            onNavigate={handleNavigate}
            eventPropGetter={eventPropGetter}
            components={{
              event: CustomEvent
            }}
            popup
            selectable
            className="rounded-xl overflow-hidden text-sm"
          />
       </div>

       {loading && (
          <div className="fixed top-24 right-8 bg-[var(--primary)] text-[#0F172A] px-4 py-2 rounded-xl font-bold font-mono tracking-widest text-xs animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.5)] z-50">
             SYNCING CALENDAR...
          </div>
       )}
    </div>
  );
}
