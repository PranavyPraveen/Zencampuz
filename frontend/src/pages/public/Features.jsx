import { 
  Database, 
  Clock, 
  BookOpen, 
  ShieldCheck, 
  BarChart3, 
  Users, 
  Settings, 
  Bell 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Features() {
  const features = [
    { 
      title: "Resource Management", 
      desc: "Comprehensive tracking for IT assets, high-precision lab instruments, and sub-unit booking capabilities. Complete with maintenance scheduling.", 
      icon: Database 
    },
    { 
      title: "Timetable Management", 
      desc: "Automated engine to prevent faculty double-booking. Drag-and-drop scheduling interface with constraint resolution.", 
      icon: Clock 
    },
    { 
      title: "Exam Management", 
      desc: "Seating arrangement generation based on room capacity, invigilator assignments, and conflict-free exam timetabling.", 
      icon: BookOpen 
    },
    { 
      title: "Facility Booking & Approval Workflow", 
      desc: "Multi-stage custom approval workflows. Policy-based auto-routing with built-in conflict prevention and timeline tracking.", 
      icon: ShieldCheck 
    },
    { 
      title: "Advanced Analytics", 
      desc: "Live utilisation dashboards and data-driven insights for resource distribution, predictive modeling for campus space usage.", 
      icon: BarChart3 
    },
    { 
      title: "External Access & Guest Portals", 
      desc: "Secure interfaces for external stakeholders, alumni, and community members to request facility access and events.", 
      icon: Users 
    },
    { 
      title: "Tenant Branding", 
      desc: "Fully customizable interface per institution. Maintain unique identity with custom domains, color schemes, and logos natively.", 
      icon: Settings 
    },
    { 
      title: "Smart Notifications", 
      desc: "Real-time alerts for booking approvals, schedule changes, and maintenance reminders via email and in-app channels.", 
      icon: Bell 
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4"
          >
            Complete Campus Automation
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted text-lg max-w-3xl mx-auto font-normal leading-relaxed"
          >
            Discover the powerful modules that make CampuZcore the central nervous system of modern educational institutions.
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0A1229] border border-border p-8 rounded-[2rem] group hover:border-[#00E5FF]/40 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] transition-all duration-300 flex flex-col items-start"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#0F172A] border border-border flex items-center justify-center mb-6 group-hover:border-[#00E5FF]/50 transition-colors">
                <f.icon className="w-6 h-6 text-[#00E5FF]" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 tracking-wide">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
