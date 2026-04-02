import { Link } from 'react-router-dom';
import { 
  Monitor, 
  Calendar, 
  Clock, 
  Users, 
  BarChart3, 
  ShieldCheck,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div className="relative w-full bg-background text-foreground font-sans selection:bg-[#00E5FF] selection:text-black overflow-hidden">
      {/* Full Page Dynamic Background with Motion Graphics Network */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-full w-full">
        {/* Glows */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-[20%] w-[40%] h-[40vh] bg-[#2563EB]/15 rounded-full blur-[120px] mix-blend-screen" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[-10%] w-[35%] h-[50vh] bg-[#00E5FF]/10 rounded-full blur-[150px] mix-blend-screen" 
        />
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40vh] bg-[#2563EB]/10 rounded-full blur-[150px] mix-blend-screen" 
        />
        
        {/* Network Nodes (Floating Particles) - Enhanced with varied speeds and distributed across entire height */}
        {[...Array(60)].map((_, i) => {
          const size = Math.random() * 4 + 1;
          return (
            <motion.div
              key={`node-${i}`}
              className="absolute rounded-full bg-[#00E5FF]/60 shadow-[0_0_15px_rgba(0,229,255,0.8)]"
              style={{
                width: size + 'px',
                height: size + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%', // Scatter across the full height
              }}
              animate={{
                y: [0, Math.random() * -300 - 150], // Taller vertical movement
                x: [0, Math.random() * 100 - 50],
                opacity: [0, 0.6, 0], // Slightly more subtle opacity to prevent clutter
                scale: [0, 1.5, 0]
              }}
              transition={{
                duration: Math.random() * 20 + 15, // Slower, more ambient movement
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 10
              }}
            >
              {/* Particle Trail Effect for larger nodes */}
              {size > 2.5 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-[1px] h-12 bg-gradient-to-t from-transparent to-[#00E5FF]/40"></div>
              )}
            </motion.div>
          );
        })}

        {/* Ambient Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{ 
            backgroundImage: 'linear-gradient(#2563EB 1px, transparent 1px), linear-gradient(90deg, #2563EB 1px, transparent 1px)', 
            backgroundSize: '40px 40px',
            backgroundPosition: 'center center'
          }} 
        />
      </div>

      {/* 1. Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center -mt-20 pt-32 pb-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-[3.5rem] md:text-7xl lg:text-[5.5rem] font-bold text-foreground tracking-tight mb-6 leading-[1.1]"
          >
            Unify Your Higher <br className="hidden md:block"/>
            Education <span className="text-[#00E5FF] drop-shadow-[0_0_20px_rgba(0,229,255,0.4)]">Ecosystem</span>
          </motion.h1>
          
          <p className="text-lg md:text-xl text-muted max-w-3xl mx-auto mb-10 font-normal leading-relaxed">
            Built to simplify campus management.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-12">
            <Link to="/contact" className="group w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#00E5FF] to-[#00F0B5] hover:from-[#00D0E0] hover:to-[#00D0A0] text-[#0A0F1C] text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all flex items-center justify-center gap-2">
              Partner Your Institution <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-[10px] text-[#475569] font-bold tracking-widest uppercase">
            Scroll
          </div>
        </div>
      </section>

      {/* 2. About CampuZcore */}
      <section className="py-24 relative z-10 bg-transparent">
        {/* We removed the hard bg-[#0A0F1C] gradient background so the global background shows through */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Column */}
            <div>
              <div className="text-[#2563EB] text-[11px] font-bold tracking-widest uppercase mb-4">Core Platform Overview</div>
              <h2 className="text-4xl md:text-[2.75rem] font-bold text-foreground tracking-tight mb-10 leading-tight">Built for the Complexity <br/> of Modern Education</h2>
              
              <div className="space-y-6 relative">
                {/* Vertical connecting line for list */}
                <div className="absolute left-[11px] top-6 bottom-6 w-[1px] bg-gradient-to-b from-[#00E5FF]/50 via-[#00E5FF]/20 to-transparent"></div>

                {[
                  "Seamless multi-tenant architecture",
                  "Custom branding per institution",
                  "Automated timetable & resource scheduling",
                  "Centralized facility and asset tracking"
                ].map((item, i) => (
                   <div key={i} className="flex items-center gap-4 relative z-10 group">
                     {/* Custom Check Circle matching user screenshot */}
                     <div className="flex z-10 items-center justify-center w-[24px] h-[24px] rounded-full border-2 border-[#00E5FF] bg-background group-hover:bg-[#00E5FF]/10 transition-colors">
                       <CheckCircle2 className="w-4 h-4 text-[#00E5FF]" strokeWidth={3} />
                     </div>
                     <span className="text-muted text-lg font-medium group-hover:text-foreground transition-colors">{item}</span>
                   </div>
                ))}
              </div>
            </div>

            {/* Right Column - Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "50+", label: "INSTITUTIONS SERVED" },
                { value: "500+", label: "HOURS SAVED WEEKLY" },
                { value: "200k+", label: "BOOKINGS MANAGED" },
                { value: "10k+", label: "CONFLICTS PREVENTED" }
              ].map((stat, i) => (
                <div key={i} className="bg-surface/80 backdrop-blur-xl shadow-sm border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg backdrop-blur-sm">
                  <div className="text-[2.5rem] font-black text-[#00E5FF] mb-2">{stat.value}</div>
                  <div className="text-[10px] text-muted font-bold tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Capabilities */}
      <section className="py-24 bg-transparent relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-[2.75rem] font-bold text-foreground tracking-tight mb-4">Core Capabilities</h2>
            <p className="text-muted text-lg max-w-2xl mx-auto font-normal">Modular, enterprise-grade features designed to scale with your institution's needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Monitor, topText: "10K+ ASSETS", title: "Resource Management", desc: "Track assets, IT equipment, and lab instruments across all campuses in real-time.", border: "border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.05)]", bg: "bg-[#0A1229]/80 backdrop-blur-sm" },
              { icon: Calendar, topText: "ZERO CONFLICTS", title: "Facility Booking", desc: "Smart conflict-detection algorithms with multi-stage approval workflows.", border: "border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.05)]", bg: "bg-[#0A1229]/80 backdrop-blur-sm" },
              { icon: Clock, topText: "80% FASTER", title: "Timetable Scheduling", desc: "Automate complex academic schedules for courses, faculty and rooms.", border: "border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.05)]", bg: "bg-[#0A1229]/80 backdrop-blur-sm" },
              { icon: Users, topText: "3 ROLE LEVELS", title: "Role-Based Portals", desc: "Personalised views for students, faculty, and administrative staff.", border: "border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.05)]", bg: "bg-[#0A1229]/80 backdrop-blur-sm" },
              { icon: BarChart3, topText: "LIVE REPORTS", title: "Advanced Analytics", desc: "Live utilisation dashboards and data-driven insights for resource distribution.", border: "border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.05)]", bg: "bg-[#0A1229]/80 backdrop-blur-sm" },
              { icon: ShieldCheck, topText: "100% ISOLATED", title: "Multi-Tenant Security", desc: "Complete data isolation per institution with enterprise-grade encryption.", border: "border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.05)]", bg: "bg-[#0A1229]/80 backdrop-blur-sm" }
            ].map((mod, i) => (
              <div key={i} className={`p-6 rounded-2xl border ${mod.border} transform hover:-translate-y-2 hover:border-[#00E5FF]/80 hover:shadow-[0_0_30px_rgba(0,229,255,0.2)] transition-all duration-300 ${mod.bg}`}>
                <div className="flex justify-between items-start mb-5">
                  <div className={`w-10 h-10 rounded-xl bg-surface shadow-sm border border-border flex items-center justify-center`}>
                    <mod.icon className={`w-5 h-5 text-[#00E5FF]`} strokeWidth={1.5} />
                  </div>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-[#00E5FF] mt-2">{mod.topText}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 tracking-wide">{mod.title}</h3>
                <p className="text-muted text-xs leading-relaxed">{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Bottom CTA */}
      <section className="py-24 bg-transparent border-t border-border/30 relative z-10 backdrop-blur-sm">
         <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="text-[#2563EB] text-[11px] font-bold tracking-widest uppercase mb-4">Get Started</div>
            <h2 className="text-4xl md:text-[3rem] font-bold text-foreground mb-6 leading-tight">Ready to Smartify Your<br/>Campus?</h2>
            <p className="text-muted text-lg mb-10 max-w-2xl mx-auto">Join leading academic institutions that have transformed their operations with CampuZcore. Setup takes less than a day.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/contact" className="group w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#00E5FF] to-[#00F0B5] hover:from-[#00D0E0] hover:to-[#00D0A0] text-[#0A0F1C] text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all flex items-center justify-center gap-2">
                Partner Your Institution <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
         </div>
      </section>
    </div>
  );
}
