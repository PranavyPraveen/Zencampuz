import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { notificationsApi } from '../../api/notifications';
import { 
  Bell, Info, AlertCircle, CheckCircle2, Loader2, 
  Clock, Trash2, MailOpen
} from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const primaryColor = user?.tenant?.primary_color || '#22D3EE';

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const data = await notificationsApi.getNotifications();
        setNotifications(data);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'substitution_approved':
      case 'leave_approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'substitution_rejected':
      case 'leave_rejected':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      <p className="text-foreground/40 text-sm font-medium">Loading notifications...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-1 bg-gradient-to-r from-transparent to-transparent rounded-full"
              style={{ background: `linear-gradient(90deg, ${primaryColor}, transparent)` }}
            />
            <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.5em]">Inbox</span>
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter">
            My <span style={{ color: primaryColor }}>Alerts</span>
          </h1>
        </div>

        <button 
          onClick={markAllRead}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/5 border border-border text-xs font-bold text-foreground/40 hover:text-foreground hover:bg-white/10 transition-all"
        >
          <MailOpen className="w-4 h-4" /> Mark all as read
        </button>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-surface shadow-sm/40 border border-border rounded-3xl p-16 text-center">
            <Bell className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
            <p className="text-foreground/30 font-bold uppercase tracking-widest text-sm">All caught up!</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`group relative bg-surface/60 backdrop-blur-xl shadow-sm border rounded-3xl p-6 transition-all ${!n.is_read ? 'border-blue-500/20' : 'border-border opacity-60 hover:opacity-100'}`}>
              {!n.is_read && (
                <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-blue-500" />
              )}
              <div className="flex gap-4">
                <div className="p-3 rounded-2xl bg-foreground/5 flex-shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="space-y-1 pr-8">
                  <h4 className="font-bold text-foreground text-lg tracking-tight">{n.title}</h4>
                  <p className="text-sm text-foreground/50 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-2 mt-4 text-[10px] font-black text-foreground/20 uppercase tracking-widest">
                    <Clock className="w-3 h-3" /> {new Date(n.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-foreground/5 border border-border rounded-3xl flex items-center justify-between">
         <div className="flex items-center gap-3">
           <Bell className="w-5 h-5 text-foreground/20" />
           <p className="text-xs text-foreground/40 font-medium">Notification preferences can be managed in your Profile Settings.</p>
         </div>
         <button className="text-blue-400 text-xs font-bold hover:underline">Settings</button>
      </div>
    </div>
  );
}
